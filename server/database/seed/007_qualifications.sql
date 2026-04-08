-- Stable IDs (1..N) so 008_endorsements.sql can reference them.
-- The serial sequence is bumped at the end so future inserts don't collide.

INSERT INTO qualifications (id, user_id, title, area, detail, created_at, updated_at) VALUES
  -- Sarah Chen — civil engineer, water systems
  (1, 'a0000001-0000-4000-8000-000000000001',
    '12 years designing stormwater systems',
    'civil engineering',
    E'Lead engineer on three coastal-city retrofit projects. Chartered with NEN and ICE.',
    '2025-06-13T10:00:00.000Z', '2025-06-13T10:00:00.000Z'),
  (2, 'a0000001-0000-4000-8000-000000000001',
    'Coastal flood-risk modelling',
    'climate adaptation',
    E'Built FEMA- and Deltares-style hydrodynamic models for the Port of Rotterdam expansion.',
    '2025-06-14T10:00:00.000Z', '2025-06-14T10:00:00.000Z'),

  -- Marcus Johnson — community organising
  (3, 'a0000002-0000-4000-8000-000000000002',
    '10 years organising public-housing tenants',
    'community organising',
    E'Trained by the Midwest Academy. Ran a successful repairs campaign for 600+ households.',
    '2025-06-16T10:00:00.000Z', '2025-06-16T10:00:00.000Z'),
  (4, 'a0000002-0000-4000-8000-000000000002',
    'Public meeting facilitation',
    'facilitation',
    E'Comfortable holding the room for groups of 5 to 500. Bilingual EN/ES.',
    '2025-06-17T10:00:00.000Z', '2025-06-17T10:00:00.000Z'),

  -- Amara Okafor — public health
  (5, 'a0000003-0000-4000-8000-000000000003',
    'Registered nurse, 15 years maternal health',
    'public health',
    E'RN, BSN. Lead trainer for the Lagos State CHEW (Community Health Extension Worker) programme.',
    '2025-07-02T10:00:00.000Z', '2025-07-02T10:00:00.000Z'),
  (6, 'a0000003-0000-4000-8000-000000000003',
    'Outbreak response logistics',
    'epidemiology',
    E'Coordinated cold-chain vaccine outreach during the 2022 measles response in Cross River State.',
    '2025-07-03T10:00:00.000Z', '2025-07-03T10:00:00.000Z'),

  -- Leo Martinez — software / civic tech
  (7, 'a0000004-0000-4000-8000-000000000004',
    'Senior backend engineer (Go, Postgres, GIS)',
    'software engineering',
    E'7 years building geospatial data pipelines, last 3 in civic tech.',
    '2025-07-09T10:00:00.000Z', '2025-07-09T10:00:00.000Z'),
  (8, 'a0000004-0000-4000-8000-000000000004',
    'OpenStreetMap mapper, HOT volunteer',
    'open data',
    E'500+ HOT tasks completed, regular validator for Mexican mapping projects.',
    '2025-07-10T10:00:00.000Z', '2025-07-10T10:00:00.000Z'),

  -- Priya Sharma — urban planning
  (9, 'a0000005-0000-4000-8000-000000000005',
    'PhD, urban planning (informal settlements)',
    'urban planning',
    E'Doctorate from TISS Mumbai. Thesis on participatory upgrade of Dharavi housing blocks.',
    '2025-07-21T10:00:00.000Z', '2025-07-21T10:00:00.000Z'),
  (10, 'a0000005-0000-4000-8000-000000000005',
    'Municipal policy consultant',
    'public policy',
    E'Drafted housing-upgrade frameworks for two Indian state governments.',
    '2025-07-22T10:00:00.000Z', '2025-07-22T10:00:00.000Z'),

  -- James Whitfield — carpentry / mentoring
  (11, 'a0000006-0000-4000-8000-000000000006',
    '30 years as a carpenter',
    'construction',
    E'CSCS card holder, NVQ Level 3. From bespoke joinery to housing-association maintenance.',
    '2025-08-03T10:00:00.000Z', '2025-08-03T10:00:00.000Z'),
  (12, 'a0000006-0000-4000-8000-000000000006',
    'Apprenticeship programme founder',
    'youth education',
    E'Founded "Tools Up", a free 6-month carpentry apprenticeship for care leavers in Greater Manchester.',
    '2025-08-04T10:00:00.000Z', '2025-08-04T10:00:00.000Z'),

  -- Yuki Tanaka — environmental science
  (13, 'a0000007-0000-4000-8000-000000000007',
    'PhD in freshwater ecology',
    'environmental science',
    E'Kyoto University, 2018. Specialism in river macroinvertebrate communities.',
    '2025-08-15T10:00:00.000Z', '2025-08-15T10:00:00.000Z'),
  (14, 'a0000007-0000-4000-8000-000000000007',
    'Citizen-science programme lead',
    'science education',
    E'Runs a school-led water-quality monitoring network across 12 schools in the Yodo basin.',
    '2025-08-16T10:00:00.000Z', '2025-08-16T10:00:00.000Z'),

  -- Elena Popescu — refugee legal aid
  (15, 'a0000008-0000-4000-8000-000000000008',
    'Bar-admitted lawyer, 12 years',
    'human rights law',
    E'Bucharest Bar. Specialism in EU asylum and family-reunification law.',
    '2025-08-26T10:00:00.000Z', '2025-08-26T10:00:00.000Z'),
  (16, 'a0000008-0000-4000-8000-000000000008',
    'Legal-aid volunteer trainer',
    'legal aid',
    E'Trains volunteers for two NGOs to support asylum seekers through first-instance interviews and appeals.',
    '2025-08-27T10:00:00.000Z', '2025-08-27T10:00:00.000Z')
ON CONFLICT (id) DO NOTHING;

-- Bump the serial sequence past the highest manual id we just inserted so
-- new inserts via the API don't hit a duplicate-key error.
SELECT setval(
  pg_get_serial_sequence('qualifications', 'id'),
  (SELECT GREATEST(MAX(id), 1) FROM qualifications)
);
