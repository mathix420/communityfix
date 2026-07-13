ALTER TABLE "case_studies" ADD COLUMN "help_labels" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "help_labels" text[] DEFAULT '{}'::text[] NOT NULL;