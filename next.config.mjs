import { withBotId } from "botid/next/config";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow importing the heavy native `sharp` dep only in Node server code.
  serverExternalPackages: ["sharp", "postgres", "@electric-sql/pglite"],
  // The PGlite demo database (used on preview deployments and locally when
  // DATABASE_URL is unset) builds its schema from these files at runtime. They
  // are read with fs, so the bundler can't see them: ship them explicitly.
  outputFileTracingIncludes: {
    "/**": ["./drizzle/*.sql"],
  },
};

// withBotId adds the rewrites that proxy BotID's challenge script and checks.
export default withBotId(nextConfig);
