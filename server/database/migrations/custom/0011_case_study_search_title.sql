-- Include the deployment-specific title in case-study full-text search. Custom
-- migrations run on every deploy, so only rebuild the generated column when its
-- expression predates the title field.
DO $$
DECLARE
  expression text;
BEGIN
  SELECT pg_get_expr(ad.adbin, ad.adrelid)
    INTO expression
  FROM pg_attribute a
  JOIN pg_attrdef ad ON ad.adrelid = a.attrelid AND ad.adnum = a.attnum
  WHERE a.attrelid = 'case_studies'::regclass
    AND a.attname = 'search_vector';

  IF expression IS NULL OR position('title' IN expression) = 0 THEN
    DROP INDEX IF EXISTS idx_case_studies_search;
    ALTER TABLE case_studies DROP COLUMN IF EXISTS search_vector;
    ALTER TABLE case_studies ADD COLUMN search_vector tsvector
      GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(location_name, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(implementer, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(description, '')), 'B')
      ) STORED;
    CREATE INDEX idx_case_studies_search ON case_studies USING GIN (search_vector);
  END IF;
END;
$$;
