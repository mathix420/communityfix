CREATE TABLE "node_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"target_kind" text NOT NULL,
	"issue_id" integer,
	"case_study_id" integer,
	"user_id" uuid NOT NULL,
	"role" text NOT NULL,
	"source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "node_members" ADD CONSTRAINT "node_members_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "node_members" ADD CONSTRAINT "node_members_case_study_id_case_studies_id_fk" FOREIGN KEY ("case_study_id") REFERENCES "public"."case_studies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "node_members" ADD CONSTRAINT "node_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "node_members_issue_id_idx" ON "node_members" USING btree ("issue_id");--> statement-breakpoint
CREATE INDEX "node_members_case_study_id_idx" ON "node_members" USING btree ("case_study_id");--> statement-breakpoint
CREATE INDEX "node_members_user_id_idx" ON "node_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "node_members_role_idx" ON "node_members" USING btree ("role");