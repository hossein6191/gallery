import { notFound } from "next/navigation";
import Link from "next/link";
import { getDb, type SubmissionRow } from "@/lib/db";
import { TweetCard } from "@/components/tweet-card";
import { LiquidButton } from "@/components/ui/liquid-glass-button";
import { Palette, FileText } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function GalleryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  if (category !== "art" && category !== "text") notFound();

  const rows = getDb()
    .prepare(
      `SELECT s.*, u.twitter_handle, u.display_name,
              (SELECT COUNT(*) FROM votes v WHERE v.submission_id = s.id) AS vote_count
       FROM submissions s JOIN users u ON u.id = s.user_id
       WHERE s.category = ?
       ORDER BY s.created_at DESC LIMIT 200`
    )
    .all(category) as SubmissionRow[];

  const isArt = category === "art";

  return (
    <div className="pt-10 flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span
            className={`flex items-center justify-center w-11 h-11 rounded-2xl ${
              isArt ? "bg-pink-500/15 text-pink-400" : "bg-cyan-500/15 text-cyan-400"
            }`}
          >
            {isArt ? <Palette size={22} /> : <FileText size={22} />}
          </span>
          <div>
            <h1 className="text-2xl font-black">
              {isArt ? "گالری هنری" : "محتوای متنی"}
            </h1>
            <p className="text-muted-foreground text-sm">
              {isArt
                ? "آثار هنری اعضای جامعه فارسی GenLayer"
                : "تردها و نوشته‌های اعضای جامعه فارسی GenLayer"}
            </p>
          </div>
        </div>
        <LiquidButton variant="primary" asChild>
          <Link href="/submit">ثبت پست</Link>
        </LiquidButton>
      </div>

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
