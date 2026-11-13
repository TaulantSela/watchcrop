ALTER TABLE "watches" ADD COLUMN "master_width" integer;--> statement-breakpoint
ALTER TABLE "watches" ADD COLUMN "master_height" integer;--> statement-breakpoint
ALTER TABLE "watches" ADD COLUMN "logo_masks" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "watches" ADD COLUMN "crop_keys" jsonb DEFAULT '[]'::jsonb;