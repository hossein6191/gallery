import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { getDb, uploadsDir } from "@/lib/db";
import { currentWeekStartStamp } from "@/lib/week";

// Full data wipe for the official launch. Protected by the ADMIN_SECRET
// env var — set it on Railway, then use the /admin page.
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
  const counts = {
    users: (db.prepare("SELECT COUNT(*) c FROM users").get() as { c: number }).c,
    submissions: (db.prepare("SELECT COUNT(*) c FROM submissions").get() as { c: number }).c,
    votes: (db.prepare("SELECT COUNT(*) c FROM votes").get() as { c: number }).c,
    winners: (db.prepare("SELECT COUNT(*) c FROM winners").get() as { c: number }).c,
  };

  db.exec("DELETE FROM winners; DELETE FROM votes; DELETE FROM submissions; DELETE FROM users;");
  // restart week numbering from the current week
  db.prepare("UPDATE meta SET value = ? WHERE key = 'launch_week_start'").run(
    String(currentWeekStartStamp())
  );

  // remove uploaded files too
  const dir = uploadsDir();
  for (const f of fs.readdirSync(dir)) {
    try {
      fs.unlinkSync(path.join(dir, f));
    } catch {
      // best effort
    }
  }

  return NextResponse.json({ ok: true, removed: counts });
}
