import Link from "next/link";
import { getDb, currentWeekNumber, type SubmissionRow } from "@/lib/db";
import { votingDayNameFa } from "@/lib/week";
import { faNum } from "@/lib/utils";
import { MemberSphere } from "@/components/member-sphere";
import { ElasticGallery, type ElasticItem } from "@/components/ui/elastic-gallery";
import { TweetCard } from "@/components/tweet-card";
import { LiquidButton } from "@/components/ui/liquid-glass-button";
import { Palette, FileText, Trophy, Vote, Clapperboard, CalendarClock } from "lucide-react";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const db = getDb();
  const week = currentWeekNumber();

  const artRows = db
    .prepare(
      `SELECT s.*, u.twitter_handle, u.display_name,
              (SELECT COUNT(*) FROM votes v WHERE v.submission_id = s.id) AS vote_count
       FROM submissions s JOIN users u ON u.id = s.user_id
       WHERE s.category = 'art'
       ORDER BY vote_count DESC, s.created_at DESC LIMIT 5`
    )
    .all() as SubmissionRow[];

  const textRows = db
    .prepare(
      `SELECT s.*, u.twitter_handle, u.display_name,
              (SELECT COUNT(*) FROM votes v WHERE v.submission_id = s.id) AS vote_count
       FROM submissions s JOIN users u ON u.id = s.user_id
       WHERE s.category = 'text'
       ORDER BY vote_count DESC, s.created_at DESC LIMIT 6`
    )
    .all() as SubmissionRow[];

  const videoRows = db
    .prepare(
      `SELECT s.*, u.twitter_handle, u.display_name
       FROM submissions s JOIN users u ON u.id = s.user_id
       WHERE s.category = 'video'
       ORDER BY s.created_at DESC LIMIT 3`
    )
    .all() as SubmissionRow[];

  const memberCount = (
    db.prepare("SELECT COUNT(*) AS c FROM users").get() as { c: number }
  ).c;

  const galleryItems: ElasticItem[] = artRows.map((r) => ({
    id: String(r.id),
    title: r.display_name ?? "",
    category: "هنری",
    src: r.image_url,
    alt: r.tweet_text ?? "اثر هنری",
    href: r.tweet_url,
    handle: r.twitter_handle,
    excerpt: r.tweet_text,
  }));

  return (
    <div className="flex flex-col gap-20 pt-10">
      {/* Hero + member sphere at the very top */}
      <section className="flex flex-col items-center gap-6 text-center">
        <MemberSphere size={480} />
        <h1 className="font-nastaliq-lg text-3xl md:text-5xl font-black">
          گالری جامعه فارسی{" "}
          <span className="bg-gradient-to-l from-primary to-secondary bg-clip-text text-transparent">
            GenLayer
          </span>
        </h1>
        <p className="text-muted-foreground max-w-xl leading-8">
          آثار هنری و محتوای متنی اعضای جامعه — هر هفته بهترین‌ها با رای خود اعضا
          انتخاب می‌شوند. پروفایل توییترت را ثبت کن و وارد رقابت شو.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <LiquidButton size="xl" variant="primary" asChild>
            <Link href="/signup">عضویت در گالری</Link>
          </LiquidButton>
          <LiquidButton size="xl" asChild>
            <Link href="/submit">ثبت پست</Link>
          </LiquidButton>
        </div>
        <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground mt-2">
          <span>هفته جاری: <b className="text-foreground">هفته {faNum(week)}</b></span>
          <span>اعضا: <b className="text-foreground">{faNum(memberCount)} نفر</b></span>
          <span>
            رای‌گیری: <b className="text-foreground">هر {votingDayNameFa()}</b>
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-primary/10 border border-primary/25 px-5 py-2.5 text-xs text-foreground/85">
          <CalendarClock size={14} className="text-primary shrink-0" />
          پست‌های <b>جدید همین هفته‌ات</b> را ثبت کن — تاریخ توییت بررسی می‌شود و
          فقط پست‌های همین هفته وارد رای‌گیری می‌شوند.
        </div>
      </section>

      {/* Art showcase */}
      <section className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h2 className="font-nastaliq text-xl md:text-2xl font-bold flex items-center gap-2">
            <Palette className="text-pink-400" size={22} />
            گالری هنری
          </h2>
          <Link href="/gallery/art" className="text-sm text-primary hover:underline">
            مشاهده همه
          </Link>
        </div>
        {galleryItems.length ? (
          <ElasticGallery items={galleryItems} />
        ) : (
          <div className="glass-panel border-dashed p-12 text-center text-muted-foreground">
            هنوز اثری ثبت نشده — اولین اثر هنری را تو ثبت کن!
          </div>
        )}
      </section>

      {/* Text posts */}
      <section className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h2 className="font-nastaliq text-xl md:text-2xl font-bold flex items-center gap-2">
            <FileText className="text-cyan-400" size={22} />
            محتوای متنی
          </h2>
          <Link href="/gallery/text" className="text-sm text-primary hover:underline">
            مشاهده همه
          </Link>
        </div>
        {textRows.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {textRows.map((r) => (
              <TweetCard key={r.id} item={r} />
            ))}
          </div>
        ) : (
          <div className="glass-panel border-dashed p-12 text-center text-muted-foreground">
            هنوز محتوای متنی ثبت نشده — اولین پست را تو ثبت کن!
          </div>
        )}
      </section>

      {/* Video section (new, no weekly contest yet) */}
      {videoRows.length > 0 && (
        <section className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h2 className="font-nastaliq text-xl md:text-2xl font-bold flex items-center gap-2">
              <Clapperboard className="text-violet-400" size={22} />
              گالری ویدیو
              <span className="text-[10px] font-bold rounded-full bg-violet-500/15 text-violet-400 px-3 py-1">
                جدید
              </span>
            </h2>
            <Link href="/gallery/video" className="text-sm text-primary hover:underline">
              مشاهده همه
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {videoRows.map((r) => (
              <TweetCard key={r.id} item={r} />
            ))}
          </div>
        </section>
      )}

      {/* Weekly contest banner */}
      <section className="grid gap-4 md:grid-cols-2">
        <div className="glass-panel p-8 flex flex-col items-start gap-4">
          <span className="flex items-center justify-center w-11 h-11 rounded-2xl bg-yellow-500/15 text-yellow-400">
            <Trophy size={22} />
          </span>
          <h3 className="text-lg font-bold">برندگان هفتگی</h3>
          <p className="text-muted-foreground text-sm leading-7">
            هر هفته ۳ برنده از بخش هنری و ۳ برنده از بخش متنی انتخاب می‌شوند و
            برای همیشه در تالار افتخارات می‌مانند.
          </p>
          <LiquidButton asChild>
            <Link href="/winners">تالار افتخارات</Link>
          </LiquidButton>
        </div>
        <div className="glass-panel p-8 flex flex-col items-start gap-4">
          <span className="flex items-center justify-center w-11 h-11 rounded-2xl bg-primary/15 text-primary">
            <Vote size={22} />
          </span>
          <h3 className="text-lg font-bold">رای‌گیری هفتگی</h3>
          <p className="text-muted-foreground text-sm leading-7">
            هر {votingDayNameFa()} صفحه رای‌گیری باز می‌شود و اعضا به بهترین پست هر
            بخش رای می‌دهند. هر عضو در هر بخش یک رای دارد.
          </p>
          <LiquidButton asChild>
            <Link href="/vote">صفحه رای‌گیری</Link>
          </LiquidButton>
        </div>
      </section>
    </div>
  );
}
