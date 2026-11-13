import Link from "next/link";
import { DemoVideo } from "@/components/DemoVideo";
import { WaitlistForm } from "@/components/WaitlistForm";

const SITE = process.env.NEXT_PUBLIC_SITE_NAME ?? "WatchCrop";
const GAME_LIVE = process.env.NEXT_PUBLIC_GAME_LIVE === "true";

/** Crops 1, 3 and 6 of a sample watch, cut by the real crop pipeline (scripts/landing-art.mts). */
const STRIP = [
  { n: 1, alt: "Crop 1 of 6: an extreme close-up of a dive bezel's lume pip" },
  { n: 3, alt: "Crop 3 of 6: a quarter of the dial, with the hands and the hidden logo" },
  { n: 6, alt: "Crop 6 of 6: the whole watch, a blue steel diver on a bracelet" },
];

const STEPS = [
  ["Crop 1 is a tiny detail.", "A bezel pip, a crown, a handset. Name the brand."],
  ["Miss, and it zooms out.", "Six crops, each wider than the last. Logos stay hidden."],
  ["Right brand? Now the model.", "Solve it early for gold and a bigger Horology Score."],
  ["Share your grid.", "No spoilers, just your squares. A new watch every day."],
];

export default function Landing() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-10 px-6 py-16">
      <header className="flex items-center gap-3">
        <span className="text-2xl font-bold tracking-tight">{SITE}</span>
        <span className="rounded-full border border-[var(--gold)]/40 px-2 py-0.5 text-xs text-[var(--gold)]">
          daily
        </span>
      </header>

      <section className="flex flex-col gap-6">
        <div className="grid grid-cols-3 gap-3">
          {STRIP.map(({ n, alt }) => (
            <figure key={n} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element -- pre-sized 800px WebP */}
              <img
                src={`/landing/crop-${n}.webp`}
                alt={alt}
                width={800}
                height={800}
                className="aspect-square h-auto w-full rounded-xl border border-white/10"
              />
              <figcaption className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white/90 backdrop-blur-sm">
                {n} / 6
              </figcaption>
            </figure>
          ))}
        </div>

        <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
          Can you name the watch?
        </h1>
        <p className="max-w-xl text-lg text-[var(--muted)]">
          One watch a day. We start zoomed all the way in — a crown, a handset, a movement
          bridge — logos hidden, and zoom out every time you miss. Name the brand and model
          before it&apos;s fully revealed. A daily ritual for people who recognize a watch at a
          glance.
        </p>

        {GAME_LIVE ? (
          <div className="flex flex-col gap-4">
            <Link
              href="/play"
              className="w-fit rounded-lg bg-[var(--gold)] px-7 py-3 font-semibold text-black transition hover:brightness-110"
            >
              Play today&apos;s watch →
            </Link>
            <p className="text-sm text-[var(--muted)]">Want the heads-up each morning?</p>
            <WaitlistForm source="landing-live" />
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="font-medium">Launching soon — get the first puzzle in your inbox.</p>
            <WaitlistForm source="landing" />
            <p className="text-xs text-[var(--muted)]">
              No spam. One email at launch, then only if you opt into the daily.
            </p>
          </div>
        )}
      </section>

      <section aria-labelledby="how" className="flex flex-col items-center gap-8 sm:flex-row sm:items-center">
        <DemoVideo />
        <div className="flex flex-col gap-4">
          <h2 id="how" className="text-2xl font-bold">
            How a round plays
          </h2>
          <ol className="flex flex-col gap-3">
            {STEPS.map(([title, body], i) => (
              <li key={title} className="flex gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--gold)] text-xs font-bold text-black">
                  {i + 1}
                </span>
                <p>
                  <strong>{title}</strong> <span className="text-[var(--muted)]">{body}</span>
                </p>
              </li>
            ))}
          </ol>
          <p className="text-xs text-[var(--muted)]">
            A sample round with a made-up watch, rendered in 3D. Real puzzles use photos of real watches, with the
            logos hidden.
          </p>
        </div>
      </section>

      <footer className="mt-8 border-t border-white/10 pt-6 text-xs text-[var(--muted)]">
        {SITE} is an independent guessing game. Not affiliated with, endorsed by, or sponsored by
        any watch brand. All brand names appear solely as puzzle answers. ·{" "}
        <Link href="/privacy" className="underline hover:text-[var(--ink)]">
          Privacy
        </Link>
      </footer>
    </main>
  );
}
