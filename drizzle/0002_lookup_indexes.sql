CREATE INDEX "join_requests_domain_idx" ON "join_requests" USING btree ("domain_id");--> statement-breakpoint
CREATE INDEX "entries_season_idx" ON "mark_entries" USING btree ("season_id");--> statement-breakpoint
CREATE INDEX "members_domain_idx" ON "members" USING btree ("domain_id");