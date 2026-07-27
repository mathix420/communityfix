
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


-- Mosaic forest silviculture (68)
INSERT INTO issue_tags (issue_id, tag_id) VALUES
  (68, (SELECT id FROM tags WHERE slug = 'forestry')),
  (68, (SELECT id FROM tags WHERE slug = 'biodiversity')),
  (68, (SELECT id FROM tags WHERE slug = 'sustainability'))
ON CONFLICT DO NOTHING;

-- Thin forest stands (69)
INSERT INTO issue_tags (issue_id, tag_id) VALUES
  (69, (SELECT id FROM tags WHERE slug = 'forestry')),
  (69, (SELECT id FROM tags WHERE slug = 'sustainability'))
ON CONFLICT DO NOTHING;

-- Restore landscape water retention (70)
INSERT INTO issue_tags (issue_id, tag_id) VALUES
  (70, (SELECT id FROM tags WHERE slug = 'water')),
  (70, (SELECT id FROM tags WHERE slug = 'environment')),
  (70, (SELECT id FROM tags WHERE slug = 'infrastructure'))
ON CONFLICT DO NOTHING;

-- Test new species and provenances (71)
INSERT INTO issue_tags (issue_id, tag_id) VALUES
  (71, (SELECT id FROM tags WHERE slug = 'forestry')),
  (71, (SELECT id FROM tags WHERE slug = 'innovation')),
  (71, (SELECT id FROM tags WHERE slug = 'biodiversity'))
ON CONFLICT DO NOTHING;


-- Plant climate-adapted species (72)
INSERT INTO issue_tags (issue_id, tag_id) VALUES
  (72, (SELECT id FROM tags WHERE slug = 'forestry')),
  (72, (SELECT id FROM tags WHERE slug = 'environment')),
  (72, (SELECT id FROM tags WHERE slug = 'sustainability'))
ON CONFLICT DO NOTHING;

-- Drought-period water restrictions (73)
INSERT INTO issue_tags (issue_id, tag_id) VALUES
  (73, (SELECT id FROM tags WHERE slug = 'water')),
  (73, (SELECT id FROM tags WHERE slug = 'infrastructure')),
  (73, (SELECT id FROM tags WHERE slug = 'drought'))
ON CONFLICT DO NOTHING;


-- Trials too slow for dying stands (74, parent=71)
INSERT INTO issue_tags (issue_id, tag_id) VALUES
  (74, (SELECT id FROM tags WHERE slug = 'forestry')),
  (74, (SELECT id FROM tags WHERE slug = 'climate'))
ON CONFLICT DO NOTHING;

-- Species suitability on clay unknown (75, parent=72)
INSERT INTO issue_tags (issue_id, tag_id) VALUES
  (75, (SELECT id FROM tags WHERE slug = 'forestry')),
  (75, (SELECT id FROM tags WHERE slug = 'biodiversity'))
ON CONFLICT DO NOTHING;

-- Restrictions don't refill aquifers (76, parent=73)
INSERT INTO issue_tags (issue_id, tag_id) VALUES
  (76, (SELECT id FROM tags WHERE slug = 'water')),
  (76, (SELECT id FROM tags WHERE slug = 'drought'))
ON CONFLICT DO NOTHING;


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

