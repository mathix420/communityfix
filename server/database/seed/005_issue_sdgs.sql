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

-- ── Solutions for Drought-Induced Forest Decline – global cause (68–71) ────

-- Mosaic forest silviculture (68): SDG 15 (Life on Land), SDG 13 (Climate Action)
INSERT INTO issue_sdgs (issue_id, sdg_id) VALUES (68, 15), (68, 13)
ON CONFLICT DO NOTHING;

-- Thin forest stands (69): SDG 15 (Life on Land)
INSERT INTO issue_sdgs (issue_id, sdg_id) VALUES (69, 15)
ON CONFLICT DO NOTHING;

-- Restore landscape water retention (70): SDG 6 (Clean Water), SDG 15 (Life on Land)
INSERT INTO issue_sdgs (issue_id, sdg_id) VALUES (70, 6), (70, 15)
ON CONFLICT DO NOTHING;

-- Test new species and provenances (71): SDG 15 (Life on Land), SDG 9 (Industry & Infrastructure)
INSERT INTO issue_sdgs (issue_id, sdg_id) VALUES (71, 15), (71, 9)
ON CONFLICT DO NOTHING;

-- ── Solutions for Drought – Sundgau (72–73) ────

-- Plant climate-adapted species (72): SDG 15 (Life on Land), SDG 13 (Climate Action)
INSERT INTO issue_sdgs (issue_id, sdg_id) VALUES (72, 15), (72, 13)
ON CONFLICT DO NOTHING;

-- Drought-period water restrictions (73): SDG 6 (Clean Water), SDG 11 (Sustainable Cities)
INSERT INTO issue_sdgs (issue_id, sdg_id) VALUES (73, 6), (73, 11)
ON CONFLICT DO NOTHING;

-- ── Sub-issues attached to drought solutions (74–76) ────

-- Trials too slow for dying stands (74): SDG 15, SDG 13
INSERT INTO issue_sdgs (issue_id, sdg_id) VALUES (74, 15), (74, 13)
ON CONFLICT DO NOTHING;

-- Species suitability on clay unknown (75): SDG 15
INSERT INTO issue_sdgs (issue_id, sdg_id) VALUES (75, 15)
ON CONFLICT DO NOTHING;

-- Restrictions don't refill aquifers (76): SDG 6, SDG 15
INSERT INTO issue_sdgs (issue_id, sdg_id) VALUES (76, 6), (76, 15)
ON CONFLICT DO NOTHING;

-- ── Urban Carbon Neutrality and sub-issues (46-67) ─────────────

-- Urban Carbon Neutrality (46): SDG 13 (Climate Action), 11 (Sustainable Cities), 7 (Clean Energy)
INSERT INTO issue_sdgs (issue_id, sdg_id) VALUES (46, 13), (46, 11), (46, 7)
ON CONFLICT DO NOTHING;

-- Fossil Heating Phase-Out (47): SDG 13, 7, 11
INSERT INTO issue_sdgs (issue_id, sdg_id) VALUES (47, 13), (47, 7), (47, 11)
ON CONFLICT DO NOTHING;

-- Basel: Fossil Heating (48): SDG 13, 7, 11
INSERT INTO issue_sdgs (issue_id, sdg_id) VALUES (48, 13), (48, 7), (48, 11)
ON CONFLICT DO NOTHING;

-- District Heating Zones (49): SDG 13, 7
INSERT INTO issue_sdgs (issue_id, sdg_id) VALUES (49, 13), (49, 7)
ON CONFLICT DO NOTHING;

-- Retrofit Accelerator (50): SDG 13, 7, 9
INSERT INTO issue_sdgs (issue_id, sdg_id) VALUES (50, 13), (50, 7), (50, 9)
ON CONFLICT DO NOTHING;

-- Urban Transport Decarbonization (51): SDG 13, 11, 9
INSERT INTO issue_sdgs (issue_id, sdg_id) VALUES (51, 13), (51, 11), (51, 9)
ON CONFLICT DO NOTHING;

-- Basel: Transport (52): SDG 13, 11, 9
INSERT INTO issue_sdgs (issue_id, sdg_id) VALUES (52, 13), (52, 11), (52, 9)
ON CONFLICT DO NOTHING;

-- Right-to-Charge (53): SDG 13, 11
INSERT INTO issue_sdgs (issue_id, sdg_id) VALUES (53, 13), (53, 11)
ON CONFLICT DO NOTHING;

-- Car Deregistration (54): SDG 13, 11
INSERT INTO issue_sdgs (issue_id, sdg_id) VALUES (54, 13), (54, 11)
ON CONFLICT DO NOTHING;

-- Embodied Carbon (55): SDG 13, 12, 9
INSERT INTO issue_sdgs (issue_id, sdg_id) VALUES (55, 13), (55, 12), (55, 9)
ON CONFLICT DO NOTHING;

-- Basel: Embodied Carbon (56): SDG 13, 12, 9
INSERT INTO issue_sdgs (issue_id, sdg_id) VALUES (56, 13), (56, 12), (56, 9)
ON CONFLICT DO NOTHING;

-- Whole-Life Carbon Limits (57): SDG 13, 12
INSERT INTO issue_sdgs (issue_id, sdg_id) VALUES (57, 13), (57, 12)
ON CONFLICT DO NOTHING;

-- Demolition Tax (58): SDG 13, 12, 11
INSERT INTO issue_sdgs (issue_id, sdg_id) VALUES (58, 13), (58, 12), (58, 11)
ON CONFLICT DO NOTHING;

-- Residual Emissions (59): SDG 13, 9
INSERT INTO issue_sdgs (issue_id, sdg_id) VALUES (59, 13), (59, 9)
ON CONFLICT DO NOTHING;

-- Basel: Residual Emissions (60): SDG 13, 9
INSERT INTO issue_sdgs (issue_id, sdg_id) VALUES (60, 13), (60, 9)
ON CONFLICT DO NOTHING;

-- CCS at Waste-to-Energy (61): SDG 13, 9
INSERT INTO issue_sdgs (issue_id, sdg_id) VALUES (61, 13), (61, 9)
ON CONFLICT DO NOTHING;

-- Carbon Mineralization (62): SDG 13, 9, 12
INSERT INTO issue_sdgs (issue_id, sdg_id) VALUES (62, 13), (62, 9), (62, 12)
ON CONFLICT DO NOTHING;

-- Diversified NETs Portfolio (63): SDG 13, 9
INSERT INTO issue_sdgs (issue_id, sdg_id) VALUES (63, 13), (63, 9)
ON CONFLICT DO NOTHING;

-- Small Business Viability (64): SDG 13, 8, 9
INSERT INTO issue_sdgs (issue_id, sdg_id) VALUES (64, 13), (64, 8), (64, 9)
ON CONFLICT DO NOTHING;

-- Basel: Small Business (65): SDG 13, 8, 9
INSERT INTO issue_sdgs (issue_id, sdg_id) VALUES (65, 13), (65, 8), (65, 9)
ON CONFLICT DO NOTHING;

-- SME Climate Platform (66): SDG 13, 8, 17
INSERT INTO issue_sdgs (issue_id, sdg_id) VALUES (66, 13), (66, 8), (66, 17)
ON CONFLICT DO NOTHING;

-- Sector Roadmaps (67): SDG 13, 8
INSERT INTO issue_sdgs (issue_id, sdg_id) VALUES (67, 13), (67, 8)
ON CONFLICT DO NOTHING;
