import { getDb } from "../db/index";

/**
 * Warms the database at server startup (called from instrumentation.ts). In
 * PGlite demo mode this triggers schema creation + seeding so the first request
 * is fast; the actual bootstrap logic lives in db/index.ts's getDb().
 */
export async function ensureSeeded(): Promise<void> {
  await getDb();
}
