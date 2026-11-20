import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultSiteUrl, normalizeSiteUrl, siteUrlOrDefault } from "@/lib/site-url";

afterEach(() => vi.unstubAllEnvs());

describe("normalizeSiteUrl", () => {
  it("adds https:// to a bare domain (the Vercel copy-paste slip)", () => {
    expect(normalizeSiteUrl("clubhouseuemk.vercel.app")).toBe("https://clubhouseuemk.vercel.app");
  });
  it("keeps explicit schemes and strips trailing slashes and spaces", () => {
    expect(normalizeSiteUrl(" http://localhost:3000/ ")).toBe("http://localhost:3000");
    expect(normalizeSiteUrl("https://club.example.com//")).toBe("https://club.example.com");
  });
  it("treats blank values as unset", () => {
    expect(normalizeSiteUrl("")).toBeUndefined();
    expect(normalizeSiteUrl("   ")).toBeUndefined();
    expect(normalizeSiteUrl(undefined)).toBeUndefined();
  });
});

describe("defaults", () => {
  it("uses Vercel's production domain when available", () => {
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "clubhouseuemk.vercel.app");
    expect(defaultSiteUrl()).toBe("https://clubhouseuemk.vercel.app");
  });
  it("falls back to localhost elsewhere", () => {
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "");
    expect(defaultSiteUrl()).toBe("http://localhost:3000");
  });
  it("never throws on malformed input", () => {
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "");
    expect(siteUrlOrDefault("not a url at all").href).toBe("http://localhost:3000/");
    expect(siteUrlOrDefault("clubhouseuemk.vercel.app").href).toBe("https://clubhouseuemk.vercel.app/");
  });
});
