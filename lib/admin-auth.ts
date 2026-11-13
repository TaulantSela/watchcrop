import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/**
 * Admin access. You sign in once with ADMIN_TOKEN (the sign-in screen at
 * /admin/crop, or an old ?token= link) and get a session cookie. The cookie
 * holds an expiry and an HMAC of it keyed by ADMIN_TOKEN, never the token
 * itself, so rotating ADMIN_TOKEN signs every session out. Scripts can still
 * send the token in an `x-admin-token` header.
 */

export const SESSION_COOKIE = "wc_admin";
export const SESSION_DAYS = 30;

const digest = (s: string) => createHash("sha256").update(s).digest();
const same = (a: string, b: string) => timingSafeEqual(digest(a), digest(b));

/** Constant-time admin token check. Fails closed when ADMIN_TOKEN is unset. */
export function isAdminToken(token: string | null | undefined): boolean {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected || !token) return false;
  return same(token, expected);
}

function sign(exp: number, key: string): string {
  return createHmac("sha256", key).update(`admin-session:${exp}`).digest("base64url");
}

/** A session cookie value valid for SESSION_DAYS from `now`. */
export function createSession(now = Date.now()): string {
  const key = process.env.ADMIN_TOKEN;
  if (!key) throw new Error("ADMIN_TOKEN is not set.");
  const exp = now + SESSION_DAYS * 86_400_000;
  return `${exp}.${sign(exp, key)}`;
}

export function isValidSession(value: string | null | undefined, now = Date.now()): boolean {
  const key = process.env.ADMIN_TOKEN;
  if (!key || !value) return false;
  const [expRaw, mac] = value.split(".");
  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || exp <= now || !mac) return false;
  return same(mac, sign(exp, key));
}

/** One cookie's value out of a raw Cookie header. */
export function readCookie(header: string | null, name: string): string | null {
  for (const part of (header ?? "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return null;
}

/**
 * Is this API request from the admin? Either the token in a header (scripts)
 * or the session cookie (the admin page). Cookie-authenticated writes must
 * also come from this site: the cookie is SameSite=Strict already, and the
 * Origin check is a second lock against cross-site form posts.
 */
export function isAdminRequest(req: Request): boolean {
  if (isAdminToken(req.headers.get("x-admin-token"))) return true;
  if (!isValidSession(readCookie(req.headers.get("cookie"), SESSION_COOKIE))) return false;
  if (req.method === "GET" || req.method === "HEAD") return true;
  const origin = req.headers.get("origin");
  return !origin || origin === new URL(req.url).origin;
}

/** Cookie attributes; Secure only over https so local `next start` works. */
export function sessionCookie(req: Request, value: string, maxAgeSec: number) {
  const https = new URL(req.url).protocol === "https:" || req.headers.get("x-forwarded-proto") === "https";
  return [
    `${SESSION_COOKIE}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=${maxAgeSec}`,
    ...(https ? ["Secure"] : []),
  ].join("; ");
}
