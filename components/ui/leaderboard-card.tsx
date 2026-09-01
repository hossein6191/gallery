"use client";

import { cn, faNum } from "@/lib/utils";
import { LeaderboardPodium, type WinnerEntry } from "@/components/ui/leaderboard-podium";
import { Palette, FileText, Video } from "lucide-react";

/* Three sections, so the "is it art, otherwise text" boolean this used to run
   on no longer says anything true. */
const SECTION = {
  art: { label: "بخش هنری", icon: Palette, tone: "bg-pink-500/15 text-pink-400" },
  text: { label: "بخش محتوای متنی", icon: FileText, tone: "bg-cyan-500/15 text-cyan-400" },
  video: { label: "بخش ویدیویی", icon: Video, tone: "bg-violet-500/15 text-violet-400" },
} as const;

export function LeaderboardCard({
  weekNumber,
  category,
  entries,
  className,
}: {
  weekNumber: number;
  category: keyof typeof SECTION;
  entries: WinnerEntry[];
  className?: string;
}) {
  const section = SECTION[category];
  const Icon = section.icon;
  return (
    <div className={cn("glass-panel p-6", className)}>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span
            className={cn("flex items-center justify-center w-9 h-9 rounded-xl", section.tone)}
          >
            <Icon size={18} />
          </span>
          <div>
            <h3 className="text-base font-bold">{section.label}</h3>
            <p className="text-muted-foreground text-xs">برترین‌های این بخش</p>
          </div>
        </div>
        <span className="rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-xs font-bold text-primary">
          هفته {faNum(weekNumber)}
        </span>
      </div>

      {entries.length ? (
        <LeaderboardPodium entries={entries} />
      ) : (
        <p className="text-center text-muted-foreground text-sm py-8">
          برنده‌ای برای این بخش ثبت نشده
        </p>
      )}
    </div>
  );
}

export type { WinnerEntry };
