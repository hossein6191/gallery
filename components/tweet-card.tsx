"use client";

import { avatarUrl, twitterProfileUrl, faNum, cn } from "@/lib/utils";
import { ExternalLink, Heart } from "lucide-react";

export interface SubmissionItem {
  id: number;
  category: "art" | "text";
  tweet_url: string;
  tweet_text: string | null;
  image_url: string | null;
  week_number: number;
  twitter_handle?: string;
  display_name?: string;
  vote_count?: number;
}

export function TweetCard({
  item,
  action,
  className,
}: {
  item: SubmissionItem;
  action?: React.ReactNode;
  className?: string;
}) {
  const handle = item.twitter_handle ?? "";
  return (
    <div
      className={cn(
        "glass-panel overflow-hidden flex flex-col transition-transform duration-300 hover:-translate-y-1",
        className
      )}
    >
      {item.category === "art" && item.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.image_url}
          alt={item.tweet_text ?? "اثر هنری"}
          className="w-full aspect-[4/3] object-cover"
          loading="lazy"
        />
      )}

      <div className="p-4 flex flex-col gap-3 flex-1">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={avatarUrl(handle)}
            alt={item.display_name ?? handle}
            className="w-10 h-10 rounded-full object-cover border border-white/15 bg-muted"
            loading="lazy"
          />
          <div className="min-w-0 flex-1">
            <p className="font-bold text-sm truncate">{item.display_name}</p>
            <a
              href={twitterProfileUrl(handle)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground text-xs hover:text-primary transition-colors"
              dir="ltr"
            >
              @{handle}
            </a>
          </div>
          <span
            className={cn(
              "shrink-0 rounded-full px-3 py-1 text-[10px] font-bold",
              item.category === "art"
                ? "bg-pink-500/15 text-pink-400"
                : "bg-cyan-500/15 text-cyan-400"
            )}
          >
            {item.category === "art" ? "هنری" : "متنی"}
          </span>
        </div>

        {item.tweet_text && (
          <p className="text-sm text-foreground/80 leading-7 line-clamp-4 flex-1">
            {item.tweet_text}
          </p>
        )}

        <div className="flex items-center justify-between mt-auto pt-2 border-t border-white/5">
          <div className="flex items-center gap-3">
            <a
              href={item.tweet_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
            >
              <ExternalLink size={13} />
              مشاهده پست
            </a>
            {typeof item.vote_count === "number" && item.vote_count > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Heart size={12} className="text-pink-400" />
                {faNum(item.vote_count)}
              </span>
            )}
          </div>
          {action}
        </div>
      </div>
    </div>
  );
}
