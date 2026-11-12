/** Client-safe types shared between server data loaders and UI components. */

export type PublicSeason = { id: string; name: string; isCurrent: boolean; startDate: string; endDate: string };

export type PublicMember = {
  id: string;
  name: string;
  photoUrl: string | null;
  domainId: string;
  marks: number;
  /** Marks earned in the last 7 days (used to show rank movement). */
  recentMarks: number;
  entries: number;
  lastAwardAt: string | null;
};

export type PublicBoard = {
  club: { id: string; name: string; description: string | null; accessCode: string; allowJoinRequests: boolean };
  seasons: PublicSeason[];
  season: PublicSeason | null;
  domains: { id: string; name: string }[];
  members: PublicMember[];
  stats: { totalMarks: number; activeMembers: number; scoringThisWeek: number };
  generatedAt: string;
};

export type MemberHistory = {
  member: { id: string; name: string; photoUrl: string | null; domain: string; joinedDate: string };
  seasonTotals: { seasonId: string; seasonName: string; marks: number; isCurrent: boolean }[];
  entries: { id: string; marks: number; reason: string | null; createdAt: string; seasonName: string; givenBy: string | null }[];
};
