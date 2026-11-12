CREATE TYPE "public"."admin_role" AS ENUM('owner', 'editor');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"club_id" uuid,
	"actor_id" uuid,
	"actor_email" text,
	"action" text NOT NULL,
	"target_type" text,
	"target_id" text,
	"summary" text NOT NULL,
	"metadata" jsonb,
	"ip_address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"count" integer NOT NULL,
	"last_request" bigint NOT NULL,
	CONSTRAINT "rate_limit_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "throttles" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"window_start" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mark_entries" DROP CONSTRAINT "mark_entries_given_by_user_id_fk";
--> statement-breakpoint
ALTER TABLE "mark_entries" ALTER COLUMN "given_by" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "admins" ADD COLUMN "role" "admin_role" DEFAULT 'editor' NOT NULL;--> statement-breakpoint
ALTER TABLE "clubs" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "clubs" ADD COLUMN "allow_join_requests" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "clubs" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "join_requests" ADD COLUMN "note" text;--> statement-breakpoint
ALTER TABLE "join_requests" ADD COLUMN "reviewed_by" uuid;--> statement-breakpoint
ALTER TABLE "join_requests" ADD COLUMN "reviewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "mark_entries" ADD COLUMN "given_by_name" text;--> statement-breakpoint
ALTER TABLE "mark_entries" ADD COLUMN "updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_club_created_idx" ON "audit_logs" USING btree ("club_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "audit_created_idx" ON "audit_logs" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
ALTER TABLE "join_requests" ADD CONSTRAINT "join_requests_reviewed_by_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mark_entries" ADD CONSTRAINT "mark_entries_given_by_user_id_fk" FOREIGN KEY ("given_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "admins_club_idx" ON "admins" USING btree ("club_id");--> statement-breakpoint
CREATE UNIQUE INDEX "domains_club_name_uidx" ON "domains" USING btree ("club_id",lower(btrim("name")));--> statement-breakpoint
CREATE INDEX "join_requests_club_status_idx" ON "join_requests" USING btree ("club_id","status","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "entries_club_season_member_idx" ON "mark_entries" USING btree ("club_id","season_id","member_id");--> statement-breakpoint
CREATE INDEX "entries_club_created_idx" ON "mark_entries" USING btree ("club_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "entries_member_idx" ON "mark_entries" USING btree ("member_id");--> statement-breakpoint
CREATE UNIQUE INDEX "members_club_name_uidx" ON "members" USING btree ("club_id",lower(btrim("name")));--> statement-breakpoint
CREATE INDEX "members_club_domain_idx" ON "members" USING btree ("club_id","domain_id","active");--> statement-breakpoint
CREATE UNIQUE INDEX "seasons_one_current_per_club_uidx" ON "seasons" USING btree ("club_id") WHERE "seasons"."is_current";--> statement-breakpoint
CREATE INDEX "session_user_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
ALTER TABLE "clubs" ADD CONSTRAINT "clubs_name_not_blank" CHECK (length(btrim("clubs"."name")) > 0);--> statement-breakpoint
ALTER TABLE "clubs" ADD CONSTRAINT "clubs_access_code_format" CHECK ("clubs"."access_code" ~ '^[A-HJ-NP-Z2-9]{6}$');--> statement-breakpoint
ALTER TABLE "mark_entries" ADD CONSTRAINT "entries_marks_range" CHECK ("mark_entries"."marks" between -10000 and 10000);--> statement-breakpoint
ALTER TABLE "seasons" ADD CONSTRAINT "seasons_dates_ordered" CHECK ("seasons"."end_date" >= "seasons"."start_date");--> statement-breakpoint
-- Data backfill: admins that existed before roles were introduced keep full control.
UPDATE "admins" SET "role" = 'owner';--> statement-breakpoint
-- Snapshot the awarding admin's name onto historical entries.
UPDATE "mark_entries" e SET "given_by_name" = a."name" FROM "admins" a WHERE a."user_id" = e."given_by" AND a."club_id" = e."club_id" AND e."given_by_name" IS NULL;
