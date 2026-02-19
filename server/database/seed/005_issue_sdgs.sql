-- ── Top-level issue SDGs ──────────────────────────────────────

-- Reduce household waste (1): SDG 12 (Responsible Consumption), 11 (Sustainable Cities)
INSERT OR IGNORE INTO issue_sdgs (issue_id, sdg_id) VALUES (1, 12), (1, 11);

-- Improve local public transport (2): SDG 11 (Sustainable Cities), 9 (Industry & Infrastructure)
INSERT OR IGNORE INTO issue_sdgs (issue_id, sdg_id) VALUES (2, 11), (2, 9);

-- Cheaper access to clean water (3): SDG 6 (Clean Water), 3 (Good Health)
INSERT OR IGNORE INTO issue_sdgs (issue_id, sdg_id) VALUES (3, 6), (3, 3);

-- Affordable housing solutions (4): SDG 11 (Sustainable Cities), 1 (No Poverty)
INSERT OR IGNORE INTO issue_sdgs (issue_id, sdg_id) VALUES (4, 11), (4, 1);

-- Accessible hydroponics systems (5): SDG 2 (Zero Hunger), 11 (Sustainable Cities)
INSERT OR IGNORE INTO issue_sdgs (issue_id, sdg_id) VALUES (5, 2), (5, 11);

-- Curbing greenhouse gas emissions (6): SDG 13 (Climate Action), 7 (Clean Energy)
INSERT OR IGNORE INTO issue_sdgs (issue_id, sdg_id) VALUES (6, 13), (6, 7);

-- ── Sub-issue and solution SDGs ──────────────────────────────

-- Waste sub-issues (7-9)
INSERT OR IGNORE INTO issue_sdgs (issue_id, sdg_id) VALUES (7, 12), (7, 9);
INSERT OR IGNORE INTO issue_sdgs (issue_id, sdg_id) VALUES (8, 12), (8, 1);
INSERT OR IGNORE INTO issue_sdgs (issue_id, sdg_id) VALUES (9, 12), (9, 11);

-- Waste solutions (10-12)
INSERT OR IGNORE INTO issue_sdgs (issue_id, sdg_id) VALUES (10, 12), (10, 11);
INSERT OR IGNORE INTO issue_sdgs (issue_id, sdg_id) VALUES (11, 12);
INSERT OR IGNORE INTO issue_sdgs (issue_id, sdg_id) VALUES (12, 12), (12, 11);

-- Transport sub-issues (13-14)
INSERT OR IGNORE INTO issue_sdgs (issue_id, sdg_id) VALUES (13, 11), (13, 10);
INSERT OR IGNORE INTO issue_sdgs (issue_id, sdg_id) VALUES (14, 11), (14, 9);

-- Transport solutions (15-17)
INSERT OR IGNORE INTO issue_sdgs (issue_id, sdg_id) VALUES (15, 11), (15, 9);
INSERT OR IGNORE INTO issue_sdgs (issue_id, sdg_id) VALUES (16, 11), (16, 9);
INSERT OR IGNORE INTO issue_sdgs (issue_id, sdg_id) VALUES (17, 11), (17, 13);

-- Water sub-issues (18-19)
INSERT OR IGNORE INTO issue_sdgs (issue_id, sdg_id) VALUES (18, 6), (18, 9);
INSERT OR IGNORE INTO issue_sdgs (issue_id, sdg_id) VALUES (19, 6), (19, 3);

-- Water solutions (20-21)
INSERT OR IGNORE INTO issue_sdgs (issue_id, sdg_id) VALUES (20, 6), (20, 3);
INSERT OR IGNORE INTO issue_sdgs (issue_id, sdg_id) VALUES (21, 6), (21, 11);

-- Housing sub-issues (22-24)
INSERT OR IGNORE INTO issue_sdgs (issue_id, sdg_id) VALUES (22, 11);
INSERT OR IGNORE INTO issue_sdgs (issue_id, sdg_id) VALUES (23, 11), (23, 8);
INSERT OR IGNORE INTO issue_sdgs (issue_id, sdg_id) VALUES (24, 11), (24, 1);

-- Housing solutions (25-27)
INSERT OR IGNORE INTO issue_sdgs (issue_id, sdg_id) VALUES (25, 11), (25, 1);
INSERT OR IGNORE INTO issue_sdgs (issue_id, sdg_id) VALUES (26, 11), (26, 9);
INSERT OR IGNORE INTO issue_sdgs (issue_id, sdg_id) VALUES (27, 11), (27, 10);

-- Hydroponics sub-issues (28-29)
INSERT OR IGNORE INTO issue_sdgs (issue_id, sdg_id) VALUES (28, 2), (28, 1);
INSERT OR IGNORE INTO issue_sdgs (issue_id, sdg_id) VALUES (29, 2), (29, 4);

-- Hydroponics solutions (30-31)
INSERT OR IGNORE INTO issue_sdgs (issue_id, sdg_id) VALUES (30, 2), (30, 9);
INSERT OR IGNORE INTO issue_sdgs (issue_id, sdg_id) VALUES (31, 2), (31, 4);

-- Emissions sub-issues (32-34)
INSERT OR IGNORE INTO issue_sdgs (issue_id, sdg_id) VALUES (32, 13), (32, 3);
INSERT OR IGNORE INTO issue_sdgs (issue_id, sdg_id) VALUES (33, 13), (33, 7);
INSERT OR IGNORE INTO issue_sdgs (issue_id, sdg_id) VALUES (34, 13), (34, 11);

-- Emissions solutions (35-38)
INSERT OR IGNORE INTO issue_sdgs (issue_id, sdg_id) VALUES (35, 13), (35, 7);
INSERT OR IGNORE INTO issue_sdgs (issue_id, sdg_id) VALUES (36, 7), (36, 10);
INSERT OR IGNORE INTO issue_sdgs (issue_id, sdg_id) VALUES (37, 11), (37, 13);
INSERT OR IGNORE INTO issue_sdgs (issue_id, sdg_id) VALUES (38, 13), (38, 8);
