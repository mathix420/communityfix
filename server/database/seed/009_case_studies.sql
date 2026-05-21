-- Case studies seed: real-world implementations attached to approved solutions.
-- Each row covers one outcome bucket so the UI variants (badge colors, empty
-- states, verified flag) all get exercised by the default seed.

INSERT INTO case_studies (
  solution_id, author_id, outcome, scale,
  location_name, location, verified,
  implementer, start_date, end_date,
  description, metrics, cost, currency, funding_source,
  sources, lessons_learned, created_at, updated_at
) VALUES
-- Composting hubs in San Francisco — success, verified
(
  10, 'a0000001-0000-4000-8000-000000000001', 'success', 'city',
  'San Francisco, CA, USA', ST_SetSRID(ST_MakePoint(-122.4194, 37.7749), 4326), true,
  'San Francisco Department of the Environment', '2009-01-01', '2018-12-31',
  'San Francisco rolled out mandatory curbside composting alongside a network of neighborhood drop-off hubs. By 2018 the city was diverting over 80% of waste from landfill, with finished compost distributed to Bay Area farms and home gardeners.',
  '[
    {"label": "Landfill diversion rate", "baseline": "35%", "result": "80%", "unit": ""},
    {"label": "Annual compost produced", "baseline": "0", "result": "60,000", "unit": "tons"}
  ]'::jsonb,
  12000000, 'USD', 'Municipal budget + state grants',
  '[
    {"url": "https://sfenvironment.org/zero-waste", "title": "SF Environment — Zero Waste"},
    {"url": "https://www.epa.gov/recycle/managing-and-transforming-waste-streams-tool", "title": "EPA Waste Reduction Toolkit"}
  ]'::jsonb,
  '[
    "Curbside collection turned out to drive volume far more than drop-off hubs alone.",
    "Restaurant outreach was the single biggest lever for organic-waste capture.",
    "Contamination from non-compostable plastics required ongoing public education."
  ]'::jsonb,
  '2024-11-10T09:00:00Z', '2024-11-10T09:00:00Z'
),

-- Deposit-return scheme in Germany — success, verified
(
  11, 'a0000002-0000-4000-8000-000000000002', 'success', 'national',
  'Germany', ST_SetSRID(ST_MakePoint(10.4515, 51.1657), 4326), true,
  'Federal Government of Germany (Pfandsystem)', '2003-01-01', NULL,
  'Germany''s Pfand deposit-return system applies a 0.08–0.25 EUR deposit to most beverage containers. Return-vending machines are installed in nearly every supermarket. Return rates exceed 98% for PET and 96% for glass — among the highest in the world.',
  '[
    {"label": "PET bottle return rate", "baseline": "60%", "result": "98%", "unit": ""},
    {"label": "Glass container return rate", "baseline": "72%", "result": "96%", "unit": ""}
  ]'::jsonb,
  NULL, NULL, 'Producer-funded (extended producer responsibility)',
  '[
    {"url": "https://www.bmuv.de/en/", "title": "German Federal Ministry for the Environment"}
  ]'::jsonb,
  '[
    "A single-system national rollout avoided fragmented regional schemes.",
    "Aluminum cans were initially excluded — re-including them took a decade of legal wrangling.",
    "Informal collectors became unintended partners; some cities offered drop-off boxes to support them."
  ]'::jsonb,
  '2024-12-02T11:30:00Z', '2024-12-02T11:30:00Z'
),

-- On-demand micro-transit in Innisfil — partial
(
  15, 'a0000003-0000-4000-8000-000000000003', 'partial', 'city',
  'Innisfil, Ontario, Canada', ST_SetSRID(ST_MakePoint(-79.6111, 44.3000), 4326), false,
  'Town of Innisfil partnership with Uber', '2017-05-01', '2020-04-01',
  'Innisfil partnered with Uber to provide subsidised on-demand rides instead of building a fixed bus route. The first year saw strong adoption, but ridership growth outpaced the budget; the town later capped subsidised rides per resident.',
  '[
    {"label": "Trips per month at peak", "baseline": "0", "result": "26,700", "unit": ""},
    {"label": "Cost per trip", "baseline": "—", "result": "5.62", "unit": "CAD"}
  ]'::jsonb,
  640000, 'CAD', 'Municipal transit budget',
  '[
    {"url": "https://innisfil.ca/transit/", "title": "Innisfil Transit"}
  ]'::jsonb,
  '[
    "Without ride caps, demand grows faster than budgets even at low per-trip cost.",
    "Cross-subsidising private rideshare risks vendor lock-in for the municipality.",
    "Best as a complement to fixed routes during off-peak hours, not a wholesale replacement."
  ]'::jsonb,
  '2025-01-15T14:00:00Z', '2025-01-15T14:00:00Z'
),

