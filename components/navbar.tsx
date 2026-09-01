"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LiquidButton } from "@/components/ui/liquid-glass-button";
import { avatarUrl, cn } from "@/lib/utils";
import { Menu, X, LogOut } from "lucide-react";
import { GenLayerMarkAnim } from "@/components/ui/genlayer-mark-anim";

type User = {
  id: number;
  twitterHandle: string;
  displayName: string;
};

const LINKS = [
  { href: "/", label: "خانه" },
  { href: "/gallery/art", label: "گالری هنری" },
  { href: "/gallery/text", label: "محتوای متنی" },
  { href: "/gallery/video", label: "ویدیو" },
  { href: "/winners", label: "برندگان" },
  { href: "/vote", label: "رای‌گیری" },
  { href: "/members", label: "اعضا" },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [checked, setChecked] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUser(d.user))
      .catch(() => setUser(null))
      .finally(() => setChecked(true));
  }, [pathname]);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/70 border-b border-white/5">
      <nav className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 font-black text-lg shrink-0">
          <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-primary/15">
            <GenLayerMarkAnim variant="strata" size={20} />
          </span>
          <span>
            گالری فارسی <span className="text-primary">GenLayer</span>
          </span>
        </Link>

        <div className="hidden lg:flex items-center gap-1">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm transition-colors",
                pathname === l.href
                  ? "bg-white/10 text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              )}
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="hidden lg:flex items-center gap-2 shrink-0">
          {!checked ? null : user ? (
            <>
              <LiquidButton size="sm" asChild>
                <Link href="/submit">ثبت پست</Link>
              </LiquidButton>
              <Link
                href="/profile"
                className="flex items-center gap-2 rounded-full bg-white/5 border border-white/10 py-1 pr-1 pl-3 hover:bg-white/10 transition-colors"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={avatarUrl(user.twitterHandle)}
                  alt={user.displayName}
                  className="w-7 h-7 rounded-full object-cover"
                />
                <span className="text-sm max-w-[9rem] truncate">{user.displayName}</span>
              </Link>
              <button
                onClick={logout}
                className="text-muted-foreground hover:text-destructive transition-colors p-2"
                title="خروج"
              >
                <LogOut size={16} />
              </button>
            </>
          ) : (
            <>
              <LiquidButton size="sm" asChild>
                <Link href="/login">ورود</Link>
              </LiquidButton>
              <LiquidButton size="sm" variant="primary" asChild>
                <Link href="/signup">ثبت‌نام</Link>
              </LiquidButton>
            </>
          )}
        </div>

        <button
          className="lg:hidden p-2 text-foreground"
          onClick={() => setOpen(!open)}
          aria-label="منو"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {open && (
        <div className="lg:hidden border-t border-white/5 px-4 py-4 flex flex-col gap-2 bg-background/95">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className={cn(
                "px-3 py-2 rounded-xl text-sm",
                pathname === l.href ? "bg-white/10" : "text-muted-foreground"
              )}
            >
              {l.label}
            </Link>
          ))}
          <div className="flex gap-2 mt-2">
            {user ? (
              <>
                <LiquidButton size="sm" asChild>
                  <Link href="/submit" onClick={() => setOpen(false)}>ثبت پست</Link>
                </LiquidButton>
                <LiquidButton size="sm" asChild>
                  <Link href="/profile" onClick={() => setOpen(false)}>پروفایل</Link>
                </LiquidButton>
                <LiquidButton size="sm" onClick={logout}>خروج</LiquidButton>
              </>
            ) : (
              <>
                <LiquidButton size="sm" asChild>
                  <Link href="/login" onClick={() => setOpen(false)}>ورود</Link>
                </LiquidButton>
                <LiquidButton size="sm" variant="primary" asChild>
                  <Link href="/signup" onClick={() => setOpen(false)}>ثبت‌نام</Link>
                </LiquidButton>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
