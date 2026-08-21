"use client";

import { useEffect, useState } from "react";
import { avatarUrl, twitterProfileUrl, faNum } from "@/lib/utils";
import { Search, ExternalLink, Users } from "lucide-react";

type Member = {
  id: number;
  twitter_handle: string;
  display_name: string;
  created_at: string;
};

export default function MembersPage() {
  const [q, setQ] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      fetch(`/api/members?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((d) => setMembers(d.members ?? []))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="pt-10 flex flex-col gap-8">
      <div className="text-center flex flex-col items-center gap-3">
        <span className="flex items-center justify-center w-14 h-14 rounded-2xl bg-secondary/15 text-secondary">
          <Users size={28} />
        </span>
        <h1 className="font-nastaliq text-3xl font-black">اعضای گالری</h1>
        <p className="text-muted-foreground">
          {faNum(members.length)} عضو — همدیگر را پیدا کنید و دنبال کنید
        </p>
      </div>

      <div className="relative max-w-md mx-auto w-full" dir="ltr">
        <Search
          size={16}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
        />
        <input
          dir="ltr"
          className="glass-input pl-11 text-left"
          placeholder="@username یا اسم..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground text-sm py-8">در حال جستجو...</p>
      ) : members.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((m) => (
            <div
              key={m.id}
              className="glass-panel p-4 flex items-center gap-3 hover:-translate-y-0.5 transition-transform duration-300"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={avatarUrl(m.twitter_handle)}
                alt={m.display_name}
                className="w-12 h-12 rounded-full object-cover border border-white/15 bg-muted"
                loading="lazy"
              />
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm truncate">{m.display_name}</p>
                <p className="text-muted-foreground text-xs truncate" dir="ltr">
                  @{m.twitter_handle}
                </p>
              </div>
              <a
                href={twitterProfileUrl(m.twitter_handle)}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 flex items-center gap-1.5 rounded-full bg-primary/15 text-primary px-3 py-1.5 text-xs hover:bg-primary/25 transition-colors"
              >
                <ExternalLink size={12} />
                توییتر
              </a>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center text-muted-foreground py-8">
          {q ? "عضوی با این مشخصات پیدا نشد" : "هنوز عضوی ثبت‌نام نکرده"}
        </p>
      )}
    </div>
  );
}
