import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { aliases, guessesLog, puzzles, watches } from "@/db/schema";
import { todayKey } from "./daily";

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

/** Builds alias -> canonical map (both already normalized at seed time). */
export async function getAliasMap(kind: "brand" | "model"): Promise<Map<string, string>> {
  const db = await getDb();
  const rows = await db.select().from(aliases).where(eq(aliases.kind, kind));
  const map = new Map<string, string>();
  for (const r of rows) map.set(r.alias, r.canonical);
  return map;
}

/**
 * The autocomplete index = the WHOLE catalog's brands + model families.
 * Returning the full catalog leaks nothing about *today's* answer.
 */
export async function getCatalogIndex(): Promise<{ brands: string[]; models: string[] }> {
  const db = await getDb();
  const rows = await db.select({ brand: watches.brand, model: watches.model }).from(watches);
  const brands = new Set<string>();
  const models = new Set<string>();
  for (const r of rows) {
    brands.add(r.brand);
    models.add(`${r.brand} ${r.model}`);
  }
  return { brands: [...brands].sort(), models: [...models].sort() };
}

export async function logGuess(opts: {
  date: string;
  cropIndex: number;
  guessBrand: string | null;
  guessModel: string | null;
  brandCorrect: boolean;
  solved: boolean;
}): Promise<void> {
  const db = await getDb();
  const { date, ...rest } = opts;
  await db.insert(guessesLog).values({ puzzleDate: date, ...rest });
}

/** Powers the "X solved today" social-proof counter on the reveal screen. */
export async function solvedToday(date = todayKey()): Promise<number> {
  const db = await getDb();
  const rows = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(guessesLog)
    .where(and(eq(guessesLog.puzzleDate, date), eq(guessesLog.solved, true)));
  return rows[0]?.n ?? 0;
}
