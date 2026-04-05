-- ── Top-level issue SDGs ──────────────────────────────────────

-- Reduce household waste (1): SDG 12 (Responsible Consumption), 11 (Sustainable Cities)
INSERT INTO issue_sdgs (issue_id, sdg_id) VALUES (1, 12), (1, 11)
ON CONFLICT DO NOTHING;

-- Improve local public transport (2): SDG 11 (Sustainable Cities), 9 (Industry & Infrastructure)
INSERT INTO issue_sdgs (issue_id, sdg_id) VALUES (2, 11), (2, 9)
ON CONFLICT DO NOTHING;

-- Cheaper access to clean water (3): SDG 6 (Clean Water), 3 (Good Health)
INSERT INTO issue_sdgs (issue_id, sdg_id) VALUES (3, 6), (3, 3)
ON CONFLICT DO NOTHING;

-- Affordable housing solutions (4): SDG 11 (Sustainable Cities), 1 (No Poverty)
INSERT INTO issue_sdgs (issue_id, sdg_id) VALUES (4, 11), (4, 1)
ON CONFLICT DO NOTHING;

-- Accessible hydroponics systems (5): SDG 2 (Zero Hunger), 11 (Sustainable Cities)
INSERT INTO issue_sdgs (issue_id, sdg_id) VALUES (5, 2), (5, 11)
ON CONFLICT DO NOTHING;

-- Curbing greenhouse gas emissions (6): SDG 13 (Climate Action), 7 (Clean Energy)
INSERT INTO issue_sdgs (issue_id, sdg_id) VALUES (6, 13), (6, 7)
ON CONFLICT DO NOTHING;

-- ── Sub-issue and solution SDGs ──────────────────────────────

-- Waste sub-issues (7-9)
INSERT INTO issue_sdgs (issue_id, sdg_id) VALUES (7, 12), (7, 9)
ON CONFLICT DO NOTHING;
INSERT INTO issue_sdgs (issue_id, sdg_id) VALUES (8, 12), (8, 1)
ON CONFLICT DO NOTHING;
INSERT INTO issue_sdgs (issue_id, sdg_id) VALUES (9, 12), (9, 11)
ON CONFLICT DO NOTHING;

-- Waste solutions (10-12)
INSERT INTO issue_sdgs (issue_id, sdg_id) VALUES (10, 12), (10, 11)
ON CONFLICT DO NOTHING;
INSERT INTO issue_sdgs (issue_id, sdg_id) VALUES (11, 12)
ON CONFLICT DO NOTHING;
INSERT INTO issue_sdgs (issue_id, sdg_id) VALUES (12, 12), (12, 11)
ON CONFLICT DO NOTHING;

-- Transport sub-issues (13-14)
INSERT INTO issue_sdgs (issue_id, sdg_id) VALUES (13, 11), (13, 10)
ON CONFLICT DO NOTHING;
INSERT INTO issue_sdgs (issue_id, sdg_id) VALUES (14, 11), (14, 9)
ON CONFLICT DO NOTHING;

-- Transport solutions (15-17)
INSERT INTO issue_sdgs (issue_id, sdg_id) VALUES (15, 11), (15, 9)
ON CONFLICT DO NOTHING;
INSERT INTO issue_sdgs (issue_id, sdg_id) VALUES (16, 11), (16, 9)
ON CONFLICT DO NOTHING;
INSERT INTO issue_sdgs (issue_id, sdg_id) VALUES (17, 11), (17, 13)
ON CONFLICT DO NOTHING;

-- Water sub-issues (18-19)
INSERT INTO issue_sdgs (issue_id, sdg_id) VALUES (18, 6), (18, 9)
ON CONFLICT DO NOTHING;
INSERT INTO issue_sdgs (issue_id, sdg_id) VALUES (19, 6), (19, 3)
ON CONFLICT DO NOTHING;

-- Water solutions (20-21)
INSERT INTO issue_sdgs (issue_id, sdg_id) VALUES (20, 6), (20, 3)
ON CONFLICT DO NOTHING;
INSERT INTO issue_sdgs (issue_id, sdg_id) VALUES (21, 6), (21, 11)
ON CONFLICT DO NOTHING;

-- Housing sub-issues (22-24)
INSERT INTO issue_sdgs (issue_id, sdg_id) VALUES (22, 11)
ON CONFLICT DO NOTHING;
INSERT INTO issue_sdgs (issue_id, sdg_id) VALUES (23, 11), (23, 8)
ON CONFLICT DO NOTHING;
INSERT INTO issue_sdgs (issue_id, sdg_id) VALUES (24, 11), (24, 1)
ON CONFLICT DO NOTHING;

