import "server-only";
import { and, eq, isNotNull, isNull, or, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { aliases, guessesLog, puzzles, watches } from "@/db/schema";
import { todayKey } from "./daily";
import { normalize } from "./normalize";
import { REFERENCE_CATALOG } from "./reference-catalog";

export type TodayPuzzle = {
  puzzleNumber: number;
  date: string;
  watch: typeof watches.$inferSelect;
};

/** Loads today's scheduled puzzle + its watch. Returns null if none scheduled. */
export async function getTodayPuzzle(date = todayKey()): Promise<TodayPuzzle | null> {
  const db = await getDb();
  const rows = await db
    .select({ puzzle: puzzles, watch: watches })
    .from(puzzles)
    .innerJoin(watches, eq(puzzles.watchId, watches.id))
    .where(eq(puzzles.puzzleDate, date))
    .limit(1);

  const row = rows[0];
  if (!row) return null;
  return { puzzleNumber: row.puzzle.puzzleNumber, date, watch: row.watch };
}

/** Brand alias -> canonical brand (both already normalized at write time). */
export async function getBrandAliasMap(): Promise<Map<string, string>> {
  const db = await getDb();
  const rows = await db.select().from(aliases).where(eq(aliases.kind, "brand"));
  return new Map(rows.map((r) => [r.alias, r.canonical]));
}

/**
 * Model alias -> canonical model, scoped to one brand so the same nickname can
 * mean different watches for different brands. Unscoped (legacy) model
 * aliases still apply to every brand.
 */
export async function getModelAliasMap(brand: string): Promise<Map<string, string>> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(aliases)
    .where(
      and(
        eq(aliases.kind, "model"),
        or(eq(aliases.brand, normalize(brand)), isNull(aliases.brand)),
      ),
    );
  // Brand-scoped rows win over unscoped ones for the same alias.
  const sorted = [...rows].sort((a, b) => Number(a.brand !== null) - Number(b.brand !== null));
  return new Map(sorted.map((r) => [r.alias, r.canonical]));
}

/**
 * The autocomplete index: the broad reference vocabulary plus every puzzle
 * watch. Deduplicated by normalized form, keeping the first spelling seen.
 * Being much wider than the puzzle catalog is the point: knowing the brand
 * must not narrow the model down to the answer.
 */
export type CatalogIndex = { brands: string[]; models: { brand: string; model: string }[] };

export async function getCatalogIndex(): Promise<CatalogIndex> {
  const db = await getDb();
  const rows = await db.select({ brand: watches.brand, model: watches.model }).from(watches);

  const brands = new Map<string, string>();
  const models = new Map<string, { brand: string; model: string }>();
  const add = (brand: string, model: string) => {
    const b = brands.get(normalize(brand)) ?? brand;
    brands.set(normalize(brand), b);
    const key = `${normalize(b)}|${normalize(model)}`;
    if (!models.has(key)) models.set(key, { brand: b, model });
  };

  for (const [brand, list] of Object.entries(REFERENCE_CATALOG)) {
    for (const model of list) add(brand, model);
  }
  for (const r of rows) add(r.brand, r.model);

  return {
    brands: [...brands.values()].sort((a, b) => a.localeCompare(b)),
    models: [...models.values()].sort(
      (a, b) => a.brand.localeCompare(b.brand) || a.model.localeCompare(b.model),
    ),
  };
}

export async function logGuess(opts: {
  date: string;
  cropIndex: number;
  guessBrand: string | null;
  guessModel: string | null;
  brandCorrect: boolean;
  solved: boolean;
  playerId: string | null;
}): Promise<void> {
  const db = await getDb();
  const { date, ...rest } = opts;
  await db.insert(guessesLog).values({ puzzleDate: date, ...rest });
}

/**
 * Powers the "X solved today" social-proof counter on the reveal screen.
 * Counts distinct players, not solve requests (replays and refreshes used to
 * count once each). Spoofable by rotating ids, but honest traffic is right.
 */
export async function solvedToday(date = todayKey()): Promise<number> {
  const db = await getDb();
  const rows = await db
    .select({ n: sql<number>`count(distinct ${guessesLog.playerId})::int` })
    .from(guessesLog)
    .where(
      and(
        eq(guessesLog.puzzleDate, date),
        eq(guessesLog.solved, true),
        isNotNull(guessesLog.playerId),
      ),
    );
  return rows[0]?.n ?? 0;
}
