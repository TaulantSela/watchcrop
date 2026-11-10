import Link from "next/link";
import { WaitlistForm } from "@/components/WaitlistForm";

const SITE = process.env.NEXT_PUBLIC_SITE_NAME ?? "WatchCrop";
const GAME_LIVE = process.env.NEXT_PUBLIC_GAME_LIVE === "true";

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
          {/* A teaser strip: extreme macro -> wider. Demo art, logo hidden. */}
          {[0, 2, 4].map((i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={`/api/crop/teaser/${i}`}
              alt="watch crop"
              className="aspect-square w-full rounded-xl border border-white/10"
            />
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
