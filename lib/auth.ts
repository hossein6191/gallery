import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { getDb, type UserRow } from "./db";

const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "dev-secret-change-me-on-railway"
);
const COOKIE = "gallery_session";

export type SessionUser = {
  id: number;
  twitterHandle: string;
  displayName: string;
  discordUsername: string;
};

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(user: SessionUser): Promise<void> {
  const token = await new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(SECRET);
  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    const id = Number(payload.id);
    // Re-check the user still exists so stale cookies don't act as ghosts.
    const row = getDb()
      .prepare("SELECT id, twitter_handle, display_name, discord_username FROM users WHERE id = ?")
      .get(id) as Pick<UserRow, "id" | "twitter_handle" | "display_name" | "discord_username"> | undefined;
    if (!row) return null;
    return {
      id: row.id,
      twitterHandle: row.twitter_handle,
      displayName: row.display_name,
      discordUsername: row.discord_username,
    };
  } catch {
    return null;
  }
}
