"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import confetti from "canvas-confetti";
import { LiquidButton } from "@/components/ui/liquid-glass-button";
import { AnimatedCircularProgressBar } from "@/components/ui/animated-circular-progress-bar";
import { cn, faNum } from "@/lib/utils";
import { MAX_IMAGE_BYTES, MAX_IMAGE_MB, MAX_VIDEO_BYTES, MAX_VIDEO_MB } from "@/lib/limits";
import {
  Palette,
  FileText,
  Clapperboard,
  LinkIcon,
  CheckCircle2,
  Upload,
  CalendarClock,
} from "lucide-react";

type Category = "art" | "text" | "video";
type Phase = "form" | "category" | "file" | "saving" | "done";

const CATEGORY_INFO: Record<Category, { label: string; accept: string; fileLabel: string }> = {
  art: { label: "هنری", accept: "image/jpeg,image/png,image/webp,image/gif", fileLabel: `فایل اثرت (تصویر، حداکثر ${faNum(MAX_IMAGE_MB)} مگابایت)` },
  text: { label: "متنی", accept: "", fileLabel: "" },
  video: { label: "ویدیویی", accept: "video/mp4,video/webm,video/quicktime", fileLabel: `فایل ویدیوت (MP4/WebM/MOV، حداکثر ${faNum(MAX_VIDEO_MB)} مگابایت)` },
};

