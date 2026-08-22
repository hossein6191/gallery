"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TweetCard, type SubmissionItem } from "@/components/tweet-card";
import { LiquidButton } from "@/components/ui/liquid-glass-button";
import { EditIcon } from "@/components/ui/edit-icon";
import { avatarUrl, twitterProfileUrl, faNum } from "@/lib/utils";
import { ExternalLink, X, Loader2 } from "lucide-react";

type User = {
  id: number;
  twitterHandle: string;
  displayName: string;
  discordUsername: string;
};

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [checked, setChecked] = useState(false);
  const [subs, setSubs] = useState<SubmissionItem[]>([]);
  const [editing, setEditing] = useState<SubmissionItem | null>(null);
  const [newUrl, setNewUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const load = useCallback(async () => {
    const me = await fetch("/api/auth/me").then((r) => r.json());
    setUser(me.user);
    setChecked(true);
    if (me.user) {
      const s = await fetch("/api/submissions?mine=1").then((r) => r.json());
      setSubs(s.submissions ?? []);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    setEditError("");
    const res = await fetch(`/api/submissions/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tweetUrl: newUrl.trim() }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setEditError(data.error ?? "خطایی رخ داد");
      return;
    }
    setEditing(null);
    setNewUrl("");
    load();
  };

  if (!checked) return null;

  if (!user) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="glass-panel max-w-md w-full p-8 text-center flex flex-col items-center gap-4">
          <h1 className="text-xl font-bold">وارد نشده‌ای</h1>
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
    <div className="pt-10 flex flex-col gap-10">
      <div className="glass-panel p-8 flex flex-col sm:flex-row items-center gap-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatarUrl(user.twitterHandle)}
          alt={user.displayName}
          className="w-24 h-24 rounded-full object-cover border-2 border-primary/40"
        />
        <div className="flex-1 text-center sm:text-right">
          <h1 className="text-2xl font-black">{user.displayName}</h1>
          <div className="flex flex-wrap justify-center sm:justify-start gap-4 mt-2 text-sm text-muted-foreground">
            <a
              href={twitterProfileUrl(user.twitterHandle)}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors inline-flex items-center gap-1"
              dir="ltr"
            >
              <ExternalLink size={13} />@{user.twitterHandle}
            </a>
            <span dir="ltr">Discord: {user.discordUsername}</span>
          </div>
          <p className="text-muted-foreground text-xs mt-2">
            {faNum(subs.length)} پست ثبت‌شده
          </p>
        </div>
        <LiquidButton variant="primary" asChild>
          <Link href="/submit">ثبت پست جدید</Link>
        </LiquidButton>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-bold">پست‌های من</h2>
        {subs.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {subs.map((item) => (
              <TweetCard
                key={item.id}
                item={{
                  ...item,
                  twitter_handle: user.twitterHandle,
                  display_name: user.displayName,
                }}
                action={
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        item.week_number > 0
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "bg-white/10 text-muted-foreground"
                      }`}
                      title={
                        item.week_number > 0
                          ? "در رای‌گیری این هفته شرکت دارد"
                          : "فقط در گالری — در مسابقه نیست"
                      }
                    >
                      {item.week_number > 0
                        ? `مسابقه هفته ${faNum(item.week_number)}`
                        : item.category === "video"
                          ? "بدون مسابقه"
                          : "فقط گالری"}
                    </span>
                    <button
                      onClick={() => {
                        setEditing(item);
                        setNewUrl(item.tweet_url);
                        setEditError("");
                      }}
                      className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                      title="اصلاح لینک یا بروزرسانی کاور و متن"
                    >
                      <EditIcon size={14} />
                      اصلاح لینک
                    </button>
                  </div>
                }
              />
            ))}
          </div>
        ) : (
          <div className="glass-panel border-dashed p-12 text-center text-muted-foreground">
            هنوز پستی ثبت نکرده‌ای
          </div>
        )}
      </section>

      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
          onClick={() => setEditing(null)}
        >
          <div
            className="glass-panel bg-card/95 max-w-md w-full p-6 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold flex items-center gap-2">
                <EditIcon size={18} className="text-primary" />
                اصلاح لینک توییت
              </h3>
              <button
                onClick={() => setEditing(null)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="بستن"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-muted-foreground text-xs leading-6 mb-4">
              اگر لینک را اشتباه گذاشته‌ای اینجا اصلاحش کن. همان لینک را دوباره
              ذخیره کنی هم متن و کاور پست از نو دریافت می‌شود.
            </p>
            <input
              dir="ltr"
              className="glass-input text-left"
              placeholder="https://x.com/username/status/..."
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
            />
            {editError && <p className="mt-2 text-xs text-destructive">{editError}</p>}
            <div className="flex gap-2 mt-4">
              <LiquidButton className="flex-1" onClick={() => setEditing(null)}>
                انصراف
              </LiquidButton>
              <LiquidButton
                variant="primary"
                className="flex-1"
                disabled={saving}
                onClick={saveEdit}
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : "ذخیره"}
              </LiquidButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
