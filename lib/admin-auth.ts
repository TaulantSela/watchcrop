import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Constant-time admin token check. Fails closed when ADMIN_TOKEN is unset.
 * Both sides are hashed first so the comparison never leaks the length.
 */
export function isAdminToken(token: string | null | undefined): boolean {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected || !token) return false;
  const digest = (s: string) => createHash("sha256").update(s).digest();
  return timingSafeEqual(digest(token), digest(expected));
}
