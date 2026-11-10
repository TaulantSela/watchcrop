import "dotenv/config";
import { getDb, isPglite } from "../db/index";
import { watches } from "../db/schema";
import { seedDatabase } from "../lib/seed-data";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

/**
 * CLI seed for REAL Postgres (run `npm run db:push` first to create tables).
 * In PGlite demo mode there's nothing to do here — the in-process database is
 * created and seeded automatically when the dev server boots.
 */
async function main() {
  if (isPglite) {
    console.log(
      "PGlite/in-memory demo mode: the dev server auto-seeds on startup. Nothing to do here.",
    );
    process.exit(0);
  }

  const db = await getDb();

  // Seeding WIPES the catalog and the schedule. Never do that to a database
  // that already holds real content unless explicitly asked.
  const existing = await db.select({ id: watches.id }).from(watches).limit(1);
  if (existing.length > 0 && !process.argv.includes("--force")) {
    console.error(
      "Refusing to seed: this database already has watches, and seeding deletes every watch, " +
        "alias and scheduled puzzle. Re-run with `npm run seed -- --force` if you really mean it.",
    );
    process.exit(1);
  }

  const result = await seedDatabase(db as unknown as PostgresJsDatabase<Record<string, unknown>>);
  console.log(`Seeded ${result.watches} watches, ${result.aliases} aliases, ${result.watches} puzzles.`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
