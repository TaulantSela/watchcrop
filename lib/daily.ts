/** Total crops per puzzle (extreme macro -> whole watch). */
export const MAX_CROPS = 6;

/**
 * The puzzle "day" key, as YYYY-MM-DD.
 *
 * `RESET_OFFSET_HOURS` shifts the rollover away from UTC midnight. The default
 * -5 rolls the puzzle over at 05:00 UTC: midnight US Eastern (01:00 in summer)
 * and 06:00 CET, so US players get it at midnight and Europe at breakfast.
 * Tune before launch; it's one line. (It ignores DST.)
 */
const RESET_OFFSET_HOURS = -5;

export function todayKey(now: Date = new Date()): string {
  const shifted = new Date(now.getTime() + RESET_OFFSET_HOURS * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 10);
}

/** Seconds until the next puzzle rolls over (for the countdown on the reveal). */
export function secondsUntilNext(now: Date = new Date()): number {
  const shifted = new Date(now.getTime() + RESET_OFFSET_HOURS * 60 * 60 * 1000);
  const nextMidnight = new Date(
    Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate() + 1),
  );
  return Math.max(0, Math.floor((nextMidnight.getTime() - shifted.getTime()) / 1000));
}
