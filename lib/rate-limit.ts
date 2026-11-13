import "server-only";
import { createHmac } from "node:crypto";
import { lt, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { rateLimits } from "@/db/schema";

export type Limit = { name: string; max: number; windowSec: number };

/**
 * Generous on purpose: a whole game is under 15 guesses, and one person signs
 * up once. These stop scripts and loops, not a classroom on shared wifi.
 */
export const LIMITS = {
  waitlist: { name: "waitlist", max: 10, windowSec: 60 * 60 },
  guess: { name: "guess", max: 60, windowSec: 10 * 60 },
} satisfies Record<string, Limit>;

/** Vercel sets these to the real client address; a client can't spoof them there. */
export function clientIp(req: Request): string | null {
  const h = req.headers;
  return h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}

/**
 * "<limit>:<hash>", with the IP run through a keyed hash so the table never
 * holds an address and can't be reversed without the server secret.
 */
export function bucketKey(limit: Limit, ip: string, secret: string): string {
  const digest = createHmac("sha256", secret).update(`rate-limit:${ip}`).digest("base64url");
  return `${limit.name}:${digest.slice(0, 22)}`;
}

export type LimitResult = { ok: boolean; retryAfterSec: number };

/**
 * Counts one request against `limit` for this client: a fixed window, updated
 * in a single atomic upsert so concurrent requests can't both slip under it.
 * Fails open (allows the request) when there's no IP or no secret, or the
 * counter can't be written: rate limiting must never take the game down.
 */
export async function hit(limit: Limit, req: Request, now = new Date()): Promise<LimitResult> {
  const ip = clientIp(req);
  const secret = process.env.GUESS_SECRET;
  if (!ip || !secret) return { ok: true, retryAfterSec: 0 };

  try {
    const db = await getDb();
    // ISO strings, not Dates: raw-SQL params serialize the same on every driver.
    const nowTs = sql`${now.toISOString()}::timestamptz`;
    // windowSec comes from LIMITS in code, never from a request.
    const window = sql.raw(`interval '${Math.trunc(limit.windowSec)} seconds'`);
    const expired = sql`${rateLimits.windowStart} <= ${nowTs} - ${window}`;
    const [row] = await db
      .insert(rateLimits)
      .values({ key: bucketKey(limit, ip, secret), windowStart: now, hits: 1 })
      .onConflictDoUpdate({
        target: rateLimits.key,
        set: {
          hits: sql`case when ${expired} then 1 else ${rateLimits.hits} + 1 end`,
          windowStart: sql`case when ${expired} then ${nowTs} else ${rateLimits.windowStart} end`,
        },
      })
      .returning({ hits: rateLimits.hits, windowStart: rateLimits.windowStart });

    // Sweep old windows now and then, so the table stays tiny without a cron.
    if (Math.random() < 0.01) {
      await db.delete(rateLimits).where(lt(rateLimits.windowStart, new Date(now.getTime() - 86_400_000)));
    }

    const resetsAt = row.windowStart.getTime() + limit.windowSec * 1000;
    return {
      ok: row.hits <= limit.max,
      retryAfterSec: Math.max(1, Math.ceil((resetsAt - now.getTime()) / 1000)),
    };
  } catch (err) {
    console.error(`[watchcrop] rate limit "${limit.name}" failed open`, err);
    return { ok: true, retryAfterSec: 0 };
  }
}

export function tooManyRequests(r: LimitResult, error: string): Response {
  return Response.json(
    { error, code: "rate_limited" },
    { status: 429, headers: { "retry-after": String(r.retryAfterSec) } },
  );
}
