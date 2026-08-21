import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { currentWeekStartStamp, weekNumberFor } from "./week";

// On Railway: mount a volume (e.g. at /data) and set DATABASE_PATH=/data/gallery.db
const DB_PATH =
  process.env.DATABASE_PATH || path.join(process.cwd(), "data", "gallery.db");

declare global {
  // eslint-disable-next-line no-var
  var __galleryDb: Database.Database | undefined;
}

function createDb(): Database.Database {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      twitter_handle TEXT NOT NULL UNIQUE COLLATE NOCASE,
      display_name TEXT NOT NULL,
      discord_username TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      category TEXT NOT NULL CHECK (category IN ('art','text')),
      tweet_url TEXT NOT NULL,
      tweet_id TEXT,
      tweet_text TEXT,
      image_url TEXT,
      week_number INTEGER NOT NULL,
      edited INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      submission_id INTEGER NOT NULL REFERENCES submissions(id),
      category TEXT NOT NULL,
      week_number INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (user_id, category, week_number)
    );

    CREATE TABLE IF NOT EXISTS winners (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      week_number INTEGER NOT NULL,
      category TEXT NOT NULL,
      rank INTEGER NOT NULL,
      submission_id INTEGER NOT NULL REFERENCES submissions(id),
      user_id INTEGER NOT NULL REFERENCES users(id),
      votes INTEGER NOT NULL,
      finalized_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (week_number, category, rank)
    );

    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Record the Saturday of the launch week once; week numbers count from it.
  const existing = db
    .prepare("SELECT value FROM meta WHERE key = 'launch_week_start'")
    .get() as { value: string } | undefined;
  if (!existing) {
    db.prepare("INSERT INTO meta (key, value) VALUES ('launch_week_start', ?)").run(
      String(currentWeekStartStamp())
    );
  }
  return db;
}

export function getDb(): Database.Database {
  if (!globalThis.__galleryDb) {
    globalThis.__galleryDb = createDb();
  }
  return globalThis.__galleryDb;
}

export function launchWeekStart(): number {
  const row = getDb()
    .prepare("SELECT value FROM meta WHERE key = 'launch_week_start'")
    .get() as { value: string };
  return Number(row.value);
}

export function currentWeekNumber(): number {
  return weekNumberFor(launchWeekStart());
}

export type UserRow = {
  id: number;
  twitter_handle: string;
  display_name: string;
  discord_username: string;
  password_hash: string;
  created_at: string;
};

export type SubmissionRow = {
  id: number;
  user_id: number;
  category: "art" | "text";
  tweet_url: string;
  tweet_id: string | null;
  tweet_text: string | null;
  image_url: string | null;
  week_number: number;
  edited: number;
  created_at: string;
  // joined
  twitter_handle?: string;
  display_name?: string;
  vote_count?: number;
};

/** Finalize (top-3 per category) every past week that has votes but no winners yet. */
export function finalizePastWeeks(): void {
  const db = getDb();
  const current = currentWeekNumber();
  const weeks = db
    .prepare(
      `SELECT DISTINCT week_number FROM votes WHERE week_number < ?
       AND week_number NOT IN (SELECT DISTINCT week_number FROM winners)`
    )
    .all(current) as { week_number: number }[];

  const top = db.prepare(
    `SELECT s.id AS submission_id, s.user_id, COUNT(v.id) AS votes
     FROM submissions s
     JOIN votes v ON v.submission_id = s.id
     WHERE s.week_number = ? AND s.category = ?
     GROUP BY s.id
     ORDER BY votes DESC, s.created_at ASC
     LIMIT 3`
  );
  const insert = db.prepare(
    `INSERT OR IGNORE INTO winners (week_number, category, rank, submission_id, user_id, votes)
     VALUES (?, ?, ?, ?, ?, ?)`
  );

  for (const { week_number } of weeks) {
    for (const category of ["art", "text"] as const) {
      const rows = top.all(week_number, category) as {
        submission_id: number;
        user_id: number;
        votes: number;
      }[];
      rows.forEach((r, i) => {
        insert.run(week_number, category, i + 1, r.submission_id, r.user_id, r.votes);
      });
    }
  }
}
