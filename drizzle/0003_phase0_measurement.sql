CREATE TABLE "visits" (
	"id" serial PRIMARY KEY NOT NULL,
	"path" text NOT NULL,
	"utm_source" text,
	"utm_medium" text,
	"utm_campaign" text,
	"referrer_host" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "waitlist" ADD COLUMN "utm_source" text;--> statement-breakpoint
ALTER TABLE "waitlist" ADD COLUMN "utm_medium" text;--> statement-breakpoint
ALTER TABLE "waitlist" ADD COLUMN "utm_campaign" text;--> statement-breakpoint
ALTER TABLE "waitlist" ADD COLUMN "referrer_host" text;--> statement-breakpoint
CREATE INDEX "visits_created_idx" ON "visits" USING btree ("created_at");