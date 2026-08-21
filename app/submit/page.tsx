"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import confetti from "canvas-confetti";
import { LiquidButton } from "@/components/ui/liquid-glass-button";
import { AnimatedCircularProgressBar } from "@/components/ui/animated-circular-progress-bar";
import { cn } from "@/lib/utils";
import { Palette, FileText, LinkIcon, CheckCircle2 } from "lucide-react";

type Phase = "form" | "category" | "saving" | "done";

export default function SubmitPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  const [tweetUrl, setTweetUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [category, setCategory] = useState<"art" | "text" | null>(null);
  const [phase, setPhase] = useState<Phase>("form");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const urlValid = /(?:twitter\.com|x\.com)\/[^/]+\/status(?:es)?\/\d+/i.test(tweetUrl);

  const startSave = async (chosen: "art" | "text") => {
    setCategory(chosen);
    setPhase("saving");
    setError("");
    setProgress(10);

    // Crawl the ring forward while the server fetches & stores the tweet.
    progressTimer.current = setInterval(() => {
      setProgress((p) => (p < 85 ? p + 5 : p));
    }, 250);

    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tweetUrl: tweetUrl.trim(), category: chosen, imageUrl }),
      });
      const data = await res.json();
      if (progressTimer.current) clearInterval(progressTimer.current);
      if (!res.ok) {
        setError(data.error ?? "خطایی رخ داد");
        setPhase("category");
        setProgress(0);
        return;
      }
      setProgress(100);
      setTimeout(() => {
        setPhase("done");
        confetti({ particleCount: 100, spread: 80, origin: { y: 0.7 } });
      }, 900);
    } catch {
      if (progressTimer.current) clearInterval(progressTimer.current);
      setError("ارتباط با سرور برقرار نشد");
      setPhase("category");
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
        <AnimatePresence mode="wait">
          {phase === "form" && (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col gap-4"
            >
              <h1 className="text-2xl font-black text-center">ثبت پست جدید</h1>
              <p className="text-muted-foreground text-sm text-center leading-7">
                لینک توییتت را وارد کن؛ در مرحله بعد می‌پرسیم هنری است یا متنی.
              </p>
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
              <label className="text-sm font-medium mt-2">
                لینک تصویر اثر <span className="text-muted-foreground">(اختیاری — برای بخش هنری)</span>
              </label>
              <input
                dir="ltr"
                className="glass-input text-left"
                placeholder="https://..."
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />
              <LiquidButton
                variant="primary"
                className="mt-3 w-full"
                disabled={!urlValid}
                onClick={() => setPhase("category")}
              >
                ادامه
              </LiquidButton>
            </motion.div>
          )}

          {phase === "category" && (
            <motion.div
              key="category"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col gap-6"
            >
              <h1 className="text-xl font-black text-center">
                این پست در کدام بخش شرکت می‌کند؟
              </h1>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => startSave("art")}
                  className={cn(
                    "glass-panel p-6 flex flex-col items-center gap-3 cursor-pointer",
                    "hover:border-pink-400/50 hover:-translate-y-1 transition-all duration-300"
                  )}
                >
                  <span className="flex items-center justify-center w-14 h-14 rounded-2xl bg-pink-500/15 text-pink-400">
                    <Palette size={26} />
                  </span>
                  <span className="font-bold">اثر هنری</span>
                  <span className="text-muted-foreground text-xs text-center leading-6">
                    نقاشی، طراحی، فن‌آرت و هر اثر تصویری
                  </span>
                </button>
                <button
                  onClick={() => startSave("text")}
                  className={cn(
                    "glass-panel p-6 flex flex-col items-center gap-3 cursor-pointer",
                    "hover:border-cyan-400/50 hover:-translate-y-1 transition-all duration-300"
                  )}
                >
                  <span className="flex items-center justify-center w-14 h-14 rounded-2xl bg-cyan-500/15 text-cyan-400">
                    <FileText size={26} />
                  </span>
                  <span className="font-bold">محتوای متنی</span>
                  <span className="text-muted-foreground text-xs text-center leading-6">
                    ترد، مقاله، آموزش و هر محتوای نوشتاری
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
            </motion.div>
          )}

          {phase === "saving" && (
            <motion.div
              key="saving"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-6 py-8"
            >
              <AnimatedCircularProgressBar
                max={100}
                min={0}
                value={progress}
                gaugePrimaryColor="var(--primary)"
                gaugeSecondaryColor="rgba(255,255,255,0.08)"
              />
              <p className="text-muted-foreground text-sm">
                در حال دریافت و ذخیره پست...
              </p>
            </motion.div>
          )}

          {phase === "done" && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-5 py-8 text-center"
            >
              <CheckCircle2 size={56} className="text-emerald-400" />
              <h2 className="text-xl font-black">پستت ثبت شد!</h2>
              <p className="text-muted-foreground text-sm leading-7">
                پست تو در بخش {category === "art" ? "هنری" : "متنی"} این هفته شرکت
                داده شد. اگر لینک را اشتباه گذاشتی، از پروفایلت می‌توانی اصلاحش کنی.
              </p>
              <div className="flex gap-2">
                <LiquidButton variant="primary" onClick={() => router.push("/profile")}>
                  مشاهده پروفایل
                </LiquidButton>
                <LiquidButton
                  onClick={() => {
                    setTweetUrl("");
                    setImageUrl("");
                    setCategory(null);
                    setProgress(0);
                    setPhase("form");
                  }}
                >
                  ثبت پست دیگر
                </LiquidButton>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
