CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"action" text NOT NULL,
	"status" text DEFAULT 'auto_resolved' NOT NULL,
	"issue_id" integer,
	"user_id" uuid,
	"reason" text,
	"details" jsonb,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"review_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_type_idx" ON "audit_logs" USING btree ("type");--> statement-breakpoint
CREATE INDEX "audit_logs_status_idx" ON "audit_logs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "audit_logs_issue_id_idx" ON "audit_logs" USING btree ("issue_id");--> statement-breakpoint
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");