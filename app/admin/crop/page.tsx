import { count, desc, eq, gte, isNotNull, sql } from "drizzle-orm";
import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { puzzles, visits, watches } from "@/db/schema";
import { AdminClient, type AdminWatch, type UpcomingDay } from "@/components/AdminClient";
import { AdminSignIn } from "@/components/AdminSignIn";
import { DemandPanel } from "@/components/DemandPanel";
import { GettingStarted } from "@/components/GettingStarted";
import { isValidSession, SESSION_COOKIE } from "@/lib/admin-auth";
import { todayKey } from "@/lib/daily";
import { getDemandStats } from "@/lib/demand";
import { GUIDE_COOKIE, onboardingSteps } from "@/lib/onboarding";
import { schedulingProblems } from "@/lib/provenance";
import { addDays, runway } from "@/lib/schedule";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Admin · ${process.env.NEXT_PUBLIC_SITE_NAME ?? "WatchCrop"}`,
  robots: { index: false, follow: false },
};

export default async function Admin({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string; signedout?: string }>;
}) {
  const { token, error, signedout } = await searchParams;

  // Old ?token= links: sign in through the session route, which sets the
  // cookie and comes back here on a clean URL (no token in history).
  if (token) redirect(`/api/admin/session?token=${encodeURIComponent(token)}`);

  const jar = await cookies();
  if (!isValidSession(jar.get(SESSION_COOKIE)?.value)) {
    return <AdminSignIn error={error} signedOut={signedout === "1"} />;
  }

  const today = todayKey();
  const db = await getDb();
  const [allWatches, ahead, scheduledRows, demand, [{ tagged }]] = await Promise.all([
    db.select().from(watches).orderBy(desc(watches.id)),
    db
      .select({ date: puzzles.puzzleDate, n: puzzles.puzzleNumber, brand: watches.brand, model: watches.model })
      .from(puzzles)
      .innerJoin(watches, eq(puzzles.watchId, watches.id))
      .where(gte(puzzles.puzzleDate, today)),
    db.select({ watchId: puzzles.watchId, n: sql<number>`count(*)::int` }).from(puzzles).groupBy(puzzles.watchId),
    getDemandStats(),
    db.select({ tagged: count() }).from(visits).where(isNotNull(visits.utmSource)),
  ]);
  const scheduled = new Set(scheduledRows.map((r) => r.watchId));

  const byDate = new Map(ahead.map((p) => [p.date, p]));
  const upcoming: UpcomingDay[] = Array.from({ length: 14 }, (_, i) => {
    const date = addDays(today, i);
    const p = byDate.get(date);
    return { date, puzzle: p ? { n: p.n, name: `${p.brand} ${p.model}` } : null };
  });
  const runwayNow = runway(byDate.keys(), today);

  const adminWatches: AdminWatch[] = allWatches.map((w) => ({
    id: w.id,
    brand: w.brand,
    model: w.model,
    reference: w.reference,
    photoSource: w.photoSource,
    distinctiveDesign: w.distinctiveDesign,
    cropCount: w.cropKeys?.length ?? 0,
    logoQaAt: w.logoQaAt ? w.logoQaAt.toISOString() : null,
    problems: schedulingProblems(w),
    photo: {
      id: w.id,
      masterKey: w.masterBlobKey,
      masterSize: w.masterWidth && w.masterHeight ? { width: w.masterWidth, height: w.masterHeight } : null,
      cropSpecs: w.cropSpecs ?? [],
      logoMasks: w.logoMasks ?? [],
      // crops/<id>/<version>/<i>.webp: the version changes on every re-cut.
      cropVersion: w.cropKeys?.length === 6 ? w.cropKeys[0].split("/")[2] : null,
      scheduled: scheduled.has(w.id),
    },
  }));

  const guide = onboardingSteps({
    taggedVisits: tagged,
    signups: demand.totalSignups,
    watches: allWatches.length,
    withPhoto: allWatches.filter((w) => w.masterBlobKey).length,
    signedOff: allWatches.filter((w) => w.logoQaAt).length,
    scheduled: scheduledRows.reduce((sum, r) => sum + r.n, 0),
    runwayAhead: runwayNow.scheduledAhead,
    live: process.env.NEXT_PUBLIC_GAME_LIVE === "true",
  });

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Admin</h1>
        <form method="post" action="/api/admin/session">
          <input type="hidden" name="action" value="signout" />
          <button className="rounded border border-white/15 px-3 py-1.5 text-sm text-[var(--muted)] hover:border-white/40">
            Sign out
          </button>
        </form>
      </div>
      <GettingStarted {...guide} origin={`${proto}://${host}`} initialHidden={jar.get(GUIDE_COOKIE)?.value === "hidden"} />
      <DemandPanel stats={demand} />
      <AdminClient today={today} runway={runwayNow} upcoming={upcoming} watches={adminWatches} />
    </main>
  );
}
