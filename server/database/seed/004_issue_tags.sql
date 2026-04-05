-- ── Top-level issue tags ──────────────────────────────────────

-- Reduce household waste (1): environment, waste management, recycling
INSERT INTO issue_tags (issue_id, tag_id) VALUES
  (1, (SELECT id FROM tags WHERE slug = 'environment')),
  (1, (SELECT id FROM tags WHERE slug = 'waste-management')),
  (1, (SELECT id FROM tags WHERE slug = 'recycling'))
ON CONFLICT DO NOTHING;

-- Improve local public transport (2): transport, infrastructure, urban mobility
INSERT INTO issue_tags (issue_id, tag_id) VALUES
  (2, (SELECT id FROM tags WHERE slug = 'transport')),
  (2, (SELECT id FROM tags WHERE slug = 'infrastructure')),
  (2, (SELECT id FROM tags WHERE slug = 'urban-mobility'))
ON CONFLICT DO NOTHING;

-- Cheaper access to clean water (3): water, health, sustainability
INSERT INTO issue_tags (issue_id, tag_id) VALUES
  (3, (SELECT id FROM tags WHERE slug = 'water')),
  (3, (SELECT id FROM tags WHERE slug = 'health')),
  (3, (SELECT id FROM tags WHERE slug = 'sustainability'))
ON CONFLICT DO NOTHING;

-- Affordable housing solutions (4): housing, affordability, innovation
INSERT INTO issue_tags (issue_id, tag_id) VALUES
  (4, (SELECT id FROM tags WHERE slug = 'housing')),
  (4, (SELECT id FROM tags WHERE slug = 'affordability')),
  (4, (SELECT id FROM tags WHERE slug = 'innovation'))
ON CONFLICT DO NOTHING;

-- Accessible hydroponics systems (5): agriculture, hydroponics, urban farming
INSERT INTO issue_tags (issue_id, tag_id) VALUES
  (5, (SELECT id FROM tags WHERE slug = 'agriculture')),
  (5, (SELECT id FROM tags WHERE slug = 'hydroponics')),
  (5, (SELECT id FROM tags WHERE slug = 'urban-farming'))
ON CONFLICT DO NOTHING;

-- Curbing greenhouse gas emissions (6): climate, sustainability, energy
INSERT INTO issue_tags (issue_id, tag_id) VALUES
  (6, (SELECT id FROM tags WHERE slug = 'climate')),
  (6, (SELECT id FROM tags WHERE slug = 'sustainability')),
  (6, (SELECT id FROM tags WHERE slug = 'energy'))
ON CONFLICT DO NOTHING;

-- ── Sub-issue and solution tags ──────────────────────────────

-- Sub-issues for waste (7-9)
INSERT INTO issue_tags (issue_id, tag_id) VALUES
  (7, (SELECT id FROM tags WHERE slug = 'recycling')),
  (7, (SELECT id FROM tags WHERE slug = 'infrastructure')),
  (8, (SELECT id FROM tags WHERE slug = 'environment')),
  (8, (SELECT id FROM tags WHERE slug = 'affordability')),
  (9, (SELECT id FROM tags WHERE slug = 'waste-management')),
  (9, (SELECT id FROM tags WHERE slug = 'urban-farming'))
ON CONFLICT DO NOTHING;

-- Solutions for waste (10-12)
INSERT INTO issue_tags (issue_id, tag_id) VALUES
  (10, (SELECT id FROM tags WHERE slug = 'waste-management')),
  (10, (SELECT id FROM tags WHERE slug = 'sustainability')),
  (11, (SELECT id FROM tags WHERE slug = 'recycling')),
  (12, (SELECT id FROM tags WHERE slug = 'waste-management'))
ON CONFLICT DO NOTHING;

-- Sub-issues for transport (13-14)
INSERT INTO issue_tags (issue_id, tag_id) VALUES
  (13, (SELECT id FROM tags WHERE slug = 'transport')),
  (13, (SELECT id FROM tags WHERE slug = 'urban-mobility')),
  (14, (SELECT id FROM tags WHERE slug = 'transport')),
  (14, (SELECT id FROM tags WHERE slug = 'infrastructure'))
ON CONFLICT DO NOTHING;

