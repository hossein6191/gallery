import { NextResponse } from "next/server";
import { getDb, type SubmissionRow } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { fetchTweet, isTweetUrl } from "@/lib/twitter";

// Members may only fix a wrong tweet link on their own submission.
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

  db.prepare(
    `UPDATE submissions
     SET tweet_url = ?, tweet_id = ?, tweet_text = COALESCE(?, tweet_text),
         image_url = COALESCE(?, image_url), edited = 1
     WHERE id = ?`
  ).run(tweetUrl, tweetId, fetched?.text ?? null, fetched?.imageUrl ?? null, row.id);

  return NextResponse.json({ ok: true });
}
