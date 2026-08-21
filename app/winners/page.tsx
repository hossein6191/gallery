import { getDb, finalizePastWeeks, currentWeekNumber } from "@/lib/db";
import { votingDayNameFa } from "@/lib/week";
import { faNum } from "@/lib/utils";
import { LeaderboardCard, type WinnerEntry } from "@/components/ui/leaderboard-card";
import { Trophy } from "lucide-react";

export const dynamic = "force-dynamic";

type WinnerRow = {
  week_number: number;
  category: "art" | "text";
  rank: number;
  votes: number;
  twitter_handle: string;
  display_name: string;
  tweet_url: string;
  tweet_text: string | null;
  image_url: string | null;
};

export default function WinnersPage() {
  finalizePastWeeks();
  const rows = getDb()
    .prepare(
      `SELECT w.week_number, w.category, w.rank, w.votes,
              u.twitter_handle, u.display_name,
              s.tweet_url, s.tweet_text, s.image_url
       FROM winners w
       JOIN users u ON u.id = w.user_id
       JOIN submissions s ON s.id = w.submission_id
       ORDER BY w.week_number DESC, w.category ASC, w.rank ASC`
    )
    .all() as WinnerRow[];

  const week = currentWeekNumber();

  // group by week, then category
  const weeks = new Map<number, { art: WinnerEntry[]; text: WinnerEntry[] }>();
  for (const r of rows) {
    if (!weeks.has(r.week_number)) weeks.set(r.week_number, { art: [], text: [] });
    weeks.get(r.week_number)![r.category].push({
      rank: r.rank,
      displayName: r.display_name,
      twitterHandle: r.twitter_handle,
      votes: r.votes,
      tweetUrl: r.tweet_url,
      tweetText: r.tweet_text,
      imageUrl: r.image_url,
    });
  }

  return (
    <div className="pt-10 flex flex-col gap-10">
      <div className="text-center flex flex-col items-center gap-3">
        <span className="flex items-center justify-center w-14 h-14 rounded-2xl bg-yellow-500/15 text-yellow-400">
          <Trophy size={28} />
        </span>
        <h1 className="font-nastaliq text-3xl font-black">تالار افتخارات</h1>
        <p className="text-muted-foreground max-w-lg leading-8">
          برندگان هر هفته برای همیشه اینجا ثبت می‌شوند — از هر بخش ۳ نفر، با رای
          اعضای جامعه در روز {votingDayNameFa()}.
        </p>
      </div>

      {weeks.size === 0 ? (
        <div className="glass-panel border-dashed p-16 text-center text-muted-foreground leading-8">
          هنوز هفته‌ای به پایان نرسیده و برنده‌ای ثبت نشده.
          <br />
          هفته جاری: هفته {faNum(week)} — اولین برندگان بعد از اولین رای‌گیری مشخص
          می‌شوند.
        </div>
      ) : (
        <div className="flex flex-col gap-12">
          {[...weeks.entries()].map(([weekNumber, cats]) => (
            <section key={weekNumber} className="flex flex-col gap-4">
              <h2 className="text-lg font-bold text-muted-foreground">
                هفته {faNum(weekNumber)}
              </h2>
              <div className="grid gap-4 lg:grid-cols-2">
                <LeaderboardCard weekNumber={weekNumber} category="art" entries={cats.art} />
                <LeaderboardCard weekNumber={weekNumber} category="text" entries={cats.text} />
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
