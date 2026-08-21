"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LiquidButton } from "@/components/ui/liquid-glass-button";
import { AtSign, Eye, EyeOff, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [twitterHandle, setTwitterHandle] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!twitterHandle || !password) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ twitterHandle, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "خطایی رخ داد");
        setLoading(false);
        return;
      }
      router.push("/profile");
      router.refresh();
    } catch {
      setError("ارتباط با سرور برقرار نشد");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center py-12">
      <div className="glass-panel w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="font-nastaliq text-2xl font-black">ورود به گالری</h1>
          <p className="text-muted-foreground text-sm mt-2">
            با یوزرنیم توییتر و رمز عبورت وارد شو
          </p>
        </div>

        <div className="flex flex-col gap-4">
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
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
          </div>

          <label className="text-sm font-medium">رمز عبور</label>
          <div className="relative">
            <input
              dir="ltr"
              type={showPassword ? "text" : "password"}
              className="glass-input pl-11 text-left"
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
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

          <LiquidButton
            variant="primary"
            className="mt-2 w-full"
            disabled={!twitterHandle || !password || loading}
            onClick={submit}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                در حال ورود...
              </>
            ) : (
              "ورود"
            )}
          </LiquidButton>
        </div>

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
