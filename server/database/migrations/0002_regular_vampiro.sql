ALTER TABLE "users" ADD COLUMN "trust_score" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "trust_score_updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "votes" ADD COLUMN "weight" integer DEFAULT 1 NOT NULL;