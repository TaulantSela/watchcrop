import { describe, expect, it } from "vitest";
import { isBot } from "@/lib/bots";
import { horologyScore } from "@/lib/scoring";
import { buildShareString } from "@/lib/share";

const base = { puzzleNumber: 7, usedHint: false, gotReference: false, streak: 3, url: "watchcrop.app/s" };

describe("share string extras", () => {
  it("shows the score and the link on a solve", () => {
    expect(buildShareString({ ...base, solvedCropIndex: 1, medal: "gold", score: 150 })).toBe(
      "WatchCrop #7 — 2/6 🥇 · 150 pts · streak 3\n🟥🟨⬛⬛⬛⬛\nwatchcrop.app/s",
    );
  });

  it("never shows points on a loss, but still links", () => {
    expect(buildShareString({ ...base, solvedCropIndex: null, medal: "none", score: 150, streak: 0 })).toBe(
      "WatchCrop #7 — X/6\n🟥🟥🟥🟥🟥🟥\nwatchcrop.app/s",
    );
  });
});

describe("horology score", () => {
  const solve = { solved: true, gotReference: false, usedHint: false, partialRetries: 0 };

  it("rewards early crops and rarer watches", () => {
    expect(horologyScore({ ...solve, cropIndex: 0, difficultyWeight: 4 })).toBe(240);
    expect(horologyScore({ ...solve, cropIndex: 4, difficultyWeight: 1 })).toBe(20);
  });

  it("takes penalties for a hint and a model retry, never below 0", () => {
    expect(horologyScore({ ...solve, cropIndex: 2, difficultyWeight: 2, usedHint: true, partialRetries: 1 })).toBe(60);
    expect(horologyScore({ ...solve, cropIndex: 5, difficultyWeight: 1, usedHint: true })).toBe(0);
  });
});

describe("bot user agents", () => {
  it("flags crawlers and scripts, not browsers", () => {
    expect(isBot("Mozilla/5.0 (compatible; Googlebot/2.1)")).toBe(true);
    expect(isBot("facebookexternalhit/1.1")).toBe(true);
    expect(isBot("curl/8.4.0")).toBe(true);
    expect(isBot("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1")).toBe(false);
    expect(isBot(null)).toBe(false);
  });
});
