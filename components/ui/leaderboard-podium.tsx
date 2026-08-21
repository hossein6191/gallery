"use client";

import { cn, faNum, avatarUrl, twitterProfileUrl } from "@/lib/utils";
import { Crown, ExternalLink } from "lucide-react";
import { useState } from "react";

export interface WinnerEntry {
  rank: number;
  displayName: string;
  twitterHandle: string;
  votes: number;
  tweetUrl: string;
  tweetText?: string | null;
  imageUrl?: string | null;
}

const RANK_STYLES: Record<number, { ring: string; label: string; height: string }> = {
  1: { ring: "border-yellow-400/70 shadow-[0_0_24px_rgba(250,204,21,0.35)]", label: "🥇", height: "h-28" },
  2: { ring: "border-slate-300/60 shadow-[0_0_16px_rgba(203,213,225,0.25)]", label: "🥈", height: "h-20" },
  3: { ring: "border-amber-600/60 shadow-[0_0_16px_rgba(217,119,6,0.25)]", label: "🥉", height: "h-16" },
};

function WinnerColumn({ entry }: { entry: WinnerEntry }) {
  const [hovered, setHovered] = useState(false);
  const style = RANK_STYLES[entry.rank] ?? RANK_STYLES[3];

  return (
    <div
      className="relative flex flex-col items-center gap-2 flex-1 min-w-0"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* hover tooltip: profile + tweet */}
      {hovered && (
        <div className="absolute bottom-full mb-3 z-30 w-64 glass-panel bg-card/95 p-4 text-right animate-fade-in">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatarUrl(entry.twitterHandle)}
              alt={entry.displayName}
              className="w-10 h-10 rounded-full object-cover border border-white/20"
            />
            <div className="min-w-0">
              <p className="font-bold text-sm truncate">{entry.displayName}</p>
              <a
                href={twitterProfileUrl(entry.twitterHandle)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground text-xs hover:text-primary transition-colors"
                dir="ltr"
              >
                @{entry.twitterHandle}
              </a>
            </div>
          </div>
          {entry.tweetText && (
            <p className="mt-3 text-xs text-muted-foreground leading-6 line-clamp-3">
              {entry.tweetText}
            </p>
          )}
          <a
            href={entry.tweetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
          >
            <ExternalLink size={12} />
            مشاهده پست
          </a>
        </div>
      )}

      {entry.rank === 1 && <Crown className="text-yellow-400 w-5 h-5 -mb-1" />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={avatarUrl(entry.twitterHandle)}
        alt={entry.displayName}
        className={cn(
          "w-14 h-14 rounded-full object-cover border-2 bg-muted",
          style.ring
        )}
      />
      <p className="text-xs font-bold truncate max-w-full">{entry.displayName}</p>
      <p className="text-[10px] text-muted-foreground truncate max-w-full" dir="ltr">
        @{entry.twitterHandle}
      </p>
      <div
        className={cn(
          "w-full rounded-t-xl bg-gradient-to-t from-white/[0.03] to-white/10 border border-white/10 border-b-0 flex flex-col items-center justify-start pt-2",
          style.height
        )}
      >
        <span className="text-lg">{style.label}</span>
        <span className="text-[11px] text-muted-foreground">
          {faNum(entry.votes)} رای
        </span>
      </div>
    </div>
  );
}

export function LeaderboardPodium({ entries }: { entries: WinnerEntry[] }) {
  const byRank = (r: number) => entries.find((e) => e.rank === r);
  const first = byRank(1);
  const second = byRank(2);
  const third = byRank(3);

  return (
    <div className="flex items-end justify-center gap-3 px-2">
      {second ? <WinnerColumn entry={second} /> : <div className="flex-1" />}
      {first ? <WinnerColumn entry={first} /> : <div className="flex-1" />}
      {third ? <WinnerColumn entry={third} /> : <div className="flex-1" />}
    </div>
  );
}
