"use client";

import { useEffect, useState } from "react";
import { Info, X, ShieldOff, HeartHandshake, Eye, Trophy } from "lucide-react";
import { LiquidButton } from "@/components/ui/liquid-glass-button";

// Bump the version to show the notice again to everyone.
const STORAGE_KEY = "gl_unofficial_notice_v1";

const POINTS = [
  {
    icon: ShieldOff,
    cls: "bg-amber-500/15 text-amber-400",
    title: "این سایت غیررسمی است",
    body: "یک پروژه مستقل که اعضای جامعه فارسی‌زبان GenLayer ساخته‌اند.",
  },
  {
    icon: Info,
    cls: "bg-primary/15 text-primary",
    title: "هیچ ربطی به دیسکورد و پورتال رسمی ندارد",
    body: "این گالری با تیم رسمی GenLayer، برندگان و رول‌های دیسکورد و پورتال رسمی هیچ ارتباطی ندارد و هیچ تأثیری روی آن‌ها نمی‌گذارد.",
  },
  {
    icon: HeartHandshake,
    cls: "bg-pink-500/15 text-pink-400",
    title: "اینجا برای حمایت از همدیگر است",
    body: "کارهای همدیگر را ببینیم، حمایت کنیم و با هم بزرگ‌تر شویم — همین.",
  },
  {
    icon: Eye,
    cls: "bg-cyan-500/15 text-cyan-400",
    title: "توییت‌های بقیه را راحت‌تر ببین",
    body: "همه پست‌های جامعه یک‌جا جمع است؛ لازم نیست توی تایم‌لاین دنبالشان بگردی.",
  },
  {
    icon: Trophy,
    cls: "bg-yellow-500/15 text-yellow-400",
    title: "یاد بگیر چطور می‌شود بهترینِ هفته بود",
    body: "با دیدن پست‌های برتر هر هفته می‌فهمی چه محتوایی بیشتر دیده و پسندیده می‌شود. برنده‌های اینجا فقط یک تشویق دوستانه بین خودمان است، نه جایزه یا امتیاز رسمی.",
  },
];

function NoticeList() {
  return (
    <ul className="flex flex-col gap-4">
      {POINTS.map((p) => (
        <li key={p.title} className="flex items-start gap-3">
          <span
            className={`flex shrink-0 items-center justify-center w-9 h-9 rounded-xl ${p.cls}`}
          >
            <p.icon size={17} />
          </span>
          <div className="min-w-0">
            <p className="font-bold text-sm">{p.title}</p>
            <p className="text-muted-foreground text-xs leading-6 mt-0.5">{p.body}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Opens once on the first visit, then stays quiet. */
export function UnofficialNoticeModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setOpen(true);
    } catch {
      // private mode / blocked storage — show it, just don't remember
      setOpen(true);
    }
  }, []);

  const close = () => {
    setOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // nothing to do
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={close}
      role="dialog"
      aria-modal="true"
      aria-label="توضیح مهم درباره گالری"
    >
      <div
        className="glass-panel bg-card/95 w-full max-w-lg max-h-[85vh] overflow-y-auto p-6 sm:p-8 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h2 className="font-nastaliq text-2xl font-black">قبل از شروع</h2>
            <p className="text-muted-foreground text-xs mt-1">یک بار می‌خوانی و تمام</p>
          </div>
          <button
            onClick={close}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="بستن"
          >
            <X size={18} />
          </button>
        </div>

        <NoticeList />

        <p className="text-muted-foreground text-[11px] leading-5 mt-5 pt-4 border-t border-white/10" dir="ltr">
          This is an unofficial, community-made gallery. It is not affiliated with the
          official GenLayer team and has no connection to Discord winners, roles or the
          official portal.
        </p>

        <LiquidButton variant="primary" className="w-full mt-5" onClick={close}>
          متوجه شدم، بریم
        </LiquidButton>
      </div>
    </div>
  );
}

/** Always-available box (homepage) for anyone who dismissed the modal. */
export function UnofficialNoticeBox() {
  return (
    <section className="glass-panel p-6 sm:p-8 flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <span className="flex items-center justify-center w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-400">
          <Info size={19} />
        </span>
        <div>
          <h2 className="font-nastaliq text-xl font-bold">درباره این گالری</h2>
          <p className="text-muted-foreground text-xs">
            غیررسمی، ساخته‌شده توسط اعضای جامعه
          </p>
        </div>
      </div>
      <NoticeList />
    </section>
  );
}