-- Real-time transit open data in Helsinki — success
(
  16, 'a0000005-0000-4000-8000-000000000005', 'success', 'city',
  'Helsinki, Finland', ST_SetSRID(ST_MakePoint(24.9384, 60.1699), 4326), true,
  'Helsinki Region Transport (HSL)', '2014-01-01', NULL,
  'HSL publishes a full real-time GTFS-RT feed and open APIs for every mode. Third-party apps like Reittiopas and the multimodal Whim service were built on top. Ridership satisfaction tracked upward each year of the deployment.',
  '[
    {"label": "Real-time data coverage", "baseline": "30%", "result": "100%", "unit": ""},
    {"label": "3rd-party transit apps using API", "baseline": "3", "result": "60+", "unit": ""}
  ]'::jsonb,
  2500000, 'EUR', 'HSL operating budget',
  '[
    {"url": "https://www.hsl.fi/en/hsl/open-data", "title": "HSL Open Data"}
  ]'::jsonb,
  '[
    "Open data alone is not a product — fund a reference app to seed the ecosystem.",
    "Real-time accuracy depends on GPS hardware on the bus fleet, not just the API."
  ]'::jsonb,
  '2025-02-08T10:20:00Z', '2025-02-08T10:20:00Z'
),

-- Bus lanes pilot that failed politically — failed
(
  17, 'a0000004-0000-4000-8000-000000000004', 'failed', 'city',
  'Boston, MA, USA', ST_SetSRID(ST_MakePoint(-71.0589, 42.3601), 4326), false,
  'City of Boston (Washington Street pilot)', '2018-09-01', '2018-12-01',
  'A 3-month dedicated bus-lane pilot on Washington Street cut peak commute times by 20% and was popular with riders. The lane was discontinued after political pressure from drivers; the city later restored a permanent lane on a different corridor in 2020.',
  '[
    {"label": "Peak commute time", "baseline": "23 min", "result": "18 min", "unit": ""}
  ]'::jsonb,
  85000, 'USD', 'Municipal pilot fund',
  '[
    {"url": "https://www.boston.gov/transportation", "title": "City of Boston Transportation"}
  ]'::jsonb,
  '[
    "Operational success doesn''t translate to political durability without organised rider support.",
    "Three months is too short — opponents mobilise faster than commuters re-route their habits.",
    "Restoring the lane elsewhere required a community-engagement budget the original pilot lacked."
  ]'::jsonb,
  '2025-03-04T13:15:00Z', '2025-03-04T13:15:00Z'
),

-- Ceramic water filters in Cambodia — success, verified
(
  20, 'a0000006-0000-4000-8000-000000000006', 'success', 'region',
  'Kandal Province, Cambodia', ST_SetSRID(ST_MakePoint(105.0000, 11.5000), 4326), true,
  'Hydrologic Social Enterprise (Cambodia)', '2008-01-01', NULL,
  'Locally manufactured ceramic pot filters distributed at subsidised prices across rural Cambodia. Diarrheal disease incidence in beneficiary households dropped sharply; the program is now self-funding through filter sales.',
  '[
    {"label": "Households served", "baseline": "0", "result": "300,000+", "unit": ""},
    {"label": "Diarrheal disease incidence (children)", "baseline": "100%", "result": "54%", "unit": "(relative)"}
  ]'::jsonb,
  8, 'USD', 'Mixed: grants + filter sales',
  '[
    {"url": "https://www.hydrologichealth.com/", "title": "Hydrologic Social Enterprise"}
  ]'::jsonb,
  '[
    "Local manufacturing kept unit cost low and built community ownership.",
    "Filter replacement schedules need radio-friendly messaging, not just leaflets.",
    "Carrying-case design mattered as much as the filter itself for adoption."
  ]'::jsonb,
  '2025-04-12T08:45:00Z', '2025-04-12T08:45:00Z'
),

