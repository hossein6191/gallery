import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim().replace(/^@/, "");
  const db = getDb();

  const rows = q
    ? db
        .prepare(
          `SELECT id, twitter_handle, display_name, discord_username, created_at
           FROM users
           WHERE twitter_handle LIKE ? OR display_name LIKE ?
           ORDER BY created_at DESC LIMIT 60`
        )
        .all(`%${q}%`, `%${q}%`)
    : db
        .prepare(
          `SELECT id, twitter_handle, display_name, discord_username, created_at
           FROM users ORDER BY created_at DESC LIMIT 120`
        )
        .all();

  return NextResponse.json({ members: rows });
}
