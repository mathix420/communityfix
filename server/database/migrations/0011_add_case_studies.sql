CREATE TABLE "case_studies" (
	"id" serial PRIMARY KEY NOT NULL,
	"solution_id" integer NOT NULL,
	"author_id" uuid,
	"description" text,
	"outcome" text NOT NULL,
	"scale" text,
	"location_name" text NOT NULL,
	"location" geometry(point) NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"implementer" text,
	"start_date" date,
	"end_date" date,
	"metrics" jsonb,
	"cost" numeric,
	"currency" text,
	"funding_source" text,
	"sources" jsonb,
	"lessons_learned" jsonb,
	"media" jsonb,
	"embedding" vector(1536),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "case_studies" ADD CONSTRAINT "case_studies_solution_id_issues_id_fk" FOREIGN KEY ("solution_id") REFERENCES "public"."issues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_studies" ADD CONSTRAINT "case_studies_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "case_studies_solution_idx" ON "case_studies" USING btree ("solution_id");