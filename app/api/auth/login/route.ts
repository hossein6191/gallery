import { NextResponse } from "next/server";
import { getDb, logAuthEvent, type UserRow } from "@/lib/db";
import { createSession, verifyPassword } from "@/lib/auth";
import { normalizeHandle } from "@/lib/utils";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const twitterHandle = normalizeHandle(String(body?.twitterHandle ?? ""));
  const password = String(body?.password ?? "");

  if (!twitterHandle || !password) {
    return NextResponse.json(
      { error: "یوزرنیم توییتر و رمز عبور را وارد کن" },
      { status: 400 }
    );
  }

  const row = getDb()
    .prepare("SELECT * FROM users WHERE twitter_handle = ?")
    .get(twitterHandle) as UserRow | undefined;

  if (!row) {
    logAuthEvent({
      kind: "login_failed_no_user",
      handle: twitterHandle,
      reason: "چنین عضوی ثبت‌نام نکرده",
      req,
    });
    return NextResponse.json(
      { error: "با این یوزرنیم ثبت‌نام نشده — اول عضو شو" },
      { status: 401 }
    );
  }

  if (!(await verifyPassword(password, row.password_hash))) {
    logAuthEvent({
      kind: "login_failed",
      handle: twitterHandle,
      userId: row.id,
      reason: "رمز عبور اشتباه",
      req,
    });
    return NextResponse.json({ error: "رمز عبور اشتباه است" }, { status: 401 });
  }

  const user = {
    id: row.id,
    twitterHandle: row.twitter_handle,
    displayName: row.display_name,
    discordUsername: row.discord_username,
  };
  await createSession(user);
  logAuthEvent({ kind: "login_success", handle: user.twitterHandle, userId: user.id, req });
  return NextResponse.json({ user });
}
