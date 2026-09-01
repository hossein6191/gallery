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
  Vote,
  KeyRound,
  LogIn,
  Users,
  AlertTriangle,
  CheckCircle2 as CheckIcon,
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

type AdminVote = {
  id: number;
  week_number: number;
  category: "art" | "text";
  voted_at: string;
  submission_id: number;
  tweet_url: string;
  tweet_text: string | null;
  author_handle: string;
  author_name: string;
  voter_handle: string;
  voter_name: string;
  voter_discord: string;
  voter_joined: string;
};

type AuthEvent = {
  id: number;
  handle: string;
  kind: "signup" | "login_success" | "login_failed" | "login_failed_no_user";
  reason: string | null;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
  display_name: string | null;
  discord_username: string | null;
};

type AdminMember = {
  id: number;
  twitter_handle: string;
  display_name: string;
  discord_username: string;
  created_at: string;
  posts: number;
  votes_cast: number;
  logins: number;
  failed_logins: number;
  last_login: string | null;
};

const EVENT_LABEL: Record<AuthEvent["kind"], { text: string; cls: string }> = {
  signup: { text: "ثبت‌نام", cls: "bg-emerald-500/15 text-emerald-400" },
  login_success: { text: "ورود موفق", cls: "bg-primary/15 text-primary" },
  login_failed: { text: "رمز اشتباه", cls: "bg-destructive/15 text-destructive" },
  login_failed_no_user: { text: "عضو نبوده", cls: "bg-amber-500/15 text-amber-400" },
};

/** "Chrome روی اندروید" — enough to answer "با چی وارد شد؟" */
function deviceOf(ua: string | null): string {
  if (!ua) return "نامشخص";
  const os = /iPhone|iPad|iOS/i.test(ua)
    ? "آیفون"
    : /Android/i.test(ua)
      ? "اندروید"
      : /Windows/i.test(ua)
        ? "ویندوز"
        : /Mac OS X|Macintosh/i.test(ua)
          ? "مک"
          : /Linux/i.test(ua)
            ? "لینوکس"
            : "نامشخص";
  const browser = /SamsungBrowser/i.test(ua)
    ? "Samsung Internet"
    : /Edg\//i.test(ua)
      ? "Edge"
      : /OPR\/|Opera/i.test(ua)
        ? "Opera"
        : /Firefox/i.test(ua)
          ? "Firefox"
          : /Chrome/i.test(ua)
            ? "Chrome"
            : /Safari/i.test(ua)
              ? "Safari"
              : "مرورگر نامشخص";
  return `${browser} روی ${os}`;
}

