import { describe, expect, it } from "vitest";
import { rankMembers } from "@/lib/ranking";

const m = (id: string, name: string, marks: number) => ({ id, name, marks });

describe("rankMembers", () => {
  it("sorts by marks descending", () => {
    const ranked = rankMembers([m("a", "A", 5), m("b", "B", 20), m("c", "C", 10)]);
    expect(ranked.map((r) => [r.id, r.rank])).toEqual([["b", 1], ["c", 2], ["a", 3]]);
  });

  it("uses standard competition ranking for ties (1, 1, 3)", () => {
    const ranked = rankMembers([m("a", "Zed", 10), m("b", "Amy", 10), m("c", "Cat", 4)]);
    expect(ranked.map((r) => r.rank)).toEqual([1, 1, 3]);
  });

  it("breaks ties alphabetically, case-insensitively", () => {
    const ranked = rankMembers([m("a", "zoe", 1), m("b", "Adam", 1), m("c", "bella", 1)]);
    expect(ranked.map((r) => r.name)).toEqual(["Adam", "bella", "zoe"]);
  });

  it("handles negative totals and empty input", () => {
    expect(rankMembers([])).toEqual([]);
    expect(rankMembers([m("a", "A", -5), m("b", "B", 0)]).map((r) => r.id)).toEqual(["b", "a"]);
  });

  it("does not mutate the input", () => {
    const input = [m("a", "A", 1), m("b", "B", 2)];
    rankMembers(input);
    expect(input[0].id).toBe("a");
  });
});
