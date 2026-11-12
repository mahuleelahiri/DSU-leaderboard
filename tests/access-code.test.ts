import { describe, expect, it } from "vitest";
import { ACCESS_CODE_PATTERN, generateAccessCode, isValidAccessCode, normalizeAccessCode } from "@/lib/access-code";

describe("access codes", () => {
  it("generates valid, unambiguous codes", () => {
    for (let i = 0; i < 2000; i += 1) {
      const code = generateAccessCode();
      expect(code).toMatch(ACCESS_CODE_PATTERN);
      expect(code).not.toMatch(/[01IO]/);
    }
  });

  it("is effectively unique across many draws", () => {
    const codes = new Set(Array.from({ length: 5000 }, generateAccessCode));
    expect(codes.size).toBeGreaterThan(4990);
  });

  it("normalises user input", () => {
    expect(normalizeAccessCode(" ab-c 2d9xyz ")).toBe("ABC2D9");
    expect(normalizeAccessCode(null)).toBe("");
    expect(normalizeAccessCode("io01")).toBe("");
  });

  it("validates format", () => {
    expect(isValidAccessCode("7KDM4R")).toBe(true);
    expect(isValidAccessCode("7KDM4")).toBe(false);
    expect(isValidAccessCode("7KDM4O")).toBe(false);
  });
});
