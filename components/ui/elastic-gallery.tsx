"use client";

import { cn } from "@/lib/utils";
import { ArrowUpLeft } from "lucide-react";
import { useState } from "react";
import { GenLayerMarkAnim } from "@/components/ui/genlayer-mark-anim";

export interface ElasticItem {
  id: string;
  title: string;
  category: string;
  src: string | null;
  alt: string;
  href: string;
  handle?: string;
  excerpt?: string | null;
}

const FALLBACK_GRADIENTS = [
  "linear-gradient(135deg, #4c3b8f 0%, #1c2340 100%)",
  "linear-gradient(135deg, #0e5e6f 0%, #131b33 100%)",
  "linear-gradient(135deg, #7a2e57 0%, #241531 100%)",
  "linear-gradient(135deg, #6d5310 0%, #221a10 100%)",
  "linear-gradient(135deg, #24557a 0%, #101a2c 100%)",
];

function ElasticGallery({ items }: { items: ElasticItem[] }) {
  const [activeId, setActiveId] = useState<string | null>(items[0]?.id ?? null);

  if (!items.length) return null;

  return (
    <div className="w-full">
      <div className="mx-auto flex h-[420px] w-full max-w-6xl flex-col gap-2 md:h-[520px] md:flex-row md:gap-4">
        {items.map((item, i) => (
          <div
            key={item.id}
            onMouseEnter={() => setActiveId(item.id)}
            onClick={() => setActiveId(item.id)}
            className={cn(
              "relative cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-card",
              "transition-[flex,filter] duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]",
              activeId === item.id ? "flex-[4]" : "flex-[1]",
              activeId === item.id
                ? "brightness-100"
                : "brightness-50 hover:brightness-75"
            )}
          >
            <div className="absolute inset-0 h-full w-full">
              {item.src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.src}
                  alt={item.alt}
                  className={cn(
                    "h-full w-full object-cover transition-transform duration-1000",
                    activeId === item.id ? "scale-100" : "scale-110"
                  )}
                />
              ) : (
                <div
                  className="relative h-full w-full flex items-center justify-center p-6"
                  style={{ background: FALLBACK_GRADIENTS[i % FALLBACK_GRADIENTS.length] }}
                >
                  <GenLayerMarkAnim variant="spark" size={140} className="absolute opacity-30" />
                  {activeId === item.id && item.excerpt && (
                    <p dir="auto" className="text-white/70 text-sm leading-7 line-clamp-6 max-w-md text-center">
                      {item.excerpt}
                    </p>
                  )}
                </div>
              )}
              <div
                className={cn(
                  "absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent transition-opacity duration-500",
                  activeId === item.id ? "opacity-100" : "opacity-0"
                )}
              />
            </div>

            <div className="absolute bottom-0 left-0 right-0 flex h-full flex-col justify-end p-4 md:p-8">
              <div
                className={cn(
                  "flex flex-col gap-2 transition-all duration-500",
                  activeId === item.id
                    ? "translate-y-0 opacity-100 delay-200"
                    : "translate-y-12 opacity-0"
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-white/30 bg-white/10 px-3 py-1 text-[11px] font-medium tracking-wider text-white backdrop-blur-md">
                    {item.category}
                  </span>
                </div>

                <h3 className="text-xl font-black leading-tight text-white md:text-3xl">
                  {item.title}
                </h3>
                {item.handle && (
                  <p className="text-white/60 text-xs" dir="ltr">
                    @{item.handle}
                  </p>
                )}

                <a
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="mt-2 flex w-fit items-center gap-2 text-xs font-bold tracking-widest text-white/80 hover:text-white md:mt-3 md:text-sm transition-colors"
                >
                  مشاهده پست
                  <ArrowUpLeft className="h-3 w-3 md:h-4 md:w-4" />
                </a>
              </div>

              <div
                className={cn(
                  "absolute transition-all duration-500",
                  "bottom-4 left-1/2 -translate-x-1/2 md:bottom-8",
                  activeId === item.id ? "opacity-0 scale-50" : "opacity-100 delay-500"
                )}
              >
                <span className="hidden whitespace-nowrap text-lg font-bold tracking-widest text-white [writing-mode:vertical-rl] md:block">
                  {item.title}
                </span>
                <span className="block text-xs font-bold text-white md:hidden">
                  {item.title}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export { ElasticGallery };
