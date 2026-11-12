import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

export const joinRequestStatus = pgEnum("join_request_status", ["pending", "approved", "rejected"]);
export const adminRole = pgEnum("admin_role", ["owner", "editor"]);

/* -------------------------------------------------------------------------- */
/*                               Better Auth core                             */
/* -------------------------------------------------------------------------- */

export const user = pgTable("user", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const session = pgTable(
  "session",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [index("session_user_idx").on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("account_user_idx").on(t.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

/** Better Auth database-backed rate limiting (works across serverless instances). */
export const rateLimit = pgTable("rate_limit", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
});

/* -------------------------------------------------------------------------- */
/*                                  Platform                                  */
/* -------------------------------------------------------------------------- */

export const clubs = pgTable(
  "clubs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    description: text("description"),
    accessCode: text("access_code").notNull().unique(),
    allowJoinRequests: boolean("allow_join_requests").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check("clubs_name_not_blank", sql`length(btrim(${t.name})) > 0`),
    check("clubs_access_code_format", sql`${t.accessCode} ~ '^[A-HJ-NP-Z2-9]{6}$'`),
  ],
);

export const superAdmins = pgTable("super_admins", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: createdAt(),
});

export const domains = pgTable(
  "domains",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clubId: uuid("club_id")
      .notNull()
      .references(() => clubs.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("domains_club_name_uidx").on(t.clubId, sql`lower(btrim(${t.name}))`)],
);

export const admins = pgTable(
  "admins",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    clubId: uuid("club_id")
      .notNull()
      .references(() => clubs.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    name: text("name").notNull(),
    role: adminRole("role").notNull().default("editor"),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.clubId] }), index("admins_club_idx").on(t.clubId)],
);

export const members = pgTable(
  "members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clubId: uuid("club_id")
      .notNull()
      .references(() => clubs.id, { onDelete: "cascade" }),
    domainId: uuid("domain_id")
      .notNull()
      .references(() => domains.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    photoUrl: text("photo_url"),
    active: boolean("active").notNull().default(true),
    joinedDate: timestamp("joined_date", { withTimezone: true }).notNull().defaultNow(),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("members_club_name_uidx").on(t.clubId, sql`lower(btrim(${t.name}))`),
    index("members_club_domain_idx").on(t.clubId, t.domainId, t.active),
    index("members_domain_idx").on(t.domainId),
  ],
);

export const seasons = pgTable(
  "seasons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clubId: uuid("club_id")
      .notNull()
      .references(() => clubs.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    startDate: timestamp("start_date", { withTimezone: true }).notNull(),
    endDate: timestamp("end_date", { withTimezone: true }).notNull(),
    isCurrent: boolean("is_current").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("seasons_one_current_per_club_uidx").on(t.clubId).where(sql`${t.isCurrent}`),
    check("seasons_dates_ordered", sql`${t.endDate} >= ${t.startDate}`),
  ],
);

export const markEntries = pgTable(
  "mark_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clubId: uuid("club_id")
      .notNull()
      .references(() => clubs.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "restrict" }),
    seasonId: uuid("season_id")
      .notNull()
      .references(() => seasons.id, { onDelete: "restrict" }),
    marks: integer("marks").notNull(),
    reason: text("reason"),
    /** Nullable so an admin account can be deleted without erasing history. */
    givenBy: uuid("given_by").references(() => user.id, { onDelete: "set null" }),
    /** Snapshot of the awarding admin's display name at the time of the award. */
    givenByName: text("given_by_name"),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
    legacyCategoryName: text("legacy_category_name"),
  },
  (t) => [
    index("entries_club_season_member_idx").on(t.clubId, t.seasonId, t.memberId),
    index("entries_club_created_idx").on(t.clubId, t.createdAt.desc()),
    index("entries_member_idx").on(t.memberId),
    index("entries_season_idx").on(t.seasonId),
    check("entries_marks_range", sql`${t.marks} between -10000 and 10000`),
  ],
);

export const joinRequests = pgTable(
  "join_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clubId: uuid("club_id")
      .notNull()
      .references(() => clubs.id, { onDelete: "cascade" }),
    domainId: uuid("domain_id")
      .notNull()
      .references(() => domains.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    note: text("note"),
    status: joinRequestStatus("status").notNull().default("pending"),
    reviewedBy: uuid("reviewed_by").references(() => user.id, { onDelete: "set null" }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("join_requests_club_status_idx").on(t.clubId, t.status, t.createdAt.desc()), index("join_requests_domain_idx").on(t.domainId)],
);

/** Append-only trail of every privileged mutation on the platform. */
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clubId: uuid("club_id").references(() => clubs.id, { onDelete: "cascade" }),
    actorId: uuid("actor_id").references(() => user.id, { onDelete: "set null" }),
    actorEmail: text("actor_email"),
    action: text("action").notNull(),
    targetType: text("target_type"),
    targetId: text("target_id"),
    summary: text("summary").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    ipAddress: text("ip_address"),
    createdAt: createdAt(),
  },
  (t) => [
    index("audit_club_created_idx").on(t.clubId, t.createdAt.desc()),
    index("audit_created_idx").on(t.createdAt.desc()),
  ],
);

/** Fixed-window throttle for anonymous public endpoints (e.g. join requests). */
export const throttles = pgTable("throttles", {
  key: text("key").primaryKey(),
  count: integer("count").notNull().default(0),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull().defaultNow(),
});

export const legacyCategoriesArchive = pgTable("legacy_categories_archive", {
  id: uuid("id").primaryKey().defaultRandom(),
  clubId: uuid("club_id")
    .notNull()
    .references(() => clubs.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  defaultMarks: integer("default_marks"),
  createdAt: createdAt(),
});

export type Club = typeof clubs.$inferSelect;
export type Member = typeof members.$inferSelect;
export type Domain = typeof domains.$inferSelect;
export type Season = typeof seasons.$inferSelect;
export type MarkEntry = typeof markEntries.$inferSelect;
export type AdminRole = (typeof adminRole.enumValues)[number];
