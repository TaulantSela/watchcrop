/**
 * Runs once when the server process starts. In the local PGlite demo this
 * creates the schema and seeds the catalog so the game works with zero setup.
 *
 * A failed warmup must never take the whole server down: routes that don't
 * touch the database (the landing teaser, the share image) keep working, and
 * the ones that do surface the real error on their own request.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      const { ensureSeeded } = await import("./lib/bootstrap");
      await ensureSeeded();
    } catch (err) {
      console.error("[watchcrop] database warmup failed", err);
    }
  }
}
