"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";
import { LiquidButton } from "@/components/ui/liquid-glass-button";
import PasswordStrength from "@/components/ui/password-strength";
import { avatarUrl, normalizeHandle } from "@/lib/utils";
import { ArrowLeft, ArrowRight, AtSign, Eye, EyeOff, Loader2, MessageSquare } from "lucide-react";

const steps = ["twitter", "discord", "password"] as const;
type Step = (typeof steps)[number];

/** Browsers autofill (and restore on back-navigation) without firing React
 *  events, so mirror the DOM value into state a few times after mount. */
function useAutofillSync(
  ref: React.RefObject<HTMLInputElement | null>,
  set: (v: string) => void
) {
  useEffect(() => {
    const sync = () => {
      const v = ref.current?.value ?? "";
      if (v) set(v);
    };
    const timers = [80, 400, 1200].map((ms) => setTimeout(sync, ms));
    return () => timers.forEach(clearTimeout);
  }, [ref, set]);
}

export default function SignupPage() {
  const [step, setStep] = useState<Step>("twitter");
  const [twitterHandle, setTwitterHandle] = useState("");
  const [password, setPassword] = useState("");
  // values kept across steps (each step's inputs unmount when it leaves)
  const [saved, setSaved] = useState({
    handle: "",
    name: "",
    discord: "",
    password: "",
    confirm: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const discordRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);

  useAutofillSync(handleRef, setTwitterHandle);
  useAutofillSync(passwordRef, setPassword);

  const handle = normalizeHandle(twitterHandle);

  /** Read whatever is in the inputs right now (autofill included) and keep it. */
  const readInputs = useCallback(() => {
    const values = {
      handle: handleRef.current?.value ?? saved.handle,
      name: nameRef.current?.value ?? saved.name,
      discord: discordRef.current?.value ?? saved.discord,
      password: passwordRef.current?.value ?? saved.password,
      confirm: confirmRef.current?.value ?? saved.confirm,
    };
    setSaved(values);
    return values;
  }, [saved]);

  const go = (next: Step) => {
    readInputs();
    setError("");
    setStep(next);
  };

  const next = () => {
    const values = readInputs();
    if (step === "twitter") {
      const h = normalizeHandle(values.handle);
      if (!/^[A-Za-z0-9_]{1,15}$/.test(h)) {
        setError("یوزرنیم توییترت را درست وارد کن (فقط حروف انگلیسی، عدد و _)");
        return;
      }
      if (!values.name.trim()) {
        setError("اسم نمایشی‌ات را وارد کن");
        return;
      }
      go("discord");
      return;
    }
    if (step === "discord") {
      if (values.discord.trim().length < 2) {
        setError("یوزرنیم دیسکوردت را وارد کن");
        return;
      }
      go("password");
    }
  };

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (loading) return;
    if (step !== "password") {
      next();
      return;
    }
    const values = readInputs();
    const pass = values.password;
    const confirm = values.confirm;
    if (pass.length < 8) {
      setError("رمز عبور باید حداقل ۸ کاراکتر باشد");
      return;
    }
    if (pass !== confirm) {
      setError("رمز عبور و تکرارش یکی نیستند");
      return;
    }

    setLoading(true);
    setError("");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25000);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          twitterHandle: normalizeHandle(values.handle),
          displayName: values.name.trim(),
          discordUsername: values.discord.trim(),
          password: pass,
        }),
        signal: controller.signal,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "خطایی رخ داد");
        setLoading(false);
        return;
      }
      try {
        confetti({ particleCount: 120, spread: 90, origin: { y: 0.7 } });
      } catch {
        // confetti is decoration; never let it block the redirect
      }
      // hard navigation so a stuck client router can't trap the spinner
      // deliberate full page load: router.push could leave the button
      // spinning on mobile browsers, which is the bug this replaces
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      setTimeout(() => window.location.assign("/profile"), 700);
    } catch (err) {
      setError(
        err instanceof DOMException && err.name === "AbortError"
          ? "سرور جواب نداد — اینترنتت را چک کن و دوباره امتحان کن"
          : "ارتباط با سرور برقرار نشد"
      );
      setLoading(false);
    } finally {
      clearTimeout(timer);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center py-12">
      <div className="glass-panel w-full max-w-md p-6 sm:p-8">
        <div className="text-center mb-8">
          <h1 className="font-nastaliq text-2xl font-black">عضویت در گالری</h1>
          <p className="text-muted-foreground text-sm mt-2 leading-7">
            چون جامعه غیررسمی است، با یوزرنیم توییتر و دیسکوردت ثبت‌نام می‌کنی و
            یک رمز عبور می‌سازی تا بعداً بتوانی وارد پروفایلت شوی.
          </p>
        </div>

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

        <form onSubmit={submit}>
          {step === "twitter" && (
            <div key="twitter" className="animate-step flex flex-col gap-4">
                <label htmlFor="su-handle" className="text-sm font-medium">
                  یوزرنیم توییتر (X)
                </label>
                <div className="relative">
                  <AtSign
                    size={16}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                  />
                  <input
                    id="su-handle"
                    ref={handleRef}
                    name="username"
                    autoComplete="username"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    enterKeyHint="next"
                    dir="ltr"
                    className="glass-input pr-11 text-left"
                    placeholder="username"
                    defaultValue={saved.handle}
                    onChange={(e) => {
                      setTwitterHandle(e.target.value);
                      if (error) setError("");
                    }}
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
                <label htmlFor="su-name" className="text-sm font-medium mt-2">
                  اسم نمایشی
                </label>
                <input
                  id="su-name"
                  ref={nameRef}
                  name="name"
                  autoComplete="name"
                  enterKeyHint="next"
                  className="glass-input"
                  placeholder="اسمی که در گالری نشان داده می‌شود"
                  defaultValue={saved.name}
                  onChange={() => error && setError("")}
                />
                <LiquidButton type="submit" variant="primary" className="mt-2 w-full">
                  ادامه
                  <ArrowLeft size={16} />
                </LiquidButton>
            </div>
          )}

          {step === "discord" && (
            <div key="discord" className="animate-step flex flex-col gap-4">
                <label htmlFor="su-discord" className="text-sm font-medium">
                  یوزرنیم دیسکورد
                </label>
                <div className="relative">
                  <MessageSquare
                    size={16}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                  />
                  <input
                    id="su-discord"
                    ref={discordRef}
                    name="discord"
                    autoComplete="nickname"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    enterKeyHint="next"
                    dir="ltr"
                    className="glass-input pr-11 text-left"
                    placeholder="discord_username"
                    defaultValue={saved.discord}
                    onChange={() => error && setError("")}
                  />
                </div>
                <div className="flex gap-2 mt-2">
                  <LiquidButton type="button" className="flex-1" onClick={() => go("twitter")}>
                    <ArrowRight size={16} />
                    بازگشت
                  </LiquidButton>
                  <LiquidButton type="submit" variant="primary" className="flex-1">
                    ادامه
                    <ArrowLeft size={16} />
                  </LiquidButton>
                </div>
            </div>
          )}

          {step === "password" && (
            <div key="password" className="animate-step flex flex-col gap-4">
                <label htmlFor="su-password" className="text-sm font-medium">
                  یک رمز عبور بساز
                </label>
                <div className="relative">
                  <input
                    id="su-password"
                    ref={passwordRef}
                    name="new-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    enterKeyHint="next"
                    dir="ltr"
                    className="glass-input pl-11 text-left"
                    placeholder="********"
                    defaultValue={saved.password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError("");
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                    aria-label="نمایش رمز"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <PasswordStrength value={password} />
                <label htmlFor="su-confirm" className="text-sm font-medium">
                  تکرار رمز عبور
                </label>
                <input
                  id="su-confirm"
                  ref={confirmRef}
                  name="confirm-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  enterKeyHint="done"
                  dir="ltr"
                  className="glass-input text-left"
                  placeholder="********"
                  defaultValue={saved.confirm}
                  onChange={() => error && setError("")}
                />
                <div className="flex gap-2 mt-2">
                  <LiquidButton
                    type="button"
                    className="flex-1"
                    disabled={loading}
                    onClick={() => go("discord")}
                  >
                    <ArrowRight size={16} />
                    بازگشت
                  </LiquidButton>
                  <LiquidButton
                    type="submit"
                    variant="primary"
                    className="flex-1"
                    disabled={loading}
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
            </div>
          )}
        </form>

        {error && <p className="mt-4 text-center text-sm text-destructive">{error}</p>}

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
