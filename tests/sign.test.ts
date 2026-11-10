import { beforeAll, describe, expect, it } from "vitest";
import { cropUrl, signCrop, verifyCrop } from "@/lib/sign";

beforeAll(() => {
  process.env.GUESS_SECRET = "test-secret";
});

describe("crop tokens", () => {
  it("verifies a token only for its own date and crop", () => {
    const t = signCrop("2026-11-10", 0);
    expect(verifyCrop("2026-11-10", 0, t)).toBe(true);
    expect(verifyCrop("2026-11-10", 1, t)).toBe(false);
    expect(verifyCrop("2026-11-11", 0, t)).toBe(false);
  });

  it("rejects empty and malformed tokens", () => {
    expect(verifyCrop("2026-11-10", 0, "")).toBe(false);
    expect(verifyCrop("2026-11-10", 0, "x".repeat(43))).toBe(false);
  });

  it("builds a URL carrying the token", () => {
    expect(cropUrl("2026-11-10", 3)).toBe(`/api/crop/2026-11-10/3?t=${signCrop("2026-11-10", 3)}`);
  });
});
