import { beforeEach, describe, expect, it } from "vitest";
import { createSession, isAdminRequest, isValidSession, readCookie, SESSION_COOKIE } from "@/lib/admin-auth";

beforeEach(() => {
  process.env.ADMIN_TOKEN = "the-admin-token";
});

const NOW = Date.UTC(2026, 10, 13, 12);
const DAY = 86_400_000;

describe("admin sessions", () => {
  it("are valid for 30 days, then expire", () => {
    const s = createSession(NOW);
    expect(isValidSession(s, NOW + DAY)).toBe(true);
    expect(isValidSession(s, NOW + 29 * DAY)).toBe(true);
    expect(isValidSession(s, NOW + 31 * DAY)).toBe(false);
  });

  it("never contain the token, and reject tampering", () => {
    const s = createSession(NOW);
    expect(s).not.toContain("the-admin-token");
    const [exp, mac] = s.split(".");
    expect(isValidSession(`${Number(exp) + 1}.${mac}`, NOW)).toBe(false);
    expect(isValidSession(`${exp}.${mac.slice(0, -1)}x`, NOW)).toBe(false);
    expect(isValidSession("garbage", NOW)).toBe(false);
    expect(isValidSession(undefined, NOW)).toBe(false);
  });

  it("all end when the admin token is rotated", () => {
    const s = createSession(NOW);
    process.env.ADMIN_TOKEN = "a-new-token";
    expect(isValidSession(s, NOW + DAY)).toBe(false);
  });
});

describe("admin requests", () => {
  const url = "https://watchcrop.test/api/admin";
  const withCookie = (init: RequestInit = {}) =>
    new Request(url, {
      ...init,
      headers: { cookie: `other=1; ${SESSION_COOKIE}=${encodeURIComponent(createSession())}`, ...(init.headers ?? {}) },
    });

  it("reads one cookie out of the header", () => {
    expect(readCookie("a=1; wc_admin=xyz; b=2", "wc_admin")).toBe("xyz");
    expect(readCookie(null, "wc_admin")).toBeNull();
  });

  it("accept the token header (scripts) or the session cookie", () => {
    expect(isAdminRequest(new Request(url, { method: "POST", headers: { "x-admin-token": "the-admin-token" } }))).toBe(true);
    expect(isAdminRequest(withCookie())).toBe(true);
    expect(isAdminRequest(withCookie({ method: "POST", headers: { origin: "https://watchcrop.test" } }))).toBe(true);
  });

  it("refuse cookie-authenticated writes from another site, and no credentials at all", () => {
    expect(isAdminRequest(withCookie({ method: "POST", headers: { origin: "https://evil.test" } }))).toBe(false);
    expect(isAdminRequest(new Request(url, { method: "POST" }))).toBe(false);
    expect(isAdminRequest(new Request(url, { headers: { "x-admin-token": "wrong" } }))).toBe(false);
  });
});
