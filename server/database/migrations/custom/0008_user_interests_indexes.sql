-- Case-insensitive uniqueness for user interests: the same label can't be
-- declared twice by one user regardless of capitalization ("Beekeeping" vs
-- "beekeeping"). Expression indexes aren't expressible in drizzle schema,
-- hence custom. The table itself is created by drizzle migration 0021.
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_interests_user_label_ci
  ON user_interests (user_id, lower(label));

-- pgvector HNSW index for cosine similarity (same pattern as custom 0001).
CREATE INDEX IF NOT EXISTS idx_user_interests_embedding
  ON user_interests USING hnsw (embedding vector_cosine_ops);
