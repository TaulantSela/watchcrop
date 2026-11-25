// Commands that wipe or rewrite data (`npm run seed`, `npm run db:push`, `npm run db:migrate`)
// only run on the in-memory demo database (no DATABASE_URL), which has nothing to lose, or on a
// database marked as a disposable dev database. Production is never marked, so if `.env` ever
// points at it, they stop instead of wiping it. Production gets its migrations from its own build
// (scripts/migrate-on-production-build.ts), which doesn't go through this check.
//
// The mark is a comment on the database itself, so it holds whichever connection string leads
// there. To mark a dev database (never production), run this once against it:
//   COMMENT ON DATABASE neondb IS 'watchcrop:disposable';
import postgres from "postgres";

export const DISPOSABLE_MARK = "watchcrop:disposable";

/** Same rule as db/index.ts: no URL (or a pglite/memory one) means the in-memory demo. */
const isInMemory = (url: string) => url.startsWith("pglite") || url.startsWith("memory");

/**
 * Throws unless every database the environment points at (DATABASE_URL, and
 * DATABASE_URL_UNPOOLED if set) is the in-memory demo or marked as disposable.
 * Returns what it checked.
 */
export async function assertDisposableDatabase(env: NodeJS.ProcessEnv = process.env): Promise<string[]> {
  const urls = [...new Set([env.DATABASE_URL, env.DATABASE_URL_UNPOOLED].filter((url): url is string => !!url))];
  const real = urls.filter((url) => !isInMemory(url));
  if (real.length === 0) return ["the in-memory demo database"];

  const checked: string[] = [];
  for (const url of real) {
    const sql = postgres(url, { max: 1, prepare: false, onnotice: () => {} });
    try {
      const [row] = await sql<{ name: string; mark: string | null }[]>`
        select datname as name, shobj_description(oid, 'pg_database') as mark
        from pg_database where datname = current_database()`;
      const host = new URL(url).hostname;
      // Neon hosts start with the endpoint id; show a local host or IP in full.
      const label = host === "localhost" || /^[\d.]+$/.test(host) ? host : host.split(".")[0];
      const where = `${label}/${row?.name ?? "?"}`;
      if (row?.mark !== DISPOSABLE_MARK) {
        throw new Error(
          `Refusing to touch ${where}: it isn't marked as a disposable dev database, and production never is.\n` +
            "Leave DATABASE_URL empty for the in-memory demo, or point it at a marked dev database (see the README).",
        );
      }
      checked.push(where);
    } finally {
      await sql.end();
    }
  }
  return checked;
}
