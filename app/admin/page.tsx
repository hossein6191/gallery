"use client";

import { useMemo, useState } from "react";
import { LiquidButton } from "@/components/ui/liquid-glass-button";
import { avatarUrl, faNum, cn } from "@/lib/utils";
import {
  ShieldAlert,
  Trash2,
  Loader2,
  CheckCircle2,
  RefreshCw,
  ListFilter,
  ExternalLink,
  Search,
} from "lucide-react";

type AdminPost = {
  id: number;
  category: "art" | "text" | "video";
  tweet_url: string;
  tweet_text: string | null;
  image_url: string | null;
  file_url: string | null;
  file_type: "image" | "video" | null;
  week_number: number;
  created_at: string;
  twitter_handle: string;
  display_name: string;
  vote_count: number;
};

const CAT_LABEL: Record<AdminPost["category"], string> = {
  art: "هنری",
  text: "متنی",
  video: "ویدیویی",
};

export default function AdminPage() {
  const [key, setKey] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Record<string, number> | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState("");

  // post moderation
  const [posts, setPosts] = useState<AdminPost[] | null>(null);
  const [postsLoading, setPostsLoading] = useState(false);
  const [q, setQ] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [postMsg, setPostMsg] = useState("");

  const call = async (url: string, payload: Record<string, unknown>) => {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, ...payload }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? "خطایی رخ داد");
    return data;
  };

  const refresh = async () => {
    setRefreshing(true);
    setRefreshMsg("");
    setError("");
    try {
      const data = await call("/api/admin/refresh", {});
      setRefreshMsg(
        `${faNum(data.updated)} پست بروزرسانی شد` +
          (data.reinstated ? `، ${faNum(data.reinstated)} پست به مسابقه این هفته برگشت` : "") +
          (data.failed ? ` (${faNum(data.failed)} پست قابل دریافت نبود)` : "")
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "ارتباط با سرور برقرار نشد");
    }
    setRefreshing(false);
  };

  const reset = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await call("/api/admin/reset", {});
      setResult(data.removed);
      setConfirming(false);
      setPosts(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "ارتباط با سرور برقرار نشد");
    }
    setLoading(false);
  };

  const loadPosts = async () => {
    setPostsLoading(true);
    setPostMsg("");
    setError("");
    try {
      const data = await call("/api/admin/posts", { action: "list" });
      setPosts(data.posts);
    } catch (e) {
      setError(e instanceof Error ? e.message : "ارتباط با سرور برقرار نشد");
    }
    setPostsLoading(false);
  };

  const deletePost = async (id: number) => {
    setDeletingId(id);
    setPostMsg("");
    try {
      await call("/api/admin/posts", { action: "delete", id });
      setPosts((p) => (p ? p.filter((x) => x.id !== id) : p));
      setPostMsg(`پست ${faNum(id)} حذف شد`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "ارتباط با سرور برقرار نشد");
    }
    setDeletingId(null);
    setConfirmId(null);
  };

  const filtered = useMemo(() => {
    if (!posts) return [];
    const s = q.trim().toLowerCase().replace(/^@/, "");
    if (!s) return posts;
    return posts.filter(
      (p) =>
        p.twitter_handle.toLowerCase().includes(s) ||
        p.display_name.toLowerCase().includes(s) ||
        (p.tweet_text ?? "").toLowerCase().includes(s) ||
        String(p.id) === s
    );
  }, [posts, q]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center gap-6 py-12">
      {/* ---- key + global actions ---- */}
      <div className="glass-panel w-full max-w-md p-8 flex flex-col gap-5">
        <div className="text-center">
          <span className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/15 text-primary mb-3">
            <ShieldAlert size={24} />
          </span>
          <h1 className="text-xl font-black">مدیریت گالری</h1>
          <p className="text-muted-foreground text-sm mt-2 leading-7">
            این صفحه در منو نیست. برای هر کاری اول رمز ادمین (ADMIN_SECRET) را وارد کن.
          </p>
        </div>

        <label className="text-sm font-medium">رمز ادمین</label>
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

        <LiquidButton className="w-full" disabled={!key || postsLoading} onClick={loadPosts}>
          {postsLoading ? <Loader2 size={16} className="animate-spin" /> : <ListFilter size={16} />}
          مدیریت پست‌ها (نمایش لیست)
        </LiquidButton>

        <LiquidButton className="w-full" disabled={!key || refreshing} onClick={refresh}>
          {refreshing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          بروزرسانی کاور و متن همه پست‌ها
        </LiquidButton>
        {refreshMsg && <p className="text-center text-xs text-emerald-400">{refreshMsg}</p>}

        <div className="border-t border-white/10 my-1" />

        {result ? (
          <div className="text-center flex flex-col items-center gap-3 py-2">
            <CheckCircle2 size={36} className="text-emerald-400" />
            <p className="font-bold">همه‌چیز صفر شد!</p>
            <p className="text-muted-foreground text-xs leading-6">
              حذف شد: {faNum(result.users)} عضو، {faNum(result.submissions)} پست،{" "}
              {faNum(result.votes)} رای، {faNum(result.winners)} برنده
            </p>
          </div>
        ) : !confirming ? (
          <LiquidButton
            className="w-full text-destructive"
            disabled={!key || loading}
            onClick={() => setConfirming(true)}
          >
            <Trash2 size={16} />
            صفر کردن همه داده‌ها (روز افتتاح)
          </LiquidButton>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-center text-sm text-amber-400">
              مطمئنی؟ همه اعضا، پست‌ها، رای‌ها و برنده‌ها برای همیشه پاک می‌شوند.
            </p>
            <div className="flex gap-2">
              <LiquidButton className="flex-1" onClick={() => setConfirming(false)}>
                انصراف
              </LiquidButton>
              <LiquidButton className="flex-1 text-destructive" disabled={loading} onClick={reset}>
                {loading ? <Loader2 size={16} className="animate-spin" /> : "بله، پاک کن"}
              </LiquidButton>
            </div>
          </div>
        )}
        {error && <p className="text-center text-sm text-destructive">{error}</p>}
      </div>

      {/* ---- post moderation list ---- */}
      {posts && (
        <div className="glass-panel w-full max-w-3xl p-6 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-bold">
              پست‌ها <span className="text-muted-foreground text-sm">({faNum(filtered.length)})</span>
            </h2>
            <div className="relative w-full sm:w-72">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              />
              <input
                dir="auto"
                className="glass-input pl-9 pr-3 py-2 text-sm"
                placeholder="جستجو: یوزرنیم، اسم، متن یا شماره پست"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          </div>
          {postMsg && <p className="text-xs text-emerald-400">{postMsg}</p>}

          {filtered.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-6">پستی پیدا نشد</p>
          ) : (
            <ul className="flex flex-col divide-y divide-white/5">
              {filtered.map((p) => {
                const cover =
                  p.file_type === "image" && p.file_url ? p.file_url : p.image_url;
                return (
                  <li key={p.id} className="py-3 flex items-center gap-3">
                    <div className="w-14 h-14 rounded-lg overflow-hidden bg-white/5 shrink-0 flex items-center justify-center">
                      {cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={cover} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[10px] text-muted-foreground">بدون کاور</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] text-muted-foreground">#{faNum(p.id)}</span>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-bold",
                            p.category === "art"
                              ? "bg-pink-500/15 text-pink-400"
                              : p.category === "text"
                                ? "bg-cyan-500/15 text-cyan-400"
                                : "bg-violet-500/15 text-violet-400"
                          )}
                        >
                          {CAT_LABEL[p.category]}
                        </span>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={avatarUrl(p.twitter_handle)}
                          alt=""
                          className="w-5 h-5 rounded-full object-cover"
                        />
                        <span className="text-sm font-bold truncate">{p.display_name}</span>
                        <span className="text-xs text-muted-foreground" dir="ltr">
                          @{p.twitter_handle}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {p.week_number > 0 ? `هفته ${faNum(p.week_number)}` : "خارج از مسابقه"} ·{" "}
                          {faNum(p.vote_count)} رای
                        </span>
                      </div>
                      <p className="text-xs text-foreground/70 truncate mt-1" dir="auto">
                        {p.tweet_text ?? "—"}
                      </p>
                    </div>
                    <a
                      href={p.tweet_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary shrink-0"
                      title="مشاهده توییت"
                    >
                      <ExternalLink size={15} />
                    </a>
                    {confirmId === p.id ? (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => deletePost(p.id)}
                          disabled={deletingId === p.id}
                          className="rounded-full bg-destructive/20 text-destructive px-3 py-1 text-xs font-bold hover:bg-destructive/30"
                        >
                          {deletingId === p.id ? "..." : "حذف شود"}
                        </button>
                        <button
                          onClick={() => setConfirmId(null)}
                          className="rounded-full bg-white/10 px-3 py-1 text-xs"
                        >
                          نه
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmId(p.id)}
                        className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                        title="حذف این پست"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
