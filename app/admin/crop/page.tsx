import { desc } from "drizzle-orm";
import { getDb } from "@/db";
import { puzzles, watches } from "@/db/schema";
import { AdminClient } from "@/components/AdminClient";

export const dynamic = "force-dynamic";

export default async function Admin({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token || token !== process.env.ADMIN_TOKEN) {
    return (
      <main className="mx-auto max-w-md py-20 text-center text-[var(--muted)]">
        Unauthorized. Append <code className="text-[var(--gold)]">?token=YOUR_ADMIN_TOKEN</code> to
        the URL.
      </main>
    );
  }

  const db = await getDb();
  const [allWatches, upcoming] = await Promise.all([
    db.select().from(watches).orderBy(desc(watches.id)),
    db
      .select({ date: puzzles.puzzleDate, n: puzzles.puzzleNumber })
      .from(puzzles)
      .orderBy(desc(puzzles.puzzleDate))
      .limit(14),
  ]);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="mb-1 text-2xl font-bold">Admin · content</h1>
      <p className="mb-6 text-sm text-[var(--muted)]">
        {allWatches.length} watches · buffer:{" "}
        {upcoming.length > 0 ? `latest scheduled ${upcoming[0].date} (#${upcoming[0].n})` : "none scheduled"}
        . Drag-to-crop authoring is a TODO — for now define crop_specs JSON via the seed/script.
      </p>
      <AdminClient
        token={token}
        watches={allWatches.map((w) => ({
          id: w.id,
          brand: w.brand,
          model: w.model,
          reference: w.reference,
          photoSource: w.photoSource,
        }))}
      />
    </main>
  );
}