-- Solutions for transport (15-17)
INSERT INTO issue_tags (issue_id, tag_id) VALUES
  (15, (SELECT id FROM tags WHERE slug = 'transport')),
  (15, (SELECT id FROM tags WHERE slug = 'innovation')),
  (16, (SELECT id FROM tags WHERE slug = 'transport')),
  (16, (SELECT id FROM tags WHERE slug = 'infrastructure')),
  (17, (SELECT id FROM tags WHERE slug = 'transport')),
  (17, (SELECT id FROM tags WHERE slug = 'urban-mobility'))
ON CONFLICT DO NOTHING;

-- Sub-issues for water (18-19)
INSERT INTO issue_tags (issue_id, tag_id) VALUES
  (18, (SELECT id FROM tags WHERE slug = 'water')),
  (18, (SELECT id FROM tags WHERE slug = 'infrastructure')),
  (19, (SELECT id FROM tags WHERE slug = 'water')),
  (19, (SELECT id FROM tags WHERE slug = 'health'))
ON CONFLICT DO NOTHING;

-- Solutions for water (20-21)
INSERT INTO issue_tags (issue_id, tag_id) VALUES
  (20, (SELECT id FROM tags WHERE slug = 'water')),
  (20, (SELECT id FROM tags WHERE slug = 'health')),
  (21, (SELECT id FROM tags WHERE slug = 'water')),
  (21, (SELECT id FROM tags WHERE slug = 'sustainability'))
ON CONFLICT DO NOTHING;

-- Sub-issues for housing (22-24)
INSERT INTO issue_tags (issue_id, tag_id) VALUES
  (22, (SELECT id FROM tags WHERE slug = 'housing')),
  (23, (SELECT id FROM tags WHERE slug = 'housing')),
  (23, (SELECT id FROM tags WHERE slug = 'affordability')),
  (24, (SELECT id FROM tags WHERE slug = 'housing'))
ON CONFLICT DO NOTHING;

-- Solutions for housing (25-27)
INSERT INTO issue_tags (issue_id, tag_id) VALUES
  (25, (SELECT id FROM tags WHERE slug = 'housing')),
  (25, (SELECT id FROM tags WHERE slug = 'affordability')),
  (26, (SELECT id FROM tags WHERE slug = 'housing')),
  (26, (SELECT id FROM tags WHERE slug = 'innovation')),
  (27, (SELECT id FROM tags WHERE slug = 'housing')),
  (27, (SELECT id FROM tags WHERE slug = 'affordability'))
ON CONFLICT DO NOTHING;

-- Sub-issues for hydroponics (28-29)
INSERT INTO issue_tags (issue_id, tag_id) VALUES
  (28, (SELECT id FROM tags WHERE slug = 'hydroponics')),
  (28, (SELECT id FROM tags WHERE slug = 'affordability')),
  (29, (SELECT id FROM tags WHERE slug = 'hydroponics')),
  (29, (SELECT id FROM tags WHERE slug = 'agriculture'))
ON CONFLICT DO NOTHING;

-- Solutions for hydroponics (30-31)
INSERT INTO issue_tags (issue_id, tag_id) VALUES
  (30, (SELECT id FROM tags WHERE slug = 'hydroponics')),
  (30, (SELECT id FROM tags WHERE slug = 'innovation')),
  (31, (SELECT id FROM tags WHERE slug = 'hydroponics')),
  (31, (SELECT id FROM tags WHERE slug = 'urban-farming'))
ON CONFLICT DO NOTHING;

-- Sub-issues for emissions (32-34)
INSERT INTO issue_tags (issue_id, tag_id) VALUES
  (32, (SELECT id FROM tags WHERE slug = 'climate')),
  (32, (SELECT id FROM tags WHERE slug = 'environment')),
  (33, (SELECT id FROM tags WHERE slug = 'energy')),
  (33, (SELECT id FROM tags WHERE slug = 'sustainability')),
  (34, (SELECT id FROM tags WHERE slug = 'transport')),
  (34, (SELECT id FROM tags WHERE slug = 'energy'))
ON CONFLICT DO NOTHING;

