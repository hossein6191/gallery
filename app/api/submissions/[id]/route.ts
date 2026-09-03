import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { getDb, currentWeekNumber, uploadsDir, type SubmissionRow } from "@/lib/db";
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
  // excluded before. All three sections are judged the same way.
  let weekNumber = row.week_number;
  if (fetched?.createdAt) {
    const tweetTime = new Date(fetched.createdAt).getTime();
    if (!Number.isNaN(tweetTime) && tweetTime < Date.now() - MAX_TWEET_AGE_MS) {
      weekNumber = 0;
    } else if (row.week_number === 0) {
      weekNumber = currentWeekNumber();
    }
  }

  // A video post follows its tweet: a new link with a video in it replaces the
  // remote URL. A file the member uploaded is theirs and is left alone.
  const keepsUpload = row.file_url?.startsWith("/api/uploads/") ?? false;
  const remoteVideo =
    row.category === "video" && !keepsUpload && fetched?.videoUrl ? fetched.videoUrl : null;

  db.prepare(
    `UPDATE submissions
     SET tweet_url = ?, tweet_id = ?, tweet_text = COALESCE(?, tweet_text),
         image_url = COALESCE(?, image_url), tweet_date = COALESCE(?, tweet_date),
         file_url = COALESCE(?, file_url), file_type = COALESCE(?, file_type),
         week_number = ?, edited = 1
     WHERE id = ?`
  ).run(
    tweetUrl,
    tweetId,
    fetched?.text ?? null,
    fetched?.imageUrl ?? null,
    fetched?.createdAt ?? null,
    remoteVideo,
    remoteVideo ? "video" : null,
    weekNumber,
    row.id
  );

  return NextResponse.json({ ok: true, inContest: weekNumber > 0 });
}

// Members may delete their own post. Hall-of-fame posts stay (the winners
// archive is permanent) — only the admin can remove those.
export async function DELETE(
  _req: Request,
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

  const won = db
    .prepare("SELECT COUNT(*) AS c FROM winners WHERE submission_id = ?")
    .get(row.id) as { c: number };
  if (won.c > 0) {
    return NextResponse.json(
      { error: "این پست در تالار افتخارات ثبت شده و قابل حذف نیست" },
      { status: 400 }
    );
  }

  db.transaction(() => {
    db.prepare("DELETE FROM votes WHERE submission_id = ?").run(row.id);
    db.prepare("DELETE FROM submissions WHERE id = ?").run(row.id);
  })();

  if (row.file_url?.startsWith("/api/uploads/")) {
    try {
      fs.unlinkSync(path.join(uploadsDir(), path.basename(row.file_url)));
    } catch {
      // already gone
    }
  }

  return NextResponse.json({ ok: true });
}
