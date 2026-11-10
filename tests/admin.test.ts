import { describe, expect, it } from "vitest";
import { schedulingProblems, type GateInput } from "@/lib/provenance";
import { addDays, puzzleNumberFor, runway } from "@/lib/schedule";

const crops = Array.from({ length: 6 }, () => ({ x: 0, y: 0, w: 10, h: 10, blur: 0 }));
const ready: GateInput = {
  photoSource: "own",
  photoLicense: null,
  attribution: null,
  distinctiveDesign: false,
  masterBlobKey: "sub.jpg",
  cropSpecs: crops,
  logoQaAt: "2026-11-10T10:00:00Z",
};

describe("scheduling gate", () => {
  it("passes a fully prepared, self-shot watch", () => {
    expect(schedulingProblems(ready)).toEqual([]);
  });

  it("refuses a missing photo source", () => {
    expect(schedulingProblems({ ...ready, photoSource: null })).toContain("No photo source recorded.");
  });

  it("refuses community photos outright", () => {
    expect(schedulingProblems({ ...ready, photoSource: "community" }).join()).toMatch(/leads, not puzzle content/);
  });

  it("needs the license for licensed photos and the attribution for CC BY", () => {
    expect(schedulingProblems({ ...ready, photoSource: "licensed" })).toContain("Licensed photo: record the license.");
    expect(schedulingProblems({ ...ready, photoSource: "licensed", photoLicense: "Getty #123" })).toEqual([]);
    expect(schedulingProblems({ ...ready, photoSource: "cc-by" })).toContain("CC BY photo: record the attribution.");
  });

  it("only allows own photos for protected designs", () => {
    const licensedRoyalOak = { ...ready, photoSource: "licensed", photoLicense: "x", distinctiveDesign: true };
    expect(schedulingProblems(licensedRoyalOak)).toContain("Protected design (trade dress): own photos only.");
    expect(schedulingProblems({ ...ready, distinctiveDesign: true })).toEqual([]);
  });

  it("needs a master, exactly 6 crops and a logo sign-off", () => {
    const p = schedulingProblems({ ...ready, masterBlobKey: null, cropSpecs: crops.slice(1), logoQaAt: null });
    expect(p).toEqual([
      "No master photo.",
      "Needs 6 crop rectangles.",
      "Crops not yet checked for surviving logos.",
    ]);
  });
});

describe("schedule calendar", () => {
  it("numbers puzzles by date, not by scheduling order", () => {
    expect(puzzleNumberFor("2026-11-10", "2026-11-10")).toBe(1);
    expect(puzzleNumberFor("2026-12-05", "2026-11-10")).toBe(26);
    expect(puzzleNumberFor("2027-01-01", "2026-12-31")).toBe(2);
  });

  it("measures the unbroken run from today and finds the gaps", () => {
    const today = "2026-11-10";
    const scheduled = [0, 1, 2, 4].map((i) => addDays(today, i));
    const r = runway(scheduled, today, 7);
    expect(r).toEqual({
      days: 3,
      through: "2026-11-12",
      scheduledAhead: 4,
      gapCount: 3,
      nextGaps: ["2026-11-13", "2026-11-15", "2026-11-16"],
    });
  });

  it("reports an empty today as zero runway", () => {
    expect(runway(["2026-11-11"], "2026-11-10", 3)).toMatchObject({ days: 0, through: null });
  });
});