export default function SubmitPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  const [tweetUrl, setTweetUrl] = useState("");
  const [category, setCategory] = useState<Category | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>("form");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [inContest, setInContest] = useState(true);
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setLoggedIn(Boolean(d.user)))
      .finally(() => setAuthChecked(true));
  }, []);

  useEffect(() => {
    return () => {
      if (progressTimer.current) clearInterval(progressTimer.current);
    };
  }, []);

  // object URL for the image preview, revoked when the file changes
  const previewUrl = useMemo(
    () => (file && file.type.startsWith("image/") ? URL.createObjectURL(file) : null),
    [file]
  );
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const urlValid = /(?:twitter\.com|x\.com)\/[^/]+\/status(?:es)?\/\d+/i.test(tweetUrl);

  const chooseCategory = (chosen: Category) => {
    setCategory(chosen);
    setFile(null);
    setError("");
    // Text and video need only the link: the video is read from the tweet.
    // The file step is reached for art, or when the server could not find a
    // video in the tweet and asks for one.
    if (chosen === "text" || chosen === "video") {
      startSave(chosen, null);
    } else {
      setPhase("file");
    }
  };

  const startSave = async (chosen: Category, chosenFile: File | null) => {
    setPhase("saving");
    setError("");
    setProgress(10);

    progressTimer.current = setInterval(() => {
      setProgress((p) => (p < 85 ? p + 5 : p));
    }, 300);

    try {
      const form = new FormData();
      form.append("tweetUrl", tweetUrl.trim());
      form.append("category", chosen);
      if (chosenFile) form.append("file", chosenFile);

      const res = await fetch("/api/submissions", { method: "POST", body: form });
      const data = await res.json();
      if (progressTimer.current) clearInterval(progressTimer.current);
      if (!res.ok) {
        setError(data.error ?? "خطایی رخ داد");
        setPhase(data.needsFile ? "file" : chosen === "art" ? "file" : "category");
        setProgress(0);
        return;
      }
      setInContest(Boolean(data.inContest));
      setProgress(100);
      setTimeout(() => {
        setPhase("done");
        confetti({ particleCount: 100, spread: 80, origin: { y: 0.7 } });
      }, 900);
    } catch {
      if (progressTimer.current) clearInterval(progressTimer.current);
      setError("ارتباط با سرور برقرار نشد");
      setPhase(chosen === "text" ? "category" : "file");
      setProgress(0);
    }
  };

  if (!authChecked) return null;

  if (!loggedIn) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="glass-panel max-w-md w-full p-8 text-center flex flex-col items-center gap-4">
          <h1 className="text-xl font-bold">برای ثبت پست باید وارد شوی</h1>
          <p className="text-muted-foreground text-sm leading-7">
            پست‌ها به پروفایل اعضا وصل می‌شوند تا در مسابقه هفتگی شرکت کنند.
          </p>
          <div className="flex gap-2">
            <LiquidButton variant="primary" asChild>
              <Link href="/login">ورود</Link>
            </LiquidButton>
            <LiquidButton asChild>
              <Link href="/signup">ثبت‌نام</Link>
            </LiquidButton>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center py-12">
      <div className="glass-panel w-full max-w-lg p-8">
          {phase === "form" && (
            <div key="form" className="animate-step flex flex-col gap-4">
              <h1 className="font-nastaliq text-2xl font-black text-center">ثبت پست جدید</h1>
              <p className="text-muted-foreground text-sm text-center leading-7">
                لینک توییتت را وارد کن؛ در مرحله بعد بخشش را انتخاب می‌کنی.
              </p>
              <div className="flex items-start gap-2 rounded-xl bg-primary/10 border border-primary/25 p-3 text-xs leading-6 text-foreground/80">
                <CalendarClock size={15} className="text-primary shrink-0 mt-0.5" />
                <span>
                  <b>پست‌های جدیدت را ثبت کن!</b> تاریخ توییت بررسی می‌شود — فقط
                  توییت‌هایی که حداکثر <b>۷ روز</b> قدمت دارند وارد رای‌گیری این
                  هفته می‌شوند. پست‌های قدیمی‌تر هم ثبت می‌شوند ولی فقط در گالری
                  نمایش داده می‌شوند.
                </span>
              </div>
              <label className="text-sm font-medium mt-2">لینک توییت</label>
              <div className="relative">
                <LinkIcon
                  size={16}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  dir="ltr"
                  className="glass-input pr-11 text-left"
                  placeholder="https://x.com/username/status/..."
                  value={tweetUrl}
                  onChange={(e) => setTweetUrl(e.target.value)}
                />
              </div>
              {tweetUrl && !urlValid && (
                <p className="text-xs text-amber-400">
                  لینک باید شکل x.com/کاربر/status/شماره داشته باشد
                </p>
              )}
              <LiquidButton
                variant="primary"
                className="mt-3 w-full"
                disabled={!urlValid}
                onClick={() => setPhase("category")}
              >
                ادامه
              </LiquidButton>
            </div>
          )}

          {phase === "category" && (
            <div key="category" className="animate-step flex flex-col gap-6">
              <h1 className="text-xl font-black text-center">
                این پست در کدام بخش شرکت می‌کند؟
              </h1>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={() => chooseCategory("art")}
                  className={cn(
                    "glass-panel p-5 flex flex-col items-center gap-2 cursor-pointer",
                    "hover:border-pink-400/50 hover:-translate-y-1 transition-all duration-300"
                  )}
                >
                  <span className="flex items-center justify-center w-12 h-12 rounded-2xl bg-pink-500/15 text-pink-400">
                    <Palette size={24} />
                  </span>
                  <span className="font-bold text-sm">اثر هنری</span>
                  <span className="text-muted-foreground text-[11px] text-center leading-5">
                    توییت + آپلود فایل اثر
                  </span>
                </button>
                <button
                  onClick={() => chooseCategory("text")}
                  className={cn(
                    "glass-panel p-5 flex flex-col items-center gap-2 cursor-pointer",
                    "hover:border-cyan-400/50 hover:-translate-y-1 transition-all duration-300"
                  )}
                >
                  <span className="flex items-center justify-center w-12 h-12 rounded-2xl bg-cyan-500/15 text-cyan-400">
                    <FileText size={24} />
                  </span>
                  <span className="font-bold text-sm">محتوای متنی</span>
                  <span className="text-muted-foreground text-[11px] text-center leading-5">
                    فقط لینک توییت کافیست
                  </span>
                </button>
                <button
                  onClick={() => chooseCategory("video")}
                  className={cn(
                    "glass-panel p-5 flex flex-col items-center gap-2 cursor-pointer",
                    "hover:border-violet-400/50 hover:-translate-y-1 transition-all duration-300"
                  )}
                >
                  <span className="flex items-center justify-center w-12 h-12 rounded-2xl bg-violet-500/15 text-violet-400">
                    <Clapperboard size={24} />
                  </span>
                  <span className="font-bold text-sm">ویدیویی</span>
                  <span className="text-muted-foreground text-[11px] text-center leading-5">
                    فقط لینک توییت کافیست — ویدیو از خود توییت خوانده می‌شود
                  </span>
                </button>
              </div>
              {error && <p className="text-center text-sm text-destructive">{error}</p>}
              <button
                onClick={() => setPhase("form")}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors mx-auto"
              >
                بازگشت و ویرایش لینک
              </button>
            </div>
          )}

          {phase === "file" && category && category !== "text" && (
            <div key="file" className="animate-step flex flex-col gap-4">
              <h1 className="text-xl font-black text-center">
                {category === "art"
                  ? "فایل اثرت را آپلود کن"
                  : "ویدیویی در توییت پیدا نشد — فایلش را آپلود کن"}
              </h1>
              <p className="text-muted-foreground text-sm text-center leading-7">
                {CATEGORY_INFO[category].fileLabel}
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept={CATEGORY_INFO[category].accept}
                className="hidden"
                onChange={(e) => {
                  const picked = e.target.files?.[0] ?? null;
                  // Refuse here, before a quarter-gigabyte leaves the phone only
                  // to be refused by the server with the same words.
                  const cap = category === "video" ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
                  const capMb = category === "video" ? MAX_VIDEO_MB : MAX_IMAGE_MB;
                  if (picked && picked.size > cap) {
                    setError(
                      `این فایل ${faNum(Math.ceil(picked.size / (1024 * 1024)))} مگابایت است؛ حداکثر ${faNum(capMb)} مگابایت`
                    );
                    setFile(null);
                    e.target.value = "";
                    return;
                  }
                  setError("");
                  setFile(picked);
                }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "glass-panel border-dashed p-8 flex flex-col items-center gap-3 cursor-pointer",
                  "hover:border-primary/50 transition-colors"
                )}
              >
                <Upload size={28} className="text-primary" />
                {file ? (
                  <span className="text-sm font-bold break-all text-center" dir="ltr">
                    {file.name}
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    برای انتخاب فایل کلیک کن
                  </span>
                )}
              </button>
              {previewUrl && category === "art" && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt="پیش‌نمایش اثر"
                  className="rounded-xl max-h-56 object-contain mx-auto"
                />
              )}
              {error && <p className="text-center text-sm text-destructive">{error}</p>}
              <div className="flex gap-2 mt-2">
                <LiquidButton className="flex-1" onClick={() => setPhase("category")}>
                  بازگشت
                </LiquidButton>
                <LiquidButton
                  variant="primary"
                  className="flex-1"
                  disabled={!file}
                  onClick={() => file && startSave(category, file)}
                >
                  ثبت پست
                </LiquidButton>
              </div>
            </div>
          )}

          {phase === "saving" && (
            <div key="saving" className="animate-step flex flex-col items-center gap-6 py-8">
              <AnimatedCircularProgressBar
                max={100}
                min={0}
                value={progress}
                gaugePrimaryColor="var(--primary)"
                gaugeSecondaryColor="rgba(255,255,255,0.08)"
              />
              <p className="text-muted-foreground text-sm">
                در حال آپلود و ذخیره پست...
              </p>
            </div>
          )}

          {phase === "done" && (
            <div key="done" className="animate-step flex flex-col items-center gap-5 py-8 text-center">
              <CheckCircle2 size={56} className="text-emerald-400" />
              <h2 className="text-xl font-black">پستت ثبت شد!</h2>
              {inContest ? (
                <p className="text-muted-foreground text-sm leading-7">
                  پست تو در بخش{" "}
                  {category === "art" ? "هنری" : category === "video" ? "ویدیویی" : "متنی"}{" "}
                  <b className="text-emerald-400">وارد رای‌گیری این هفته شد</b>. اگر
                  لینک را اشتباه گذاشتی، از پروفایلت اصلاحش کن.
                </p>
              ) : (
                <p className="text-muted-foreground text-sm leading-7">
                  پستت در گالری ثبت شد، ولی چون توییتش مال قبل از این هفته است،
                  <b className="text-amber-400"> وارد رای‌گیری این هفته نمی‌شود</b>.
                  برای مسابقه، پست جدید همین هفته‌ات را ثبت کن.
                </p>
              )}
              <div className="flex gap-2">
                <LiquidButton variant="primary" onClick={() => router.push("/profile")}>
                  مشاهده پروفایل
                </LiquidButton>
                <LiquidButton
                  onClick={() => {
                    setTweetUrl("");
                    setCategory(null);
                    setFile(null);
                    setProgress(0);
                    setPhase("form");
                  }}
                >
                  ثبت پست دیگر
                </LiquidButton>
              </div>
            </div>
          )}
      </div>
    </div>
  );
}