-- Solutions for emissions (35-38)
INSERT INTO issue_tags (issue_id, tag_id) VALUES
  (35, (SELECT id FROM tags WHERE slug = 'energy')),
  (35, (SELECT id FROM tags WHERE slug = 'sustainability')),
  (36, (SELECT id FROM tags WHERE slug = 'energy')),
  (36, (SELECT id FROM tags WHERE slug = 'affordability')),
  (37, (SELECT id FROM tags WHERE slug = 'urban-mobility')),
  (37, (SELECT id FROM tags WHERE slug = 'climate')),
  (38, (SELECT id FROM tags WHERE slug = 'climate')),
  (38, (SELECT id FROM tags WHERE slug = 'innovation'))
ON CONFLICT DO NOTHING;

-- ── Forest Dieback Crisis (39) ──────────────────────────────
INSERT INTO issue_tags (issue_id, tag_id) VALUES
  (39, (SELECT id FROM tags WHERE slug = 'environment')),
  (39, (SELECT id FROM tags WHERE slug = 'climate')),
  (39, (SELECT id FROM tags WHERE slug = 'forestry')),
  (39, (SELECT id FROM tags WHERE slug = 'biodiversity'))
ON CONFLICT DO NOTHING;

-- Drought-Induced Forest Decline (40)
INSERT INTO issue_tags (issue_id, tag_id) VALUES
  (40, (SELECT id FROM tags WHERE slug = 'environment')),
  (40, (SELECT id FROM tags WHERE slug = 'drought')),
  (40, (SELECT id FROM tags WHERE slug = 'water')),
  (40, (SELECT id FROM tags WHERE slug = 'forestry'))
ON CONFLICT DO NOTHING;

-- Drought — Sundgau (41)
INSERT INTO issue_tags (issue_id, tag_id) VALUES
  (41, (SELECT id FROM tags WHERE slug = 'drought')),
  (41, (SELECT id FROM tags WHERE slug = 'water')),
  (41, (SELECT id FROM tags WHERE slug = 'environment'))
ON CONFLICT DO NOTHING;

-- Bark Beetle Epidemic (42)
INSERT INTO issue_tags (issue_id, tag_id) VALUES
  (42, (SELECT id FROM tags WHERE slug = 'environment')),
  (42, (SELECT id FROM tags WHERE slug = 'forestry')),
  (42, (SELECT id FROM tags WHERE slug = 'climate'))
ON CONFLICT DO NOTHING;

-- Bark Beetle — Sundgau (43)
INSERT INTO issue_tags (issue_id, tag_id) VALUES
  (43, (SELECT id FROM tags WHERE slug = 'forestry')),
  (43, (SELECT id FROM tags WHERE slug = 'environment'))
ON CONFLICT DO NOTHING;

-- Beech and Ash Dieback (44)
INSERT INTO issue_tags (issue_id, tag_id) VALUES
  (44, (SELECT id FROM tags WHERE slug = 'environment')),
  (44, (SELECT id FROM tags WHERE slug = 'forestry')),
  (44, (SELECT id FROM tags WHERE slug = 'biodiversity')),
  (44, (SELECT id FROM tags WHERE slug = 'climate'))
ON CONFLICT DO NOTHING;

-- Beech/Ash — Sundgau (45)
INSERT INTO issue_tags (issue_id, tag_id) VALUES
  (45, (SELECT id FROM tags WHERE slug = 'forestry')),
  (45, (SELECT id FROM tags WHERE slug = 'environment')),
  (45, (SELECT id FROM tags WHERE slug = 'biodiversity'))
ON CONFLICT DO NOTHING;

-- ── Urban Carbon Neutrality (46) ──────────────────────────────

-- Urban Carbon Neutrality (46): climate, energy, sustainability, infrastructure
INSERT INTO issue_tags (issue_id, tag_id) VALUES
  (46, (SELECT id FROM tags WHERE slug = 'climate')),
  (46, (SELECT id FROM tags WHERE slug = 'energy')),
  (46, (SELECT id FROM tags WHERE slug = 'sustainability')),
  (46, (SELECT id FROM tags WHERE slug = 'infrastructure'))
ON CONFLICT DO NOTHING;

-- Fossil Heating Phase-Out (47): energy, housing, climate, infrastructure
INSERT INTO issue_tags (issue_id, tag_id) VALUES
  (47, (SELECT id FROM tags WHERE slug = 'energy')),
  (47, (SELECT id FROM tags WHERE slug = 'housing')),
  (47, (SELECT id FROM tags WHERE slug = 'climate')),
  (47, (SELECT id FROM tags WHERE slug = 'infrastructure'))
