-- Feature-rich community metadata for development and demos.
--
-- The earlier seed files focus on catalog content. This final pass fills newer
-- community features that otherwise start empty: interests, newsletter
-- preferences, wanted skills, and multi-user node membership.

INSERT INTO user_interests (user_id, label, created_at) VALUES
  ('a0000001-0000-4000-8000-000000000001', 'Climate adaptation', '2025-06-13T08:00:00.000Z'),
  ('a0000001-0000-4000-8000-000000000001', 'Stormwater design', '2025-06-13T08:05:00.000Z'),
  ('a0000001-0000-4000-8000-000000000001', 'Heat-resilient cities', '2025-06-13T08:10:00.000Z'),
  ('a0000001-0000-4000-8000-000000000001', 'Community energy', '2025-06-13T08:15:00.000Z'),
  ('a0000001-0000-4000-8000-000000000001', 'Accessible infrastructure', '2025-06-13T08:20:00.000Z'),

  ('a0000002-0000-4000-8000-000000000002', 'Tenant rights', '2025-06-16T08:00:00.000Z'),
  ('a0000002-0000-4000-8000-000000000002', 'Participatory budgeting', '2025-06-16T08:05:00.000Z'),
  ('a0000002-0000-4000-8000-000000000002', 'Public transport', '2025-06-16T08:10:00.000Z'),
  ('a0000002-0000-4000-8000-000000000002', 'Cooperative ownership', '2025-06-16T08:15:00.000Z'),
  ('a0000002-0000-4000-8000-000000000002', 'Neighborhood organizing', '2025-06-16T08:20:00.000Z'),

  ('a0000003-0000-4000-8000-000000000003', 'Maternal health', '2025-07-02T08:00:00.000Z'),
  ('a0000003-0000-4000-8000-000000000003', 'Community mental health', '2025-07-02T08:05:00.000Z'),
  ('a0000003-0000-4000-8000-000000000003', 'Clean drinking water', '2025-07-02T08:10:00.000Z'),
  ('a0000003-0000-4000-8000-000000000003', 'Food security', '2025-07-02T08:15:00.000Z'),
  ('a0000003-0000-4000-8000-000000000003', 'Health worker training', '2025-07-02T08:20:00.000Z'),

  ('a0000004-0000-4000-8000-000000000004', 'Civic technology', '2025-07-09T08:00:00.000Z'),
  ('a0000004-0000-4000-8000-000000000004', 'Open data', '2025-07-09T08:05:00.000Z'),
  ('a0000004-0000-4000-8000-000000000004', 'Community broadband', '2025-07-09T08:10:00.000Z'),
  ('a0000004-0000-4000-8000-000000000004', 'Citizen science', '2025-07-09T08:15:00.000Z'),
  ('a0000004-0000-4000-8000-000000000004', 'Open-source hardware', '2025-07-09T08:20:00.000Z'),

  ('a0000005-0000-4000-8000-000000000005', 'Urban farming', '2025-07-22T08:00:00.000Z'),
  ('a0000005-0000-4000-8000-000000000005', 'Food redistribution', '2025-07-22T08:05:00.000Z'),
  ('a0000005-0000-4000-8000-000000000005', 'Women-led cooperatives', '2025-07-22T08:10:00.000Z'),
  ('a0000005-0000-4000-8000-000000000005', 'Solar cold chains', '2025-07-22T08:15:00.000Z'),
  ('a0000005-0000-4000-8000-000000000005', 'Affordable childcare', '2025-07-22T08:20:00.000Z'),

  ('a0000006-0000-4000-8000-000000000006', 'Building retrofits', '2025-08-03T08:00:00.000Z'),
  ('a0000006-0000-4000-8000-000000000006', 'Workforce development', '2025-08-03T08:05:00.000Z'),
  ('a0000006-0000-4000-8000-000000000006', 'Affordable housing', '2025-08-03T08:10:00.000Z'),
  ('a0000006-0000-4000-8000-000000000006', 'Energy poverty', '2025-08-03T08:15:00.000Z'),
  ('a0000006-0000-4000-8000-000000000006', 'Repair and reuse', '2025-08-03T08:20:00.000Z'),

  ('a0000007-0000-4000-8000-000000000007', 'Freshwater ecology', '2025-08-15T08:00:00.000Z'),
  ('a0000007-0000-4000-8000-000000000007', 'Forest restoration', '2025-08-15T08:05:00.000Z'),
  ('a0000007-0000-4000-8000-000000000007', 'Pollinator habitats', '2025-08-15T08:10:00.000Z'),
  ('a0000007-0000-4000-8000-000000000007', 'Water-quality monitoring', '2025-08-15T08:15:00.000Z'),
  ('a0000007-0000-4000-8000-000000000007', 'Nature-based flood protection', '2025-08-15T08:20:00.000Z'),

  ('a0000008-0000-4000-8000-000000000008', 'Refugee support', '2025-08-26T08:00:00.000Z'),
  ('a0000008-0000-4000-8000-000000000008', 'Disability inclusion', '2025-08-26T08:05:00.000Z'),
  ('a0000008-0000-4000-8000-000000000008', 'Digital access to services', '2025-08-26T08:10:00.000Z'),
  ('a0000008-0000-4000-8000-000000000008', 'Universal design', '2025-08-26T08:15:00.000Z'),
  ('a0000008-0000-4000-8000-000000000008', 'Community legal aid', '2025-08-26T08:20:00.000Z')
