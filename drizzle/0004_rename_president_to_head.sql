-- Club team role: president -> head. Renamed in place, so existing admins
-- rows keep their role.
ALTER TYPE "public"."admin_role" RENAME VALUE 'president' TO 'head';
