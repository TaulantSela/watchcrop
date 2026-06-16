import { MAX_CROPS } from "./daily";

export type Medal = "gold" | "silver" | "bronze" | "none";

/** GeoGuessr-style tiers: solve early = better medal. cropIndex is 0-based. */
export function medalForCrop(cropIndex: number, solved: boolean): Medal {
  if (!solved) return "none";
  if (cropIndex <= 1) return "gold"; // crops 1-2
  if (cropIndex <= 3) return "silver"; // crops 3-4
  return "bronze"; // crops 5-6
}

export type ScoreInput = {
  cropIndex: number; // 0-based crop the watch was solved on
  solved: boolean;
  difficultyWeight: number; // 1..5, intrinsic to the watch
  gotReference: boolean;
  usedHint: boolean;
  partialRetries: number; // brand-right/model-wrong retries used
};

/**
 * The depth axis (the thing incumbents lack): nailing an obscure grail early
 * scores far more than an easy Submariner. Returns 0 for an unsolved puzzle.
 */
export function horologyScore({
  cropIndex,
  solved,
  difficultyWeight,
  gotReference,
  usedHint,
  partialRetries,
}: ScoreInput): number {
  if (!solved) return 0;
  const base = (MAX_CROPS - cropIndex) * difficultyWeight * 10;
  const refBonus = gotReference ? 50 : 0;
  const hintPenalty = usedHint ? 15 : 0;
  const retryPenalty = partialRetries * 5;
  return Math.max(0, base + refBonus - hintPenalty - retryPenalty);
}
