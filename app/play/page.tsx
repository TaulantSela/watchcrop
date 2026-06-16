import Link from "next/link";
import { Game } from "@/components/Game";

const SITE = process.env.NEXT_PUBLIC_SITE_NAME ?? "WatchCrop";
const GAME_LIVE = process.env.NEXT_PUBLIC_GAME_LIVE === "true";

export default function Play() {
  // During the de-risk phase, keep the game private. Flip NEXT_PUBLIC_GAME_LIVE
  // to "true" once the waitlist proves there's demand.
  if (!GAME_LIVE) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-2xl font-bold">{SITE} isn&apos;t live yet</h1>
        <p className="text-[var(--muted)]">
          We&apos;re still loading the watch cases. Join the waitlist and you&apos;ll get the first
          puzzle the day it drops.
        </p>
        <Link href="/" className="rounded-lg bg-[var(--gold)] px-6 py-3 font-semibold text-black">
          Join the waitlist →
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen flex-col px-6 py-10">
      <Game />
    </main>
  );
}
