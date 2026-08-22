import { NextResponse } from "next/server";
import { getDb, currentWeekNumber, type SubmissionRow } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { fetchTweet, isTweetUrl } from "@/lib/twitter";

const MAX_TWEET_AGE_MS = 7 * 24 * 60 * 60 * 1000;

// Members may fix a wrong tweet link on their own submission — or re-save the
// same link to refresh the cover/text from the tweet.
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "اول باید وارد حسابت بشی" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM submissions WHERE id = ?")
    .get(Number(id)) as SubmissionRow | undefined;

  if (!row || row.user_id !== user.id) {
    return NextResponse.json({ error: "این پست متعلق به تو نیست" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const tweetUrl = String(body?.tweetUrl ?? "").trim();
  if (!isTweetUrl(tweetUrl)) {
    return NextResponse.json({ error: "لینک توییت معتبر نیست" }, { status: 400 });
  }

  const fetched = await fetchTweet(tweetUrl);
  const tweetId = tweetUrl.match(/status(?:es)?\/(\d+)/)?.[1] ?? null;

  // Re-evaluate contest eligibility for the (possibly new) tweet. A post can
  // drop out of the contest if the tweet is too old, or come back in if it was
  // excluded before; video never competes.
  let weekNumber = row.week_number;
  if (row.category === "video") {
    weekNumber = 0;
  } else if (fetched?.createdAt) {
    const tweetTime = new Date(fetched.createdAt).getTime();
    if (!Number.isNaN(tweetTime) && tweetTime < Date.now() - MAX_TWEET_AGE_MS) {
      weekNumber = 0;
    } else if (row.week_number === 0) {
      weekNumber = currentWeekNumber();
    }
  }

  db.prepare(
    `UPDATE submissions
     SET tweet_url = ?, tweet_id = ?, tweet_text = COALESCE(?, tweet_text),
         image_url = COALESCE(?, image_url), tweet_date = COALESCE(?, tweet_date),
         week_number = ?, edited = 1
     WHERE id = ?`
  ).run(
    tweetUrl,
    tweetId,
    fetched?.text ?? null,
    fetched?.imageUrl ?? null,
    fetched?.createdAt ?? null,
    weekNumber,
    row.id
  );

  return NextResponse.json({ ok: true, inContest: weekNumber > 0 });
}