-- Housing solutions (25-27)
INSERT INTO issue_sdgs (issue_id, sdg_id) VALUES (25, 11), (25, 1)
ON CONFLICT DO NOTHING;
INSERT INTO issue_sdgs (issue_id, sdg_id) VALUES (26, 11), (26, 9)
ON CONFLICT DO NOTHING;
INSERT INTO issue_sdgs (issue_id, sdg_id) VALUES (27, 11), (27, 10)
ON CONFLICT DO NOTHING;

-- Hydroponics sub-issues (28-29)
INSERT INTO issue_sdgs (issue_id, sdg_id) VALUES (28, 2), (28, 1)
ON CONFLICT DO NOTHING;
INSERT INTO issue_sdgs (issue_id, sdg_id) VALUES (29, 2), (29, 4)
ON CONFLICT DO NOTHING;

-- Hydroponics solutions (30-31)
INSERT INTO issue_sdgs (issue_id, sdg_id) VALUES (30, 2), (30, 9)
ON CONFLICT DO NOTHING;
INSERT INTO issue_sdgs (issue_id, sdg_id) VALUES (31, 2), (31, 4)
ON CONFLICT DO NOTHING;

-- Emissions sub-issues (32-34)
INSERT INTO issue_sdgs (issue_id, sdg_id) VALUES (32, 13), (32, 3)
ON CONFLICT DO NOTHING;
INSERT INTO issue_sdgs (issue_id, sdg_id) VALUES (33, 13), (33, 7)
ON CONFLICT DO NOTHING;
INSERT INTO issue_sdgs (issue_id, sdg_id) VALUES (34, 13), (34, 11)
ON CONFLICT DO NOTHING;

-- Emissions solutions (35-38)
INSERT INTO issue_sdgs (issue_id, sdg_id) VALUES (35, 13), (35, 7)
ON CONFLICT DO NOTHING;
INSERT INTO issue_sdgs (issue_id, sdg_id) VALUES (36, 7), (36, 10)
ON CONFLICT DO NOTHING;
INSERT INTO issue_sdgs (issue_id, sdg_id) VALUES (37, 11), (37, 13)
ON CONFLICT DO NOTHING;
INSERT INTO issue_sdgs (issue_id, sdg_id) VALUES (38, 13), (38, 8)
ON CONFLICT DO NOTHING;

-- ── Forest Dieback Crisis and sub-issues (39-45) ────────────

-- Forest Dieback Crisis (39): SDG 13 (Climate Action), SDG 15 (Life on Land)
INSERT INTO issue_sdgs (issue_id, sdg_id) VALUES (39, 13), (39, 15)
ON CONFLICT DO NOTHING;

-- Drought-Induced Forest Decline (40): SDG 15 (Life on Land), SDG 6 (Clean Water)
INSERT INTO issue_sdgs (issue_id, sdg_id) VALUES (40, 15), (40, 6)
ON CONFLICT DO NOTHING;

-- Drought — Sundgau (41): SDG 6 (Clean Water), SDG 15 (Life on Land)
INSERT INTO issue_sdgs (issue_id, sdg_id) VALUES (41, 6), (41, 15)
ON CONFLICT DO NOTHING;

-- Bark Beetle Epidemic (42): SDG 15 (Life on Land), SDG 13 (Climate Action)
INSERT INTO issue_sdgs (issue_id, sdg_id) VALUES (42, 15), (42, 13)
ON CONFLICT DO NOTHING;

-- Bark Beetle — Sundgau (43): SDG 15 (Life on Land), SDG 8 (Decent Work)
INSERT INTO issue_sdgs (issue_id, sdg_id) VALUES (43, 15), (43, 8)
ON CONFLICT DO NOTHING;

-- Beech and Ash Dieback (44): SDG 15 (Life on Land), SDG 13 (Climate Action)
INSERT INTO issue_sdgs (issue_id, sdg_id) VALUES (44, 15), (44, 13)
ON CONFLICT DO NOTHING;

-- Beech/Ash — Sundgau (45): SDG 15 (Life on Land), SDG 13 (Climate Action)
INSERT INTO issue_sdgs (issue_id, sdg_id) VALUES (45, 15), (45, 13)
ON CONFLICT DO NOTHING;