-- Richer taxonomy coverage for the original fixtures plus the additional
-- branches in 003_issues.sql. Keeping the mapping as (issue, slug) pairs makes
-- it readable and avoids relying on serial tag IDs.
WITH tag_map (issue_id, slug) AS (
  VALUES
    -- Waste and circularity
    (1, 'circular-economy'), (1, 'zero-waste'), (1, 'reuse'), (1, 'repair'),
    (1, 'food-waste'), (7, 'environmental-justice'), (7, 'public-policy'),
    (8, 'plastic-pollution'), (8, 'poverty-reduction'), (9, 'composting'),
    (9, 'food-waste'), (10, 'composting'), (10, 'community-gardens'),
    (11, 'circular-economy'), (11, 'plastic-pollution'), (11, 'reuse'),
    (12, 'zero-waste'), (12, 'education'),

    -- Transport
    (2, 'public-transit'), (2, 'buses'), (2, 'transit-equity'), (2, 'accessibility'),
    (13, 'shared-mobility'), (13, 'transit-equity'), (14, 'open-data'),
    (14, 'civic-tech'), (15, 'shared-mobility'), (15, 'transit-equity'),
    (16, 'open-data'), (16, 'civic-tech'), (17, 'buses'), (17, 'traffic-calming'),

    -- Water
    (3, 'drinking-water'), (3, 'water-affordability'), (3, 'public-health'),
    (3, 'informal-settlements'), (18, 'water-quality'), (18, 'drinking-water'),
    (18, 'environmental-justice'), (19, 'rural-water'), (19, 'sanitation'),
    (19, 'groundwater'), (19, 'indigenous-rights'), (20, 'drinking-water'),
    (20, 'public-health'), (21, 'rainwater-harvesting'), (21, 'water-conservation'),
    (21, 'stormwater'),

    -- Housing and construction
    (4, 'affordable-housing'), (4, 'homelessness'), (4, 'land-use'),
    (4, 'public-policy'), (22, 'zoning'), (22, 'urban-planning'), (22, 'land-use'),
    (23, 'modular-housing'), (23, 'building-materials'), (23, 'workforce-development'),
    (24, 'tenant-rights'), (25, 'community-land-trusts'), (25, 'cooperatives'),
    (25, 'affordable-housing'), (26, 'modular-housing'), (26, 'building-materials'),
    (27, 'zoning'), (27, 'public-policy'),

    -- Food and growing
    (5, 'food-security'), (5, 'food-deserts'), (5, 'local-food'), (5, 'irrigation'),
    (28, 'food-deserts'), (28, 'poverty-reduction'), (29, 'education'),
    (29, 'open-source'), (30, 'open-source'), (30, 'seed-saving'),
    (31, 'school-meals'), (31, 'education'), (31, 'community-gardens'),
    (31, 'nutrition'),

    -- Climate, energy, and air quality
    (6, 'emissions'), (6, 'decarbonization'), (6, 'climate-justice'),
    (6, 'clean-cooking'), (32, 'air-quality'), (32, 'air-pollution'),
    (32, 'environmental-justice'), (32, 'environmental-monitoring'),
    (33, 'energy-efficiency'), (33, 'building-retrofits'), (33, 'energy-poverty'),
    (33, 'green-buildings'), (34, 'electrification'), (34, 'freight'),
    (34, 'charging-infrastructure'), (35, 'energy-efficiency'),
    (35, 'building-retrofits'), (35, 'heat-pumps'), (36, 'renewable-energy'),
    (36, 'solar-energy'), (36, 'community-energy'), (36, 'energy-poverty'),
    (37, 'cycling'), (37, 'walking'), (37, 'active-mobility'),
    (37, 'public-space'), (37, 'traffic-calming'), (38, 'carbon-removal'),
    (38, 'social-enterprise'), (38, 'small-business'),

    -- Forest and landscape resilience
    (39, 'climate-adaptation'), (39, 'wildfire'), (39, 'ecosystem-restoration'),
    (39, 'conservation'), (39, 'disaster-risk-reduction'), (39, 'resilience'),
    (39, 'indigenous-rights'), (40, 'soil-health'), (40, 'climate-adaptation'),
    (41, 'soil-health'), (42, 'environmental-monitoring'), (42, 'conservation'),
    (44, 'ecosystem-restoration'), (68, 'agroforestry'), (68, 'pollinators'),
    (68, 'conservation'), (69, 'wildfire'), (69, 'resilience'),
    (70, 'nature-based-solutions'), (70, 'wetlands'), (70, 'watershed-management'),
    (70, 'flood-management'), (70, 'green-infrastructure'), (70, 'flooding'),
    (70, 'coastal-resilience'), (71, 'citizen-science'), (71, 'seed-saving'),
    (71, 'conservation'), (72, 'agroforestry'), (72, 'soil-regeneration'),
    (73, 'public-policy'), (73, 'water-conservation'), (74, 'citizen-science'),
    (75, 'soil-health'), (76, 'groundwater'),

    -- Urban decarbonization
    (46, 'renewable-energy'), (46, 'wind-energy'), (46, 'grid-resilience'),
    (46, 'energy-storage'), (46, 'decarbonization'), (46, 'local-government'),
    (47, 'district-heating'), (47, 'heat-pumps'), (47, 'building-retrofits'),
    (48, 'district-heating'), (48, 'heat-pumps'), (49, 'district-heating'),
    (50, 'building-retrofits'), (50, 'energy-poverty'), (51, 'electric-vehicles'),
    (51, 'charging-infrastructure'), (51, 'rail'), (51, 'freight'),
    (52, 'cycling'), (52, 'walking'), (52, 'public-transit'),
    (53, 'electric-vehicles'), (53, 'charging-infrastructure'), (53, 'tenant-rights'),
    (54, 'shared-mobility'), (54, 'active-mobility'), (55, 'building-materials'),
    (55, 'adaptive-reuse'), (55, 'green-buildings'), (56, 'building-materials'),
    (57, 'green-buildings'), (57, 'public-policy'), (58, 'adaptive-reuse'),
    (58, 'circular-economy'), (59, 'carbon-removal'), (60, 'carbon-removal'),
    (61, 'carbon-removal'), (62, 'carbon-removal'), (62, 'building-materials'),
    (62, 'circular-economy'), (63, 'carbon-removal'), (63, 'resilience'),
    (64, 'small-business'), (64, 'workforce-development'), (65, 'small-business'),
    (65, 'workforce-development'), (66, 'participatory-budgeting'),
    (66, 'local-government'), (66, 'cooperatives'), (66, 'civic-tech'),
    (67, 'workforce-development'), (67, 'small-business'), (67, 'education'),

    -- Safe school travel
    (1001, 'road-safety'), (1001, 'walking'), (1001, 'active-mobility'),
    (1001, 'school-streets'), (1001, 'traffic-calming'), (1001, 'youth'),
    (1001, 'disability-inclusion'), (1002, 'school-streets'),
    (1002, 'traffic-calming'), (1002, 'local-government'), (1002, 'public-policy'),
    (1003, 'citizen-science'), (1003, 'open-data'), (1003, 'civic-tech'),
    (1003, 'education'), (1003, 'road-safety'),

    -- Heat resilience
    (1004, 'extreme-heat'), (1004, 'heat-health'), (1004, 'public-health'),
    (1004, 'climate-adaptation'), (1004, 'poverty-reduction'), (1004, 'aging'),
    (1005, 'green-infrastructure'), (1005, 'walking'), (1005, 'public-space'),
    (1005, 'nature-based-solutions'), (1006, 'heat-health'),
    (1006, 'green-buildings'), (1006, 'building-retrofits'),
    (1006, 'energy-poverty'),

    -- Digital inclusion
    (1007, 'broadband'), (1007, 'digital-inclusion'), (1007, 'digital-literacy'),
    (1007, 'education'), (1007, 'poverty-reduction'), (1008, 'broadband'),
    (1008, 'cooperatives'), (1008, 'community-organizing'),
    (1008, 'social-enterprise'), (1009, 'accessibility'),
    (1009, 'digital-literacy'), (1009, 'aging'), (1009, 'community-care'),
    (1009, 'refugee-support'),

    -- Childcare
    (1010, 'childcare'), (1010, 'gender-equity'), (1010, 'poverty-reduction'),
    (1010, 'workforce-development'), (1010, 'community-care'),
    (1011, 'cooperatives'), (1011, 'social-enterprise'), (1011, 'childcare'),
    (1012, 'public-policy'), (1012, 'childcare'), (1012, 'small-business'),

    -- Urban waterways
    (1013, 'wastewater'), (1013, 'water-quality'), (1013, 'watershed-management'),
    (1013, 'plastic-pollution'), (1013, 'environmental-justice'),
    (1013, 'sustainable-fisheries'), (1013, 'informal-settlements'),
    (1014, 'environmental-monitoring'), (1014, 'citizen-science'),
    (1014, 'open-data'), (1014, 'education'), (1015, 'wetlands'),
    (1015, 'nature-based-solutions'), (1015, 'stormwater'),
    (1015, 'flood-management'), (1015, 'ecosystem-restoration'),

    -- Mental health
    (1016, 'mental-health'), (1016, 'healthcare-access'), (1016, 'youth'),
    (1016, 'social-isolation'), (1016, 'community-care'), (1016, 'maternal-health'),
    (1017, 'mental-health'), (1017, 'community-care'),
    (1017, 'community-organizing'), (1018, 'healthcare-access'),
    (1018, 'maternal-health'), (1018, 'refugee-support'), (1018, 'public-health'),

    -- Accessible public space
    (1019, 'accessibility'), (1019, 'disability-inclusion'),
    (1019, 'universal-design'), (1019, 'public-space'), (1019, 'aging'),
    (1019, 'neighborhood-revitalization'), (1020, 'open-data'),
    (1020, 'civic-tech'), (1020, 'universal-design'),
    (1020, 'participatory-budgeting'), (1021, 'accessibility'),
    (1021, 'local-government'), (1021, 'urban-planning'),

    -- Food security and redistribution
    (1022, 'food-security'), (1022, 'food-deserts'), (1022, 'nutrition'),
    (1022, 'local-food'), (1022, 'poverty-reduction'), (1023, 'cold-chain'),
    (1023, 'solar-energy'), (1023, 'cooperatives'), (1023, 'small-business'),
    (1024, 'food-redistribution'), (1024, 'food-waste'),
    (1024, 'social-enterprise'), (1024, 'local-food'),

    -- Additional agriculture topics represented by the broader food/forest set
    (5, 'regenerative-agriculture'), (31, 'soil-regeneration'),
    (68, 'regenerative-agriculture')
)
INSERT INTO issue_tags (issue_id, tag_id)
SELECT m.issue_id, t.id
FROM tag_map m
JOIN issues i ON i.id = m.issue_id
JOIN tags t ON t.slug = m.slug
ON CONFLICT DO NOTHING;
