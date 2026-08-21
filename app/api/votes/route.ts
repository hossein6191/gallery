import { NextResponse } from "next/server";
import { getDb, currentWeekNumber, type SubmissionRow } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { isVotingOpen, votingDayNameFa } from "@/lib/week";

export async function GET() {
  const user = await getSessionUser();
  const db = getDb();
  const week = currentWeekNumber();

  const myVotes = user
    ? (db
        .prepare(
          "SELECT category, submission_id FROM votes WHERE user_id = ? AND week_number = ?"
        )
        .all(user.id, week) as { category: string; submission_id: number }[])
    : [];

  return NextResponse.json({
    open: isVotingOpen(),
    votingDay: votingDayNameFa(),
    week,
    myVotes,
  });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "برای رای دادن اول وارد شو" }, { status: 401 });
  }
  if (!isVotingOpen()) {
    return NextResponse.json(
      { error: `رای‌گیری فقط روز ${votingDayNameFa()} باز است` },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => null);
  const submissionId = Number(body?.submissionId);
  const db = getDb();
  const week = currentWeekNumber();

  const sub = db
    .prepare("SELECT * FROM submissions WHERE id = ?")
    .get(submissionId) as SubmissionRow | undefined;
  if (!sub) {
    return NextResponse.json({ error: "پست پیدا نشد" }, { status: 404 });
  }
  if (sub.category === "video") {
    return NextResponse.json(
      { error: "بخش ویدیو فعلاً مسابقه هفتگی ندارد" },
      { status: 400 }
    );
  }
  if (sub.week_number !== week) {
    return NextResponse.json(
      { error: "فقط به پست‌هایی که همین هفته توییت شده‌اند می‌شود رای داد" },
      { status: 400 }
    );
  }
  if (sub.user_id === user.id) {
    return NextResponse.json({ error: "به پست خودت نمی‌توانی رای بدهی" }, { status: 400 });
  }

  // One vote per member, per category, per week — re-voting replaces the old vote.
  db.prepare(
    "DELETE FROM votes WHERE user_id = ? AND category = ? AND week_number = ?"
  ).run(user.id, sub.category, week);
  db.prepare(
    `INSERT INTO votes (user_id, submission_id, category, week_number)
     VALUES (?, ?, ?, ?)`
  ).run(user.id, submissionId, sub.category, week);

  return NextResponse.json({ ok: true });
}
