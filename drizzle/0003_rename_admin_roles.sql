-- Club team roles: owner -> president, editor -> member.
-- Renaming enum values in place keeps every existing admins row (and any
-- default) pointing at the same value, so no data is copied or rewritten.
ALTER TYPE "public"."admin_role" RENAME VALUE 'owner' TO 'president';--> statement-breakpoint
ALTER TYPE "public"."admin_role" RENAME VALUE 'editor' TO 'member';--> statement-breakpoint
ALTER TABLE "admins" ALTER COLUMN "role" SET DEFAULT 'member';