ON CONFLICT DO NOTHING;

INSERT INTO newsletter_prefs (
  user_id, enabled, frequency, content, created_at, updated_at
) VALUES
  ('a0000001-0000-4000-8000-000000000001', true, 'weekly',
   '{"goodNews":true,"skillMatches":true,"topicMatches":true,"helpWanted":true,"productUpdates":false}'::jsonb,
   '2025-06-13T09:00:00.000Z', '2025-06-13T09:00:00.000Z'),
  ('a0000002-0000-4000-8000-000000000002', true, 'weekly',
   '{"goodNews":true,"skillMatches":false,"topicMatches":true,"helpWanted":true,"productUpdates":true}'::jsonb,
   '2025-06-16T09:00:00.000Z', '2025-06-16T09:00:00.000Z'),
  ('a0000003-0000-4000-8000-000000000003', true, 'monthly',
   '{"goodNews":true,"skillMatches":true,"topicMatches":true,"helpWanted":false,"productUpdates":false}'::jsonb,
   '2025-07-02T09:00:00.000Z', '2025-07-02T09:00:00.000Z'),
  ('a0000004-0000-4000-8000-000000000004', false, 'monthly',
   '{"goodNews":true,"skillMatches":true,"topicMatches":true,"helpWanted":true,"productUpdates":true}'::jsonb,
   '2025-07-09T09:00:00.000Z', '2025-07-09T09:00:00.000Z'),
  ('a0000005-0000-4000-8000-000000000005', true, 'weekly',
   '{"goodNews":true,"skillMatches":true,"topicMatches":true,"helpWanted":true,"productUpdates":false}'::jsonb,
   '2025-07-22T09:00:00.000Z', '2025-07-22T09:00:00.000Z'),
  ('a0000006-0000-4000-8000-000000000006', true, 'monthly',
   '{"goodNews":true,"skillMatches":true,"topicMatches":false,"helpWanted":true,"productUpdates":false}'::jsonb,
   '2025-08-03T09:00:00.000Z', '2025-08-03T09:00:00.000Z'),
  ('a0000007-0000-4000-8000-000000000007', true, 'monthly',
   '{"goodNews":true,"skillMatches":false,"topicMatches":true,"helpWanted":true,"productUpdates":false}'::jsonb,
   '2025-08-15T09:00:00.000Z', '2025-08-15T09:00:00.000Z'),
  ('a0000008-0000-4000-8000-000000000008', false, 'monthly',
   '{"goodNews":true,"skillMatches":true,"topicMatches":true,"helpWanted":false,"productUpdates":true}'::jsonb,
   '2025-08-26T09:00:00.000Z', '2025-08-26T09:00:00.000Z')
ON CONFLICT (user_id) DO NOTHING;

