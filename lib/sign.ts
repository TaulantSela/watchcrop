import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Anti-cheat: crop images are served only with a valid HMAC token for that
 * (date, cropIndex) pair. The client receives the token for crop 0 from
 * /api/puzzle/today, and a token for the *next* crop only when it earns it via
 * /api/guess. This stops anyone from enumerating future crops of today's watch.
 */
function secret(): string {
  const s = process.env.GUESS_SECRET;
  if (!s) throw new Error("GUESS_SECRET is not set.");
  return s;
}

export function signCrop(date: string, cropIndex: number): string {
  return createHmac("sha256", secret())
    .update(`${date}:${cropIndex}`)
    .digest("base64url");
}

export function verifyCrop(date: string, cropIndex: number, token: string): boolean {
  const expected = signCrop(date, cropIndex);
  const a = Buffer.from(expected);
  const b = Buffer.from(token);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Builds the opaque, signed crop URL the client should fetch. */
export function cropUrl(date: string, cropIndex: number): string {
  return `/api/crop/${date}/${cropIndex}?t=${signCrop(date, cropIndex)}`;
}
