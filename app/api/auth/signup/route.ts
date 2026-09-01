import { NextResponse } from "next/server";
import { getDb, logAuthEvent } from "@/lib/db";
import { createSession, hashPassword } from "@/lib/auth";
import { normalizeHandle } from "@/lib/utils";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const twitterHandle = normalizeHandle(String(body?.twitterHandle ?? ""));
  const displayName = String(body?.displayName ?? "").trim();
  const discordUsername = String(body?.discordUsername ?? "").trim();
  const password = String(body?.password ?? "");

  if (!twitterHandle || !/^[A-Za-z0-9_]{1,15}$/.test(twitterHandle)) {
    return NextResponse.json({ error: "یوزرنیم توییتر معتبر نیست" }, { status: 400 });
  }
  if (!displayName) {
    return NextResponse.json({ error: "اسم نمایشی را وارد کن" }, { status: 400 });
  }
  if (displayName.length > 40) {
    return NextResponse.json({ error: "اسم نمایشی حداکثر ۴۰ کاراکتر باشد" }, { status: 400 });
  }
  if (!discordUsername) {
    return NextResponse.json({ error: "یوزرنیم دیسکورد را وارد کن" }, { status: 400 });
  }
  if (discordUsername.length > 40) {
    return NextResponse.json({ error: "یوزرنیم دیسکورد حداکثر ۴۰ کاراکتر باشد" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "رمز عبور باید حداقل ۸ کاراکتر باشد" }, { status: 400 });
  }

  const db = getDb();
  const exists = db
    .prepare("SELECT id FROM users WHERE twitter_handle = ?")
    .get(twitterHandle);
  if (exists) {
    return NextResponse.json(
      { error: "این یوزرنیم توییتر قبلاً ثبت شده — وارد شو" },
      { status: 409 }
    );
  }

  const passwordHash = await hashPassword(password);
  const result = db
    .prepare(
      `INSERT INTO users (twitter_handle, display_name, discord_username, password_hash)
       VALUES (?, ?, ?, ?)`
    )
    .run(twitterHandle, displayName, discordUsername, passwordHash);

  const user = {
    id: Number(result.lastInsertRowid),
    twitterHandle,
    displayName,
    discordUsername,
  };
  await createSession(user);
  logAuthEvent({ kind: "signup", handle: user.twitterHandle, userId: user.id, req });
  return NextResponse.json({ user });
}
