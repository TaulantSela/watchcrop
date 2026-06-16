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
 *   WatchCrop #142 — 3/6 🥈⭐ · streak 24
 *   ⬛⬛⬜⬛⬛⬛
 */
export function buildShareString(input: ShareInput): string {
  const site = input.siteName ?? "WatchCrop";
  const solved = input.solvedCropIndex !== null;

  const squares: string[] = [];
  for (let i = 0; i < MAX_CROPS; i++) {
    if (solved && i === input.solvedCropIndex) {
      squares.push(MEDAL_SQUARE[input.medal]);
    } else if (solved && i < (input.solvedCropIndex ?? 0)) {
      squares.push("🟥"); // missed crops before the solve
    } else {
      squares.push("⬛");
    }
  }

  const result = solved ? `${(input.solvedCropIndex ?? 0) + 1}/${MAX_CROPS}` : `X/${MAX_CROPS}`;
  const flags =
    (solved ? medalEmoji(input.medal) : "") + (input.gotReference ? "⭐" : "") + (input.usedHint ? "🔧" : "");

  const header = `${site} #${input.puzzleNumber} — ${result} ${flags}`.trim() +
    (input.streak > 0 ? ` · streak ${input.streak}` : "");

  return `${header}\n${squares.join("")}`;
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
