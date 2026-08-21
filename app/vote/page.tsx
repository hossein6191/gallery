"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { TweetCard, type SubmissionItem } from "@/components/tweet-card";
import { LiquidButton } from "@/components/ui/liquid-glass-button";
import { faNum } from "@/lib/utils";
import { Vote, Lock, CheckCircle2 } from "lucide-react";

type VoteStatus = {
  open: boolean;
  votingDay: string;
  week: number;
  myVotes: { category: string; submission_id: number }[];
};

export default function VotePage() {
  const [status, setStatus] = useState<VoteStatus | null>(null);
  const [subs, setSubs] = useState<SubmissionItem[]>([]);
  const [loggedIn, setLoggedIn] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const [s, me] = await Promise.all([
      fetch("/api/votes").then((r) => r.json()),
      fetch("/api/auth/me").then((r) => r.json()),
    ]);
    setStatus(s);
    setLoggedIn(Boolean(me.user));
    const subsRes = await fetch(`/api/submissions?week=${s.week}`).then((r) => r.json());
    setSubs(subsRes.submissions ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const castVote = async (submissionId: number) => {
    setMessage("");
    const res = await fetch("/api/votes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submissionId }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error ?? "خطایی رخ داد");
      return;
    }
    setMessage("رای تو ثبت شد ✅");
    load();
  };

  if (!status) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-muted-foreground">
        در حال بارگذاری...
      </div>
    );
  }

  const art = subs.filter((s) => s.category === "art");
  const text = subs.filter((s) => s.category === "text");
  const votedIds = new Set(status.myVotes.map((v) => v.submission_id));

  return (
    <div className="pt-10 flex flex-col gap-10">
      <div className="text-center flex flex-col items-center gap-3">
        <span
          className={`flex items-center justify-center w-14 h-14 rounded-2xl ${
            status.open ? "bg-primary/15 text-primary" : "bg-white/5 text-muted-foreground"
          }`}
        >
          {status.open ? <Vote size={28} /> : <Lock size={26} />}
        </span>
        <h1 className="font-nastaliq text-3xl font-black">رای‌گیری هفته {faNum(status.week)}</h1>
        {status.open ? (
          <p className="text-emerald-400 text-sm font-bold">
            رای‌گیری باز است! در هر بخش به یک پست رای بده.
          </p>
        ) : null}
        <p className="text-muted-foreground text-xs max-w-md leading-6">
          فقط پست‌هایی که همین هفته توییت شده‌اند اینجا می‌آیند — بخش ویدیو فعلا
          مسابقه ندارد.
        </p>
        {!status.open && (
          <p className="text-muted-foreground max-w-md leading-8">
            رای‌گیری فقط روز <b className="text-foreground">{status.votingDay}</b> هر
            هفته باز می‌شود. تا آن موقع می‌توانی پست‌های این هفته را ببینی.
          </p>
        )}
        {!loggedIn && status.open && (
          <div className="flex items-center gap-2 mt-1">
            <p className="text-sm text-amber-400">برای رای دادن باید وارد شوی</p>
            <LiquidButton size="sm" asChild>
              <Link href="/login">ورود</Link>
            </LiquidButton>
          </div>
        )}
        {message && <p className="text-sm text-primary">{message}</p>}
      </div>

      {[
        { key: "art", label: "بخش هنری", items: art },
        { key: "text", label: "بخش محتوای متنی", items: text },
      ].map((section) => (
        <section key={section.key} className="flex flex-col gap-4">
          <h2 className="text-xl font-bold">{section.label}</h2>
          {section.items.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {section.items.map((item) => (
                <TweetCard
                  key={item.id}
                  item={item}
                  action={
                    status.open && loggedIn ? (
                      votedIds.has(item.id) ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-bold">
                          <CheckCircle2 size={14} />
                          رای تو
                        </span>
                      ) : (
                        <LiquidButton size="sm" onClick={() => castVote(item.id)}>
                          رای می‌دهم
                        </LiquidButton>
                      )
                    ) : undefined
                  }
                />
              ))}
            </div>
          ) : (
            <div className="glass-panel border-dashed p-10 text-center text-muted-foreground text-sm">
              این هفته هنوز پستی در این بخش ثبت نشده
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
