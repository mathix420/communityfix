ALTER TABLE "case_studies" DROP COLUMN IF EXISTS "media";--> statement-breakpoint
ALTER TABLE "case_studies" ADD COLUMN "links" jsonb;--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "links" jsonb;
