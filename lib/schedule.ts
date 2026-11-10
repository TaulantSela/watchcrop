/** Calendar helpers for the daily schedule. Dates are YYYY-MM-DD day keys. */

export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/**
 * Puzzle numbers follow the calendar: #1 is the first scheduled day, so a
 * day's number never depends on the order puzzles happened to be scheduled in
 * (scheduling Dec 5 before Dec 3 used to give Dec 3 the higher number).
 */
export function puzzleNumberFor(date: string, firstDate: string): number {
  return daysBetween(firstDate, date) + 1;
}

export type Runway = {
  /** Consecutive scheduled days starting today (0 = today is empty). */
  days: number;
  /** Last day of that unbroken run, or null when today is empty. */
  through: string | null;
  /** Scheduled days within the horizon. */
  scheduledAhead: number;
  /** Empty days within the horizon, and the first few of them. */
  gapCount: number;
  nextGaps: string[];
};

/**
 * How long the daily runs unattended: the solvency metric behind the 180-day
 * buffer in docs/RISKS.md.
 */
export function runway(scheduled: Iterable<string>, today: string, horizon = 180): Runway {
  const set = new Set(scheduled);
  let days = 0;
  while (set.has(addDays(today, days))) days++;

  let scheduledAhead = 0;
  const gaps: string[] = [];
  for (let i = 0; i < horizon; i++) {
    const d = addDays(today, i);
    if (set.has(d)) scheduledAhead++;
    else gaps.push(d);
  }
  return {
    days,
    through: days ? addDays(today, days - 1) : null,
    scheduledAhead,
    gapCount: gaps.length,
    nextGaps: gaps.slice(0, 5),
  };
}