WITH skill_map (issue_id, skill, created_by) AS (
  VALUES
    (1, 'Circular economy program design', 'a0000002-0000-4000-8000-000000000002'::uuid),
    (1, 'Community outreach', 'a0000002-0000-4000-8000-000000000002'::uuid),
    (2, 'Transit planning', 'a0000004-0000-4000-8000-000000000004'::uuid),
    (2, 'Accessibility auditing', 'a0000008-0000-4000-8000-000000000008'::uuid),
    (3, 'Water systems engineering', 'a0000001-0000-4000-8000-000000000001'::uuid),
    (3, 'Public-health evaluation', 'a0000003-0000-4000-8000-000000000003'::uuid),
    (4, 'Housing policy', 'a0000002-0000-4000-8000-000000000002'::uuid),
    (4, 'Community finance', 'a0000005-0000-4000-8000-000000000005'::uuid),
    (5, 'Hydroponic growing', 'a0000005-0000-4000-8000-000000000005'::uuid),
    (5, 'Open-source documentation', 'a0000004-0000-4000-8000-000000000004'::uuid),
    (6, 'Carbon accounting', 'a0000006-0000-4000-8000-000000000006'::uuid),
    (6, 'Climate policy', 'a0000001-0000-4000-8000-000000000001'::uuid),
    (39, 'Forest ecology', 'a0000007-0000-4000-8000-000000000007'::uuid),
    (39, 'Hydrological modeling', 'a0000001-0000-4000-8000-000000000001'::uuid),
    (46, 'Municipal decarbonization', 'a0000006-0000-4000-8000-000000000006'::uuid),
    (46, 'Small-business engagement', 'a0000002-0000-4000-8000-000000000002'::uuid),

    (1001, 'Road-safety engineering', 'a0000001-0000-4000-8000-000000000001'::uuid),
    (1001, 'Participatory mapping with children', 'a0000004-0000-4000-8000-000000000004'::uuid),
    (1002, 'Traffic operations', 'a0000004-0000-4000-8000-000000000004'::uuid),
    (1002, 'School community facilitation', 'a0000002-0000-4000-8000-000000000002'::uuid),
    (1003, 'Accessible map design', 'a0000008-0000-4000-8000-000000000008'::uuid),
    (1003, 'Data analysis', 'a0000004-0000-4000-8000-000000000004'::uuid),

    (1004, 'Urban heat modeling', 'a0000001-0000-4000-8000-000000000001'::uuid),
    (1004, 'Heat-health outreach', 'a0000003-0000-4000-8000-000000000003'::uuid),
    (1005, 'Landscape architecture', 'a0000007-0000-4000-8000-000000000007'::uuid),
    (1005, 'Irrigation maintenance', 'a0000005-0000-4000-8000-000000000005'::uuid),
    (1006, 'Building energy assessment', 'a0000006-0000-4000-8000-000000000006'::uuid),
    (1006, 'Cooperative procurement', 'a0000002-0000-4000-8000-000000000002'::uuid),

    (1007, 'Telecommunications planning', 'a0000004-0000-4000-8000-000000000004'::uuid),
    (1007, 'Digital inclusion research', 'a0000008-0000-4000-8000-000000000008'::uuid),
    (1008, 'Cooperative finance', 'a0000005-0000-4000-8000-000000000005'::uuid),
    (1008, 'Fiber network engineering', 'a0000004-0000-4000-8000-000000000004'::uuid),
    (1009, 'Digital skills training', 'a0000008-0000-4000-8000-000000000008'::uuid),
    (1009, 'Device refurbishment', 'a0000006-0000-4000-8000-000000000006'::uuid),

    (1010, 'Childcare service design', 'a0000003-0000-4000-8000-000000000003'::uuid),
    (1010, 'Shift-work scheduling', 'a0000006-0000-4000-8000-000000000006'::uuid),
    (1011, 'Early-years education', 'a0000003-0000-4000-8000-000000000003'::uuid),
    (1011, 'Cooperative governance', 'a0000002-0000-4000-8000-000000000002'::uuid),
    (1012, 'Public finance', 'a0000005-0000-4000-8000-000000000005'::uuid),
    (1012, 'Employment policy', 'a0000006-0000-4000-8000-000000000006'::uuid),

    (1013, 'Watershed science', 'a0000007-0000-4000-8000-000000000007'::uuid),
    (1013, 'Wastewater engineering', 'a0000001-0000-4000-8000-000000000001'::uuid),
    (1014, 'Laboratory quality assurance', 'a0000003-0000-4000-8000-000000000003'::uuid),
    (1014, 'Open geospatial data', 'a0000004-0000-4000-8000-000000000004'::uuid),
    (1015, 'Wetland ecology', 'a0000007-0000-4000-8000-000000000007'::uuid),
    (1015, 'Drainage engineering', 'a0000001-0000-4000-8000-000000000001'::uuid),

    (1016, 'Community mental-health practice', 'a0000003-0000-4000-8000-000000000003'::uuid),
    (1016, 'Program evaluation', 'a0000004-0000-4000-8000-000000000004'::uuid),
    (1017, 'Peer-support supervision', 'a0000003-0000-4000-8000-000000000003'::uuid),
    (1017, 'Safeguarding policy', 'a0000008-0000-4000-8000-000000000008'::uuid),
    (1018, 'Mobile clinic logistics', 'a0000003-0000-4000-8000-000000000003'::uuid),
    (1018, 'Clinical data protection', 'a0000008-0000-4000-8000-000000000008'::uuid),

    (1019, 'Universal design', 'a0000008-0000-4000-8000-000000000008'::uuid),
    (1019, 'Public-realm engineering', 'a0000001-0000-4000-8000-000000000001'::uuid),
    (1020, 'Accessible user research', 'a0000008-0000-4000-8000-000000000008'::uuid),
    (1020, 'Civic issue tracking', 'a0000004-0000-4000-8000-000000000004'::uuid),
    (1021, 'Construction estimating', 'a0000006-0000-4000-8000-000000000006'::uuid),
    (1021, 'Accessibility inspection', 'a0000008-0000-4000-8000-000000000008'::uuid),

    (1022, 'Food-systems planning', 'a0000005-0000-4000-8000-000000000005'::uuid),
    (1022, 'Community logistics', 'a0000002-0000-4000-8000-000000000002'::uuid),
    (1023, 'Solar refrigeration', 'a0000001-0000-4000-8000-000000000001'::uuid),
    (1023, 'Cooperative operations', 'a0000005-0000-4000-8000-000000000005'::uuid),
    (1024, 'Food-safety systems', 'a0000003-0000-4000-8000-000000000003'::uuid),
    (1024, 'Last-mile routing', 'a0000004-0000-4000-8000-000000000004'::uuid)
)
INSERT INTO wanted_skills (issue_id, skill, created_by, created_at)
SELECT m.issue_id, m.skill, m.created_by, '2026-05-25T09:00:00.000Z'
FROM skill_map m
JOIN issues i ON i.id = m.issue_id
ON CONFLICT DO NOTHING;

