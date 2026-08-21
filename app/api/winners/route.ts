import { NextResponse } from "next/server";
import { getDb, finalizePastWeeks, currentWeekNumber } from "@/lib/db";

export async function GET() {
  finalizePastWeeks();
  const db = getDb();

  const rows = db
    .prepare(
      `SELECT w.*, u.twitter_handle, u.display_name,
              s.tweet_url, s.tweet_text, s.image_url
       FROM winners w
       JOIN users u ON u.id = w.user_id
       JOIN submissions s ON s.id = w.submission_id
       ORDER BY w.week_number DESC, w.category ASC, w.rank ASC`
    )
    .all();

  return NextResponse.json({ winners: rows, currentWeek: currentWeekNumber() });
}
