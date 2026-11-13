"use client";

import { useState, type ReactNode } from "react";
import { GUIDE_COOKIE, RUNWAY_GOAL, type Step, type StepId } from "@/lib/onboarding";

/** Remembered per browser in a cookie, so the server renders it right first time. */
function rememberHidden(hidden: boolean) {
  document.cookie = `${GUIDE_COOKIE}=${hidden ? "hidden" : "shown"}; Path=/admin; Max-Age=31536000; SameSite=Lax`;
}

/* --- small pieces --------------------------------------------------------- */
const quiet = "rounded border border-white/15 px-3 py-1.5 text-sm hover:border-white/40";

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [state, setState] = useState<"idle" | "done" | "failed">("idle");
  return (
    <button
      type="button"
      className={quiet}
      onClick={() =>
        navigator.clipboard.writeText(text).then(
          () => setState("done"),
          () => setState("failed"),
        )
      }
    >
      {state === "done" ? "Copied ✓" : state === "failed" ? "Select and copy" : label}
    </button>
  );
}

function Jump({ to, children }: { to: string; children: ReactNode }) {
  return (
    <a href={`#${to}`} className={`${quiet} inline-block`}>
      {children} ↓
    </a>
  );
}

const slug = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const SOURCES = ["reddit", "watchuseek", "instagram", "x", "discord"];

/** Builds the tagged link to post, so the Demand panel can tell communities apart. */
function LinkBuilder({ origin }: { origin: string }) {
  const [source, setSource] = useState("reddit");
  const [campaign, setCampaign] = useState("");
  const params = new URLSearchParams({ utm_source: slug(source) || "unknown" });
  if (slug(campaign)) params.set("utm_campaign", slug(campaign));
  const url = `${origin}/?${params}`;

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-white/10 p-3">
      <div className="flex flex-wrap gap-1.5">
        {SOURCES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSource(s)}
            className={`rounded-full border px-2.5 py-0.5 text-xs ${slug(source) === s ? "border-[var(--gold)] text-[var(--gold)]" : "border-white/15 text-[var(--muted)]"}`}
          >
            {s}
          </button>
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
          Where you&apos;re posting
          <input
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="rounded border border-white/10 bg-[var(--bg)] px-2 py-1.5 text-sm text-[var(--ink)] outline-none focus:border-[var(--gold)]"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
          Which post (optional)
          <input
            value={campaign}
            onChange={(e) => setCampaign(e.target.value)}
            placeholder="r-watches-nov"
            className="rounded border border-white/10 bg-[var(--bg)] px-2 py-1.5 text-sm text-[var(--ink)] outline-none focus:border-[var(--gold)]"
          />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <code className="min-w-0 flex-1 break-all rounded bg-black/30 px-2 py-1.5 text-xs">{url}</code>
        <CopyButton text={url} label="Copy link" />
      </div>
    </div>
  );
}

const GO_LIVE = `cd ~/Personal/Projects/watchcrop
npx vercel@latest env add NEXT_PUBLIC_GAME_LIVE -e production --value true --yes
npx vercel@latest redeploy watchcrop.vercel.app`;

