ALTER TABLE "case_studies" ADD COLUMN "status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
UPDATE "case_studies" SET "status" = 'approved' WHERE "status" = 'pending';--> statement-breakpoint
ALTER TABLE "case_studies" ADD COLUMN "rejection_reason" text;--> statement-breakpoint
ALTER TABLE "case_studies" ADD COLUMN "rejected_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "case_studies" ADD COLUMN "is_spam" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "info_request" text;--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "info_requested_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "info_response" text;--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "info_responded_at" timestamp with time zone;