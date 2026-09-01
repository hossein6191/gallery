import { notFound } from "next/navigation";
import Link from "next/link";
import { getDb, type SubmissionRow } from "@/lib/db";
import { TweetCard } from "@/components/tweet-card";
import { LiquidButton } from "@/components/ui/liquid-glass-button";
import { Palette, FileText, Clapperboard } from "lucide-react";

export const dynamic = "force-dynamic";

const META = {
  art: {
    title: "گالری هنری",
    desc: "آثار هنری اعضای جامعه فارسی GenLayer",
    icon: Palette,
    cls: "bg-pink-500/15 text-pink-400",
    note: null as string | null,
  },
  text: {
    title: "محتوای متنی",
    desc: "تردها و نوشته‌های اعضای جامعه فارسی GenLayer",
    icon: FileText,
    cls: "bg-cyan-500/15 text-cyan-400",
    note: null as string | null,
  },
  video: {
    title: "گالری ویدیو",
    desc: "ویدیوهای اعضای جامعه فارسی GenLayer",
    icon: Clapperboard,
    cls: "bg-violet-500/15 text-violet-400",
    note: null as string | null,
  },
} as const;

export default async function GalleryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  if (category !== "art" && category !== "text" && category !== "video") notFound();

  const rows = getDb()
    .prepare(
      `SELECT s.*, u.twitter_handle, u.display_name,
              (SELECT COUNT(*) FROM votes v WHERE v.submission_id = s.id) AS vote_count
       FROM submissions s JOIN users u ON u.id = s.user_id
       WHERE s.category = ?
       ORDER BY s.created_at DESC LIMIT 200`
    )
    .all(category) as SubmissionRow[];

  const meta = META[category];
  const Icon = meta.icon;

  return (
    <div className="pt-10 flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className={`flex items-center justify-center w-11 h-11 rounded-2xl ${meta.cls}`}>
            <Icon size={22} />
          </span>
          <div>
            <h1 className="font-nastaliq text-2xl font-black">{meta.title}</h1>
            <p className="text-muted-foreground text-sm">{meta.desc}</p>
          </div>
        </div>
        <LiquidButton variant="primary" asChild>
          <Link href="/submit">ثبت پست</Link>
        </LiquidButton>
      </div>

      {meta.note && (
        <p className="glass-panel p-4 text-sm text-amber-400/90 leading-7">{meta.note}</p>
      )}

      {rows.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r) => (
            <TweetCard key={r.id} item={r} />
          ))}
        </div>
      ) : (
        <div className="glass-panel border-dashed p-16 text-center text-muted-foreground">
          هنوز پستی در این بخش ثبت نشده — اولین نفر باش!
        </div>
      )}
    </div>
  );
}
