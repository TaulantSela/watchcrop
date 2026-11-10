import { describe, expect, it } from "vitest";
import { previousDayKey, todayKey } from "@/lib/daily";
import { dateForOffset } from "@/lib/seed-data";
import { buildShareString } from "@/lib/share";
import { EMPTY_STATS, liveStreak, parseStats, recordResult } from "@/lib/stats";

describe("streaks", () => {
  const onDay = (date: string, streak: number) => ({ ...EMPTY_STATS, lastDate: date, streak, maxStreak: streak });

  it("a win the day after a result extends the streak", () => {
    expect(recordResult(onDay("2026-11-09", 4), "2026-11-10", 2).streak).toBe(5);
  });

  it("a win after a missed day starts over at 1", () => {
    const next = recordResult(onDay("2026-11-07", 4), "2026-11-10", 2);
    expect(next.streak).toBe(1);
    expect(next.maxStreak).toBe(4);
  });

  it("a loss resets to 0", () => {
    expect(recordResult(onDay("2026-11-09", 4), "2026-11-10", null).streak).toBe(0);
  });

  it("recording the same day twice is a no-op", () => {
    const once = recordResult(onDay("2026-11-09", 4), "2026-11-10", 2);
    expect(recordResult(once, "2026-11-10", 2)).toBe(once);
  });

  it("a stale stored streak displays as 0", () => {
    expect(liveStreak(onDay("2026-11-09", 4), "2026-11-10")).toBe(4);
    expect(liveStreak(onDay("2026-11-08", 4), "2026-11-10")).toBe(0);
  });

  it("parses junk storage as empty stats", () => {
    expect(parseStats(null)).toEqual(EMPTY_STATS);
    expect(parseStats("null")).toEqual(EMPTY_STATS);
    expect(parseStats("{not json")).toEqual(EMPTY_STATS);
  });
});

describe("day keys", () => {
  it("previousDayKey crosses month and year boundaries", () => {
    expect(previousDayKey("2026-03-01")).toBe("2026-02-28");
    expect(previousDayKey("2027-01-01")).toBe("2026-12-31");
  });

  it("seeded day 0 is the game's today, even inside the reset-offset window", () => {
    for (const iso of ["2026-11-10T02:00:00Z", "2026-11-10T12:00:00Z", "2026-12-31T03:00:00Z"]) {
      const now = new Date(iso);
      expect(dateForOffset(0, now)).toBe(todayKey(now));
    }
  });
});

describe("share grid", () => {
  const base = { puzzleNumber: 7, usedHint: false, gotReference: false, streak: 0 };

  it("a loss shows every crop as missed", () => {
    expect(buildShareString({ ...base, solvedCropIndex: null, medal: "none" })).toBe(
      "WatchCrop #7 — X/6\n🟥🟥🟥🟥🟥🟥",
    );
  });

  it("a solve shows misses, the medal, then unused crops", () => {
    expect(buildShareString({ ...base, solvedCropIndex: 2, medal: "silver", streak: 3 })).toBe(
      "WatchCrop #7 — 3/6 🥈 · streak 3\n🟥🟥⬜⬛⬛⬛",
    );
  });

  it("never contains the answer", () => {
    const s = buildShareString({ ...base, solvedCropIndex: 0, medal: "gold" });
    expect(s).not.toMatch(/rolex|submariner/i);
  });
});
