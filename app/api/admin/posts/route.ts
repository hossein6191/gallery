import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { getDb, uploadsDir, type SubmissionRow } from "@/lib/db";

// Manual moderation: list every submission, delete a specific one.
// Protected by ADMIN_SECRET like the other admin endpoints.
function authorized(key: unknown): boolean {
  const secret = process.env.ADMIN_SECRET;
  return Boolean(secret) && String(key ?? "") === secret;
}

export async function POST(req: Request) {
  if (!process.env.ADMIN_SECRET) {
    return NextResponse.json(
      { error: "ADMIN_SECRET روی سرور تنظیم نشده — اول در Railway اضافه‌اش کن" },
      { status: 500 }
    );
  }
  const body = await req.json().catch(() => null);
  if (!authorized(body?.key)) {
    return NextResponse.json({ error: "رمز ادمین اشتباه است" }, { status: 403 });
  }

  const db = getDb();
  const action = String(body?.action ?? "list");

  if (action === "list") {
    const rows = db
      .prepare(
        `SELECT s.id, s.category, s.tweet_url, s.tweet_text, s.image_url, s.file_url,
                s.file_type, s.week_number, s.created_at,
                u.twitter_handle, u.display_name,
                (SELECT COUNT(*) FROM votes v WHERE v.submission_id = s.id) AS vote_count
         FROM submissions s JOIN users u ON u.id = s.user_id
         ORDER BY s.created_at DESC LIMIT 500`
      )
      .all();
    return NextResponse.json({ posts: rows });
  }

  if (action === "delete") {
    const id = Number(body?.id);
    const row = db.prepare("SELECT * FROM submissions WHERE id = ?").get(id) as
      | SubmissionRow
      | undefined;
    if (!row) {
      return NextResponse.json({ error: "پست پیدا نشد" }, { status: 404 });
    }

    db.transaction(() => {
      db.prepare("DELETE FROM votes WHERE submission_id = ?").run(id);
      db.prepare("DELETE FROM winners WHERE submission_id = ?").run(id);
      db.prepare("DELETE FROM submissions WHERE id = ?").run(id);
    })();

    // remove the uploaded file, if any
    if (row.file_url?.startsWith("/api/uploads/")) {
      const name = path.basename(row.file_url);
      try {
        fs.unlinkSync(path.join(uploadsDir(), name));
      } catch {
        // already gone
      }
    }
    return NextResponse.json({ ok: true, id });
  }

  return NextResponse.json({ error: "عملیات نامعتبر" }, { status: 400 });
}
