import { NextResponse } from "next/server";
import { getDb, currentWeekNumber, type SubmissionRow } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { fetchTweet, isTweetUrl } from "@/lib/twitter";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const week = searchParams.get("week");
  const mine = searchParams.get("mine");
  const db = getDb();

  const where: string[] = [];
  const params: (string | number)[] = [];
  if (category === "art" || category === "text") {
    where.push("s.category = ?");
    params.push(category);
  }
  if (week) {
    where.push("s.week_number = ?");
    params.push(Number(week));
  }
  if (mine === "1") {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ submissions: [] });
    where.push("s.user_id = ?");
    params.push(user.id);
  }

  const rows = db
    .prepare(
      `SELECT s.*, u.twitter_handle, u.display_name,
              (SELECT COUNT(*) FROM votes v WHERE v.submission_id = s.id) AS vote_count
       FROM submissions s
       JOIN users u ON u.id = s.user_id
       ${where.length ? "WHERE " + where.join(" AND ") : ""}
       ORDER BY s.created_at DESC
       LIMIT 200`
    )
    .all(...params) as SubmissionRow[];

  return NextResponse.json({ submissions: rows, currentWeek: currentWeekNumber() });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "اول باید وارد حسابت بشی" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const tweetUrl = String(body?.tweetUrl ?? "").trim();
  const category = String(body?.category ?? "");
  const manualImageUrl = String(body?.imageUrl ?? "").trim() || null;

  if (!isTweetUrl(tweetUrl)) {
    return NextResponse.json(
      { error: "لینک توییت معتبر نیست — باید لینک یک پست از X/توییتر باشد" },
      { status: 400 }
    );
  }
  if (category !== "art" && category !== "text") {
    return NextResponse.json({ error: "نوع پست را انتخاب کن (هنری یا متنی)" }, { status: 400 });
  }

  const db = getDb();
  const dup = db
    .prepare("SELECT id FROM submissions WHERE tweet_url = ? AND user_id = ?")
    .get(tweetUrl, user.id);
  if (dup) {
    return NextResponse.json({ error: "این توییت را قبلاً ثبت کرده‌ای" }, { status: 409 });
  }

  const fetched = await fetchTweet(tweetUrl);
  const tweetId = tweetUrl.match(/status(?:es)?\/(\d+)/)?.[1] ?? null;

  const result = db
    .prepare(
      `INSERT INTO submissions (user_id, category, tweet_url, tweet_id, tweet_text, image_url, week_number)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      user.id,
      category,
      tweetUrl,
      tweetId,
      fetched?.text ?? null,
      fetched?.imageUrl ?? manualImageUrl,
      currentWeekNumber()
    );

  return NextResponse.json({ id: Number(result.lastInsertRowid) });
}
