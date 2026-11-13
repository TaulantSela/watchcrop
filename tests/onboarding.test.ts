import { describe, expect, it } from "vitest";
import { onboardingSteps, RUNWAY_GOAL, type OnboardingFacts } from "@/lib/onboarding";

const empty: OnboardingFacts = {
  taggedVisits: 0,
  signups: 0,
  watches: 0,
  withPhoto: 0,
  signedOff: 0,
  scheduled: 0,
  runwayAhead: 0,
  live: false,
};

describe("getting started", () => {
  it("starts at sharing a tagged link, demand before content", () => {
    const g = onboardingSteps(empty);
    expect(g.current).toBe("share");
    expect(g.doneCount).toBe(0);
    expect(g.steps.map((s) => s.id)).toEqual(["share", "signups", "watch", "photo", "logo", "schedule", "runway", "live"]);
  });

  it("points at the first unfinished step and describes the live numbers", () => {
    const g = onboardingSteps({ ...empty, taggedVisits: 41, signups: 1, watches: 2 });
    expect(g.current).toBe("photo");
    expect(g.doneCount).toBe(3);
    const status = Object.fromEntries(g.steps.map((s) => [s.id, s.status]));
    expect(status).toMatchObject({
      share: "41 visits from tagged links",
      signups: "1 signup on the waitlist",
      watch: "2 watches in the catalog",
      photo: "No photos yet",
    });
  });

  it("tracks runway progress toward the goal", () => {
    const runway = onboardingSteps({ ...empty, runwayAhead: 45 }).steps.find((s) => s.id === "runway")!;
    expect(runway).toMatchObject({ done: false, status: `45 of ${RUNWAY_GOAL} days scheduled`, progress: { value: 45, goal: RUNWAY_GOAL } });
  });

  it("is finished once everything is done", () => {
    const all = { taggedVisits: 1, signups: 1, watches: 1, withPhoto: 1, signedOff: 1, scheduled: 180, runwayAhead: 180, live: true };
    expect(onboardingSteps(all)).toMatchObject({ current: null, doneCount: 8 });
  });
});
