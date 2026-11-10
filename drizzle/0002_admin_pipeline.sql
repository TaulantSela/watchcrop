ALTER TABLE "watches" ADD COLUMN "logo_qa_at" timestamp;--> statement-breakpoint
CREATE UNIQUE INDEX "watches_affiliate_ref_unique" ON "watches" USING btree ("affiliate_ref");