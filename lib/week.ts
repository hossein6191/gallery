// Week logic on Tehran time. The Iranian week runs Saturday..Friday;
// voting opens on the configured weekday (default Friday) and each week's
// winners are finalized lazily once that week has passed.

const TEHRAN_TZ = "Asia/Tehran";

const WEEKDAY_INDEX: Record<string, number> = {
  saturday: 0,
  sunday: 1,
  monday: 2,
  tuesday: 3,
  wednesday: 4,
  thursday: 5,
  friday: 6,
};

export function tehranDateParts(date = new Date()) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: TEHRAN_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "long",
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(date).map((p) => [p.type, p.value])
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    weekday: String(parts.weekday).toLowerCase(),
  };
}

/** UTC-midnight timestamp of "today" as seen from Tehran — stable for day math. */
export function tehranDayStamp(date = new Date()): number {
  const { year, month, day } = tehranDateParts(date);
  return Date.UTC(year, month - 1, day);
}

/** 0 = Saturday .. 6 = Friday */
export function tehranWeekdayIndex(date = new Date()): number {
  return WEEKDAY_INDEX[tehranDateParts(date).weekday] ?? 0;
}

/** Stamp of the Saturday that starts the current Tehran week. */
export function currentWeekStartStamp(date = new Date()): number {
  const DAY = 86_400_000;
  return tehranDayStamp(date) - tehranWeekdayIndex(date) * DAY;
}

export function weekNumberFor(launchWeekStart: number, date = new Date()): number {
  const DAY = 86_400_000;
  const diff = currentWeekStartStamp(date) - launchWeekStart;
  return Math.max(1, Math.floor(diff / (7 * DAY)) + 1);
}

export function votingWeekday(): number {
  const name = (process.env.VOTE_WEEKDAY || "friday").toLowerCase();
  return WEEKDAY_INDEX[name] ?? WEEKDAY_INDEX.friday;
}

export function isVotingOpen(date = new Date()): boolean {
  if (process.env.FORCE_VOTING_OPEN === "1") return true;
  return tehranWeekdayIndex(date) === votingWeekday();
}

export const VOTING_DAY_FA: Record<number, string> = {
  0: "شنبه",
  1: "یکشنبه",
  2: "دوشنبه",
  3: "سه‌شنبه",
  4: "چهارشنبه",
  5: "پنجشنبه",
  6: "جمعه",
};

export function votingDayNameFa(): string {
  return VOTING_DAY_FA[votingWeekday()];
}
