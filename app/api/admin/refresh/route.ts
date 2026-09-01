import { NextResponse } from "next/server";
import { getDb, currentWeekNumber, type SubmissionRow } from "@/lib/db";
import { fetchTweet } from "@/lib/twitter";

const MAX_TWEET_AGE_MS = 7 * 24 * 60 * 60 * 1000;

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
         tweet_date = COALESCE(?, tweet_date),
         week_number = ?
     WHERE id = ?`
  );

  const week = currentWeekNumber();
  let updated = 0;
  let failed = 0;
  let reinstated = 0;
  for (const row of rows) {
    const fetched = await fetchTweet(row.tweet_url);
    if (!fetched) {
      failed++;
      continue;
    }
    // Posts marked gallery-only under the old "since Saturday" rule come back
    // into the current week's contest if the tweet is within the 7-day window.
    let weekNumber = row.week_number;
    if (row.week_number === 0 && fetched.createdAt) {
      const t = new Date(fetched.createdAt).getTime();
      if (!Number.isNaN(t) && t >= Date.now() - MAX_TWEET_AGE_MS) {
        weekNumber = week;
        reinstated++;
      }
    }
    update.run(fetched.text, fetched.imageUrl, fetched.createdAt, weekNumber, row.id);
    updated++;
  }

  return NextResponse.json({ ok: true, total: rows.length, updated, failed, reinstated });
}
