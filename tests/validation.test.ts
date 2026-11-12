import { describe, expect, it } from "vitest";
import { awardMarksSchema, joinRequestSchema, parseMemberCsv, seasonSchema } from "@/lib/validation";

const uuid = "3f1c1a52-4a7e-4a3b-9c55-1d2e3f4a5b6c";

describe("parseMemberCsv", () => {
  it("parses comma and tab separated rows and skips a header", () => {
    const { rows, errors } = parseMemberCsv("Name, Domain\nAarav Sharma, Design\nMeera\tWeb Dev\n\n");
    expect(errors).toEqual([]);
    expect(rows).toEqual([
      { line: 2, name: "Aarav Sharma", domain: "Design" },
      { line: 3, name: "Meera", domain: "Web Dev" },
    ]);
  });

  it("reports missing domains with line numbers", () => {
    const { rows, errors } = parseMemberCsv("Solo Person\nOk, Design");
    expect(rows).toHaveLength(1);
    expect(errors[0]).toMatchObject({ line: 1 });
  });

  it("collapses whitespace and strips quotes", () => {
    const { rows } = parseMemberCsv('"Riya   Kapoor",  "UI/UX"');
    expect(rows[0]).toMatchObject({ name: "Riya Kapoor", domain: "UI/UX" });
  });
});

describe("awardMarksSchema", () => {
  it("rejects zero, fractional and out-of-range marks", () => {
    for (const marks of [0, 1.5, 1001, -1001]) {
      expect(awardMarksSchema.safeParse({ clubId: uuid, memberIds: [uuid], marks }).success).toBe(false);
    }
  });

  it("requires at least one member and normalises an empty reason to null", () => {
    expect(awardMarksSchema.safeParse({ clubId: uuid, memberIds: [], marks: 5 }).success).toBe(false);
    const ok = awardMarksSchema.parse({ clubId: uuid, memberIds: [uuid], marks: "10", reason: "  " });
    expect(ok).toMatchObject({ marks: 10, reason: null });
  });
});

describe("seasonSchema", () => {
  it("rejects end dates before start dates", () => {
    const result = seasonSchema.safeParse({ clubId: uuid, name: "S1", startDate: "2026-06-01", endDate: "2026-05-01" });
    expect(result.success).toBe(false);
  });
});

describe("joinRequestSchema", () => {
  it("rejects filled honeypot fields", () => {
    expect(joinRequestSchema.safeParse({ code: "7KDM4R", name: "A", domainId: uuid, website: "spam" }).success).toBe(false);
  });

  it("uppercases the club code", () => {
    expect(joinRequestSchema.parse({ code: "7kdm4r", name: " A  B ", domainId: uuid })).toMatchObject({ code: "7KDM4R", name: "A B" });
  });
});
