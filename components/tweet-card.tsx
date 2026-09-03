"use client";

import { avatarUrl, twitterProfileUrl, faNum, cn } from "@/lib/utils";
import { ExternalLink, Heart } from "lucide-react";

export interface SubmissionItem {
  id: number;
  category: "art" | "text" | "video";
  tweet_url: string;
  tweet_text: string | null;
  image_url: string | null;
  file_url?: string | null;
  file_type?: "image" | "video" | null;
  week_number: number;
  twitter_handle?: string;
  display_name?: string;
  vote_count?: number;
}

const CATEGORY_CHIP: Record<SubmissionItem["category"], { label: string; cls: string }> = {
  art: { label: "هنری", cls: "bg-pink-500/15 text-pink-400" },
  text: { label: "متنی", cls: "bg-cyan-500/15 text-cyan-400" },
  video: { label: "ویدیویی", cls: "bg-violet-500/15 text-violet-400" },
};

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
  const chip = CATEGORY_CHIP[item.category];
  // uploaded file wins; otherwise the image fetched from the tweet
  const showVideo = item.file_type === "video" && item.file_url;
  const coverUrl =
    item.file_type === "image" && item.file_url ? item.file_url : item.image_url;
  const showImage = !showVideo && Boolean(coverUrl);

  return (
    <div
      className={cn(
        "glass-panel overflow-hidden flex flex-col transition-transform duration-300 hover:-translate-y-1",
        className
      )}
    >
      {showVideo && (
        <video
          src={item.file_url!}
          poster={item.image_url ?? undefined}
          controls
          preload="metadata"
          playsInline
          className="w-full aspect-video object-contain bg-black/40"
        />
      )}
      {showImage && (
        // Whole cover always visible (object-contain); a blurred copy fills
        // the box behind it so odd aspect ratios never leave empty bars.
        <div
          className={cn(
            "relative w-full overflow-hidden bg-black/30",
            item.category === "art" ? "aspect-[4/3]" : "aspect-[16/10]"
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverUrl!}
            alt=""
            aria-hidden
            className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110 opacity-50"
            loading="lazy"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverUrl!}
            alt={item.tweet_text ?? "کاور پست"}
            className="relative w-full h-full object-contain"
            loading="lazy"
          />
        </div>
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
          <span className={cn("shrink-0 rounded-full px-3 py-1 text-[10px] font-bold", chip.cls)}>
            {chip.label}
          </span>
        </div>

        {item.tweet_text && (
          <p className="text-sm text-foreground/80 leading-7 line-clamp-4 flex-1" dir="auto">
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
