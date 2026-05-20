-- Rename the short snippet column to `summary` and promote the long-form
-- markdown column to take the `description` name. PostgreSQL keeps the
-- `search_vector` generated column expression bound by column identity, so
-- the FTS weights (B for the short, C for the long) stay correct after the
-- rename without rebuilding the index.
ALTER TABLE "issues" RENAME COLUMN "description" TO "summary";--> statement-breakpoint
ALTER TABLE "issues" RENAME COLUMN "detailed_description" TO "description";
