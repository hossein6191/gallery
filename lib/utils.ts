import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function faNum(n: number | string): string {
  return Number(n).toLocaleString("fa-IR");
}

export function avatarUrl(twitterHandle: string): string {
  const fallback = `https://api.dicebear.com/9.x/avataaars/png?seed=${encodeURIComponent(twitterHandle)}`;
  return `https://unavatar.io/x/${encodeURIComponent(twitterHandle)}?fallback=${encodeURIComponent(fallback)}`;
}

export function twitterProfileUrl(handle: string): string {
  return `https://x.com/${encodeURIComponent(handle)}`;
}

export function normalizeHandle(raw: string): string {
  return raw
    .trim()
    .replace(/^@+/, "")
    .replace(/^https?:\/\/(www\.)?(x|twitter)\.com\//i, "")
    .replace(/[/?#].*$/, "");
}
