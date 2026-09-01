"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LiquidButton } from "@/components/ui/liquid-glass-button";
import { AtSign, Eye, EyeOff, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const handleRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  // Some mobile browsers restore/autofill the fields without firing React
  // events, so values are always read straight from the inputs on submit.
  useEffect(() => {
    handleRef.current?.focus({ preventScroll: true });
  }, []);

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (loading) return;

    const twitterHandle = handleRef.current?.value.trim() ?? "";
    const password = passwordRef.current?.value ?? "";
    if (!twitterHandle || !password) {
      setError("یوزرنیم توییتر و رمز عبورت را وارد کن");
      return;
    }

    setLoading(true);
    setError("");

    // never leave the button spinning if the network stalls
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25000);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ twitterHandle, password }),
        signal: controller.signal,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "خطایی رخ داد");
        setLoading(false);
        return;
      }
      // full page load: the session cookie is guaranteed to be in effect and
      // no client-side router quirk can leave the button stuck
      // deliberate full page load: router.push could leave the button
      // spinning on mobile browsers, which is the bug this replaces
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/profile");
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
          <h1 className="font-nastaliq text-2xl font-black">ورود به گالری</h1>
          <p className="text-muted-foreground text-sm mt-2">
            با یوزرنیم توییتر و رمز عبورت وارد شو
          </p>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-4">
          <label htmlFor="login-handle" className="text-sm font-medium">
            یوزرنیم توییتر (X)
          </label>
          <div className="relative">
            <AtSign
              size={16}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
            <input
              id="login-handle"
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
              onChange={() => error && setError("")}
            />
          </div>

          <label htmlFor="login-password" className="text-sm font-medium">
            رمز عبور
          </label>
          <div className="relative">
            <input
              id="login-password"
              ref={passwordRef}
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              enterKeyHint="go"
              dir="ltr"
              className="glass-input pl-11 text-left"
              placeholder="********"
              onChange={() => error && setError("")}
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

          {/* Only `loading` disables it — a disabled-by-validation button looks
              broken when the browser autofills the fields. */}
          <LiquidButton type="submit" variant="primary" className="mt-2 w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                در حال ورود...
              </>
            ) : (
              "ورود"
            )}
          </LiquidButton>
        </form>

        {error && <p className="mt-4 text-center text-sm text-destructive">{error}</p>}

        <p className="mt-8 text-center text-sm text-muted-foreground">
          هنوز عضو نشدی؟{" "}
          <Link href="/signup" className="text-primary hover:underline">
            ثبت‌نام کن
          </Link>
        </p>
      </div>
    </div>
  );
}
