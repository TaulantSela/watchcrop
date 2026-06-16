/**
 * Runs once when the server process starts. In the local PGlite demo this
 * creates the schema and seeds the catalog so the game works with zero setup.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { ensureSeeded } = await import("./lib/bootstrap");
    await ensureSeeded();
  }
}
