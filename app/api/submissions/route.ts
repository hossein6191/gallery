import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { getDb, currentWeekNumber, uploadsDir, type SubmissionRow } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { fetchTweet, isTweetUrl } from "@/lib/twitter";
import { currentWeekStartStamp } from "@/lib/week";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const week = searchParams.get("week");
  const mine = searchParams.get("mine");
  const db = getDb();

  const where: string[] = [];
  const params: (string | number)[] = [];
  if (category === "art" || category === "text" || category === "video") {
    where.push("s.category = ?");
    params.push(category);
  }
  if (week) {
    where.push("s.week_number = ?");
    params.push(Number(week));
  }
  if (mine === "1") {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ submissions: [] });
    where.push("s.user_id = ?");
    params.push(user.id);
  }

  const rows = db
    .prepare(
      `SELECT s.*, u.twitter_handle, u.display_name,
              (SELECT COUNT(*) FROM votes v WHERE v.submission_id = s.id) AS vote_count
       FROM submissions s
       JOIN users u ON u.id = s.user_id
       ${where.length ? "WHERE " + where.join(" AND ") : ""}
       ORDER BY s.created_at DESC
       LIMIT 200`
    )
    .all(...params) as SubmissionRow[];

  return NextResponse.json({ submissions: rows, currentWeek: currentWeekNumber() });
}

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB
const MAX_VIDEO_BYTES = 60 * 1024 * 1024; // 60MB

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "اول باید وارد حسابت بشی" }, { status: 401 });
  }

  // The submit form sends multipart form-data (tweet link + optional file);
  // plain JSON is still accepted for text-only submissions.
  let tweetUrl = "";
  let category = "";
  let file: File | null = null;

  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    tweetUrl = String(form.get("tweetUrl") ?? "").trim();
    category = String(form.get("category") ?? "");
    const f = form.get("file");
    if (f instanceof File && f.size > 0) file = f;
  } else {
    const body = await req.json().catch(() => null);
    tweetUrl = String(body?.tweetUrl ?? "").trim();
    category = String(body?.category ?? "");
  }

  if (!isTweetUrl(tweetUrl)) {
    return NextResponse.json(
      { error: "لینک توییت معتبر نیست — باید لینک یک پست از X/توییتر باشد" },
      { status: 400 }
    );
  }
  if (category !== "art" && category !== "text" && category !== "video") {
    return NextResponse.json({ error: "نوع پست را انتخاب کن" }, { status: 400 });
  }

  // art must come with the artwork file, video with the video file
  if (category === "art") {
    if (!file) {
      return NextResponse.json(
        { error: "برای بخش هنری باید فایل اثرت را هم آپلود کنی" },
        { status: 400 }
      );
    }
    if (!IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "فایل اثر باید تصویر باشد (JPG، PNG، WebP یا GIF)" },
        { status: 400 }
      );
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: "حجم تصویر حداکثر ۸ مگابایت است" }, { status: 400 });
    }
  }
  if (category === "video") {
    if (!file) {
      return NextResponse.json(
        { error: "برای بخش ویدیو باید فایل ویدیوت را آپلود کنی" },
        { status: 400 }
      );
    }
    if (!VIDEO_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "فایل ویدیو باید MP4، WebM یا MOV باشد" },
        { status: 400 }
      );
    }
    if (file.size > MAX_VIDEO_BYTES) {
      return NextResponse.json({ error: "حجم ویدیو حداکثر ۶۰ مگابایت است" }, { status: 400 });
    }
  }

  const db = getDb();
  const dup = db
    .prepare("SELECT id FROM submissions WHERE tweet_url = ? AND user_id = ?")
    .get(tweetUrl, user.id);
  if (dup) {
    return NextResponse.json({ error: "این توییت را قبلاً ثبت کرده‌ای" }, { status: 409 });
  }

  const fetched = await fetchTweet(tweetUrl);
  const tweetId = tweetUrl.match(/status(?:es)?\/(\d+)/)?.[1] ?? null;

  // Contest eligibility: only tweets posted during the current (Tehran) week
  // enter this week's voting. Older tweets still live in the gallery.
  // If the tweet date can't be determined, be lenient and allow it in.
  let weekNumber = currentWeekNumber();
  let inContest = true;
  if (fetched?.createdAt) {
    const tweetTime = new Date(fetched.createdAt).getTime();
    if (!Number.isNaN(tweetTime) && tweetTime < currentWeekStartStamp()) {
      weekNumber = 0;
      inContest = false;
    }
  }
  // Video section has no weekly contest yet.
  if (category === "video") {
    weekNumber = 0;
    inContest = false;
  }

  let fileUrl: string | null = null;
  let fileType: "image" | "video" | null = null;
  if (file) {
    const ext = EXT_BY_TYPE[file.type] ?? "bin";
    const name = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(path.join(uploadsDir(), name), buffer);
    fileUrl = `/api/uploads/${name}`;
    fileType = file.type.startsWith("video/") ? "video" : "image";
  }

  const result = db
    .prepare(
      `INSERT INTO submissions
        (user_id, category, tweet_url, tweet_id, tweet_text, image_url,
         file_url, file_type, tweet_date, week_number)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      user.id,
      category,
      tweetUrl,
      tweetId,
      fetched?.text ?? null,
      fetched?.imageUrl ?? null,
      fileUrl,
      fileType,
      fetched?.createdAt ?? null,
      weekNumber
    );

  return NextResponse.json({ id: Number(result.lastInsertRowid), inContest });
}
