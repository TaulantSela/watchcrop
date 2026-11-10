/**
 * The scheduling gate: what a watch needs before it can be a daily puzzle.
 * The admin API enforces it and the admin page shows the same reasons, so the
 * rule lives in one place. See docs/RISKS.md for why each check exists.
 */

export const PHOTO_SOURCES = ["own", "licensed", "cc-by", "community"] as const;
export type PhotoSource = (typeof PHOTO_SOURCES)[number];

export type GateInput = {
  photoSource: string | null;
  photoLicense: string | null;
  attribution: string | null;
  distinctiveDesign: boolean;
  masterBlobKey: string | null;
  cropSpecs: unknown[] | null;
  logoQaAt: Date | string | null;
};

/** Every reason this watch can't be scheduled yet; empty means it can. */
export function schedulingProblems(w: GateInput): string[] {
  const problems: string[] = [];

  if (!w.photoSource) {
    problems.push("No photo source recorded.");
  } else if (w.photoSource === "community") {
    problems.push("Community photos are leads, not puzzle content: shoot it or license it.");
  } else if (w.photoSource === "licensed" && !w.photoLicense?.trim()) {
    problems.push("Licensed photo: record the license.");
  } else if (w.photoSource === "cc-by" && !w.attribution?.trim()) {
    problems.push("CC BY photo: record the attribution.");
  }
  if (w.distinctiveDesign && w.photoSource !== "own") {
    problems.push("Protected design (trade dress): own photos only.");
  }

  if (!w.masterBlobKey) problems.push("No master photo.");
  if ((w.cropSpecs?.length ?? 0) !== 6) problems.push("Needs 6 crop rectangles.");
  if (!w.logoQaAt) problems.push("Crops not yet checked for surviving logos.");

  return problems;
}