-- Rainwater harvesting pilot — inconclusive
(
  21, 'a0000007-0000-4000-8000-000000000007', 'inconclusive', 'neighborhood',
  'Mumbai, India (Powai pilot)', ST_SetSRID(ST_MakePoint(72.9081, 19.1197), 4326), false,
  'BMC ward office in partnership with local housing societies', '2019-06-01', '2021-06-01',
  'Twelve housing societies in Powai installed rooftop rainwater harvesting and recharge pits with municipal subsidy. Two consecutive weak monsoons made it impossible to measure aquifer impact; pilot results are not statistically meaningful.',
  '[
    {"label": "Participating buildings", "baseline": "0", "result": "12", "unit": ""},
    {"label": "Capture potential", "baseline": "—", "result": "8.4M", "unit": "litres/year"}
  ]'::jsonb,
  3500000, 'INR', 'BMC ward fund + resident contribution',
  '[
    {"url": "https://www.mcgm.gov.in/", "title": "BMC — Municipal Corporation of Mumbai"}
  ]'::jsonb,
  '[
    "Pilots tied to monsoon cycles need a 5+ year baseline before drawing conclusions.",
    "Maintenance contracts were the first thing dropped when budgets tightened — built into the design from day one next time."
  ]'::jsonb,
  '2025-05-20T16:00:00Z', '2025-05-20T16:00:00Z'
),

-- Community land trust in Burlington — success
(
  25, 'a0000008-0000-4000-8000-000000000008', 'success', 'city',
  'Burlington, VT, USA', ST_SetSRID(ST_MakePoint(-73.2121, 44.4759), 4326), true,
  'Champlain Housing Trust', '1984-01-01', NULL,
  'The Champlain Housing Trust stewards over 3,000 permanently affordable homes across the Burlington region. Resale formulas cap appreciation so units stay affordable to subsequent buyers, while owners still build wealth.',
  '[
    {"label": "Permanently-affordable homes", "baseline": "0", "result": "3,100+", "unit": ""},
    {"label": "Average homeowner equity gain", "baseline": "—", "result": "23,000", "unit": "USD"}
  ]'::jsonb,
  NULL, NULL, 'Federal HUD grants + state housing trust fund',
  '[
    {"url": "https://www.getahome.org/", "title": "Champlain Housing Trust"}
  ]'::jsonb,
  '[
    "Resale formula must balance long-term affordability against owner wealth-building, or buyers will exit.",
    "Stewardship costs scale with portfolio age — budget for capital reserves from year one."
  ]'::jsonb,
  '2025-06-08T12:00:00Z', '2025-06-08T12:00:00Z'
),

-- Community solar program — ongoing
(
  36, 'a0000001-0000-4000-8000-000000000001', 'ongoing', 'region',
  'Minnesota, USA', ST_SetSRID(ST_MakePoint(-94.6859, 46.7296), 4326), false,
  'Xcel Energy Solar*Rewards Community program', '2014-01-01', NULL,
  'Minnesota''s community solar garden program lets subscribers buy a share of an off-site solar array and receive credits on their utility bill. Over 800 MW of subscribed capacity as of 2024, with renter and low-income carve-outs.',
  '[
    {"label": "Subscribed capacity", "baseline": "0", "result": "800+", "unit": "MW"},
    {"label": "Low-income carve-out fulfilled", "baseline": "0%", "result": "12%", "unit": ""}
  ]'::jsonb,
  NULL, 'USD', 'Subscriber payments + utility credit',
  '[
    {"url": "https://mn.gov/commerce/energy/", "title": "Minnesota Department of Commerce — Energy"}
  ]'::jsonb,
  '[
    "Bill-crediting mechanics need to be transparent or subscribers churn early.",
    "Low-income participation needs explicit subscription assistance — flat carve-outs don''t fill on their own."
  ]'::jsonb,
  '2025-07-22T15:30:00Z', '2025-07-22T15:30:00Z'
),

