import { z } from "zod";
import { getDb } from "@/db";
import { visits } from "@/db/schema";

export const runtime = "nodejs";

const opt = (max: number) => z.string().trim().max(max).optional();

const Body = z.object({
  path: z.string().max(200).regex(/^\//),
  utmSource: opt(64),
  utmMedium: opt(64),
  utmCampaign: opt(64),
  referrerHost: opt(255),
});

// Crawlers and link-preview fetchers rarely run JS, but some do.
const BOT_UA = /bot|crawl|spider|slurp|preview|facebookexternalhit|embedly|headless|curl|wget|python/i;

/** Records one browser session (see components/VisitTracker.tsx). Always 204. */
export async function POST(req: Request) {
  const done = new Response(null, { status: 204 });
  if (BOT_UA.test(req.headers.get("user-agent") ?? "")) return done;

  let body;
  try {
    body = Body.parse(await req.json());
  } catch {
    return done;
  }
  try {
    const db = await getDb();
    await db.insert(visits).values(body);
  } catch (err) {
    console.error("visit insert failed", err);
  }
  return done;
}
