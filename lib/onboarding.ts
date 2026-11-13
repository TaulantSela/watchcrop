/**
 * The admin's "Getting started" checklist: the path from an empty site to a
 * live daily game, in the order the roadmap gates it (demand first, then
 * content, then launch). Every step is decided by real data, so it ticks
 * itself off. Pure, so the page and the tests share it.
 */

export const RUNWAY_GOAL = 180;

/** Cookie remembering a hidden guide (set by the client, read by the server). */
export const GUIDE_COOKIE = "wc_guide";

export type OnboardingFacts = {
  /** Visits that arrived through a link with a utm_source tag. */
  taggedVisits: number;
  /** Waitlist signups, not counting ones BotID flagged. */
  signups: number;
  watches: number;
  /** Watches with an uploaded master photo. */
  withPhoto: number;
  /** Watches whose crops passed the logo check. */
  signedOff: number;
  /** Puzzles ever scheduled. */
  scheduled: number;
  /** Days scheduled within the next RUNWAY_GOAL days. */
  runwayAhead: number;
  live: boolean;
};

export type StepId = "share" | "signups" | "watch" | "photo" | "logo" | "schedule" | "runway" | "live";

export type Step = {
  id: StepId;
  title: string;
  /** Where things stand right now, in a few words. */
  status: string;
  done: boolean;
  progress?: { value: number; goal: number };
};

const n = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;

export function onboardingSteps(f: OnboardingFacts): { steps: Step[]; current: StepId | null; doneCount: number } {
  const steps: Step[] = [
    {
      id: "share",
      title: "Share a tagged link",
      status: f.taggedVisits ? `${n(f.taggedVisits, "visit")} from tagged links` : "No tagged visits yet",
      done: f.taggedVisits > 0,
    },
    {
      id: "signups",
      title: "Get your first signups",
      status: f.signups ? `${n(f.signups, "signup")} on the waitlist` : "Nobody on the waitlist yet",
      done: f.signups > 0,
    },
    {
      id: "watch",
      title: "Add your first watch",
      status: f.watches ? `${n(f.watches, "watch", "watches")} in the catalog` : "The catalog is empty",
      done: f.watches > 0,
    },
    {
      id: "photo",
      title: "Upload its photo",
      status: f.withPhoto ? `${n(f.withPhoto, "watch", "watches")} with a photo` : "No photos yet",
      done: f.withPhoto > 0,
    },
    {
      id: "logo",
      title: "Mask the logos and sign off",
      status: f.signedOff ? `${n(f.signedOff, "watch", "watches")} signed off` : "Nothing signed off yet",
      done: f.signedOff > 0,
    },
    {
      id: "schedule",
      title: "Schedule the first puzzle",
      status: f.scheduled ? `${n(f.scheduled, "puzzle")} scheduled` : "Nothing scheduled",
      done: f.scheduled > 0,
    },
    {
      id: "runway",
      title: `Fill ${RUNWAY_GOAL} days of runway`,
      status: `${f.runwayAhead} of ${RUNWAY_GOAL} days scheduled`,
      done: f.runwayAhead >= RUNWAY_GOAL,
      progress: { value: Math.min(f.runwayAhead, RUNWAY_GOAL), goal: RUNWAY_GOAL },
    },
    {
      id: "live",
      title: "Go live",
      status: f.live ? "The game is live" : "Waitlist only",
      done: f.live,
    },
  ];
  return {
    steps,
    current: steps.find((s) => !s.done)?.id ?? null,
    doneCount: steps.filter((s) => s.done).length,
  };
}
