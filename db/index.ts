import { drizzle as drizzlePg, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import postgres from "postgres";
import { PGlite } from "@electric-sql/pglite";
import * as schema from "./schema";

/**
 * Dual driver:
 *  - Real Postgres (Neon) when DATABASE_URL is a postgres URL.
 *  - In-process PGlite (WASM) otherwise — zero setup, used for the local demo.
 *
 * In PGlite mode the instance self-bootstraps (applies schema DDL + seeds the
 * catalog) on first use, so it works regardless of which module instance the
 * dev server happens to serve a request from. ALWAYS access the database via
 * `await getDb()` so that bootstrap is complete before any query runs.
 */
const url = process.env.DATABASE_URL;
export const isPglite = !url || url.startsWith("pglite") || url.startsWith("memory");

type Db = PostgresJsDatabase<typeof schema>;

let instance: Db | null = null;
let pglite: PGlite | null = null;
let bootstrapPromise: Promise<void> | null = null;

function ensureInit(): Db {
  if (instance) return instance;
  if (isPglite) {
    pglite = new PGlite(); // in-memory
    instance = drizzlePglite(pglite, { schema }) as unknown as Db;
    bootstrapPromise = bootstrapPglite(pglite, instance);
  } else {
    const client = postgres(url!, { prepare: false });
    instance = drizzlePg(client, { schema });
  }
  return instance;
}

async function bootstrapPglite(pg: PGlite, d: Db): Promise<void> {
  const { readdir, readFile } = await import("node:fs/promises");
  const path = await import("node:path");
  const { seedDatabase } = await import("../lib/seed-data");

  const dir = path.join(process.cwd(), "drizzle");
  const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();
  for (const f of files) {
    await pg.exec(await readFile(path.join(dir, f), "utf8"));
  }
  const r = await seedDatabase(d as unknown as PostgresJsDatabase<Record<string, unknown>>);
  console.log(`[watchcrop] PGlite demo seeded: ${r.watches} watches, ${r.aliases} aliases.`);
}

/** The ONLY safe way to get the database — awaits PGlite bootstrap if needed. */
export async function getDb(): Promise<Db> {
  const i = ensureInit();
  if (bootstrapPromise) await bootstrapPromise;
  return i;
}

export { schema };
