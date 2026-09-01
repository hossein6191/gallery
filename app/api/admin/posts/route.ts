import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { getDb, uploadsDir, type SubmissionRow } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

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

  // Full voter audit: who voted for which post, with the voter's join date so
  // freshly-created fake accounts stand out.
  if (action === "votes") {
    const rows = db
      .prepare(
        `SELECT v.id, v.week_number, v.category, v.created_at AS voted_at,
                s.id AS submission_id, s.tweet_url, s.tweet_text,
                au.twitter_handle AS author_handle, au.display_name AS author_name,
                vu.twitter_handle AS voter_handle, vu.display_name AS voter_name,
                vu.discord_username AS voter_discord, vu.created_at AS voter_joined
         FROM votes v
         JOIN submissions s ON s.id = v.submission_id
         JOIN users au ON au.id = s.user_id
         JOIN users vu ON vu.id = v.user_id
         ORDER BY v.week_number DESC, s.id ASC, v.created_at ASC
         LIMIT 1000`
      )
      .all();
    return NextResponse.json({ votes: rows });
  }

  // Who signed up, who got in with what device, and who is stuck outside.
  if (action === "authlog") {
    const rows = db
      .prepare(
        `SELECT a.id, a.handle, a.kind, a.reason, a.ip, a.user_agent, a.created_at,
                u.display_name, u.discord_username
         FROM auth_events a
         LEFT JOIN users u ON u.id = a.user_id
         ORDER BY a.created_at DESC, a.id DESC
         LIMIT 400`
      )
      .all();
    return NextResponse.json({ events: rows });
  }

  // Members with their activity, plus whether they ever managed to log in.
  if (action === "members") {
    const rows = db
      .prepare(
        `SELECT u.id, u.twitter_handle, u.display_name, u.discord_username, u.created_at,
                (SELECT COUNT(*) FROM submissions s WHERE s.user_id = u.id) AS posts,
                (SELECT COUNT(*) FROM votes v WHERE v.user_id = u.id) AS votes_cast,
                (SELECT COUNT(*) FROM auth_events a
                   WHERE a.user_id = u.id AND a.kind = 'login_success') AS logins,
                (SELECT COUNT(*) FROM auth_events a
                   WHERE a.user_id = u.id AND a.kind LIKE 'login_failed%') AS failed_logins,
                (SELECT MAX(a.created_at) FROM auth_events a
                   WHERE a.user_id = u.id AND a.kind = 'login_success') AS last_login
         FROM users u
         ORDER BY u.created_at DESC
         LIMIT 500`
      )
      .all();
    return NextResponse.json({ members: rows });
  }

  // Rescue an account whose owner cannot log in.
  if (action === "set_password") {
    const id = Number(body?.id);
    const password = String(body?.password ?? "");
    if (password.length < 8) {
      return NextResponse.json(
        { error: "رمز جدید باید حداقل ۸ کاراکتر باشد" },
        { status: 400 }
      );
    }
    const user = db.prepare("SELECT twitter_handle FROM users WHERE id = ?").get(id) as
      | { twitter_handle: string }
      | undefined;
    if (!user) {
      return NextResponse.json({ error: "عضو پیدا نشد" }, { status: 404 });
    }
    db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(
      await hashPassword(password),
      id
    );
    return NextResponse.json({ ok: true, handle: user.twitter_handle });
  }

  // Remove a member and everything they left behind (spam / duplicate accounts).
  if (action === "delete_member") {
    const id = Number(body?.id);
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as
      | { id: number; twitter_handle: string }
      | undefined;
    if (!user) {
      return NextResponse.json({ error: "عضو پیدا نشد" }, { status: 404 });
    }

    const files = db
      .prepare("SELECT file_url FROM submissions WHERE user_id = ? AND file_url IS NOT NULL")
      .all(id) as { file_url: string }[];

    db.transaction(() => {
      db.prepare("DELETE FROM votes WHERE user_id = ?").run(id);
      db.prepare(
        "DELETE FROM votes WHERE submission_id IN (SELECT id FROM submissions WHERE user_id = ?)"
      ).run(id);
      db.prepare("DELETE FROM winners WHERE user_id = ?").run(id);
      db.prepare("DELETE FROM submissions WHERE user_id = ?").run(id);
      db.prepare("DELETE FROM users WHERE id = ?").run(id);
    })();

    for (const f of files) {
      if (f.file_url?.startsWith("/api/uploads/")) {
        try {
          fs.unlinkSync(path.join(uploadsDir(), path.basename(f.file_url)));
        } catch {
          // already gone
        }
      }
    }
    return NextResponse.json({ ok: true, handle: user.twitter_handle });
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