/* --- what to do for each step --------------------------------------------- */
const how = (origin: string): Record<StepId, ReactNode> => ({
  share: (
    <>
      <p>
        Post the game where watch people hang out, with a link that says where you posted it. The Demand panel
        then shows which communities actually sign up. Use a different link for every place.
      </p>
      <LinkBuilder origin={origin} />
    </>
  ),
  signups: (
    <>
      <p>
        Signups land in Demand, split by where they came from. Give each post a few days, then compare
        conversion, not raw visits. Before building more, the roadmap asks for a believable path to about 1,000
        daily players.
      </p>
      <div>
        <Jump to="demand">See Demand</Jump>
      </div>
    </>
  ),
  watch: (
    <>
      <p>
        Start with a watch you can photograph yourself: your own, a friend&apos;s, or one a shop lends you. When
        adding it, say where the photo comes from. Only your own photos or paid licenses can become puzzles.
      </p>
      <div>
        <Jump to="add-watch">Add a watch</Jump>
      </div>
    </>
  ),
  photo: (
    <>
      <p>
        In the catalog, open <strong>Photo &amp; crops</strong> on the watch and upload the photo. A sharp,
        straight-on shot on a plain background works best. Six crops are cut right away, from a close-up detail
        to the whole watch.
      </p>
      <div>
        <Jump to="catalog">Go to the catalog</Jump>
      </div>
    </>
  ),
  logo: (
    <>
      <p>
        Draw a red mask over every logo, brand name and signed text (dial, bezel, crown, clasp), then{" "}
        <strong>Save and re-cut</strong>. Look at all six crops. If nothing readable survives, press{" "}
        <strong>Sign off logo check</strong>.
      </p>
      <div>
        <Jump to="catalog">Go to the catalog</Jump>
      </div>
    </>
  ),
  schedule: (
    <>
      <p>
        Pick a signed-off watch and a date. Puzzle numbers follow the calendar from the first puzzle. Once a watch
        is scheduled, its photo is frozen.
      </p>
      <div>
        <Jump to="schedule">Schedule a puzzle</Jump>
      </div>
    </>
  ),
  runway: (
    <>
      <p>
        A daily game can never miss a day, so fill {RUNWAY_GOAL} days before launching. Mix about 70% watches an
        enthusiast gets by crop 4–5, 20% icons and 10% deep cuts.
      </p>
      <div>
        <Jump to="runway">See the runway</Jump>
      </div>
    </>
  ),
  live: (
    <>
      <p>
        Switch the game on. The landing page swaps the waitlist for a Play button. Run this in your terminal, then
        reload this page:
      </p>
      <div className="flex flex-wrap items-start gap-2">
        <pre className="min-w-0 flex-1 overflow-x-auto rounded bg-black/30 p-2 text-xs">{GO_LIVE}</pre>
        <CopyButton text={GO_LIVE} />
      </div>
    </>
  ),
});

/* --- the checklist ----------------------------------------------------------- */
export function GettingStarted({
  steps,
  current,
  doneCount,
  origin,
  initialHidden,
}: {
  steps: Step[];
  current: StepId | null;
  doneCount: number;
  /** This site's address, for the links the guide builds. */
  origin: string;
  initialHidden: boolean;
}) {
  const [hidden, setHidden] = useState(initialHidden);
  const [open, setOpen] = useState<StepId | null>(current);
  const HOW = how(origin);
  const next = steps.find((s) => s.id === current);

  return (
    <section id="guide" className="mb-10 scroll-mt-6 rounded-xl border border-[var(--gold)]/30 bg-[var(--panel)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Getting started</h2>
          <p className="text-xs text-[var(--muted)]">
            {next ? (
              <>
                {doneCount} of {steps.length} done · next: {next.title.toLowerCase()}
              </>
            ) : (
              "All done. The game is live."
            )}
          </p>
        </div>
        <button
          type="button"
          className={quiet}
          onClick={() => {
            rememberHidden(!hidden);
            setHidden(!hidden);
          }}
        >
          {hidden ? "Show guide" : "Hide"}
        </button>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden>
        <div className="h-full bg-[var(--gold)]" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
      </div>

      {!hidden && (
        <ol className="mt-4 flex flex-col">
          {steps.map((s, i) => {
            const isOpen = open === s.id;
            const isCurrent = s.id === current;
            return (
              <li key={s.id} className="border-t border-white/5 first:border-t-0">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? null : s.id)}
                  className="flex w-full items-center gap-3 py-2.5 text-left"
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      s.done
                        ? "bg-emerald-600/30 text-emerald-300"
                        : isCurrent
                          ? "bg-[var(--gold)] text-black"
                          : "border border-white/20 text-[var(--muted)]"
                    }`}
                  >
                    {s.done ? "✓" : i + 1}
                  </span>
                  <span className={`flex-1 ${s.done ? "text-[var(--muted)]" : ""} ${isCurrent ? "font-semibold" : ""}`}>
                    {s.title}
                  </span>
                  <span className="text-xs text-[var(--muted)]">{s.status}</span>
                </button>
                {s.progress && !s.done && (
                  <div className="mb-2 ml-9 h-1 overflow-hidden rounded-full bg-white/10" aria-hidden>
                    <div
                      className="h-full bg-[var(--gold)]/70"
                      style={{ width: `${(s.progress.value / s.progress.goal) * 100}%` }}
                    />
                  </div>
                )}
                {isOpen && (
                  <div className="mb-3 ml-9 flex flex-col gap-3 text-sm leading-relaxed text-[var(--ink)]/90">
                    {HOW[s.id]}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
