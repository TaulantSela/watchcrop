// Runs before drizzle-kit in `npm run db:push` and `npm run db:migrate`: exits with an error unless
// the database in .env is the in-memory demo or a marked dev database (see db-guard.ts).
import "dotenv/config";
import { assertDisposableDatabase } from "./db-guard";

assertDisposableDatabase().then(
  (checked) => console.log(`Disposable database: ${checked.join(", ")}`),
  (error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  },
);
