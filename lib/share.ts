import { MAX_CROPS } from "./daily";
import type { Medal } from "./scoring";

export type ShareInput = {
  puzzleNumber: number;
  solvedCropIndex: number | null; // 0-based, or null if lost
  medal: Medal;
  usedHint: boolean;
  gotReference: boolean;
  streak: number;
  siteName?: string;
  /** Horology Score, shown for solves: the depth axis, worth bragging about. */
  score?: number | null;
  /** Where friends can play, e.g. "watchcrop.app/s". */
  url?: string;
};

const MEDAL_SQUARE: Record<Medal, string> = {
  gold: "🟨",
  silver: "⬜",
  bronze: "🟧",
  none: "⬛",
};

/**
 * Spoiler-free share grid — the #1 growth feature. NEVER contains the answer.
 * Example:
 *   WatchCrop #142 — 3/6 🥈⭐ · 120 pts · streak 24
 *   🟥🟥⬜⬛⬛⬛
 *   watchcrop.app/s
 */
export function buildShareString(input: ShareInput): string {
  const site = input.siteName ?? "WatchCrop";
  const solved = input.solvedCropIndex !== null;

  const squares: string[] = [];
  for (let i = 0; i < MAX_CROPS; i++) {
    if (solved && i === input.solvedCropIndex) {
      squares.push(MEDAL_SQUARE[input.medal]);
    } else if (!solved || i < (input.solvedCropIndex ?? 0)) {
      squares.push("🟥"); // a missed crop (a loss misses all of them)
    } else {
      squares.push("⬛"); // never needed
    }
  }

  const result = solved ? `${(input.solvedCropIndex ?? 0) + 1}/${MAX_CROPS}` : `X/${MAX_CROPS}`;
  const flags =
    (solved ? medalEmoji(input.medal) : "") + (input.gotReference ? "⭐" : "") + (input.usedHint ? "🔧" : "");

  const header =
    `${site} #${input.puzzleNumber} — ${result} ${flags}`.trim() +
    (solved && input.score ? ` · ${input.score} pts` : "") +
    (input.streak > 0 ? ` · streak ${input.streak}` : "");

  return [header, squares.join(""), input.url].filter(Boolean).join("\n");
}

function medalEmoji(medal: Medal): string {
  switch (medal) {
    case "gold":
      return "🥇";
    case "silver":
      return "🥈";
    case "bronze":
      return "🥉";
    default:
      return "";
  }
}
