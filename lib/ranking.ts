export type Rankable = { id: string; name: string; marks: number };
export type Ranked<T extends Rankable> = T & { rank: number };

/**
 * Standard competition ranking ("1224"): tied scores share a rank and the next
 * distinct score skips ahead. Ties are listed alphabetically for stability.
 */
export function rankMembers<T extends Rankable>(items: readonly T[]): Ranked<T>[] {
  const sorted = [...items].sort((a, b) => b.marks - a.marks || a.name.localeCompare(b.name, "en", { sensitivity: "base" }));
  let previousMarks: number | null = null;
  let previousRank = 0;
  return sorted.map((item, index) => {
    const rank = previousMarks === item.marks ? previousRank : index + 1;
    previousMarks = item.marks;
    previousRank = rank;
    return { ...item, rank };
  });
}
