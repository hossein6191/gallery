import { NextResponse } from "next/server";
import { getDb, type UserRow } from "@/lib/db";
import { createSession, verifyPassword } from "@/lib/auth";
import { normalizeHandle } from "@/lib/utils";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const twitterHandle = normalizeHandle(String(body?.twitterHandle ?? ""));
  const password = String(body?.password ?? "");

  const row = getDb()
    .prepare("SELECT * FROM users WHERE twitter_handle = ?")
    .get(twitterHandle) as UserRow | undefined;

  if (!row || !(await verifyPassword(password, row.password_hash))) {
    return NextResponse.json(
      { error: "یوزرنیم توییتر یا رمز عبور اشتباه است" },
      { status: 401 }
    );
  }

  const user = {
    id: row.id,
    twitterHandle: row.twitter_handle,
    displayName: row.display_name,
    discordUsername: row.discord_username,
  };
  await createSession(user);
  return NextResponse.json({ user });
}