-- Car-free zone in Pontevedra — success, verified
(
  37, 'a0000002-0000-4000-8000-000000000002', 'success', 'city',
  'Pontevedra, Galicia, Spain', ST_SetSRID(ST_MakePoint(-8.6444, 42.4310), 4326), true,
  'Concello de Pontevedra (city government)', '1999-01-01', NULL,
  'Pontevedra pedestrianised its entire historic core starting in 1999 and progressively expanded the car-free zone. CO₂ emissions in the centre dropped by 70%, traffic deaths went to zero for many consecutive years, and city-centre retail revenue grew.',
  '[
    {"label": "Centre CO₂ emissions", "baseline": "100%", "result": "30%", "unit": "(relative)"},
    {"label": "Traffic deaths in centre (annual)", "baseline": "3-5", "result": "0", "unit": ""},
    {"label": "Centre retail revenue", "baseline": "100%", "result": "115%", "unit": "(relative)"}
  ]'::jsonb,
  NULL, 'EUR', 'Municipal budget',
  '[
    {"url": "https://www.pontevedra.gal/", "title": "Concello de Pontevedra"},
    {"url": "https://www.eltis.org/", "title": "ELTIS Urban Mobility Observatory"}
  ]'::jsonb,
  '[
    "Doing it all at once was politically easier than rolling out by street — fewer cycles of opposition.",
    "Strong free public-parking belt outside the centre absorbed displaced cars.",
    "The mayor''s persistent two-decade tenure mattered — short electoral cycles would have killed the rollout."
  ]'::jsonb,
  '2025-08-14T09:00:00Z', '2025-08-14T09:00:00Z'
),

-- Retrofit accelerator pilot in NYC — partial
(
  50, 'a0000003-0000-4000-8000-000000000003', 'partial', 'city',
  'New York City, NY, USA', ST_SetSRID(ST_MakePoint(-74.0060, 40.7128), 4326), false,
  'NYC Retrofit Accelerator (Mayor''s Office of Climate)', '2015-09-01', NULL,
  'Free advisory service for building owners pursuing energy retrofits, paired with optional on-bill financing. Reached over 16,000 buildings but adoption of the on-bill financing component was lower than projected.',
  '[
    {"label": "Buildings served", "baseline": "0", "result": "16,000+", "unit": ""},
    {"label": "On-bill financing uptake (of eligible)", "baseline": "—", "result": "8%", "unit": ""}
  ]'::jsonb,
  NULL, 'USD', 'NYC capital budget + utility programs',
  '[
    {"url": "https://retrofitaccelerator.cityofnewyork.us/", "title": "NYC Retrofit Accelerator"}
  ]'::jsonb,
  '[
    "Advisory + financing in one package is more effective than either alone.",
    "Co-op boards added decision-making lead time that the original timeline didn''t account for.",
    "Contractor capacity, not demand, became the bottleneck after year two."
  ]'::jsonb,
  '2025-09-01T11:00:00Z', '2025-09-01T11:00:00Z'
),

-- Forest thinning pilot — ongoing
(
  69, 'a0000007-0000-4000-8000-000000000007', 'ongoing', 'region',
  'Vysočina Region, Czech Republic', ST_SetSRID(ST_MakePoint(15.6000, 49.4500), 4326), false,
  'Czech State Forests (Lesy ČR), Vysočina branch', '2022-04-01', NULL,
  'Selective thinning of dense spruce monocultures to reduce drought stress and bark-beetle outbreak severity. Three-year monitoring is underway; preliminary readings show treated stands retaining 12% higher soil moisture than controls.',
  '[
    {"label": "Treated area", "baseline": "0", "result": "1,200", "unit": "hectares"},
    {"label": "Soil moisture vs control", "baseline": "0", "result": "+12%", "unit": ""}
  ]'::jsonb,
  4200000, 'CZK', 'State forestry budget + EU recovery fund',
  '[
    {"url": "https://lesycr.cz/", "title": "Lesy ČR"}
  ]'::jsonb,
  '[
    "Don''t equate ''thinning'' with ''logging'' in public messaging — the framing affects permitting timelines.",
    "Bark-beetle monitoring needs to span at least two summer cycles before drawing conclusions."
  ]'::jsonb,
  '2025-10-30T14:00:00Z', '2025-10-30T14:00:00Z'
);

-- Sanity check counter (mirrors the votes pattern in 006_votes.sql)
SELECT COUNT(*) AS case_studies_seeded FROM case_studies;