ON CONFLICT DO NOTHING;

-- Basel: Fossil Heating (48): energy, housing, climate
INSERT INTO issue_tags (issue_id, tag_id) VALUES
  (48, (SELECT id FROM tags WHERE slug = 'energy')),
  (48, (SELECT id FROM tags WHERE slug = 'housing')),
  (48, (SELECT id FROM tags WHERE slug = 'climate'))
ON CONFLICT DO NOTHING;

-- District Heating Zones (49): energy, infrastructure, climate
INSERT INTO issue_tags (issue_id, tag_id) VALUES
  (49, (SELECT id FROM tags WHERE slug = 'energy')),
  (49, (SELECT id FROM tags WHERE slug = 'infrastructure')),
  (49, (SELECT id FROM tags WHERE slug = 'climate'))
ON CONFLICT DO NOTHING;

-- Retrofit Accelerator (50): energy, housing, innovation
INSERT INTO issue_tags (issue_id, tag_id) VALUES
  (50, (SELECT id FROM tags WHERE slug = 'energy')),
  (50, (SELECT id FROM tags WHERE slug = 'housing')),
  (50, (SELECT id FROM tags WHERE slug = 'innovation'))
ON CONFLICT DO NOTHING;

-- Urban Transport Decarbonization (51): transport, urban-mobility, climate, energy
INSERT INTO issue_tags (issue_id, tag_id) VALUES
  (51, (SELECT id FROM tags WHERE slug = 'transport')),
  (51, (SELECT id FROM tags WHERE slug = 'urban-mobility')),
  (51, (SELECT id FROM tags WHERE slug = 'climate')),
  (51, (SELECT id FROM tags WHERE slug = 'energy'))
ON CONFLICT DO NOTHING;

-- Basel: Transport (52): transport, urban-mobility, climate
INSERT INTO issue_tags (issue_id, tag_id) VALUES
  (52, (SELECT id FROM tags WHERE slug = 'transport')),
  (52, (SELECT id FROM tags WHERE slug = 'urban-mobility')),
  (52, (SELECT id FROM tags WHERE slug = 'climate'))
ON CONFLICT DO NOTHING;

-- Right-to-Charge (53): transport, housing, innovation
INSERT INTO issue_tags (issue_id, tag_id) VALUES
  (53, (SELECT id FROM tags WHERE slug = 'transport')),
  (53, (SELECT id FROM tags WHERE slug = 'housing')),
  (53, (SELECT id FROM tags WHERE slug = 'innovation'))
ON CONFLICT DO NOTHING;

-- Car Deregistration (54): transport, urban-mobility, sustainability
INSERT INTO issue_tags (issue_id, tag_id) VALUES
  (54, (SELECT id FROM tags WHERE slug = 'transport')),
  (54, (SELECT id FROM tags WHERE slug = 'urban-mobility')),
  (54, (SELECT id FROM tags WHERE slug = 'sustainability'))
ON CONFLICT DO NOTHING;

-- Embodied Carbon (55): climate, housing, sustainability, construction
INSERT INTO issue_tags (issue_id, tag_id) VALUES
  (55, (SELECT id FROM tags WHERE slug = 'climate')),
  (55, (SELECT id FROM tags WHERE slug = 'housing')),
  (55, (SELECT id FROM tags WHERE slug = 'sustainability')),
  (55, (SELECT id FROM tags WHERE slug = 'construction'))
ON CONFLICT DO NOTHING;

-- Basel: Embodied Carbon (56): climate, housing, construction
INSERT INTO issue_tags (issue_id, tag_id) VALUES
  (56, (SELECT id FROM tags WHERE slug = 'climate')),
  (56, (SELECT id FROM tags WHERE slug = 'housing')),
  (56, (SELECT id FROM tags WHERE slug = 'construction'))
ON CONFLICT DO NOTHING;

-- Whole-Life Carbon Limits (57): climate, housing, construction
INSERT INTO issue_tags (issue_id, tag_id) VALUES
  (57, (SELECT id FROM tags WHERE slug = 'climate')),
  (57, (SELECT id FROM tags WHERE slug = 'housing')),
  (57, (SELECT id FROM tags WHERE slug = 'construction'))
