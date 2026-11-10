import { desc, eq, gte } from "drizzle-orm";
import { getDb } from "@/db";
import { puzzles, watches } from "@/db/schema";
import { AdminClient, type AdminWatch, type UpcomingDay } from "@/components/AdminClient";
import { isAdminToken } from "@/lib/admin-auth";
import { todayKey } from "@/lib/daily";
import { schedulingProblems } from "@/lib/provenance";
import { addDays, runway } from "@/lib/schedule";

export const dynamic = "force-dynamic";

export default async function Admin({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token || !isAdminToken(token)) {
    return (
      <main className="mx-auto max-w-md py-20 text-center text-[var(--muted)]">
        Unauthorized. Append <code className="text-[var(--gold)]">?token=YOUR_ADMIN_TOKEN</code> to
        the URL.
      </main>
    );
  }

  const today = todayKey();
  const db = await getDb();
  const [allWatches, ahead] = await Promise.all([
    db.select().from(watches).orderBy(desc(watches.id)),
    db
      .select({ date: puzzles.puzzleDate, n: puzzles.puzzleNumber, brand: watches.brand, model: watches.model })
      .from(puzzles)
      .innerJoin(watches, eq(puzzles.watchId, watches.id))
      .where(gte(puzzles.puzzleDate, today)),
  ]);

  const byDate = new Map(ahead.map((p) => [p.date, p]));
  const upcoming: UpcomingDay[] = Array.from({ length: 14 }, (_, i) => {
    const date = addDays(today, i);
    const p = byDate.get(date);
    return { date, puzzle: p ? { n: p.n, name: `${p.brand} ${p.model}` } : null };
  });

  const adminWatches: AdminWatch[] = allWatches.map((w) => ({
    id: w.id,
    brand: w.brand,
    model: w.model,
    reference: w.reference,
    photoSource: w.photoSource,
    distinctiveDesign: w.distinctiveDesign,
    masterBlobKey: w.masterBlobKey,
    cropCount: w.cropSpecs?.length ?? 0,
    logoQaAt: w.logoQaAt ? w.logoQaAt.toISOString() : null,
    problems: schedulingProblems(w),
  }));

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="mb-6 text-2xl font-bold">Admin · content</h1>
      <AdminClient
        token={token}
        today={today}
        runway={runway(byDate.keys(), today)}
        upcoming={upcoming}
        watches={adminWatches}
      />
    </main>
  );
}
