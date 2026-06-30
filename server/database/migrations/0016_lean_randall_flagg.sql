CREATE TABLE "revisions" (
	"id" serial PRIMARY KEY NOT NULL,
	"target_kind" text NOT NULL,
	"issue_id" integer,
	"case_study_id" integer,
	"proposer_id" uuid,
	"status" text DEFAULT 'pending' NOT NULL,
	"changes" jsonb NOT NULL,
	"base_snapshot" jsonb NOT NULL,
	"applied_snapshot" jsonb,
	"base_updated_at" timestamp with time zone,
	"note" text,
	"ai_verdict" text,
	"ai_confidence" numeric,
	"ai_reason" text,
	"decided_by_id" uuid,
	"decided_by_role" text,
	"decision_reason" text,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "revisions" ADD CONSTRAINT "revisions_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revisions" ADD CONSTRAINT "revisions_case_study_id_case_studies_id_fk" FOREIGN KEY ("case_study_id") REFERENCES "public"."case_studies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revisions" ADD CONSTRAINT "revisions_proposer_id_users_id_fk" FOREIGN KEY ("proposer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revisions" ADD CONSTRAINT "revisions_decided_by_id_users_id_fk" FOREIGN KEY ("decided_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "revisions_issue_id_idx" ON "revisions" USING btree ("issue_id");--> statement-breakpoint
CREATE INDEX "revisions_case_study_id_idx" ON "revisions" USING btree ("case_study_id");--> statement-breakpoint
CREATE INDEX "revisions_status_idx" ON "revisions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "revisions_proposer_id_idx" ON "revisions" USING btree ("proposer_id");--> statement-breakpoint
CREATE INDEX "revisions_target_kind_status_idx" ON "revisions" USING btree ("target_kind","status");