CREATE TABLE "affiliate_clicks" (
	"id" serial PRIMARY KEY NOT NULL,
	"ref" text NOT NULL,
	"puzzle_date" date,
	"referer" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "aliases" (
	"id" serial PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"alias" text NOT NULL,
	"canonical" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guesses_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"puzzle_date" date NOT NULL,
	"crop_index" integer NOT NULL,
	"guess_brand" text,
	"guess_model" text,
	"brand_correct" boolean DEFAULT false NOT NULL,
	"solved" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "puzzles" (
	"id" serial PRIMARY KEY NOT NULL,
	"puzzle_date" date NOT NULL,
	"puzzle_number" integer NOT NULL,
	"watch_id" integer NOT NULL,
	"sponsored" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "waitlist" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"source" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "watches" (
	"id" serial PRIMARY KEY NOT NULL,
	"brand" text NOT NULL,
	"model" text NOT NULL,
	"reference" text,
	"year" integer,
	"movement" text,
	"price_tier" text DEFAULT 'mid' NOT NULL,
	"difficulty_weight" integer DEFAULT 2 NOT NULL,
	"spec_bullets" jsonb DEFAULT '[]'::jsonb,
	"affiliate_ref" text,
	"affiliate_url" text,
	"master_blob_key" text,
	"crop_specs" jsonb DEFAULT '[]'::jsonb,
	"distinctive_design" boolean DEFAULT false NOT NULL,
	"photo_source" text,
	"photo_license" text,
	"attribution" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "puzzles" ADD CONSTRAINT "puzzles_watch_id_watches_id_fk" FOREIGN KEY ("watch_id") REFERENCES "public"."watches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "aliases_alias_idx" ON "aliases" USING btree ("alias");--> statement-breakpoint
CREATE UNIQUE INDEX "puzzles_date_unique" ON "puzzles" USING btree ("puzzle_date");--> statement-breakpoint
CREATE UNIQUE INDEX "puzzles_number_unique" ON "puzzles" USING btree ("puzzle_number");--> statement-breakpoint
CREATE UNIQUE INDEX "waitlist_email_unique" ON "waitlist" USING btree ("email");