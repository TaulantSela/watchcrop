ALTER TABLE "aliases" ADD COLUMN "brand" text;--> statement-breakpoint
ALTER TABLE "guesses_log" ADD COLUMN "player_id" text;--> statement-breakpoint
CREATE INDEX "guesses_log_date_solved_idx" ON "guesses_log" USING btree ("puzzle_date","solved");