ON CONFLICT DO NOTHING;

-- Demolition Tax (58): climate, housing, sustainability
INSERT INTO issue_tags (issue_id, tag_id) VALUES
  (58, (SELECT id FROM tags WHERE slug = 'climate')),
  (58, (SELECT id FROM tags WHERE slug = 'housing')),
  (58, (SELECT id FROM tags WHERE slug = 'sustainability'))
ON CONFLICT DO NOTHING;

-- Residual Emissions (59): climate, innovation, energy
INSERT INTO issue_tags (issue_id, tag_id) VALUES
  (59, (SELECT id FROM tags WHERE slug = 'climate')),
  (59, (SELECT id FROM tags WHERE slug = 'innovation')),
  (59, (SELECT id FROM tags WHERE slug = 'energy'))
ON CONFLICT DO NOTHING;

-- Basel: Residual Emissions (60): climate, innovation, energy
INSERT INTO issue_tags (issue_id, tag_id) VALUES
  (60, (SELECT id FROM tags WHERE slug = 'climate')),
  (60, (SELECT id FROM tags WHERE slug = 'innovation')),
  (60, (SELECT id FROM tags WHERE slug = 'energy'))
ON CONFLICT DO NOTHING;

-- CCS at Waste-to-Energy (61): climate, innovation, infrastructure
INSERT INTO issue_tags (issue_id, tag_id) VALUES
  (61, (SELECT id FROM tags WHERE slug = 'climate')),
  (61, (SELECT id FROM tags WHERE slug = 'innovation')),
  (61, (SELECT id FROM tags WHERE slug = 'infrastructure'))
ON CONFLICT DO NOTHING;

-- Carbon Mineralization (62): climate, innovation, construction
INSERT INTO issue_tags (issue_id, tag_id) VALUES
  (62, (SELECT id FROM tags WHERE slug = 'climate')),
  (62, (SELECT id FROM tags WHERE slug = 'innovation')),
  (62, (SELECT id FROM tags WHERE slug = 'construction'))
ON CONFLICT DO NOTHING;

-- Diversified NETs Portfolio (63): climate, innovation, sustainability
INSERT INTO issue_tags (issue_id, tag_id) VALUES
  (63, (SELECT id FROM tags WHERE slug = 'climate')),
  (63, (SELECT id FROM tags WHERE slug = 'innovation')),
  (63, (SELECT id FROM tags WHERE slug = 'sustainability'))
ON CONFLICT DO NOTHING;

-- Small Business Viability (64): climate, sustainability, innovation
INSERT INTO issue_tags (issue_id, tag_id) VALUES
  (64, (SELECT id FROM tags WHERE slug = 'climate')),
  (64, (SELECT id FROM tags WHERE slug = 'sustainability')),
  (64, (SELECT id FROM tags WHERE slug = 'innovation'))
ON CONFLICT DO NOTHING;

-- Basel: Small Business (65): climate, sustainability, innovation
INSERT INTO issue_tags (issue_id, tag_id) VALUES
  (65, (SELECT id FROM tags WHERE slug = 'climate')),
  (65, (SELECT id FROM tags WHERE slug = 'sustainability')),
  (65, (SELECT id FROM tags WHERE slug = 'innovation'))
ON CONFLICT DO NOTHING;

-- SME Climate Platform (66): climate, innovation, sustainability
INSERT INTO issue_tags (issue_id, tag_id) VALUES
  (66, (SELECT id FROM tags WHERE slug = 'climate')),
  (66, (SELECT id FROM tags WHERE slug = 'innovation')),
  (66, (SELECT id FROM tags WHERE slug = 'sustainability'))
ON CONFLICT DO NOTHING;

-- Sector Roadmaps (67): climate, sustainability, innovation
INSERT INTO issue_tags (issue_id, tag_id) VALUES
  (67, (SELECT id FROM tags WHERE slug = 'climate')),
  (67, (SELECT id FROM tags WHERE slug = 'sustainability')),
  (67, (SELECT id FROM tags WHERE slug = 'innovation'))
ON CONFLICT DO NOTHING;