// SQLite stores datetime('now') in UTC without a zone marker
function faDate(sqliteUtc: string): string {
  const d = new Date(sqliteUtc.replace(" ", "T") + "Z");
  if (Number.isNaN(d.getTime())) return sqliteUtc;
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    timeZone: "Asia/Tehran",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

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

  // voter audit
  const [votes, setVotes] = useState<AdminVote[] | null>(null);
  const [votesLoading, setVotesLoading] = useState(false);

  // auth log + members
  const [events, setEvents] = useState<AuthEvent[] | null>(null);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [onlyProblems, setOnlyProblems] = useState(false);
  const [members, setMembers] = useState<AdminMember[] | null>(null);
  const [membersLoading, setMembersLoading] = useState(false);
  const [memberMsg, setMemberMsg] = useState("");
  const [pwFor, setPwFor] = useState<AdminMember | null>(null);
  const [pwValue, setPwValue] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [confirmMember, setConfirmMember] = useState<number | null>(null);

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

  const loadVotes = async () => {
    setVotesLoading(true);
    setError("");
    try {
      const data = await call("/api/admin/posts", { action: "votes" });
      setVotes(data.votes);
    } catch (e) {
      setError(e instanceof Error ? e.message : "ارتباط با سرور برقرار نشد");
    }
    setVotesLoading(false);
  };

  const loadEvents = async () => {
    setEventsLoading(true);
    setError("");
    try {
      const data = await call("/api/admin/posts", { action: "authlog" });
      setEvents(data.events);
    } catch (e) {
      setError(e instanceof Error ? e.message : "ارتباط با سرور برقرار نشد");
    }
    setEventsLoading(false);
  };

  const loadMembers = async () => {
    setMembersLoading(true);
    setError("");
    setMemberMsg("");
    try {
      const data = await call("/api/admin/posts", { action: "members" });
      setMembers(data.members);
    } catch (e) {
      setError(e instanceof Error ? e.message : "ارتباط با سرور برقرار نشد");
    }
    setMembersLoading(false);
  };

  const savePassword = async () => {
    if (!pwFor) return;
    setPwBusy(true);
    try {
      await call("/api/admin/posts", {
        action: "set_password",
        id: pwFor.id,
        password: pwValue,
      });
      setMemberMsg(`رمز جدید برای @${pwFor.twitter_handle} ثبت شد: ${pwValue}`);
      setPwFor(null);
      setPwValue("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "ارتباط با سرور برقرار نشد");
    }
    setPwBusy(false);
  };

  const deleteMember = async (m: AdminMember) => {
    try {
      await call("/api/admin/posts", { action: "delete_member", id: m.id });
      setMembers((list) => (list ? list.filter((x) => x.id !== m.id) : list));
      setMemberMsg(`عضو @${m.twitter_handle} و همه پست‌هایش حذف شد`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "ارتباط با سرور برقرار نشد");
    }
    setConfirmMember(null);
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

        <LiquidButton className="w-full" disabled={!key || eventsLoading} onClick={loadEvents}>
          {eventsLoading ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
          ورودها و ثبت‌نام‌ها (و کسانی که نتوانستند وارد شوند)
        </LiquidButton>

        <LiquidButton className="w-full" disabled={!key || membersLoading} onClick={loadMembers}>
          {membersLoading ? <Loader2 size={16} className="animate-spin" /> : <Users size={16} />}
          مدیریت اعضا (ریست رمز / حذف)
        </LiquidButton>

        <LiquidButton className="w-full" disabled={!key || votesLoading} onClick={loadVotes}>
          {votesLoading ? <Loader2 size={16} className="animate-spin" /> : <Vote size={16} />}
          نمایش رای‌ها (چه کسی به چه کسی)
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

      {/* ---- sign-ups & logins, including failures ---- */}
      {events && (
        <div className="glass-panel w-full max-w-3xl p-4 sm:p-6 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-bold">
              ورودها و ثبت‌نام‌ها{" "}
              <span className="text-muted-foreground text-sm">({faNum(events.length)})</span>
            </h2>
            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={onlyProblems}
                onChange={(e) => setOnlyProblems(e.target.checked)}
                className="accent-primary"
              />
              فقط ناموفق‌ها (کسانی که نتوانستند وارد شوند)
            </label>
          </div>
          <ul className="flex flex-col divide-y divide-white/5">
            {events
              .filter((ev) => !onlyProblems || ev.kind.startsWith("login_failed"))
              .map((ev) => {
                const label = EVENT_LABEL[ev.kind];
                const failed = ev.kind.startsWith("login_failed");
                return (
                  <li key={ev.id} className="py-2.5 flex items-start gap-2.5 text-xs">
                    <span className={cn("shrink-0 rounded-full px-2 py-0.5 font-bold", label.cls)}>
                      {label.text}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={avatarUrl(ev.handle)}
                          alt=""
                          className="w-4 h-4 rounded-full object-cover"
                        />
                        <span className="font-bold" dir="ltr">
                          @{ev.handle}
                        </span>
                        {ev.display_name && <span>{ev.display_name}</span>}
                        {ev.discord_username && (
                          <span className="text-muted-foreground" dir="ltr">
                            {ev.discord_username}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground mt-1">
                        <span>{faDate(ev.created_at)}</span>
                        <span>· {deviceOf(ev.user_agent)}</span>
                        {ev.ip && (
                          <span>
                            · <span dir="ltr">{ev.ip}</span>
                          </span>
                        )}
                        {failed && ev.reason && (
                          <span className="text-destructive">· {ev.reason}</span>
                        )}
                      </div>
                    </div>
                    {failed ? (
                      <AlertTriangle size={14} className="text-destructive shrink-0 mt-0.5" />
                    ) : (
                      <CheckIcon size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                    )}
                  </li>
                );
              })}
          </ul>
          {events.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-4">
              هنوز ورود یا ثبت‌نامی ثبت نشده (این لاگ از الان به بعد پر می‌شود)
            </p>
          )}
        </div>
      )}

      {/* ---- members ---- */}
      {members && (
        <div className="glass-panel w-full max-w-3xl p-4 sm:p-6 flex flex-col gap-4">
          <h2 className="font-bold">
            اعضا <span className="text-muted-foreground text-sm">({faNum(members.length)})</span>
          </h2>
          {memberMsg && <p className="text-xs text-emerald-400 break-all">{memberMsg}</p>}
          <ul className="flex flex-col divide-y divide-white/5">
            {members.map((m) => (
              <li key={m.id} className="py-3 flex flex-wrap items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={avatarUrl(m.twitter_handle)}
                  alt=""
                  className="w-9 h-9 rounded-full object-cover shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 text-sm">
                    <span className="font-bold">{m.display_name}</span>
                    <span className="text-xs text-muted-foreground" dir="ltr">
                      @{m.twitter_handle}
                    </span>
                    <span className="text-xs text-muted-foreground" dir="ltr">
                      {m.discord_username}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground mt-1">
                    <span>عضو از {faDate(m.created_at)}</span>
                    <span>· {faNum(m.posts)} پست</span>
                    <span>· {faNum(m.votes_cast)} رای داده</span>
                    <span>· {faNum(m.logins)} ورود</span>
                    {m.failed_logins > 0 && (
                      <span className="text-amber-400">
                        · {faNum(m.failed_logins)} تلاش ناموفق
                      </span>
                    )}
                    <span>
                      · آخرین ورود: {m.last_login ? faDate(m.last_login) : "هیچ‌وقت"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      setPwFor(m);
                      setPwValue("");
                      setMemberMsg("");
                    }}
                    className="inline-flex items-center gap-1 rounded-full bg-white/5 px-3 py-1 text-[11px] hover:bg-white/10"
                    title="رمز جدید برایش بگذار"
                  >
                    <KeyRound size={12} />
                    رمز جدید
                  </button>
                  {confirmMember === m.id ? (
                    <>
                      <button
                        onClick={() => deleteMember(m)}
                        className="rounded-full bg-destructive/20 text-destructive px-3 py-1 text-[11px] font-bold"
                      >
                        حذف شود
                      </button>
                      <button
                        onClick={() => setConfirmMember(null)}
                        className="rounded-full bg-white/10 px-3 py-1 text-[11px]"
                      >
                        نه
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setConfirmMember(m.id)}
                      className="text-muted-foreground hover:text-destructive"
                      title="حذف عضو و همه پست‌هایش"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ---- set a new password for a member ---- */}
      {pwFor && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setPwFor(null)}
        >
          <div
            className="glass-panel bg-card/95 w-full max-w-sm p-6 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold flex items-center gap-2">
              <KeyRound size={16} className="text-primary" />
              رمز جدید برای <span dir="ltr">@{pwFor.twitter_handle}</span>
            </h3>
            <p className="text-muted-foreground text-xs leading-6 mt-2">
              رمز جدید را خودت بگذار و به همان شخص بده تا بتواند وارد شود. حداقل ۸
              کاراکتر.
            </p>
            <input
              dir="ltr"
              className="glass-input text-left mt-3"
              placeholder="رمز جدید"
              value={pwValue}
              onChange={(e) => setPwValue(e.target.value)}
            />
            <div className="flex gap-2 mt-4">
              <LiquidButton className="flex-1" onClick={() => setPwFor(null)}>
                انصراف
              </LiquidButton>
              <LiquidButton
                variant="primary"
                className="flex-1"
                disabled={pwBusy}
                onClick={savePassword}
              >
                {pwBusy ? <Loader2 size={16} className="animate-spin" /> : "ذخیره رمز"}
              </LiquidButton>
            </div>
          </div>
        </div>
      )}

      {/* ---- voter audit ---- */}
      {votes && (
        <div className="glass-panel w-full max-w-3xl p-6 flex flex-col gap-4">
          <h2 className="font-bold">
            رای‌ها <span className="text-muted-foreground text-sm">({faNum(votes.length)})</span>
          </h2>
          <p className="text-muted-foreground text-xs leading-6">
            فقط اعضای ثبت‌نام‌شده می‌توانند رای بدهند (هر عضو در هر بخش، هر هفته یک
            رای). تاریخ عضویت رای‌دهنده را نگاه کن — اکانتی که همان روز رای‌گیری
            ساخته شده مشکوک است.
          </p>
          {votes.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-6">
              هنوز رایی ثبت نشده
            </p>
          ) : (
            (() => {
              const groups = new Map<number, AdminVote[]>();
              for (const v of votes) {
                if (!groups.has(v.submission_id)) groups.set(v.submission_id, []);
                groups.get(v.submission_id)!.push(v);
              }
              return [...groups.values()].map((g) => {
                const first = g[0];
                return (
                  <div key={first.submission_id} className="rounded-xl bg-white/[0.03] border border-white/5 p-4">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-bold">
                        پست #{faNum(first.submission_id)} از {first.author_name}
                      </span>
                      <span className="text-xs text-muted-foreground" dir="ltr">
                        @{first.author_handle}
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-bold",
                          first.category === "art"
                            ? "bg-pink-500/15 text-pink-400"
                            : "bg-cyan-500/15 text-cyan-400"
                        )}
                      >
                        {first.category === "art" ? "هنری" : "متنی"}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        هفته {faNum(first.week_number)} · {faNum(g.length)} رای
                      </span>
                      <a
                        href={first.tweet_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-primary"
                      >
                        <ExternalLink size={13} />
                      </a>
                    </div>
                    <ul className="mt-3 flex flex-col gap-1.5">
                      {g.map((v) => (
                        <li key={v.id} className="flex flex-wrap items-center gap-2 text-xs">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={avatarUrl(v.voter_handle)}
                            alt=""
                            className="w-5 h-5 rounded-full object-cover"
                          />
                          <span className="font-bold">{v.voter_name}</span>
                          <span className="text-muted-foreground" dir="ltr">
                            @{v.voter_handle}
                          </span>
                          <span className="text-muted-foreground" dir="ltr">
                            {v.voter_discord}
                          </span>
                          <span className="text-muted-foreground">
                            عضو از {faDate(v.voter_joined)} · رای در {faDate(v.voted_at)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              });
            })()
          )}
        </div>
      )}
    </div>
  );
}
