INSERT INTO tags (slug, name) VALUES
  ('environment', 'environment'),
  ('waste-management', 'waste management'),
  ('recycling', 'recycling'),
  ('transport', 'transport'),
  ('infrastructure', 'infrastructure'),
  ('urban-mobility', 'urban mobility'),
  ('water', 'water'),
  ('health', 'health'),
  ('sustainability', 'sustainability'),
  ('housing', 'housing'),
  ('affordability', 'affordability'),
  ('innovation', 'innovation'),
  ('agriculture', 'agriculture'),
  ('hydroponics', 'hydroponics'),
  ('urban-farming', 'urban farming'),
  ('climate', 'climate'),
  ('energy', 'energy'),
  ('forestry', 'forestry'),
  ('biodiversity', 'biodiversity'),
  ('drought', 'drought'),
  ('construction', 'construction')
ON CONFLICT DO NOTHING;
SELECT setval('tags_id_seq', (SELECT MAX(id) FROM tags));
