-- Full-text search generated column + GIN index
ALTER TABLE issues ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(detailed_description, '')), 'C')
  ) STORED;
CREATE INDEX IF NOT EXISTS idx_issues_search ON issues USING GIN (search_vector);

-- pgvector HNSW index for cosine similarity
CREATE INDEX IF NOT EXISTS idx_issues_embedding ON issues USING hnsw (embedding vector_cosine_ops);

-- PostGIS spatial index
CREATE INDEX IF NOT EXISTS idx_issues_location ON issues USING GIST (location);