-- Every creator is an owner. The migration backfill only sees rows that exist
-- at migration time, while fixtures are applied afterward on a fresh database.
INSERT INTO node_members (
  target_kind, issue_id, user_id, role, source, created_at, updated_at
)
SELECT
  'issue', i.id, i.author_id, 'owner', 'creator', i.created_at, i.created_at
FROM issues i
WHERE i.author_id IS NOT NULL
ON CONFLICT (issue_id, user_id) WHERE target_kind = 'issue' DO NOTHING;

INSERT INTO node_members (
  target_kind, case_study_id, user_id, role, source, created_at, updated_at
)
SELECT
  'case_study', c.id, c.author_id, 'owner', 'creator', c.created_at, c.created_at
FROM case_studies c
WHERE c.author_id IS NOT NULL
ON CONFLICT (case_study_id, user_id) WHERE target_kind = 'case_study' DO NOTHING;

-- A handful of cross-disciplinary collaborators makes shared attribution and
-- permission states visible in the UI.
WITH collaborator_map (issue_id, user_id) AS (
  VALUES
    (1, 'a0000002-0000-4000-8000-000000000002'::uuid),
    (2, 'a0000004-0000-4000-8000-000000000004'::uuid),
    (3, 'a0000001-0000-4000-8000-000000000001'::uuid),
    (4, 'a0000005-0000-4000-8000-000000000005'::uuid),
    (5, 'a0000007-0000-4000-8000-000000000007'::uuid),
    (6, 'a0000001-0000-4000-8000-000000000001'::uuid),
    (39, 'a0000001-0000-4000-8000-000000000001'::uuid),
    (46, 'a0000006-0000-4000-8000-000000000006'::uuid),
    (1001, 'a0000008-0000-4000-8000-000000000008'::uuid),
    (1004, 'a0000003-0000-4000-8000-000000000003'::uuid),
    (1007, 'a0000008-0000-4000-8000-000000000008'::uuid),
    (1010, 'a0000003-0000-4000-8000-000000000003'::uuid),
    (1013, 'a0000001-0000-4000-8000-000000000001'::uuid),
    (1016, 'a0000008-0000-4000-8000-000000000008'::uuid),
    (1019, 'a0000001-0000-4000-8000-000000000001'::uuid),
    (1022, 'a0000002-0000-4000-8000-000000000002'::uuid)
)
INSERT INTO node_members (
  target_kind, issue_id, user_id, role, source, created_at, updated_at
)
SELECT
  'issue', m.issue_id, m.user_id, 'collaborator', 'granted',
  '2026-05-26T09:00:00.000Z', '2026-05-26T09:00:00.000Z'
FROM collaborator_map m
JOIN issues i ON i.id = m.issue_id
WHERE m.user_id IS DISTINCT FROM i.author_id
ON CONFLICT (issue_id, user_id) WHERE target_kind = 'issue' DO NOTHING;

SELECT
  (SELECT COUNT(*) FROM tags) AS tags_seeded,
  (SELECT COUNT(*) FROM issues) AS issues_and_solutions_seeded,
  (SELECT COUNT(*) FROM issue_tags) AS issue_tags_seeded,
  (SELECT COUNT(*) FROM user_interests) AS interests_seeded,
  (SELECT COUNT(*) FROM wanted_skills) AS wanted_skills_seeded;
