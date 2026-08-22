"use client";

import { useState } from "react";
import { LiquidButton } from "@/components/ui/liquid-glass-button";
import { faNum } from "@/lib/utils";
import { ShieldAlert, Trash2, Loader2, CheckCircle2, RefreshCw } from "lucide-react";

export default function AdminPage() {
  const [key, setKey] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Record<string, number> | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState("");

  const refresh = async () => {
    setRefreshing(true);
    setRefreshMsg("");
    setError("");
    try {
      const res = await fetch("/api/admin/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "خطایی رخ داد");
      else
        setRefreshMsg(
          `${faNum(data.updated)} پست بروزرسانی شد` +
            (data.reinstated ? `، ${faNum(data.reinstated)} پست به مسابقه این هفته برگشت` : "") +
            (data.failed ? ` (${faNum(data.failed)} پست قابل دریافت نبود)` : "")
        );
    } catch {
      setError("ارتباط با سرور برقرار نشد");
    }
    setRefreshing(false);
  };

  const reset = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "خطایی رخ داد");
      } else {
        setResult(data.removed);
        setConfirming(false);
      }
    } catch {
      setError("ارتباط با سرور برقرار نشد");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center py-12">
      <div className="glass-panel w-full max-w-md p-8 flex flex-col gap-5">
        <div className="text-center">
          <span className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-destructive/15 text-destructive mb-3">
            <ShieldAlert size={24} />
          </span>
          <h1 className="text-xl font-black">مدیریت — صفر کردن داده‌ها</h1>
          <p className="text-muted-foreground text-sm mt-2 leading-7">
            برای شروع رسمی سایت: همه اعضا، پست‌ها، رای‌ها، برندگان و فایل‌های
            آپلودی پاک می‌شوند و شماره هفته از ۱ شروع می‌شود.
            <b className="text-destructive"> این کار برگشت‌ناپذیر است.</b>
          </p>
        </div>

        {result ? (
          <div className="text-center flex flex-col items-center gap-3 py-4">
            <CheckCircle2 size={40} className="text-emerald-400" />
            <p className="font-bold">همه‌چیز صفر شد!</p>
            <p className="text-muted-foreground text-xs leading-6">
              حذف شد: {faNum(result.users)} عضو، {faNum(result.submissions)} پست،{" "}
              {faNum(result.votes)} رای، {faNum(result.winners)} برنده
            </p>
          </div>
        ) : (
          <>
            <label className="text-sm font-medium">رمز ادمین (ADMIN_SECRET)</label>
            <input
              dir="ltr"
              type="password"
              className="glass-input text-left"
              placeholder="********"
              value={key}
              onChange={(e) => {
                setKey(e.target.value);
                setConfirming(false);
              }}
            />
            <LiquidButton
              className="w-full"
              disabled={!key || refreshing}
              onClick={refresh}
            >
              {refreshing ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <RefreshCw size={16} />
              )}
              بروزرسانی کاور و متن همه پست‌ها
            </LiquidButton>
            {refreshMsg && (
              <p className="text-center text-xs text-emerald-400">{refreshMsg}</p>
            )}
            <div className="border-t border-white/10 my-1" />
            {!confirming ? (
              <LiquidButton
                className="w-full text-destructive"
                disabled={!key || loading}
                onClick={() => setConfirming(true)}
              >
                <Trash2 size={16} />
                صفر کردن همه داده‌ها
              </LiquidButton>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-center text-sm text-amber-400">
                  مطمئنی؟ همه‌چیز برای همیشه پاک می‌شود.
                </p>
                <div className="flex gap-2">
                  <LiquidButton className="flex-1" onClick={() => setConfirming(false)}>
                    انصراف
                  </LiquidButton>
                  <LiquidButton
                    className="flex-1 text-destructive"
                    disabled={loading}
                    onClick={reset}
                  >
                    {loading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      "بله، پاک کن"
                    )}
                  </LiquidButton>
                </div>
              </div>
            )}
            {error && <p className="text-center text-sm text-destructive">{error}</p>}
          </>
        )}
      </div>
    </div>
  );
}
