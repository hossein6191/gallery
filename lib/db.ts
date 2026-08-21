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
  db.pragma("busy_timeout = 5000");
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
      category TEXT NOT NULL CHECK (category IN ('art','text','video')),
      tweet_url TEXT NOT NULL,
      tweet_id TEXT,
      tweet_text TEXT,
      image_url TEXT,
      file_url TEXT,
      file_type TEXT,
      tweet_date TEXT,
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

  migrateSubmissions(db);

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

/** Upgrade databases created before the video category / file uploads existed. */
function migrateSubmissions(db: Database.Database): void {
  const cols = (db.prepare("PRAGMA table_info(submissions)").all() as { name: string }[]).map(
    (c) => c.name
  );
  for (const col of ["file_url", "file_type", "tweet_date"]) {
    if (!cols.includes(col)) {
      db.exec(`ALTER TABLE submissions ADD COLUMN ${col} TEXT`);
    }
  }

  const tableSql = (
    db
      .prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='submissions'")
      .get() as { sql: string }
  ).sql;
  if (!tableSql.includes("'video'")) {
    // SQLite can't relax a CHECK constraint in place — rebuild the table.
    // foreign_keys must be off while the parent table is dropped/renamed,
    // and concurrent dev workers may race here, so failures are tolerated
    // when another worker already finished the migration.
    db.pragma("foreign_keys = OFF");
    try {
      db.exec(`
        BEGIN IMMEDIATE;
        CREATE TABLE submissions_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL REFERENCES users(id),
          category TEXT NOT NULL CHECK (category IN ('art','text','video')),
          tweet_url TEXT NOT NULL,
          tweet_id TEXT,
          tweet_text TEXT,
          image_url TEXT,
          file_url TEXT,
          file_type TEXT,
          tweet_date TEXT,
          week_number INTEGER NOT NULL,
          edited INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        INSERT INTO submissions_new (id, user_id, category, tweet_url, tweet_id, tweet_text,
          image_url, file_url, file_type, tweet_date, week_number, edited, created_at)
        SELECT id, user_id, category, tweet_url, tweet_id, tweet_text,
          image_url, file_url, file_type, tweet_date, week_number, edited, created_at
        FROM submissions;
        DROP TABLE submissions;
        ALTER TABLE submissions_new RENAME TO submissions;
        COMMIT;
      `);
    } catch (err) {
      try {
        db.exec("ROLLBACK;");
      } catch {
        // no open transaction
      }
      const nowSql = (
        db
          .prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='submissions'")
          .get() as { sql: string }
      ).sql;
      if (!nowSql.includes("'video'")) throw err;
    } finally {
      db.pragma("foreign_keys = ON");
    }
  }
}

/** Directory for uploaded art/video files — lives next to the DB so the
 *  Railway volume persists it. */
export function uploadsDir(): string {
  const dir = path.join(path.dirname(DB_PATH), "uploads");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
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
  category: "art" | "text" | "video";
  tweet_url: string;
  tweet_id: string | null;
  tweet_text: string | null;
  image_url: string | null;
  file_url: string | null;
  file_type: "image" | "video" | null;
  tweet_date: string | null;
  week_number: number; // 0 = in the gallery but not in any week's contest
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
