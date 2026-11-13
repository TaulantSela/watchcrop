/**
 * The requests Vercel BotID guards. The client script (instrumentation-client.ts)
 * attaches its proof only to these, and each route calls isBotRequest()
 * (lib/botcheck.ts), so the two lists must match: keep them here, in one place.
 */
export const BOTID_ROUTES = [
  { path: "/api/waitlist", method: "POST" },
  { path: "/api/guess", method: "POST" },
] as const;
