CREATE TABLE "case_study_solutions" (
	"case_study_id" integer NOT NULL,
	"solution_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "case_study_solutions_case_study_id_solution_id_pk" PRIMARY KEY("case_study_id","solution_id")
);
--> statement-breakpoint
ALTER TABLE "case_studies" ADD COLUMN "title" text;--> statement-breakpoint
INSERT INTO "case_study_solutions" ("case_study_id", "solution_id")
SELECT "id", "solution_id" FROM "case_studies";--> statement-breakpoint
UPDATE "case_studies" AS cs
SET "title" = i."title"
FROM "issues" AS i
WHERE i."id" = cs."solution_id";--> statement-breakpoint
ALTER TABLE "case_studies" ALTER COLUMN "title" SET NOT NULL;--> statement-breakpoint
UPDATE "revisions"
SET
  "changes" = CASE
    WHEN "changes" ? 'solutionId'
      THEN ("changes" - 'solutionId') || jsonb_build_object(
        'solutionIds', jsonb_build_array(("changes"->>'solutionId')::integer)
      )
    ELSE "changes"
  END,
  "base_snapshot" = CASE
    WHEN "base_snapshot" ? 'solutionId'
      THEN ("base_snapshot" - 'solutionId') || jsonb_build_object(
        'solutionIds', jsonb_build_array(("base_snapshot"->>'solutionId')::integer)
      )
    ELSE "base_snapshot"
  END,
  "applied_snapshot" = CASE
    WHEN "applied_snapshot" ? 'solutionId'
      THEN ("applied_snapshot" - 'solutionId') || jsonb_build_object(
        'solutionIds', jsonb_build_array(("applied_snapshot"->>'solutionId')::integer)
      )
    ELSE "applied_snapshot"
  END
WHERE "target_kind" = 'case_study';--> statement-breakpoint
UPDATE "audit_logs"
SET "details" = ("details" - 'solutionId') || jsonb_build_object(
  'solutionIds', jsonb_build_array(("details"->>'solutionId')::integer)
)
WHERE "details" ? 'caseStudyId'
  AND "details" ? 'solutionId';--> statement-breakpoint
ALTER TABLE "case_study_solutions" ADD CONSTRAINT "case_study_solutions_case_study_id_case_studies_id_fk" FOREIGN KEY ("case_study_id") REFERENCES "public"."case_studies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_study_solutions" ADD CONSTRAINT "case_study_solutions_solution_id_issues_id_fk" FOREIGN KEY ("solution_id") REFERENCES "public"."issues"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "case_study_solutions_solution_idx" ON "case_study_solutions" USING btree ("solution_id");--> statement-breakpoint
ALTER TABLE "case_studies" DROP CONSTRAINT "case_studies_solution_id_issues_id_fk";--> statement-breakpoint
DROP INDEX "case_studies_solution_idx";--> statement-breakpoint
ALTER TABLE "case_studies" DROP COLUMN "solution_id";
