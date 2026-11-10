import { aliases, puzzles, watches } from "../db/schema";
import { normalize } from "./normalize";
import { todayKey } from "./daily";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

/** A DB handle that exposes the drizzle methods we use (pg OR pglite). */
type AnyDb = PostgresJsDatabase<Record<string, unknown>>;

type SeedWatch = typeof watches.$inferInsert & {
  modelAliases?: string[];
  brandAliases?: string[];
};

export const CATALOG: SeedWatch[] = [
  {
    brand: "Rolex", model: "Submariner", reference: "126610LN", year: 2020,
    movement: "Automatic (cal. 3235)", priceTier: "luxury", difficultyWeight: 1,
    specBullets: ["41mm Oystersteel", "Unidirectional dive bezel", "300m water resistance"],
    photoSource: "own", brandAliases: ["rolex"], modelAliases: ["sub", "submariner date"],
  },
  {
    brand: "Omega", model: "Speedmaster", reference: "310.30.42", year: 2021,
    movement: "Manual (cal. 3861)", priceTier: "luxury", difficultyWeight: 2,
    specBullets: ["The Moonwatch", "Hesalite crystal", "Tachymeter bezel"],
    affiliateRef: "omega-speedmaster", affiliateUrl: "https://www.omegawatches.com/en-us/watches/speedmaster",
    photoSource: "own", modelAliases: ["speedy", "moonwatch"],
  },
  {
    brand: "Seiko", model: "SKX007", reference: "SKX007", year: 1996,
    movement: "Automatic (cal. 7S26)", priceTier: "entry", difficultyWeight: 2,
    specBullets: ["Iconic diver", "Day-date at 3", "Discontinued 2019"],
    affiliateRef: "seiko-skx", affiliateUrl: "https://www.seikowatches.com/us-en/products/prospex",
    photoSource: "own", brandAliases: ["seiko"], modelAliases: ["skx", "skx007"],
  },
  {
    brand: "Tudor", model: "Black Bay", reference: "M79030N", year: 2021,
    movement: "Automatic (MT5402)", priceTier: "mid", difficultyWeight: 2,
    specBullets: ["58 in 39mm", "Snowflake hands", "Rivet-style bracelet"],
    affiliateRef: "tudor-bb58", affiliateUrl: "https://www.tudorwatch.com/en/watches/black-bay",
    photoSource: "own", modelAliases: ["black bay 58", "bb58", "bb"],
  },
  {
    brand: "Cartier", model: "Tank", reference: "WSTA0041", year: 2019,
    movement: "Quartz", priceTier: "luxury", difficultyWeight: 3,
    specBullets: ["Rectangular case", "Roman numerals", "Blue sword hands"],
    photoSource: "own", modelAliases: ["tank must", "tank solo"],
  },
  {
    brand: "Audemars Piguet", model: "Royal Oak", reference: "15500ST", year: 2019,
    movement: "Automatic (cal. 4302)", priceTier: "grail", difficultyWeight: 3,
    specBullets: ["Octagonal bezel, 8 hex screws", "Tapisserie dial", "Integrated bracelet"],
    distinctiveDesign: true, photoSource: "own",
    brandAliases: ["ap", "a p"], modelAliases: ["ro", "royal oak jumbo"],
  },
  {
    brand: "Casio", model: "G-Shock", reference: "DW-5600", year: 1996,
    movement: "Quartz (digital)", priceTier: "entry", difficultyWeight: 2,
    specBullets: ["Square resin case", "200m water resistance", "EL backlight"],
    affiliateRef: "casio-gshock", affiliateUrl: "https://www.gshock.com/",
    distinctiveDesign: true, photoSource: "own",
    brandAliases: ["g shock", "gshock"], modelAliases: ["dw5600", "square"],
  },
  {
    brand: "Patek Philippe", model: "Nautilus", reference: "5711/1A", year: 2018,
    movement: "Automatic (cal. 26-330)", priceTier: "grail", difficultyWeight: 4,
    specBullets: ["Porthole-shaped case", "Horizontally embossed dial", "Discontinued 2021"],
    distinctiveDesign: true, photoSource: "own",
    brandAliases: ["patek", "pp"], modelAliases: ["naut", "5711"],
  },
];

/**
 * The puzzle day `offsetDays` after today, on the same shifted clock the game
 * reads (todayKey). Plain UTC dates would leave "today" unscheduled for the
 * RESET_OFFSET_HOURS window after UTC midnight.
 */
export function dateForOffset(offsetDays: number, now: Date = new Date()): string {
  const d = new Date(`${todayKey(now)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

/** Wipes and re-seeds the catalog, aliases, and a week of scheduled puzzles. */
export async function seedDatabase(db: AnyDb): Promise<{ watches: number; aliases: number }> {
  await db.delete(puzzles);
  await db.delete(aliases);
  await db.delete(watches);

  const aliasRows: (typeof aliases.$inferInsert)[] = [];

  for (let i = 0; i < CATALOG.length; i++) {
    const { brandAliases, modelAliases, ...w } = CATALOG[i];
    const [row] = await db.insert(watches).values(w).returning({ id: watches.id });

    for (const a of brandAliases ?? [])
      aliasRows.push({ kind: "brand", alias: normalize(a), canonical: normalize(w.brand) });
    for (const a of modelAliases ?? [])
      aliasRows.push({
        kind: "model",
        alias: normalize(a),
        canonical: normalize(w.model),
        brand: normalize(w.brand),
      });

    await db.insert(puzzles).values({
      watchId: row.id,
      puzzleDate: dateForOffset(i),
      puzzleNumber: i + 1,
    });
  }

  if (aliasRows.length) await db.insert(aliases).values(aliasRows);
  return { watches: CATALOG.length, aliases: aliasRows.length };
}
