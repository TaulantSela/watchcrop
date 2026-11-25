// Runs first in `npm run build`. On Vercel's production builds it applies pending migrations to
// the production database (`drizzle-kit migrate`: runs the new SQL files in ./drizzle in order,
// once each; it never resets anything), so a merged PR's migrations reach production with its
// code. Everywhere else it does nothing: local and CI builds, and previews, which run the
// in-memory demo.
//
// It migrates over the direct connection (DATABASE_URL_UNPOOLED) when there is one, since
// Neon's pooler is meant for short queries, not schema changes.
//
// If a migration fails, the build fails and the current production deployment stays live.
// Migrations run while the previous version is still serving, so keep them backward-compatible:
// add columns and tables first, and remove what the old code still reads in a later release.
import { execFileSync } from "node:child_process";

if (process.env.VERCEL_ENV === "production") {
  const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!url) throw new Error("Production build without DATABASE_URL: production needs a real Postgres.");
  console.log("Production build: applying pending migrations (drizzle-kit migrate).");
  execFileSync("npx", ["drizzle-kit", "migrate"], { stdio: "inherit", env: { ...process.env, DATABASE_URL: url } });
} else {
  console.log(`Not a production build (VERCEL_ENV=${process.env.VERCEL_ENV ?? "unset"}): no migrations.`);
}
