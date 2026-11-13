CREATE TABLE "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"window_start" timestamp with time zone DEFAULT now() NOT NULL,
	"hits" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "waitlist" ADD COLUMN "flagged_bot" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX "rate_limits_window_idx" ON "rate_limits" USING btree ("window_start");