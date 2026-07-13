-- Case-insensitive uniqueness for wanted skills per node: the same skill can't
-- be listed twice on one issue/solution regardless of how it's capitalized
-- ("GIS" vs "gis"). Expression indexes aren't expressible in drizzle schema,
-- hence custom. The table itself is created by drizzle migration 0020.
CREATE UNIQUE INDEX IF NOT EXISTS idx_wanted_skills_issue_skill_ci
  ON wanted_skills (issue_id, lower(skill));
