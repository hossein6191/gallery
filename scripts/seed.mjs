// Demo seed data so the site can be previewed with content.
// Run: node scripts/seed.mjs   (wipes and refills the local database)
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import fs from "node:fs";
import path from "node:path";

const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), "data", "gallery.db");
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

// --- schema (same as lib/db.ts) ---
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
  CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
`);

// wipe
db.exec("DELETE FROM winners; DELETE FROM votes; DELETE FROM submissions; DELETE FROM users; DELETE FROM meta;");

// launch week = 2 weeks ago -> current week is week 3
const DAY = 86_400_000;
const WEEKDAYS = ["saturday","sunday","monday","tuesday","wednesday","thursday","friday"];
const parts = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Tehran", year: "numeric", month: "2-digit", day: "2-digit", weekday: "long",
}).formatToParts(new Date());
const get = (t) => parts.find((p) => p.type === t).value;
const dayStamp = Date.UTC(Number(get("year")), Number(get("month")) - 1, Number(get("day")));
const weekdayIdx = WEEKDAYS.indexOf(get("weekday").toLowerCase());
const currentWeekStart = dayStamp - weekdayIdx * DAY;
const launchWeekStart = currentWeekStart - 14 * DAY;
db.prepare("INSERT INTO meta (key, value) VALUES ('launch_week_start', ?)").run(String(launchWeekStart));

const hash = bcrypt.hashSync("Demo1234!", 10);
const users = [
  ["sara_pixels", "سارا نقاش", "sara#0001"],
  ["arman_art", "آرمان طراح", "arman#1385"],
  ["niloofar_ink", "نیلوفر", "niloo#7777"],
  ["kianoosh_gm", "کیانوش", "kian#2024"],
  ["mahsa_writes", "مهسا نویسنده", "mahsa#0912"],
  ["reza_thread", "رضا تردنویس", "reza#4242"],
  ["parisa_dev", "پریسا", "parisa#1010"],
  ["omid_layer", "امید", "omid#3333"],
];
const insUser = db.prepare(
  "INSERT INTO users (twitter_handle, display_name, discord_username, password_hash) VALUES (?, ?, ?, ?)"
);
const ids = {};
for (const [handle, name, discord] of users) {
  ids[handle] = Number(insUser.run(handle, name, discord, hash).lastInsertRowid);
}

const insSub = db.prepare(
  `INSERT INTO submissions (user_id, category, tweet_url, tweet_id, tweet_text, image_url, week_number)
   VALUES (?, ?, ?, ?, ?, ?, ?)`
);
const pic = (seed) => `https://picsum.photos/seed/${seed}/800/600`;
const tw = (h, id) => `https://x.com/${h}/status/${id}`;

const artTexts = [
  "فن‌آرت جدیدم برای GenLayer — قراردادهای هوشمندی که فکر می‌کنند 🧠✨",
  "طرح مفهومی از شبکه اعتبارسنج‌های GenLayer",
  "والپیپر اختصاصی جامعه فارسی GenLayer",
  "لوگوموشن دست‌ساز برای GenLayer",
  "پیکسل‌آرت: بلاکچینی که با هوش مصنوعی حرف می‌زند",
];
const textTexts = [
  "ترد کامل: GenLayer چیست و چرا Intelligent Contract آینده قراردادهاست؟ 🧵👇",
  "آموزش قدم‌به‌قدم نوشتن اولین قرارداد هوشمند در GenLayer",
  "مقایسه GenLayer با قراردادهای سنتی — چرا LLM داخل زنجیره همه‌چیز را عوض می‌کند",
  "خلاصه فارسی وایت‌پیپر GenLayer در ۱۰ توییت",
  "تجربه من از تست‌نت GenLayer — نکاتی که کاش زودتر می‌دانستم",
];

let tweetId = 1_000_000_000_000_000n;
const subIds = { 1: { art: [], text: [] }, 2: { art: [], text: [] }, 3: { art: [], text: [] } };
const artists = ["sara_pixels", "arman_art", "niloofar_ink", "kianoosh_gm"];
const writers = ["mahsa_writes", "reza_thread", "parisa_dev", "omid_layer"];

for (const week of [1, 2, 3]) {
  artists.forEach((h, i) => {
    tweetId += 7n;
    const id = insSub.run(
      ids[h], "art", tw(h, tweetId), String(tweetId),
      artTexts[(week + i) % artTexts.length], pic(`${h}-w${week}`), week
    ).lastInsertRowid;
    subIds[week].art.push(Number(id));
  });
  writers.forEach((h, i) => {
    tweetId += 7n;
    const id = insSub.run(
      ids[h], "text", tw(h, tweetId), String(tweetId),
      textTexts[(week + i) % textTexts.length], null, week
    ).lastInsertRowid;
    subIds[week].text.push(Number(id));
  });
}

// votes: weeks 1 & 2 (finalized later by the app), some on week 3 too
const insVote = db.prepare(
  "INSERT OR IGNORE INTO votes (user_id, submission_id, category, week_number) VALUES (?, ?, ?, ?)"
);
const allHandles = users.map((u) => u[0]);
function castVotes(week, category, distribution) {
  // distribution: array of [subIndex, voterHandles[]]
  for (const [subIdx, voters] of distribution) {
    for (const v of voters) {
      insVote.run(ids[v], subIds[week][category][subIdx], category, week);
    }
  }
}
castVotes(1, "art", [
  [0, ["mahsa_writes", "reza_thread", "parisa_dev", "omid_layer", "arman_art"]],
  [1, ["sara_pixels", "kianoosh_gm"]],
  [2, ["niloofar_ink"]],
]);
castVotes(1, "text", [
  [0, ["sara_pixels", "arman_art", "niloofar_ink", "reza_thread"]],
  [1, ["mahsa_writes", "kianoosh_gm", "omid_layer"]],
  [2, ["parisa_dev"]],
]);
castVotes(2, "art", [
  [1, ["mahsa_writes", "reza_thread", "parisa_dev", "sara_pixels"]],
  [2, ["arman_art", "omid_layer", "kianoosh_gm"]],
  [0, ["niloofar_ink"]],
]);
castVotes(2, "text", [
  [2, ["sara_pixels", "arman_art", "kianoosh_gm", "mahsa_writes", "omid_layer"]],
  [0, ["niloofar_ink", "reza_thread"]],
  [3, ["parisa_dev"]],
]);
castVotes(3, "art", [[0, ["mahsa_writes", "reza_thread"]], [1, ["parisa_dev"]]]);
castVotes(3, "text", [[0, ["sara_pixels"]], [1, ["arman_art", "niloofar_ink"]]]);

console.log("Seeded:", {
  users: allHandles.length,
  submissions: db.prepare("SELECT COUNT(*) c FROM submissions").get().c,
  votes: db.prepare("SELECT COUNT(*) c FROM votes").get().c,
});
