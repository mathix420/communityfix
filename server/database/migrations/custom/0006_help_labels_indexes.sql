-- GIN indexes for filtering nodes by help-wanted label (array containment /
-- overlap operators). The contribute view queries `help_labels @> ...` and
-- `help_labels && ...`, so a GIN index keeps those lookups fast as the catalog
-- grows. Columns themselves are created by drizzle migration 0019.
CREATE INDEX IF NOT EXISTS idx_issues_help_labels ON issues USING GIN (help_labels);
CREATE INDEX IF NOT EXISTS idx_case_studies_help_labels ON case_studies USING GIN (help_labels);
