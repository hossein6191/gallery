"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import confetti from "canvas-confetti";
import { LiquidButton } from "@/components/ui/liquid-glass-button";
import PasswordStrength from "@/components/ui/password-strength";
import { avatarUrl, normalizeHandle } from "@/lib/utils";
import { ArrowLeft, ArrowRight, AtSign, Eye, EyeOff, Loader2, MessageSquare } from "lucide-react";

const steps = ["twitter", "discord", "password"] as const;
type Step = (typeof steps)[number];

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("twitter");
  const [twitterHandle, setTwitterHandle] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [discordUsername, setDiscordUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handle = normalizeHandle(twitterHandle);
  const twitterValid = /^[A-Za-z0-9_]{1,15}$/.test(handle) && displayName.trim().length > 0;
  const discordValid = discordUsername.trim().length >= 2;
  const passwordValid = password.length >= 8;

  const next = () => {
    setError("");
    if (step === "twitter" && twitterValid) setStep("discord");
    else if (step === "discord" && discordValid) setStep("password");
  };

  const back = () => {
    setError("");
    if (step === "discord") setStep("twitter");
    else if (step === "password") setStep("discord");
  };

  const submit = async () => {
    if (!passwordValid) return;
    if (password !== confirm) {
      setError("رمز عبور و تکرارش یکی نیستند");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          twitterHandle: handle,
          displayName: displayName.trim(),
          discordUsername: discordUsername.trim(),
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "خطایی رخ داد");
        setLoading(false);
        return;
      }
      confetti({ particleCount: 120, spread: 90, origin: { y: 0.7 } });
      setTimeout(() => {
        router.push("/profile");
        router.refresh();
      }, 900);
    } catch {
      setError("ارتباط با سرور برقرار نشد");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center py-12">
      <div className="glass-panel w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black">عضویت در گالری</h1>
          <p className="text-muted-foreground text-sm mt-2 leading-7">
            چون جامعه غیررسمی است، با یوزرنیم توییتر و دیسکوردت ثبت‌نام می‌کنی و
            یک رمز عبور می‌سازی تا بعداً بتوانی وارد پروفایلت شوی.
          </p>
        </div>

        {/* step dots */}
        <div className="flex justify-center gap-2 mb-8">
          {steps.map((s) => (
            <span
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                s === step ? "w-8 bg-primary" : "w-3 bg-white/15"
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === "twitter" && (
            <motion.div
              key="twitter"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col gap-4"
            >
              <label className="text-sm font-medium">یوزرنیم توییتر (X)</label>
              <div className="relative">
                <AtSign
                  size={16}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  dir="ltr"
                  className="glass-input pr-11 text-left"
                  placeholder="username"
                  value={twitterHandle}
                  onChange={(e) => setTwitterHandle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && next()}
                />
              </div>
              {handle && (
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={avatarUrl(handle)}
                    alt=""
                    className="w-9 h-9 rounded-full object-cover border border-white/15 bg-muted"
                  />
                  <span dir="ltr">@{handle}</span>
                </div>
              )}
              <label className="text-sm font-medium mt-2">اسم نمایشی</label>
              <input
                className="glass-input"
                placeholder="اسمی که در گالری نشان داده می‌شود"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && next()}
              />
              <LiquidButton
                variant="primary"
                className="mt-2 w-full"
                disabled={!twitterValid}
                onClick={next}
              >
                ادامه
                <ArrowLeft size={16} />
              </LiquidButton>
            </motion.div>
          )}

          {step === "discord" && (
            <motion.div
              key="discord"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col gap-4"
            >
              <label className="text-sm font-medium">یوزرنیم دیسکورد</label>
              <div className="relative">
                <MessageSquare
                  size={16}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  dir="ltr"
                  className="glass-input pr-11 text-left"
                  placeholder="discord_username"
                  value={discordUsername}
                  onChange={(e) => setDiscordUsername(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && next()}
                />
              </div>
              <div className="flex gap-2 mt-2">
                <LiquidButton className="flex-1" onClick={back}>
                  <ArrowRight size={16} />
                  بازگشت
                </LiquidButton>
                <LiquidButton
                  variant="primary"
                  className="flex-1"
                  disabled={!discordValid}
                  onClick={next}
                >
                  ادامه
                  <ArrowLeft size={16} />
                </LiquidButton>
              </div>
            </motion.div>
          )}

          {step === "password" && (
            <motion.div
              key="password"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col gap-4"
            >
              <label className="text-sm font-medium">یک رمز عبور بساز</label>
              <div className="relative">
                <input
                  dir="ltr"
                  type={showPassword ? "text" : "password"}
                  className="glass-input pl-11 text-left"
                  placeholder="********"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="نمایش رمز"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <PasswordStrength value={password} />
              <label className="text-sm font-medium">تکرار رمز عبور</label>
              <input
                dir="ltr"
                type={showPassword ? "text" : "password"}
                className="glass-input text-left"
                placeholder="********"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
              />
              <div className="flex gap-2 mt-2">
                <LiquidButton className="flex-1" onClick={back} disabled={loading}>
                  <ArrowRight size={16} />
                  بازگشت
                </LiquidButton>
                <LiquidButton
                  variant="primary"
                  className="flex-1"
                  disabled={!passwordValid || loading}
                  onClick={submit}
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      در حال ساخت حساب...
                    </>
                  ) : (
                    "ثبت‌نام"
                  )}
                </LiquidButton>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <p className="mt-4 text-center text-sm text-destructive">{error}</p>
        )}

        <p className="mt-8 text-center text-sm text-muted-foreground">
          قبلاً عضو شدی؟{" "}
          <Link href="/login" className="text-primary hover:underline">
            وارد شو
          </Link>
        </p>
      </div>
    </div>
  );
}
