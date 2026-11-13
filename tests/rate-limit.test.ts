import { beforeAll, describe, expect, it } from "vitest";
import { getDb } from "@/db";
import { rateLimits } from "@/db/schema";
import { bucketKey, clientIp, hit, type Limit } from "@/lib/rate-limit";

beforeAll(() => {
  process.env.GUESS_SECRET = "test-secret";
});

const from = (ip: string) => new Request("https://x.test/api/guess", { method: "POST", headers: { "x-real-ip": ip } });
const limit = (name: string, max = 3, windowSec = 60): Limit => ({ name, max, windowSec });
const at = (iso: string) => new Date(iso);

describe("client IP", () => {
  it("prefers x-real-ip, then the first x-forwarded-for hop", () => {
    expect(clientIp(from("1.2.3.4"))).toBe("1.2.3.4");
    const fwd = new Request("https://x.test", { headers: { "x-forwarded-for": "5.6.7.8, 10.0.0.1" } });
    expect(clientIp(fwd)).toBe("5.6.7.8");
    expect(clientIp(new Request("https://x.test"))).toBeNull();
  });
});

describe("bucket keys", () => {
  it("never contain the IP, and differ per limit and per secret", () => {
    const k = bucketKey(limit("guess"), "203.0.113.9", "s1");
    expect(k).not.toContain("203.0.113.9");
    expect(k).toMatch(/^guess:[\w-]{22}$/);
    expect(bucketKey(limit("guess"), "203.0.113.9", "s1")).toBe(k);
    expect(bucketKey(limit("waitlist"), "203.0.113.9", "s1")).not.toBe(k);
    expect(bucketKey(limit("guess"), "203.0.113.9", "s2")).not.toBe(k);
  });
});

describe("fixed-window limiter", () => {
  it("allows max requests per window, then refuses with a retry time", async () => {
    const l = limit("t-max", 3, 60);
    const now = at("2026-11-13T10:00:00Z");
    for (let i = 0; i < 3; i++) expect((await hit(l, from("198.51.100.1"), now)).ok).toBe(true);
    const blocked = await hit(l, from("198.51.100.1"), at("2026-11-13T10:00:20Z"));
    expect(blocked).toEqual({ ok: false, retryAfterSec: 40 });
  });

  it("counts each client separately", async () => {
    const l = limit("t-split", 1, 60);
    const now = at("2026-11-13T10:00:00Z");
    expect((await hit(l, from("198.51.100.2"), now)).ok).toBe(true);
    expect((await hit(l, from("198.51.100.2"), now)).ok).toBe(false);
    expect((await hit(l, from("198.51.100.3"), now)).ok).toBe(true);
  });

  it("starts a fresh window once the old one has passed", async () => {
    const l = limit("t-reset", 1, 60);
    expect((await hit(l, from("198.51.100.4"), at("2026-11-13T10:00:00Z"))).ok).toBe(true);
    expect((await hit(l, from("198.51.100.4"), at("2026-11-13T10:00:59Z"))).ok).toBe(false);
    expect((await hit(l, from("198.51.100.4"), at("2026-11-13T10:01:00Z"))).ok).toBe(true);
  });

  it("fails open when there's no client IP", async () => {
    const l = limit("t-noip", 0, 60);
    expect((await hit(l, new Request("https://x.test"), at("2026-11-13T10:00:00Z"))).ok).toBe(true);
  });

  it("stores only hashed keys", async () => {
    await hit(limit("t-store"), from("192.0.2.77"), at("2026-11-13T10:00:00Z"));
    const rows = await (await getDb()).select().from(rateLimits);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.some((r) => r.key.includes("192.0.2.77"))).toBe(false);
  });
});
