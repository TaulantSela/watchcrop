import { previousDayKey } from "./daily";

/** Per-device player stats, persisted in localStorage. */
export type Stats = {
  lastDate: string; // last puzzle day a result was recorded for
  streak: number;
  maxStreak: number;
  played: number;
  wins: number;
  lastSolvedCrop: number | null; // null = lost
};

export const EMPTY_STATS: Stats = {
  lastDate: "",
  streak: 0,
  maxStreak: 0,
  played: 0,
  wins: 0,
  lastSolvedCrop: null,
};

/**
 * Records today's result. A win only extends the streak when the previous
 * result was for yesterday's puzzle; a missed day starts it over at 1.
 * Recording the same day twice is a no-op.
 */
export function recordResult(prev: Stats, date: string, solvedCropIndex: number | null): Stats {
  if (prev.lastDate === date) return prev;
  const won = solvedCropIndex !== null;
  const continues = prev.lastDate === previousDayKey(date);
  const streak = won ? (continues ? prev.streak : 0) + 1 : 0;
  return {
    lastDate: date,
    streak,
    maxStreak: Math.max(prev.maxStreak, streak),
    played: prev.played + 1,
    wins: prev.wins + (won ? 1 : 0),
    lastSolvedCrop: solvedCropIndex,
  };
}

/**
 * The streak still alive on `today`: a stored streak whose last result is
 * older than yesterday was already broken, even though nothing rewrote it.
 */
export function liveStreak(stats: Stats, today: string): number {
  return stats.lastDate === today || stats.lastDate === previousDayKey(today) ? stats.streak : 0;
}

/** Parses stored stats defensively; anything unreadable starts fresh. */
export function parseStats(raw: string | null): Stats {
  if (!raw) return EMPTY_STATS;
  try {
    const v = JSON.parse(raw);
    return v && typeof v === "object" ? { ...EMPTY_STATS, ...v } : EMPTY_STATS;
  } catch {
    return EMPTY_STATS;
  }
}
