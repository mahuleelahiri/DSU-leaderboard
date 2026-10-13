export type BoardMember = {
  id: string;
  name: string;
  photo_url: string | null;
  marks: number;
  rank: number;
};

export type DomainBoard = {
  id: string;
  name: string;
  member_count: number;
  members: BoardMember[];
};

export type PublicClub = {
  id: string;
  name: string;
  season_name: string | null;
  domains: DomainBoard[];
};

export type PublicHistory = {
  member: { id: string; name: string; photo_url: string | null; domain: string };
  entries: { id: string; marks: number; reason: string | null; created_at: string; season_name: string; given_by: string }[];
};

export type ClubMember = {
  id: string;
  club_id: string;
  domain_id: string;
  name: string;
  photo_url: string | null;
  active: boolean;
  joined_date: string;
};

export type ClubDomain = { id: string; club_id: string; name: string };
export type ClubSeason = { id: string; club_id: string; name: string; start_date: string; end_date: string; is_current: boolean };
export type ClubEntry = { id: string; club_id: string; member_id: string; season_id: string; given_by: string; marks: number; reason: string | null; created_at: string };
export type JoinRequest = { id: string; club_id: string; domain_id: string; name: string; status: "pending" | "approved" | "rejected"; created_at: string };
export type ClubAdmin = { user_id: string; club_id: string; email: string; name: string };