import { NextResponse } from "next/server";
import { getDb, type SubmissionRow } from "@/lib/db";
import { fetchTweet } from "@/lib/twitter";

// Re-fetch text / cover / date for every stored submission (e.g. after the
// fetcher improved). Protected by ADMIN_SECRET like the reset endpoint.
export async function POST(req: Request) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "ADMIN_SECRET روی سرور تنظیم نشده — اول در Railway اضافه‌اش کن" },
      { status: 500 }
    );
  }
  const body = await req.json().catch(() => null);
  if (String(body?.key ?? "") !== secret) {
    return NextResponse.json({ error: "رمز ادمین اشتباه است" }, { status: 403 });
  }

  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM submissions ORDER BY created_at DESC LIMIT 500")
    .all() as SubmissionRow[];

  const update = db.prepare(
    `UPDATE submissions
     SET tweet_text = COALESCE(?, tweet_text),
         image_url = COALESCE(?, image_url),
         tweet_date = COALESCE(?, tweet_date)
     WHERE id = ?`
  );

  let updated = 0;
  let failed = 0;
  for (const row of rows) {
    const fetched = await fetchTweet(row.tweet_url);
    if (!fetched) {
      failed++;
      continue;
    }
    update.run(fetched.text, fetched.imageUrl, fetched.createdAt, row.id);
    updated++;
  }

  return NextResponse.json({ ok: true, total: rows.length, updated, failed });
}
