-- Reject solutions nested under solutions. The earlier app-level rule is
-- mirrored here so direct SQL writes (seeds, admin scripts, MCP bypass)
-- cannot create a sub-solution either.
CREATE OR REPLACE FUNCTION assert_no_sub_solution() RETURNS trigger AS $$
BEGIN
  IF NEW.type = 'solution' AND NEW.parent_id IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM issues WHERE id = NEW.parent_id AND type = 'solution') THEN
      RAISE EXCEPTION 'Solutions cannot be nested under other solutions (parent_id=% is a solution). Use a case study instead.', NEW.parent_id
        USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_no_sub_solution ON issues;
CREATE TRIGGER trg_no_sub_solution
  BEFORE INSERT OR UPDATE OF parent_id, type ON issues
  FOR EACH ROW
  EXECUTE FUNCTION assert_no_sub_solution();

-- Base generated search column for case studies. Migration 0011 upgrades this
-- expression to include the later-added deployment title.
ALTER TABLE case_studies ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(location_name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(implementer, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B')
  ) STORED;
CREATE INDEX IF NOT EXISTS idx_case_studies_search ON case_studies USING GIN (search_vector);

-- pgvector HNSW + PostGIS GIST indexes mirror the issues table.
CREATE INDEX IF NOT EXISTS idx_case_studies_embedding ON case_studies USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_case_studies_location ON case_studies USING GIST (location);
