-- ── Top-level issues ──────────────────────────────────────────

INSERT INTO issues (id, title, description, detailed_description, author_id, author_name, solution_count, sub_issue_count, status, type, created_at, updated_at) VALUES
  (1, 'Reduce household waste',
   'Every year, millions of tons of waste end up in landfills. We need innovative solutions to reduce household waste and promote recycling.',
   'The average household generates over 4 pounds of waste per day, with less than 35% being recycled or composted. Landfills are reaching capacity in many regions, and incineration creates air quality concerns. Tackling this requires rethinking packaging, making recycling more accessible, and building composting infrastructure. Community-driven approaches have shown promise in cities like San Francisco and Kamikatsu, Japan, which have achieved near-zero-waste goals through comprehensive programs.',
   'a0000001-0000-4000-8000-000000000001', 'Sarah Chen',
   3, 3, 'approved', 'issue',
   '2025-09-01T10:00:00.000Z', '2025-09-01T10:00:00.000Z'),

  (2, 'Improve local public transport',
   'Our public transport system is outdated and inefficient. We need ideas to enhance its reliability and accessibility for all residents.',
   'Many cities suffer from underfunded public transit that fails to connect suburbs, has unreliable schedules, and lacks accessibility features. This pushes residents toward car dependency, increasing congestion, emissions, and costs for low-income households who can least afford alternatives. Successful transit systems like those in Zurich, Seoul, and Curitiba show that political will combined with smart design can create networks people actually prefer over driving.',
   'a0000002-0000-4000-8000-000000000002', 'Marcus Johnson',
   3, 2, 'approved', 'issue',
   '2025-09-05T14:30:00.000Z', '2025-09-05T14:30:00.000Z'),

  (3, 'Cheaper access to clean water',
   'Access to clean water is a basic human right. We need to find ways to make it more affordable and accessible for every community.',
   'Globally, 2 billion people lack safely managed drinking water, and even in developed countries, aging infrastructure leads to contamination events like the Flint water crisis. Rural communities and low-income neighborhoods are disproportionately affected. Solutions range from decentralized filtration to rainwater harvesting, but the core challenge is funding infrastructure upgrades while keeping water bills affordable for the most vulnerable populations.',
   'a0000003-0000-4000-8000-000000000003', 'Amara Okafor',
   2, 2, 'approved', 'issue',
   '2025-09-10T08:15:00.000Z', '2025-09-10T08:15:00.000Z'),

  (4, 'Affordable housing solutions',
   'Housing prices are skyrocketing, making it difficult for many to find affordable places to live. We need creative solutions to this crisis.',
   'In major cities worldwide, housing costs consume over 50% of income for low- and middle-income households. The causes are multifaceted: restrictive zoning, rising construction costs, speculative investment, and the conversion of long-term rentals to short-term vacation listings. Without intervention, essential workers—teachers, nurses, service workers—are being pushed further from the communities they serve, increasing commute times and reducing quality of life.',
   'a0000004-0000-4000-8000-000000000004', 'Leo Martinez',
   3, 3, 'approved', 'issue',
   '2025-09-15T11:00:00.000Z', '2025-09-15T11:00:00.000Z'),

  (5, 'Accessible hydroponics systems',
   'Hydroponics can revolutionize urban farming, but current systems are too expensive and complex for most people. We need affordable, beginner-friendly solutions.',
   'Hydroponic growing uses up to 90% less water than traditional agriculture and can produce food year-round in any climate. However, commercial systems cost thousands of dollars, and the technical knowledge required creates a steep learning curve. Making hydroponics accessible could transform food deserts, reduce transportation emissions from food supply chains, and give communities more control over their food security.',
   'a0000005-0000-4000-8000-000000000005', 'Priya Sharma',
   2, 2, 'approved', 'issue',
   '2025-09-20T16:45:00.000Z', '2025-09-20T16:45:00.000Z'),

  (6, 'Curbing greenhouse gas emissions',
   'Climate change is accelerating. We need actionable, community-level ideas to reduce greenhouse gas emissions where we live and work.',
   'While international agreements set broad targets, actual emissions reductions happen at the local level—in buildings, transportation networks, and industrial facilities. Cities account for over 70% of global CO2 emissions. Many municipalities lack the tools, funding, or political frameworks to act decisively. Community-driven approaches can fill this gap by creating accountability, piloting innovative solutions, and building public support for larger policy changes.',
   'a0000006-0000-4000-8000-000000000006', 'James Whitfield',
   4, 3, 'approved', 'issue',
   '2025-09-25T09:30:00.000Z', '2025-09-25T09:30:00.000Z')
ON CONFLICT DO NOTHING;

-- ── Sub-issues for "Reduce household waste" (parent_id = 1) ──

INSERT INTO issues (id, parent_id, title, description, author_id, author_name, solution_count, sub_issue_count, status, type, created_at, updated_at) VALUES
  (7, 1, 'Lack of accessible recycling infrastructure',
   'Many neighborhoods have no curbside recycling, and drop-off centers are too far away for people without cars. This makes even willing residents unable to recycle effectively.',
   'a0000002-0000-4000-8000-000000000002', 'Marcus Johnson',
   0, 0, 'approved', 'issue',
   '2025-09-08T12:00:00.000Z', '2025-09-08T12:00:00.000Z'),

  (8, 1, 'Single-use plastic alternatives are too expensive',
   'Reusable and biodegradable alternatives exist but cost 3-5x more than plastic equivalents. For families on tight budgets, choosing sustainable options is a luxury they cannot afford.',
   'a0000003-0000-4000-8000-000000000003', 'Amara Okafor',
   0, 0, 'approved', 'issue',
   '2025-09-12T15:20:00.000Z', '2025-09-12T15:20:00.000Z'),

  (9, 1, 'Low awareness of composting in urban areas',
   'Most urban residents don''t know how to compost or think it requires a backyard. Apartment dwellers especially lack options and knowledge about indoor composting methods like vermicomposting or bokashi.',
   'a0000005-0000-4000-8000-000000000005', 'Priya Sharma',
   0, 0, 'approved', 'issue',
   '2025-09-18T09:45:00.000Z', '2025-09-18T09:45:00.000Z')
ON CONFLICT DO NOTHING;

-- ── Solutions for "Reduce household waste" (parent_id = 1) ──

INSERT INTO issues (id, parent_id, title, description, author_id, author_name, solution_count, sub_issue_count, status, type, created_at, updated_at) VALUES
  (10, 1, 'Community composting hubs in every neighborhood',
   'Set up shared composting stations in parks, community gardens, or parking lots. Residents drop off food scraps and yard waste, and the finished compost is available free to local gardeners. Cities like Portland and Copenhagen have proven this model works at scale.',
   'a0000004-0000-4000-8000-000000000004', 'Leo Martinez',
   0, 0, 'approved', 'solution',
   '2025-09-15T10:30:00.000Z', '2025-09-15T10:30:00.000Z'),

  (11, 1, 'Deposit-return scheme for all packaging',
   'Expand bottle deposit programs to cover all consumer packaging—cans, bottles, cartons, and containers. A small refundable deposit (10-25 cents) creates a financial incentive to return packaging for recycling rather than tossing it in the trash.',
   'a0000007-0000-4000-8000-000000000007', 'Yuki Tanaka',
   0, 0, 'approved', 'solution',
   '2025-09-22T14:00:00.000Z', '2025-09-22T14:00:00.000Z'),

  (12, 1, 'Municipal zero-waste starter kits',
   'Cities distribute free starter kits to households containing reusable bags, a countertop compost bin, a recycling guide for the local system, and coupons for refill stores. Lowers the barrier to entry and makes the first step easy.',
   'a0000008-0000-4000-8000-000000000008', 'Elena Popescu',
   0, 0, 'approved', 'solution',
   '2025-10-01T11:15:00.000Z', '2025-10-01T11:15:00.000Z')
ON CONFLICT DO NOTHING;

-- ── Sub-issues for "Improve local public transport" (parent_id = 2) ──

INSERT INTO issues (id, parent_id, title, description, author_id, author_name, solution_count, sub_issue_count, status, type, created_at, updated_at) VALUES
  (13, 2, 'Bus routes don''t serve suburban neighborhoods',
   'Suburban residents often live more than a mile from the nearest bus stop, making transit impractical for daily commuting. Routes are designed around downtown corridors, ignoring the suburb-to-suburb trips that most people actually make.',
   'a0000001-0000-4000-8000-000000000001', 'Sarah Chen',
   0, 0, 'approved', 'issue',
   '2025-09-12T08:30:00.000Z', '2025-09-12T08:30:00.000Z'),

  (14, 2, 'Unreliable schedules and frequent delays',
   'Buses and trains regularly run 10-20 minutes late, making it impossible to plan trips reliably. Without real-time information, riders are left waiting at stops with no idea when their bus will arrive, pushing people back to cars.',
   'a0000006-0000-4000-8000-000000000006', 'James Whitfield',
   0, 0, 'approved', 'issue',
   '2025-09-18T17:00:00.000Z', '2025-09-18T17:00:00.000Z')
ON CONFLICT DO NOTHING;

-- ── Solutions for "Improve local public transport" (parent_id = 2) ──

INSERT INTO issues (id, parent_id, title, description, author_id, author_name, solution_count, sub_issue_count, status, type, created_at, updated_at) VALUES
  (15, 2, 'On-demand micro-transit for underserved areas',
   'Deploy small shuttle vans that operate on flexible routes within suburban zones. Riders request pickups via an app, and an algorithm optimizes routes in real-time. This model (used by Via, ArrivaClick) fills gaps where fixed routes are inefficient.',
   'a0000005-0000-4000-8000-000000000005', 'Priya Sharma',
   0, 0, 'approved', 'solution',
   '2025-09-20T13:00:00.000Z', '2025-09-20T13:00:00.000Z'),

  (16, 2, 'Real-time tracking and open data for transit',
   'Require transit agencies to publish real-time vehicle positions using the GTFS-realtime standard. This enables accurate arrival predictions in apps like Google Maps and Transit, and lets the community build tools to hold agencies accountable for on-time performance.',
   'a0000004-0000-4000-8000-000000000004', 'Leo Martinez',
   0, 0, 'approved', 'solution',
   '2025-09-28T10:00:00.000Z', '2025-09-28T10:00:00.000Z'),

  (17, 2, 'Dedicated bus lanes on major corridors',
   'Paint and enforce dedicated bus-only lanes on the busiest corridors. This simple infrastructure change can cut bus travel times by 30-50% and dramatically improve reliability, as shown by BRT systems in Bogota, Istanbul, and Brisbane.',
   'a0000003-0000-4000-8000-000000000003', 'Amara Okafor',
   0, 0, 'approved', 'solution',
   '2025-10-05T15:30:00.000Z', '2025-10-05T15:30:00.000Z')
ON CONFLICT DO NOTHING;

-- ── Sub-issues for "Cheaper access to clean water" (parent_id = 3) ──

INSERT INTO issues (id, parent_id, title, description, author_id, author_name, solution_count, sub_issue_count, status, type, created_at, updated_at) VALUES
  (18, 3, 'Aging water infrastructure causes contamination',
   'Many cities still use lead pipes and decades-old treatment facilities. Replacing this infrastructure costs billions, but delays mean continued exposure to contaminants like lead, PFAS, and bacteria for millions of residents.',
   'a0000008-0000-4000-8000-000000000008', 'Elena Popescu',
   0, 0, 'approved', 'issue',
   '2025-09-18T11:30:00.000Z', '2025-09-18T11:30:00.000Z'),

  (19, 3, 'Rural communities lack water treatment facilities',
   'Small towns and rural areas often rely on private wells or minimal treatment systems. They lack the tax base to fund modern treatment plants, leaving residents vulnerable to agricultural runoff, natural contaminants, and drought.',
   'a0000006-0000-4000-8000-000000000006', 'James Whitfield',
   0, 0, 'approved', 'issue',
   '2025-09-25T14:15:00.000Z', '2025-09-25T14:15:00.000Z')
ON CONFLICT DO NOTHING;

-- ── Solutions for "Cheaper access to clean water" (parent_id = 3) ──

INSERT INTO issues (id, parent_id, title, description, author_id, author_name, solution_count, sub_issue_count, status, type, created_at, updated_at) VALUES
  (20, 3, 'Low-cost ceramic water filters for households',
   'Distribute locally-manufactured ceramic pot filters that cost under $10 and last 2-3 years. These filters remove 99.9% of bacteria and are already used successfully across Southeast Asia and Central America. Pair with a community education program on maintenance.',
   'a0000001-0000-4000-8000-000000000001', 'Sarah Chen',
   0, 0, 'approved', 'solution',
   '2025-10-02T09:00:00.000Z', '2025-10-02T09:00:00.000Z'),

  (21, 3, 'Rainwater harvesting programs with municipal support',
   'Provide subsidies and free installation for rooftop rainwater collection systems. Harvested water can be used for irrigation and, with simple treatment, for non-potable household use. Reduces demand on the municipal supply and lowers water bills.',
   'a0000002-0000-4000-8000-000000000002', 'Marcus Johnson',
   0, 0, 'approved', 'solution',
   '2025-10-08T16:00:00.000Z', '2025-10-08T16:00:00.000Z')
ON CONFLICT DO NOTHING;

-- ── Sub-issues for "Affordable housing solutions" (parent_id = 4) ──

INSERT INTO issues (id, parent_id, title, description, author_id, author_name, solution_count, sub_issue_count, status, type, created_at, updated_at) VALUES
  (22, 4, 'Zoning laws restrict high-density development',
   'Single-family zoning in most residential areas makes it illegal to build duplexes, triplexes, or small apartment buildings. This artificial scarcity drives up land costs and forces new construction to sprawl outward rather than building up in existing neighborhoods.',
   'a0000007-0000-4000-8000-000000000007', 'Yuki Tanaka',
   0, 0, 'approved', 'issue',
   '2025-09-22T10:00:00.000Z', '2025-09-22T10:00:00.000Z'),

  (23, 4, 'Construction costs are rising faster than wages',
   'Material costs, labor shortages, and regulatory compliance have pushed the cost of building a new housing unit up by 30-40% in the last decade. Traditional construction methods are slow and expensive, pricing out affordable development.',
   'a0000002-0000-4000-8000-000000000002', 'Marcus Johnson',
   0, 0, 'approved', 'issue',
   '2025-09-28T13:45:00.000Z', '2025-09-28T13:45:00.000Z'),

  (24, 4, 'Short-term rentals reduce housing supply',
   'Platforms like Airbnb have converted thousands of long-term rental units into vacation properties. In tourist-heavy cities, entire apartment buildings sit empty most of the year while locals compete for the remaining housing stock.',
   'a0000005-0000-4000-8000-000000000005', 'Priya Sharma',
   0, 0, 'approved', 'issue',
   '2025-10-03T08:30:00.000Z', '2025-10-03T08:30:00.000Z')
ON CONFLICT DO NOTHING;

-- ── Solutions for "Affordable housing solutions" (parent_id = 4) ──

INSERT INTO issues (id, parent_id, title, description, author_id, author_name, solution_count, sub_issue_count, status, type, created_at, updated_at) VALUES
  (25, 4, 'Community land trusts to keep housing affordable permanently',
   'Create community land trusts (CLTs) where a nonprofit owns the land and residents own the buildings. When homes are resold, price caps ensure they remain affordable for the next buyer. Over 250 CLTs in the US have proven this model preserves affordability across generations.',
   'a0000003-0000-4000-8000-000000000003', 'Amara Okafor',
   0, 0, 'approved', 'solution',
   '2025-10-05T11:00:00.000Z', '2025-10-05T11:00:00.000Z'),

  (26, 4, 'Modular prefab construction to cut building costs',
   'Factory-built modular housing units can be produced 30-50% faster and 10-20% cheaper than traditional construction. Units are built in controlled environments (no weather delays), transported to site, and assembled in days. Companies like Factory OS and Katerra have demonstrated this at scale.',
   'a0000001-0000-4000-8000-000000000001', 'Sarah Chen',
   0, 0, 'approved', 'solution',
   '2025-10-10T14:30:00.000Z', '2025-10-10T14:30:00.000Z'),

  (27, 4, 'Inclusionary zoning requiring affordable units',
   'Require that new residential developments above a certain size include 15-20% affordable units. Developers can alternatively pay into an affordable housing fund. Cities like Montreal, New York, and London use this approach to ensure new construction contributes to affordability rather than displacing it.',
   'a0000008-0000-4000-8000-000000000008', 'Elena Popescu',
   0, 0, 'approved', 'solution',
   '2025-10-15T09:15:00.000Z', '2025-10-15T09:15:00.000Z')
ON CONFLICT DO NOTHING;

-- ── Sub-issues for "Accessible hydroponics systems" (parent_id = 5) ──

INSERT INTO issues (id, parent_id, title, description, author_id, author_name, solution_count, sub_issue_count, status, type, created_at, updated_at) VALUES
  (28, 5, 'High initial setup costs for home systems',
   'A basic home hydroponic system costs $200-500, and a serious setup runs $1,000+. For families in food deserts who would benefit most, this upfront cost is prohibitive even though the long-term savings on groceries are significant.',
   'a0000004-0000-4000-8000-000000000004', 'Leo Martinez',
   0, 0, 'approved', 'issue',
   '2025-09-28T15:00:00.000Z', '2025-09-28T15:00:00.000Z'),

  (29, 5, 'Lack of educational resources for beginners',
   'Most hydroponics content online is targeted at commercial growers or experienced hobbyists. Beginners face jargon-heavy guides, conflicting advice, and no local support. Without hands-on learning opportunities, people give up after their first failed crop.',
   'a0000008-0000-4000-8000-000000000008', 'Elena Popescu',
   0, 0, 'approved', 'issue',
   '2025-10-05T12:30:00.000Z', '2025-10-05T12:30:00.000Z')
ON CONFLICT DO NOTHING;

-- ── Solutions for "Accessible hydroponics systems" (parent_id = 5) ──

INSERT INTO issues (id, parent_id, title, description, author_id, author_name, solution_count, sub_issue_count, status, type, created_at, updated_at) VALUES
  (30, 5, 'Open-source DIY hydroponics kits',
   'Design and publish open-source plans for hydroponic systems built from common hardware store materials (PVC pipes, plastic bins, aquarium pumps). Total cost under $50. Include step-by-step video tutorials and a community forum for troubleshooting. Projects like OpenAg and Farmbot have shown open-source agriculture works.',
   'a0000007-0000-4000-8000-000000000007', 'Yuki Tanaka',
   0, 0, 'approved', 'solution',
   '2025-10-08T10:00:00.000Z', '2025-10-08T10:00:00.000Z'),

  (31, 5, 'School and community center hydroponic gardens',
   'Install demonstration hydroponic gardens in schools and community centers. These serve as hands-on learning labs where residents can learn techniques, take home seedlings, and get ongoing mentorship. The produce supplements school lunch programs or community food banks.',
   'a0000006-0000-4000-8000-000000000006', 'James Whitfield',
   0, 0, 'approved', 'solution',
   '2025-10-12T16:00:00.000Z', '2025-10-12T16:00:00.000Z')
ON CONFLICT DO NOTHING;

-- ── Sub-issues for "Curbing greenhouse gas emissions" (parent_id = 6) ──

INSERT INTO issues (id, parent_id, title, description, author_id, author_name, solution_count, sub_issue_count, status, type, created_at, updated_at) VALUES
  (32, 6, 'Industrial emissions lack local accountability',
   'Factories and industrial facilities are regulated at the state or federal level, but local communities bear the health and environmental burden. Residents near industrial zones have limited visibility into what is being emitted and no mechanism to demand reductions.',
   'a0000001-0000-4000-8000-000000000001', 'Sarah Chen',
   0, 0, 'approved', 'issue',
   '2025-10-01T08:00:00.000Z', '2025-10-01T08:00:00.000Z'),

  (33, 6, 'Buildings account for significant energy waste',
   'Residential and commercial buildings account for nearly 40% of energy consumption. Most existing buildings have poor insulation, outdated HVAC systems, and no smart energy management. Retrofitting is expensive, and landlords have little incentive when tenants pay the energy bills.',
   'a0000002-0000-4000-8000-000000000002', 'Marcus Johnson',
   0, 0, 'approved', 'issue',
   '2025-10-06T11:30:00.000Z', '2025-10-06T11:30:00.000Z'),

  (34, 6, 'Transportation sector relies heavily on fossil fuels',
   'Personal vehicles and freight trucks run almost entirely on gasoline and diesel. Even as EV adoption grows, charging infrastructure is sparse outside wealthy urban areas, and public transit electrification is slow due to budget constraints.',
   'a0000005-0000-4000-8000-000000000005', 'Priya Sharma',
   0, 0, 'approved', 'issue',
   '2025-10-10T14:00:00.000Z', '2025-10-10T14:00:00.000Z')
ON CONFLICT DO NOTHING;

-- ── Solutions for "Curbing greenhouse gas emissions" (parent_id = 6) ──

INSERT INTO issues (id, parent_id, title, description, author_id, author_name, solution_count, sub_issue_count, status, type, created_at, updated_at) VALUES
  (35, 6, 'Mandatory building energy audits and retrofits',
   'Require energy audits for all buildings at point of sale or lease renewal. Buildings below a minimum efficiency rating must complete retrofits within 3 years, with low-interest municipal loans available. New York City''s Local Law 97 is a model—it sets emissions caps for large buildings with escalating penalties.',
   'a0000003-0000-4000-8000-000000000003', 'Amara Okafor',
   0, 0, 'approved', 'solution',
   '2025-10-12T09:00:00.000Z', '2025-10-12T09:00:00.000Z'),

  (36, 6, 'Community solar programs for renters and low-income households',
   'Build shared solar arrays on public land or rooftops and allow residents to subscribe for a share of the energy produced. Subscribers get credits on their electricity bills without needing to own property or install panels. Programs in Minnesota and Colorado have enrolled thousands of low-income households.',
   'a0000004-0000-4000-8000-000000000004', 'Leo Martinez',
   0, 0, 'approved', 'solution',
   '2025-10-18T13:30:00.000Z', '2025-10-18T13:30:00.000Z'),

  (37, 6, 'Car-free zones in city centers',
   'Permanently close select downtown streets to private vehicles, converting them to pedestrian plazas, bike lanes, and transit-only corridors. This reduces emissions directly while making walking, cycling, and transit more attractive. Cities like Oslo, Barcelona (superblocks), and Ghent have seen air quality improvements and increased retail activity.',
   'a0000007-0000-4000-8000-000000000007', 'Yuki Tanaka',
   0, 0, 'approved', 'solution',
   '2025-10-22T10:45:00.000Z', '2025-10-22T10:45:00.000Z'),

  (38, 6, 'Local carbon offset marketplace for small businesses',
   'Create a municipal platform where small businesses can purchase verified local carbon offsets—tree planting, building retrofits, methane capture from waste facilities. Keeps offset dollars in the community and creates local green jobs. Businesses get a visible "climate-positive" certification to display.',
   'a0000008-0000-4000-8000-000000000008', 'Elena Popescu',
   0, 0, 'approved', 'solution',
   '2025-10-28T15:00:00.000Z', '2025-10-28T15:00:00.000Z')
ON CONFLICT DO NOTHING;

-- ── Top-level issue: Forest Dieback Crisis ────────────────────

INSERT INTO issues (id, title, description, detailed_description, author_id, author_name, solution_count, sub_issue_count, status, type, location_name, scale, created_at, updated_at) VALUES
  (39, 'Forest Dieback Crisis',
   'Forests across Europe and beyond are experiencing accelerating decline driven by climate change. Drought, rising temperatures, insect epidemics, and fungal diseases are killing trees at unprecedented rates across multiple species, turning forests from carbon sinks into carbon emitters.',
   'Forest dieback is no longer a localized or temporary phenomenon. Since the late 2010s, repeated heatwaves and drought episodes have weakened trees across vast areas, triggering cascading effects: insect populations explode in stressed forests, fungal pathogens spread faster, and tree mortality outpaces natural regeneration.

The consequences are systemic. Timber economies that sustain rural communities are collapsing as salvage wood floods markets at depressed prices. Biodiversity is declining as habitats disappear. Soil erosion increases on deforested slopes. And critically, forests that once absorbed atmospheric CO₂ are now releasing it, accelerating the very climate change that is causing their decline.

This issue brings together communities worldwide who are witnessing forest dieback in their regions. By sharing observations, data, and solutions across borders, we can learn faster and act more effectively than any single region working alone.',
   'a0000001-0000-4000-8000-000000000001', 'Sarah Chen',
   0, 3, 'approved', 'issue',
   NULL, 'global',
   '2026-03-15T09:00:00.000Z', '2026-03-15T09:00:00.000Z')
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  detailed_description = EXCLUDED.detailed_description,
  location_name = EXCLUDED.location_name,
  scale = EXCLUDED.scale,
  sub_issue_count = EXCLUDED.sub_issue_count,
  status = EXCLUDED.status;

-- ── Sub-issues for "Forest Dieback Crisis" (parent_id = 39) ──

INSERT INTO issues (id, parent_id, title, description, detailed_description, author_id, author_name, solution_count, sub_issue_count, status, type, location_name, scale, created_at, updated_at) VALUES
  (40, 39, 'Drought-Induced Forest Decline',
   'Prolonged and recurring drought is weakening forests globally, depriving trees of the water they need to grow, defend themselves against pests, and survive heatwaves. It is the foundational stress factor behind most forest dieback crises.',
   'Trees depend on soil moisture to photosynthesize, grow, and regulate their temperature through transpiration. When drought persists over multiple seasons, trees shut down gas exchange to conserve water, but this also stops growth and cooling. Prolonged stress leads to branch dieback, canopy thinning, and eventually death.

Drought also lowers trees'' chemical defenses, making them easy targets for bark beetles, fungi, and other opportunistic pathogens. In many regions, the combination of drought and secondary attackers is far more destructive than either factor alone.

The severity of drought-induced decline varies by region depending on local geology, soil type, groundwater access, and tree species composition. Regional sub-issues below document specific local conditions and invite solutions tailored to each context.',
   'a0000003-0000-4000-8000-000000000003', 'Amara Okafor',
   4, 1, 'approved', 'issue',
   NULL, 'global',
   '2026-03-16T10:00:00.000Z', '2026-03-16T10:00:00.000Z'),

  (42, 39, 'Bark Beetle Epidemic in Spruce Forests',
   'Bark beetles have reached epidemic levels in drought-stressed spruce forests across multiple regions. These insects exploit weakened trees, bore under the bark, block sap circulation, and can kill a tree within weeks. Infestations spread rapidly and overwhelm management capacity.',
   'Under normal conditions, healthy spruce trees can repel bark beetles by flooding bore holes with resin. But when trees are weakened by drought, sap pressure drops and this defense fails. Beetle populations then explode: each generation produces hundreds of offspring, and in warm conditions multiple generations can emerge in a single year.

Once populations cross an epidemic threshold, beetles can successfully attack even healthy trees through sheer numbers. The result is rapid, landscape-scale mortality. Forest managers respond by felling and removing infested trees as fast as possible to slow the spread, but the pace of infestation often outstrips their capacity.

The economic damage is severe. Beetle-damaged timber is lower quality and sells at steep discounts, while the sheer volume of salvage wood flooding the market depresses prices further. Communal forests that depend on timber revenue face serious budget shortfalls.

Natural predators — woodpeckers, parasitoid wasps, and predatory beetles — can help control populations over time, but they typically lag behind the initial explosion by several years.',
   'a0000006-0000-4000-8000-000000000006', 'James Whitfield',
   0, 1, 'approved', 'issue',
   NULL, 'global',
   '2026-03-17T11:00:00.000Z', '2026-03-17T11:00:00.000Z'),

  (44, 39, 'Beech and Ash Dieback from Climate Stress',
   'Beech and ash trees — historically dominant in many European forests — are in widespread decline. Drought weakens them while fungal pathogens (nectria on beech, chalara/ash dieback on ash) deliver the killing blow. The loss of these species is transforming forest landscapes and ecosystems.',
   'Beech and ash have long been pillars of temperate European forests, valued for their timber, their ecological role, and their contribution to landscape character. But both species are proving highly sensitive to the new climate regime of hotter, drier summers.

Drought-stressed beeches become vulnerable to nectria, a fungal infection that causes bark cankers and crown dieback. Ash trees face a double threat: drought stress compounded by chalara (Hymenoscyphus fraxineus), an invasive fungal pathogen from East Asia that has swept across Europe since the 2000s, causing massive ash dieback with no known cure.

The loss of these species has cascading effects. Beech and ash forests support distinct communities of insects, birds, fungi, mosses, and understory plants. Their disappearance changes soil chemistry, light conditions, and water cycling on the forest floor. Replacing them requires careful selection of alternative species suited to future climate conditions — a process that takes decades.',
   'a0000005-0000-4000-8000-000000000005', 'Priya Sharma',
   0, 1, 'approved', 'issue',
   NULL, 'global',
   '2026-03-18T14:00:00.000Z', '2026-03-18T14:00:00.000Z')
ON CONFLICT DO NOTHING;

-- ── Regional sub-issues (Sundgau, Grand Est, Metropolitan France) ──────────

INSERT INTO issues (id, parent_id, title, description, detailed_description, author_id, author_name, solution_count, sub_issue_count, status, type, location_name, location, scale, created_at, updated_at) VALUES
  (41, 40, 'Drought-Induced Forest Decline',
   'The Sundgau region in southern Alsace is especially vulnerable to drought because it does not sit above the main Alsatian groundwater table. Its forests and water supplies depend almost entirely on rainfall, which has been repeatedly deficient since 2018.',
   'Unlike the Rhine plain to the north, the Sundgau''s hills and the Jura alsacien rely on small, slow-recharging aquifers fed by surface infiltration. When rainfall drops, the impact is felt quickly and deeply — both by forests and by human communities.

In 2023, the commune of Waldighoffen was placed under reinforced drought alert, and the town of Ferrette had to be supplied with drinking water by tanker trucks after local sources ran dry. Forest trees across the area have suffered visible canopy loss, branch dieback, and mortality. ONF foresters have described feeling powerless in the face of a problem that cannot be solved by forestry techniques alone — as one put it, you cannot irrigate an entire forest.

As of early 2026, winter groundwater recharge in the Sundgau has been deficient, and summer water levels are projected to be significantly lower than in 2025. Without structural changes to how water is retained and managed in the landscape, the forests will continue to decline with each dry summer.',
   'a0000004-0000-4000-8000-000000000004', 'Leo Martinez',
   2, 0, 'approved', 'issue',
   'Sundgau, Grand Est, Metropolitan France', ST_SetSRID(ST_MakePoint(7.2541, 47.6413), 4326), 'region',
   '2026-03-19T08:30:00.000Z', '2026-03-19T08:30:00.000Z')
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title;

INSERT INTO issues (id, parent_id, title, description, detailed_description, author_id, author_name, solution_count, sub_issue_count, status, type, location_name, location, scale, created_at, updated_at) VALUES
  (43, 42, 'Bark Beetle Epidemic in Spruce Forests',
   'The Grand Est region experienced an unprecedented bark beetle explosion starting in 2018, with three simultaneous generations emerging in a single season. Spruce stands across the Sundgau and surrounding areas have been devastated, with entire plantations lost.',
   'In 2018, the combination of record drought and warm temperatures triggered something foresters in the region had never seen: three generations of bark beetles active at the same time. The ONF estimated 400,000 cubic meters of spruce were attacked in the Grand Est that year alone. By early 2019, roughly half of all spruce in France showed signs of beetle damage, compared to a normal rate of about 15%.

In communal forests like Lutzelhouse and Altkirch, no healthy timber has been harvested in years — only beetle-damaged salvage wood, which sells for 20–25% less than normal. The market has become saturated, and finding buyers is increasingly difficult. The entire Erlenwald spruce stand near Altkirch has been completely lost.

As of 2025, the epidemic has shown signs of receding thanks to natural predators catching up. But experts warn that any warm, dry spring could trigger a new wave. The fundamental vulnerability remains as long as drought continues to stress the surviving trees.',
   'a0000007-0000-4000-8000-000000000007', 'Yuki Tanaka',
   0, 0, 'approved', 'issue',
   'Sundgau, Grand Est, Metropolitan France', ST_SetSRID(ST_MakePoint(7.2541, 47.6413), 4326), 'region',
   '2026-03-20T10:00:00.000Z', '2026-03-20T10:00:00.000Z')
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title;

INSERT INTO issues (id, parent_id, title, description, detailed_description, author_id, author_name, solution_count, sub_issue_count, status, type, location_name, location, scale, created_at, updated_at) VALUES
  (45, 44, 'Beech and Ash Dieback',
   'The Sundgau''s beech forests, a defining feature of the local landscape growing on characteristic clay soils, are in serious decline. A 2023 study documented widespread beech dieback specifically on Sundgau soils, and ash trees are simultaneously being destroyed by chalara disease.',
   'Beech has historically thrived on the heavy clay soils of the Sundgau, forming the backbone of many communal forests. But these same soils, which retain water in wet periods, can become extremely hard and impenetrable when dry — cutting off tree roots from moisture during drought.

The town of Altkirch has reported that beech, ash, and spruce are the hardest-hit species in its communal forests. The combination of repeated drought, warm winters that fail to kill off pathogens, and fungal infections has created a situation where the most common local tree species are all declining simultaneously. Foresters are harvesting weakened beech and ash preemptively — particularly along paths and roads for public safety — while trying to preserve some dead wood for biodiversity.

The ONF is currently testing replacement species in the Grand Est, with oak and cedar among the leading candidates, alongside dozens of other species. But transitioning from beech-dominated forests to diverse mixed stands is a generational project, and there is still uncertainty about which species will thrive under future climate conditions on Sundgau soils specifically.',
   'a0000008-0000-4000-8000-000000000008', 'Elena Popescu',
   0, 0, 'approved', 'issue',
   'Sundgau, Grand Est, Metropolitan France', ST_SetSRID(ST_MakePoint(7.2541, 47.6413), 4326), 'region',
   '2026-03-21T13:00:00.000Z', '2026-03-21T13:00:00.000Z')
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title;

-- ── Urban Carbon Neutrality (top-level issue 46) ──────────────────────────

INSERT INTO issues (id, title, description, detailed_description, author_id, author_name, solution_count, sub_issue_count, status, type, scale, created_at, updated_at) VALUES
  (46, 'Urban Carbon Neutrality',
   'Cities worldwide are committing to carbon neutrality, but the gap between political targets and physical reality is vast. Decarbonizing urban heating, transport, construction, and waste systems within a generation requires coordinated action across sectors that have never worked together at this speed.',
   'Over 280 cities globally have adopted net-zero targets, and cities account for over 70% of global CO2 emissions. Achieving carbon neutrality requires simultaneous transformation of building heating systems, transport networks, construction practices, and waste management — each on its own a multi-billion-dollar infrastructure challenge.

The "last mile" problem is universal: even with aggressive reductions, 5–15% of urban emissions remain from hard-to-abate sectors like waste incineration and industrial processes. These residual emissions must be offset through negative emission technologies — carbon capture, direct air capture, or mineralization — that are expensive, unproven at scale, and carry the risk of becoming an excuse to delay real reductions.

Copenhagen''s experience is a cautionary tale: the city abandoned its 2025 carbon neutrality target after its entire strategy collapsed when CCS at the Amager Bakke waste-to-energy plant proved infeasible. The lesson is clear — cities must diversify their approaches rather than betting on a single technology.

Beyond direct emissions, consumption-based (Scope 3) accounting reveals that wealthy cities import far more carbon in goods and services than they produce locally. A small, service-oriented city may look clean on paper while its residents'' consumption generates massive emissions elsewhere.

The economic dimension is equally challenging: total investment requirements typically run into the billions, SMEs lack resources to navigate the transition, and skilled workers for heat pump installation, building retrofits, and EV infrastructure are in critically short supply. Without programs that carry small businesses and vulnerable populations along, the political coalition for climate action can fracture.',
   'a0000001-0000-4000-8000-000000000001', 'Sarah Chen',
   0, 5, 'approved', 'issue', 'global',
   '2026-04-01T08:00:00.000Z', '2026-04-01T08:00:00.000Z')
ON CONFLICT DO NOTHING;

-- ── Cause sub-issues for Urban Carbon Neutrality (parent_id = 46) ──────────

INSERT INTO issues (id, parent_id, title, description, detailed_description, author_id, author_name, solution_count, sub_issue_count, status, type, scale, created_at, updated_at) VALUES
  (47, 46, 'Fossil Heating Phase-Out in Existing Buildings',
   'Most urban emissions come from heating buildings with fossil fuels. Replacing millions of gas and oil systems with heat pumps, district heating, or other clean alternatives is technically possible but blocked by building age, split landlord-tenant incentives, skilled workforce shortages, and the sheer scale of infrastructure replacement needed within a single generation.',
   'Buildings account for roughly 40% of urban energy consumption and a corresponding share of direct emissions, primarily from burning gas and oil for space heating and hot water. The global building stock is aging — in Europe and North America, 50–80% of buildings predate modern energy efficiency standards.

The renovation rate — the share of buildings undergoing energy-efficient upgrades each year — hovers around 1% in most countries. At that pace, it would take a century to renovate the entire stock. Most net-zero plans require at least doubling this rate, but every acceleration attempt runs into the same constraints.

The split incentive is the most persistent barrier: landlords bear the capital cost of heating system replacement and insulation, while tenants benefit from lower energy bills. Neither party has the full incentive to act. In rental-heavy urban markets, this alone can stall thousands of conversions.

Skilled worker shortages compound the problem. An estimated 60% of construction firms in countries like Switzerland report difficulty finding qualified heat pump installers, insulation specialists, and district heating technicians. Training pipelines are years behind demand.

Gas network decommissioning adds a coordination challenge unique to the heating transition. Utilities must shut off gas supply street by street as alternative heating becomes available, requiring years of advance planning and property owner notification. Any gap leaves buildings stranded without heating.',
   'a0000002-0000-4000-8000-000000000002', 'Marcus Johnson',
   2, 1, 'approved', 'issue', 'global',
   '2026-04-01T09:00:00.000Z', '2026-04-01T09:00:00.000Z'),

  (51, 46, 'Urban Transport Decarbonization',
   'Even in cities with high public transit use, remaining car trips, freight, and last-mile delivery generate substantial emissions. Electrifying bus fleets, expanding cycling infrastructure, and shifting freight to low-carbon modes requires massive capital investment and behavioral change, while EV adoption is constrained by charging access — especially for tenants who cannot install home chargers.',
   'Transport is typically the second-largest source of urban emissions after buildings. Even cities with excellent public transit retain 15–25% car mode share, and freight delivery is growing rapidly with e-commerce. Complete decarbonization requires action across multiple fronts simultaneously.

Public transit electrification is capital-intensive but technically straightforward — cities like Shenzhen and Santiago have demonstrated full bus fleet electrification. The challenge is funding: converting a medium-sized city''s bus fleet costs hundreds of millions, and the charging infrastructure (depot chargers, opportunity chargers at terminuses) requires grid upgrades.

The EV transition for private vehicles faces a structural barrier in dense cities: tenants in apartment buildings typically cannot install home chargers, and landlord consent is often required under property law. This creates a two-tier system where EV adoption is easy for homeowners with garages but nearly impossible for renters — precisely the demographic most cities want to support.

Motor vehicle taxation reform is a key policy lever. Shifting from flat registration fees to weight-based, emissions-graduated taxes makes heavy, polluting vehicles more expensive to own while keeping small EVs affordable. But such reforms face political resistance from motorist constituencies.

Freight and last-mile delivery are often overlooked but represent a growing share of urban traffic and emissions. Solutions include electric delivery vans, cargo bikes for urban cores, consolidation hubs at city edges, and congestion pricing that favors zero-emission vehicles.',
   'a0000005-0000-4000-8000-000000000005', 'Priya Sharma',
   2, 1, 'approved', 'issue', 'global',
   '2026-04-01T10:00:00.000Z', '2026-04-01T10:00:00.000Z'),

  (55, 46, 'Embodied Carbon in Building Construction',
   'Even as operational building emissions decline through renewable energy and retrofits, the carbon embedded in construction materials — cement, steel, glass, insulation — remains a massive blind spot. Manufacturing cement alone produces 8% of global CO2. As cities renovate and build to meet climate targets, they risk creating a paradox: reducing operational emissions while increasing embodied emissions from the construction boom itself.',
   'The construction sector is responsible for roughly 11% of global greenhouse gas emissions through material production alone — cement (8%), steel (7%), and other materials. These are "embodied" emissions: they occur during manufacturing and are locked in at the moment of construction, regardless of how efficiently the building operates afterward.

This creates a perverse dynamic in the net-zero transition. Aggressive renovation programs generate embodied emissions from new insulation, windows, and heating systems. New construction to replace aging, inefficient buildings carries even higher embodied carbon. The lifecycle calculation is complex: a deep renovation may produce more upfront emissions than continued operation of the old building, even if it saves operational emissions over decades.

The demolition question is central. Tearing down an existing building destroys the embodied carbon already invested in it and generates massive new emissions for the replacement. Yet demolition is often cheaper and simpler than deep renovation, creating a market bias toward teardowns.

Measurement and regulation are catching up. France''s RE2020 regulation (in force since 2022) mandates lifecycle carbon assessment for all new buildings with progressively tightening limits. Denmark''s BR18 introduced a whole-life carbon limit of 12 kg CO2e/m2/year in 2023, tightened to 7.1 in 2025. Switzerland is now requiring cantons to set embodied carbon limits of 12–13 kg CO2-eq/m2/year.

The solutions are known — timber construction, low-carbon concrete, material reuse, bio-based insulation — but scaling them requires both regulation to create demand and investment in alternative supply chains.',
   'a0000003-0000-4000-8000-000000000003', 'Amara Okafor',
   2, 1, 'approved', 'issue', 'global',
   '2026-04-01T11:00:00.000Z', '2026-04-01T11:00:00.000Z'),

  (59, 46, 'Residual Emissions Requiring Carbon Removal',
   'Even with aggressive decarbonization, cities face residual emissions from waste incineration, industrial processes, and hard-to-abate sectors that cannot be eliminated by 2030–2040 deadlines. Reaching net-zero therefore requires negative emission technologies — carbon capture at point sources, direct air capture, or carbon mineralization — that are expensive, unproven at scale, and carry the risk of becoming an excuse to delay emission reductions.',
   'Every city pursuing carbon neutrality confronts the same arithmetic: after maximizing energy efficiency, electrifying heating and transport, and switching to renewable electricity, a stubborn 5–15% of emissions remains. These come primarily from waste incineration (which cannot stop processing waste), certain industrial processes, and residual fossil fuel use in hard-to-convert applications.

Carbon capture and storage (CCS) at waste-to-energy plants is the most commonly proposed solution. Since roughly half of waste incineration CO2 is biogenic (from organic waste), capturing it can produce genuine negative emissions (BECCS). Switzerland alone has 29 waste-to-energy plants emitting approximately 4.5 million tonnes of CO2 annually.

However, Copenhagen''s experience is a stark warning. The city''s entire 2025 carbon neutrality strategy depended on CCS at its Amager Bakke waste-to-energy plant. When the project failed due to bureaucratic obstacles and financial disputes, the entire target was abandoned. The lesson: never bet everything on a single unproven technology.

Direct air capture (DAC) works — Climeworks'' Mammoth plant in Iceland captures up to 36,000 tonnes per year — but at costs exceeding $900/tonne, it remains prohibitively expensive for municipal-scale deployment. Carbon mineralization, where CO2 is permanently stored in concrete and construction materials, is more affordable and creates circular economy benefits. Swiss startup Neustark operates 19+ such plants across Europe.

The responsible approach is a diversified portfolio: CCS at point sources where feasible, mineralization for near-term offsets, and DAC contracts for the remainder, with intermediate milestones and fallback provisions if any technology underdelivers.',
   'a0000006-0000-4000-8000-000000000006', 'James Whitfield',
   3, 1, 'approved', 'issue', 'global',
   '2026-04-01T12:00:00.000Z', '2026-04-01T12:00:00.000Z'),

  (64, 46, 'Small Business Viability in Urban Decarbonization',
   'Carbon neutrality targets require transformative investment, but small and medium enterprises lack the capital, expertise, and staff to navigate complex regulations, retrofit their premises, electrify their vehicle fleets, and adapt their supply chains — all while remaining economically competitive. If decarbonization is designed only for large corporations and well-funded institutions, SMEs will either be left behind or become a source of political backlash that derails the entire program.',
   'Small and medium enterprises make up over 99% of businesses in most economies and represent a significant share of aggregate emissions through their premises, vehicles, supply chains, and operations. But unlike large corporations with dedicated sustainability departments, an SME owner is simultaneously the CEO, accountant, HR manager, and now expected to be a climate strategist.

The capital constraint is real: replacing a commercial heating system, electrifying a delivery fleet, or insulating a workshop requires investment that SMEs often cannot access through normal banking channels. Energy efficiency subsidies exist but are complex to navigate — many SME owners report that the application process alone is a deterrent.

Workforce competition adds pressure: SMEs compete with large firms and public sector projects for the same scarce green-skilled workers (heat pump technicians, electricians, energy auditors). They typically cannot offer the same wages or career paths.

The political economy risk is the most dangerous dynamic. If SME owners and trade associations perceive decarbonization as an existential threat to their livelihood, they become a powerful opposition constituency. This pattern has derailed climate initiatives globally. The antidote is proactive engagement: simplified pathways, aggregated purchasing power, sector-specific roadmaps, and financial mechanisms that align SME economics with climate goals.

The cost of urban carbon neutrality typically runs into the billions over 10–15 years. These investments generate economic activity and energy cost savings, but only if the transition is designed so that small businesses can participate rather than just absorb the costs.',
   'a0000008-0000-4000-8000-000000000008', 'Elena Popescu',
   2, 1, 'approved', 'issue', 'global',
   '2026-04-01T13:00:00.000Z', '2026-04-01T13:00:00.000Z')
ON CONFLICT DO NOTHING;

-- ── Regional sub-issues (Basel-Stadt, Switzerland) ──────────────────────────

INSERT INTO issues (id, parent_id, title, description, detailed_description, author_id, author_name, solution_count, sub_issue_count, status, type, location_name, location, scale, created_at, updated_at) VALUES
  (48, 47, 'Fossil Heating Phase-Out in Existing Buildings',
   'Basel-Stadt must disconnect 11,000 gas connections by 2037 under its constitutionally mandated carbon neutrality target. IWB is expanding the district heating network by 60 km at a cost of CHF 460 million, with gas shutoffs beginning in 2026/27 and reaching approximately 1,000 disconnections per year from 2028. The cantonal Energiegesetz already bans new fossil heating installations.',
   'In November 2022, Basel-Stadt voters approved a constitutional amendment requiring the canton to reach net-zero direct greenhouse gas emissions by 2037 — the most ambitious target of any Swiss canton, 13 years ahead of the federal 2050 goal. The vote passed with 64% support.

The heating transition is the largest single challenge. IWB (Industrielle Werke Basel) operates Switzerland''s largest district heating network and is expanding it by 60 km of new pipeline between 2022 and 2037. By end of 2024, 10.6 km had been built, on schedule. Active expansion projects include Wettstein/Kleinbasel (2024–2026), Gellert (2026–2027), and Bachletten (2025–2026). Once complete, approximately 120,000 people will be served.

The gas network will be fully decommissioned by 2037. IWB maintains an interactive map showing every address''s planned district heating arrival date and gas shutoff schedule. Property owners receive written notice at least 3–4 years in advance (the law requires minimum 2 years). From 2028 onward, IWB will disconnect approximately 1,000 gas connections per year.

The cantonal Energiegesetz (SG 772.100) already prohibits new fossil fuel heating installations. When an existing fossil boiler reaches end-of-life, only renewable replacements are permitted — heat pumps, district heating, or biomass. Basel-Stadt exceeds the MuKEn 2025 standards approved by the EnDK in August 2025.

The renovation rate in Switzerland hovers around 1%, needing to at least double. The federal Gebäudeprogramm paid out CHF 528 million in 2024, and the Impulse Programme (since January 2025) provides CHF 2 billion over ten years for heating replacement. A tax reform planned for 2028 may change energy renovation deductibility, creating a "renovate now" incentive.

Basel''s 64-measure Klima-Aktionsplan (October 2024) estimates total transition investment at CHF 3.6 billion between 2020 and 2037, with annual energy cost savings of approximately CHF 189 million. The cantonal administration itself committed to net-zero by 2030, though this is now considered unachievable for all government buildings.',
   'a0000004-0000-4000-8000-000000000004', 'Leo Martinez',
   0, 0, 'approved', 'issue',
   'Basel-Stadt, Switzerland', ST_SetSRID(ST_MakePoint(7.5886, 47.5596), 4326), 'city',
   '2026-04-02T08:00:00.000Z', '2026-04-02T08:00:00.000Z')
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title;

INSERT INTO issues (id, parent_id, title, description, detailed_description, author_id, author_name, solution_count, sub_issue_count, status, type, location_name, location, scale, created_at, updated_at) VALUES
  (52, 51, 'Urban Transport Decarbonization',
   'Basel-Stadt already achieves a 63% active transport modal split with only 20% car use, but reaching carbon neutrality requires eliminating remaining fossil transport emissions. BVB is converting to a fully electric bus fleet by 2027 at CHF 360 million. The Umweltprämie offers CHF 1,500 for car deregistration with 400 slots. Tenant EV charging remains the single biggest barrier to further progress.',
   'Basel-Stadt has the lowest car ownership of any Swiss city at 319 cars per 1,000 inhabitants and ranks first nationally for active mobility: 42% of trips are on foot, 21% by bicycle, 16% by public transport, and only 20% by car or motorcycle.

BVB''s "Bussystem 2027" is converting the entire bus fleet to battery-electric at a total cost of approximately CHF 360 million. 65 e-buses were delivered by end of 2023, with 11 additional Hess lighTram 25 double-articulated electric buses ordered for line 30, operational from the 2027/2028 timetable. The Rank garage is being rebuilt as the main e-bus charging hub with opportunity charging stations at five terminus stops. All public transport in Basel-Stadt must run on 100% renewable energy from 2027 (legal requirement).

The Umweltprämie program (launched September 2025) offers CHF 1,500 as mobility credits to residents who permanently deregister their car and commit to staying car-free for at least 3 years. Credits are redeemable for public transport subscriptions, bike sharing, car sharing, or bicycle purchase. Funded by the Mobilitätsfonds (CHF 700,000), limited to 400 premiums.

Motor vehicle taxes will be reformed by 2028 to a polluter-pays model graduated by size, weight, and emissions. The previous 50% EV tax rebate expired in 2025 after EV market share crossed 5%.

On May 18, 2025, voters approved 40 km of safe cycle routes (Velovorzugsrouten) within 10 years at CHF 20.5 million. Swiss Post completed 100% electric delivery in Basel-Stadt in 2024. The H2-HUB Schweiz initiative is establishing the Basel port area as Switzerland''s green hydrogen hub for heavy freight.

Eurovision 2025 demonstrated that major events can achieve 78% sustainable transport with free public transit tickets, 115 extra trains, and 700 additional tram rides. Art Basel committed to 50% emission reductions by 2030.

The tenant EV charging gap is the biggest structural barrier: under Swiss law (Article 260a Code of Obligations), tenants cannot install a charging station without written landlord consent, with no legal recourse if refused. EV new-registration share reached 22.8% nationally in 2025, but adoption in rental buildings lags far behind.',
   'a0000007-0000-4000-8000-000000000007', 'Yuki Tanaka',
   0, 0, 'approved', 'issue',
   'Basel-Stadt, Switzerland', ST_SetSRID(ST_MakePoint(7.5886, 47.5596), 4326), 'city',
   '2026-04-02T09:00:00.000Z', '2026-04-02T09:00:00.000Z')
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title;

INSERT INTO issues (id, parent_id, title, description, detailed_description, author_id, author_name, solution_count, sub_issue_count, status, type, location_name, location, scale, created_at, updated_at) VALUES
  (56, 55, 'Embodied Carbon in Building Construction',
   'Basel-Stadt is poised to become the first Swiss canton with binding GHG emission limits for construction by 2026. A new demolition compensation fee for buildings younger than 60 years will discourage unnecessary teardowns. TEP Energy has conducted a Scope 3 building stock study quantifying embodied carbon for the first time.',
   'Basel-Stadt''s Klima-Aktionsplan includes groundbreaking measures on embodied carbon that go further than any other Swiss canton:

Binding greenhouse gas emission limits for construction will be introduced by 2026, coupled with a cantonal CO2 steering tax (Lenkungsabgabe). Buildings exceeding the limits face higher costs. This makes Basel-Stadt the first Swiss canton to regulate embodied carbon at the cantonal level.

A demolition compensation fee targets buildings younger than 60 years. Revenues flow into a compensation fund for Scope 3 emissions to finance further climate measures. This directly addresses the economic bias toward demolition over renovation by making premature teardowns financially unattractive.

TEP Energy conducted a study specifically commissioned to evaluate Scope 3 emissions from the Basel-Stadt building stock, filling a gap in the original climate strategy. The canton now publishes Scope 1, 2, and 3 emissions data on a dedicated Klimaportal webpage.

At the federal level, the revised Environmental Protection Act (January 2025) establishes a binding legal framework for circular economy in construction. Cantons must set embodied carbon limits: the current draft proposes 13 kg CO2-eq/m2/year for single-family homes and 12 kg CO2-eq/m2/year for multi-family homes. SIA 390/1 (published February 2024) provides the technical methodology aligned with a 1.5°C-compatible carbon budget.

Basel-Stadt''s trinational metropolitan area complicates Scope 3 accounting — construction materials are sourced across Swiss, French, and German supply chains, each with different carbon intensities and regulatory frameworks.',
   'a0000002-0000-4000-8000-000000000002', 'Marcus Johnson',
   0, 0, 'approved', 'issue',
   'Basel-Stadt, Switzerland', ST_SetSRID(ST_MakePoint(7.5886, 47.5596), 4326), 'city',
   '2026-04-02T10:00:00.000Z', '2026-04-02T10:00:00.000Z')
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title;

INSERT INTO issues (id, parent_id, title, description, detailed_description, author_id, author_name, solution_count, sub_issue_count, status, type, location_name, location, scale, created_at, updated_at) VALUES
  (60, 59, 'Residual Emissions Requiring Carbon Removal',
   'Basel-Stadt faces approximately 90,000 tonnes of residual CO2-equivalent emissions that cannot be eliminated through direct decarbonization. KVA Basel (the waste-to-energy plant) is the primary CCS candidate. VBSA has launched a CHF 90,000 pilot feasibility study due by end 2027. Deep geothermal energy remains off the table after the 2006 earthquake.',
   'Basel-Stadt''s climate strategy acknowledges that certain sectors — waste incineration, residual mobility, and parts of the economy — cannot fully eliminate emissions by 2037. These residual emissions of approximately 90,000 tonnes CO2-equivalent must be fully compensated through negative emission technologies from 2037 onward.

KVA Basel, the canton''s waste-to-energy plant, is identified as the primary candidate for CCS deployment. The VBSA (Swiss waste management association) launched a pilot feasibility study with a CHF 90,000 budget, examining whether and how captured CO2 from Basel could be transported and stored in Norway. The study confirmed technical feasibility but identified missing legal regulations and organizational structures as open questions. Results are expected by end 2027.

Under the DETEC-VBSA agreement (signed March 2022), Swiss waste incineration plants must commission at least one CO2 capture facility by 2030 with minimum capacity of 100,000 tonnes per year. KVA Linth in Niederurnen (Canton Glarus) will be the first Swiss CCS facility at a waste plant, providing a critical reference project for Basel.

The Swiss negative emission technology landscape offers additional options: Climeworks'' Mammoth plant in Iceland captures up to 36,000 tonnes per year, while Neustark operates 19+ carbon mineralization plants across Switzerland and Europe, permanently storing CO2 in demolished concrete. The federal Climate and Innovation Act provides CHF 200 million per year for climate-friendly innovations from 2025–2030.

Deep geothermal energy is explicitly off the table for Basel after the 2006 project triggered a magnitude 3.4 earthquake, causing significant property damage claims. The $100 million project was officially cancelled in 2009.

The climate action plan includes a contingency clause: "If it turns out that CCS is not feasible or financeable in the necessary scope, alternatives will be presented." Copenhagen''s failure — where the entire 2025 net-zero target was abandoned when CCS at its waste-to-energy plant proved infeasible — underscores the urgency of maintaining a diversified portfolio.',
   'a0000005-0000-4000-8000-000000000005', 'Priya Sharma',
   0, 0, 'approved', 'issue',
   'Basel-Stadt, Switzerland', ST_SetSRID(ST_MakePoint(7.5886, 47.5596), 4326), 'city',
   '2026-04-02T11:00:00.000Z', '2026-04-02T11:00:00.000Z')
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title;

INSERT INTO issues (id, parent_id, title, description, detailed_description, author_id, author_name, solution_count, sub_issue_count, status, type, location_name, location, scale, created_at, updated_at) VALUES
  (65, 64, 'Small Business Viability in Urban Decarbonization',
   'Basel''s Gewerbeverband (trade association) accepts the 2037 carbon neutrality goal but insists on SME-compatible implementation pathways. The Basel2037 joint program was launched to coordinate business transition. The Klimaplattform der Wirtschaft has enrolled over 800 companies. Total estimated transition cost is CHF 3.6 billion between 2020 and 2037, with estimated energy cost savings of CHF 189 million per year.',
   'The Gewerbeverband Basel-Stadt takes a nuanced position: they accept climate goals but insist measures must be "KMU-verträglich" (SME-compatible). Director Gabriel Barell stated after the 2022 vote that implementation by 2037 "remains unrealistic" from their perspective. Despite skepticism about the timeline, the Gewerbeverband partnered with the canton to create the Basel2037 program, recognizing that SMEs are essential for achieving climate goals.

The Klimaplattform der Wirtschaft Region Basel, operating since 2014, hosts four business lunches per year connecting over 4,500 individuals from 800+ companies to exchange ideas on resource efficiency and decarbonization. Key partners include the University of Basel and Basler Kantonalbank.

The 34 new measures in the 2024 Klima-Aktionsplan require estimated investment of CHF 197.5–317.5 million with annual operating costs of CHF 17.9–23.6 million. The total transition cost is estimated at CHF 3.6 billion between 2020 and 2037 (averaging approximately CHF 211 million per year). IWB''s district heating expansion alone requires CHF 460 million. Against this, saved energy costs are estimated at approximately CHF 189 million annually.

Political opposition exists but is a minority voice in Basel-Stadt''s left-leaning political landscape. SVP Grossrat Beat Schaller called the effort "symbolic politics." The FDP raised cost concerns and skilled labor shortages. The Gewerbeverband opposed the federal Klimafonds-Initiative (rejected March 8, 2026), citing bureaucracy and costs up to CHF 9.5 billion nationally. Despite this, the strong popular mandate (64% yes in the 2022 constitutional vote) provides democratic legitimacy.

The Klimaportal, launched in 2025, provides public transparency on progress across emissions, measures, and indicators. The first comprehensive progress report is scheduled for 2026.',
   'a0000003-0000-4000-8000-000000000003', 'Amara Okafor',
   0, 0, 'approved', 'issue',
   'Basel-Stadt, Switzerland', ST_SetSRID(ST_MakePoint(7.5886, 47.5596), 4326), 'city',
   '2026-04-02T12:00:00.000Z', '2026-04-02T12:00:00.000Z')
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title;

-- ── Solutions for Fossil Heating Phase-Out (parent_id = 47) ──────────────────

INSERT INTO issues (id, parent_id, title, description, author_id, author_name, solution_count, sub_issue_count, status, type, location_name, location, scale, created_at, updated_at) VALUES
  (49, 47, 'Mandatory District Heating Connection Zones',
   'Designate zones where buildings must connect to district heating networks when available, coordinated with gas network decommissioning schedules. This prevents stranded infrastructure investment and ensures district heating reaches the density needed for economic viability. Danish cities pioneered this approach and achieve over 60% district heating penetration nationally. Basel''s IWB is already implementing a version of this — publishing an interactive map showing every address''s planned connection date and shutting off gas supply area by area.',
   'a0000003-0000-4000-8000-000000000003', 'Amara Okafor',
   0, 0, 'approved', 'solution',
   'Basel-Stadt, Switzerland', ST_SetSRID(ST_MakePoint(7.5886, 47.5596), 4326), 'city',
   '2026-04-03T08:00:00.000Z', '2026-04-03T08:00:00.000Z'),

  (50, 47, 'Retrofit Accelerator with On-Bill Financing',
   'Create a one-stop-shop retrofit service that bundles energy audits, contractor matching, and financing into a single program. The key innovation is on-bill financing: retrofit costs are repaid through the energy bill, so landlords face no upfront cost and the charge transfers with the property, not the owner. This solves the split incentive problem that blocks most building upgrades. Energiesprong in the Netherlands has demonstrated net-zero retrofits completed in under two weeks per dwelling using this model.',
   'a0000006-0000-4000-8000-000000000006', 'James Whitfield',
   0, 0, 'approved', 'solution',
   'Basel-Stadt, Switzerland', ST_SetSRID(ST_MakePoint(7.5886, 47.5596), 4326), 'city',
   '2026-04-03T09:00:00.000Z', '2026-04-03T09:00:00.000Z')
ON CONFLICT DO NOTHING;

-- ── Solutions for Urban Transport Decarbonization (parent_id = 51) ───────────

INSERT INTO issues (id, parent_id, title, description, author_id, author_name, solution_count, sub_issue_count, status, type, location_name, location, scale, created_at, updated_at) VALUES
  (53, 51, 'Right-to-Charge Legislation for Tenants',
   'Pass legislation giving tenants and condominium owners the legal right to install EV charging stations, overriding landlord or homeowner association objections. Pair with a standardized cost-sharing mechanism so building owners are not burdened unfairly. France, Germany, and several US states have enacted right-to-charge laws, and adoption rates in buildings covered by such laws are 3–5x higher than comparable buildings without them. Under current Swiss law (Article 260a Code of Obligations), tenants have no recourse if a landlord refuses charging installation.',
   'a0000008-0000-4000-8000-000000000008', 'Elena Popescu',
   0, 0, 'approved', 'solution',
   'Switzerland', ST_SetSRID(ST_MakePoint(8.2275, 46.8182), 4326), 'national',
   '2026-04-03T10:00:00.000Z', '2026-04-03T10:00:00.000Z'),

  (54, 51, 'Car Deregistration Incentive with Mobility Credits',
   'Offer residents a financial incentive to permanently deregister a car, paid as credits redeemable for public transit passes, bike-sharing, car-sharing, and cargo bike rentals rather than cash. This ensures the incentive shifts behavior rather than just subsidizing a transaction. Basel''s Umweltprämie (CHF 1,500, launched September 2025, 400 slots) is a working pilot of this approach. Helsinki''s mobility-as-a-service platform demonstrates the broader ecosystem needed to make car-free living genuinely convenient.',
   'a0000001-0000-4000-8000-000000000001', 'Sarah Chen',
   0, 0, 'approved', 'solution',
   'Basel-Stadt, Switzerland', ST_SetSRID(ST_MakePoint(7.5886, 47.5596), 4326), 'city',
   '2026-04-03T11:00:00.000Z', '2026-04-03T11:00:00.000Z')
ON CONFLICT DO NOTHING;

-- ── Solutions for Embodied Carbon (parent_id = 55) ──────────────────────────

INSERT INTO issues (id, parent_id, title, description, author_id, author_name, solution_count, sub_issue_count, status, type, location_name, location, scale, created_at, updated_at) VALUES
  (57, 55, 'Binding Whole-Life Carbon Limits for New Construction',
   'Mandate maximum lifecycle carbon budgets per square meter for all new construction, declining over time. This forces architects and developers to optimize material choices from the design phase rather than treating embodied carbon as an afterthought. France''s RE2020 regulation, in force since 2022, sets progressively tightening embodied carbon thresholds (−15% in 2024, −25% in 2027, −30 to −40% in 2030) that have already shifted the market toward timber, low-carbon concrete, and bio-based insulation. Denmark''s BR18 set a limit of 12 kg CO2e/m2/year in 2023, tightened to 7.1 in 2025.',
   'a0000004-0000-4000-8000-000000000004', 'Leo Martinez',
   0, 0, 'approved', 'solution',
   'Switzerland', ST_SetSRID(ST_MakePoint(8.2275, 46.8182), 4326), 'national',
   '2026-04-03T12:00:00.000Z', '2026-04-03T12:00:00.000Z'),

  (58, 55, 'Demolition Tax and Renovation-First Policy',
   'Impose a fee on demolishing buildings below a certain age and require developers to demonstrate that renovation is not viable before granting demolition permits. The embodied carbon in an existing structure is already "spent" — demolishing it releases that carbon and requires new embodied carbon for the replacement. Basel-Stadt is implementing a version of this: a compensation fee for demolishing buildings younger than 60 years, with revenues funding a Scope 3 emissions compensation fund.',
   'a0000007-0000-4000-8000-000000000007', 'Yuki Tanaka',
   0, 0, 'approved', 'solution',
   'Basel-Stadt, Switzerland', ST_SetSRID(ST_MakePoint(7.5886, 47.5596), 4326), 'city',
   '2026-04-03T13:00:00.000Z', '2026-04-03T13:00:00.000Z')
ON CONFLICT DO NOTHING;

-- ── Solutions for Residual Emissions (parent_id = 59) ───────────────────────

INSERT INTO issues (id, parent_id, title, description, author_id, author_name, solution_count, sub_issue_count, status, type, location_name, location, scale, created_at, updated_at) VALUES
  (61, 59, 'CCS at Municipal Waste-to-Energy Plants',
   'Retrofit waste-to-energy incineration plants with post-combustion carbon capture, transporting captured CO2 for geological storage or industrial use. Since waste incineration produces roughly 50% biogenic CO2 (from organic waste), capturing it achieves net-negative emissions (BECCS). KVA Linth in Switzerland will be the first such facility, designed for 100,000 tonnes CO2/year. Copenhagen''s experience shows the technology is not yet proven at municipal scale — cities should pursue this as one element of a portfolio, not as a single solution.',
   'a0000002-0000-4000-8000-000000000002', 'Marcus Johnson',
   0, 0, 'approved', 'solution',
   'Basel-Stadt, Switzerland', ST_SetSRID(ST_MakePoint(7.5886, 47.5596), 4326), 'city',
   '2026-04-04T08:00:00.000Z', '2026-04-04T08:00:00.000Z'),

  (62, 59, 'Carbon Mineralization in Construction Materials',
   'Permanently store captured CO2 by mineralizing it into concrete and other construction materials. The CO2 reacts with calcium and magnesium compounds and becomes rock — permanently sequestered. Neustark, a Swiss ETH spin-off, operates 19+ plants across Switzerland, Austria, Liechtenstein, and Germany doing exactly this, with over 2,500 tonnes of CO2 removed to date and a target of 1 million tonnes by 2030. The resulting concrete performs equivalently to conventional products, creating a circular economy link between carbon removal and construction.',
   'a0000008-0000-4000-8000-000000000008', 'Elena Popescu',
   0, 0, 'approved', 'solution',
   NULL, NULL, 'global',
   '2026-04-04T09:00:00.000Z', '2026-04-04T09:00:00.000Z'),

  (63, 59, 'Diversified Negative Emissions Portfolio Strategy',
   'Instead of betting on a single carbon removal technology, build a portfolio combining CCS at point sources, direct air capture procurement contracts, carbon mineralization in construction, and potentially enhanced weathering or biochar. Set intermediate milestones requiring each technology to demonstrate progress, with fallback provisions to scale alternatives if one fails. Copenhagen''s collapse after relying solely on CCS at one waste-to-energy facility is the definitive argument for diversification. The Swiss federal Climate and Innovation Act provides CHF 200 million per year (2025–2030) that cities can leverage for portfolio development.',
   'a0000004-0000-4000-8000-000000000004', 'Leo Martinez',
   0, 0, 'approved', 'solution',
   'Basel-Stadt, Switzerland', ST_SetSRID(ST_MakePoint(7.5886, 47.5596), 4326), 'city',
   '2026-04-04T10:00:00.000Z', '2026-04-04T10:00:00.000Z')
ON CONFLICT DO NOTHING;

-- ── Solutions for Small Business Viability (parent_id = 64) ─────────────────

INSERT INTO issues (id, parent_id, title, description, author_id, author_name, solution_count, sub_issue_count, status, type, location_name, location, scale, created_at, updated_at) VALUES
  (66, 64, 'Municipal Climate Platform for SME Coordination',
   'Create a public-private platform that provides SMEs with simplified carbon footprint assessment tools, pre-negotiated group rates for retrofits and fleet electrification, peer learning networks organized by sector, and a single point of contact for navigating subsidies and regulations. The platform aggregates demand across hundreds of small businesses to achieve economies of scale that no single SME could access alone. Basel''s Klimaplattform der Wirtschaft, with 800+ member companies and quarterly business lunches since 2014, is a working model of this approach.',
   'a0000001-0000-4000-8000-000000000001', 'Sarah Chen',
   0, 0, 'approved', 'solution',
   'Basel-Stadt, Switzerland', ST_SetSRID(ST_MakePoint(7.5886, 47.5596), 4326), 'city',
   '2026-04-04T11:00:00.000Z', '2026-04-04T11:00:00.000Z'),

  (67, 64, 'Sector-Specific Transition Roadmaps for Small Businesses',
   'Develop concrete, step-by-step decarbonization roadmaps for the 10–15 most common SME sectors in a city (restaurants, retail, trades, small manufacturing, professional services). Each roadmap shows exactly what to do first, what it costs, what subsidies are available, and what the payback period is. Generic climate advice overwhelms small business owners; sector-specific guidance with real numbers is actionable. Pair each roadmap with a peer mentor program connecting businesses that have already completed the steps with those starting out.',
   'a0000005-0000-4000-8000-000000000005', 'Priya Sharma',
   0, 0, 'approved', 'solution',
   'Basel-Stadt, Switzerland', ST_SetSRID(ST_MakePoint(7.5886, 47.5596), 4326), 'city',
   '2026-04-04T12:00:00.000Z', '2026-04-04T12:00:00.000Z')
ON CONFLICT DO NOTHING;

-- ── Solutions for Drought-Induced Forest Decline (parent_id = 40, global cause) ──

INSERT INTO issues (id, parent_id, title, description, detailed_description, author_id, author_name, solution_count, sub_issue_count, status, type, scale, solution_status, created_at, updated_at) VALUES
  (68, 40, 'Mosaic forest silviculture',
   'Replace single-species, even-aged stands with mixed-species, mixed-age "mosaic" forests so that climate, pest, and drought risk is spread across many trees rather than concentrated on one vulnerable species. The approach is being pushed by the French ONF as the standard response to dieback and is gradually being applied wherever new plantings are made.',
   'A mosaic forest is a stand made up of several species, often of different ages, planted or regenerated together. The goal is resilience: when drought, pests, or disease hit one species, the others continue to provide cover, soil protection, and economic value. It is the explicit alternative to the productivity-driven monoculture model that left European forests so exposed to bark beetles after 2018.

The ONF (Office National des Forêts) promotes this concept across all French public forests as part of its climate adaptation strategy. In practice it means mixing oaks, cedars, hornbeams, lindens, and other candidate species into formerly pure beech, spruce, or fir stands, and accepting that the new forest will look and behave differently from the one it replaces.

Mosaic silviculture is being applied opportunistically wherever clearings or replantings occur, but it cannot be retrofitted onto existing stands at scale — only the next generation of trees benefits. Foresters across the Grand Est use it where they can, and it is now embedded in management plans for communal forests.',
   'a0000007-0000-4000-8000-000000000007', 'Yuki Tanaka',
   0, 0, 'approved', 'solution', 'global', 'in-progress',
   '2026-04-04T08:00:00.000Z', '2026-04-04T08:00:00.000Z'),

  (69, 40, 'Thin forest stands',
   'Reduce stand density so each remaining tree has access to more soil water during dry periods. This is the most established silvicultural response to drought stress and is widely applied across European temperate forests, including in the Grand Est.',
   'Stand thinning is one of the oldest tools in the forester''s kit. By removing a fraction of the trees in a dense stand, the remaining trees face less competition for soil water, light, and nutrients. During moderate droughts, thinned stands have measurably lower mortality and recover faster than unthinned ones — a result confirmed across decades of European and North American forestry research.

The limit of the technique is severity. When drought is mild to moderate, thinning helps. When drought is extreme — multi-year, with high temperatures and depleted soil moisture — even widely spaced trees run out of water and die. Thinning cannot save a forest from collapse; it can only extend the runway and reduce the rate of damage.

In the Grand Est, ONF foresters apply thinning as a standard response in communal and state forests, including in stands that have already started to decline. The results are visible: thinned spruce and beech stands fare better through dry summers than dense ones. But foresters also acknowledge openly that thinning alone is insufficient — they have described feeling powerless against droughts that exceed any historical precedent.',
   'a0000006-0000-4000-8000-000000000006', 'James Whitfield',
   0, 0, 'approved', 'solution', 'global', 'done',
   '2026-04-04T08:30:00.000Z', '2026-04-04T08:30:00.000Z'),

  (70, 40, 'Restore landscape water retention',
   'Slow down and infiltrate water at the landscape scale using hedgerows, retention ponds, swales, restored wetlands, and beaver-led re-wetting. The goal is to recharge small aquifers and keep soils moist longer between rainfall events, addressing the structural water shortage that no forestry technique alone can fix.',
   'When forests dry out structurally, the problem is not in the forest — it is in the wider landscape. Decades of drainage, intensive agriculture, channelized streams, and removed hedgerows have caused water to run off the land instead of soaking in. Where water once lingered for weeks or months, it now flushes downstream within days, leaving aquifers and forest soils chronically under-recharged.

Landscape water retention reverses this. The toolkit includes hedgerows and small wooded buffers along contour lines, swales and shallow infiltration basins on agricultural land, restored wetlands in valley bottoms, beaver dams or beaver-style leaky dams in headwater streams, and pond restoration in former mill sites. Each individual intervention is small; the collective effect on a watershed can be substantial. The Slovak "New Water Paradigm" projects, the British "Slow the Flow" programs, and beaver reintroductions in Bavaria all show measurable improvements in summer baseflow and soil moisture.

This is currently the most under-explored lever for drought-stressed forests in continental Europe. It addresses the root cause — water leaving the landscape too fast — rather than treating symptoms in the forest itself. The catch is that it requires coordination across many landowners and land uses, which is exactly the kind of work that no single forestry agency is set up to lead.',
   'a0000004-0000-4000-8000-000000000004', 'Leo Martinez',
   0, 0, 'approved', 'solution', 'global', 'plan',
   '2026-04-04T09:00:00.000Z', '2026-04-04T09:00:00.000Z'),

  (71, 40, 'Test new species and provenances',
   'Plant experimental forest "gardens" combining local and non-local tree species and seed provenances to study which ones adapt to future climate conditions. The work is run as a long-term research program by the ONF under the name RENEssences, with plots distributed across French regions including the Grand Est.',
   'No one knows for certain which tree species will still thrive in continental Europe by 2080. The species that dominated for centuries — beech, spruce, fir, ash — are visibly failing in many places, but the alternatives are far from obvious. Some candidates are local species from drier microclimates; others are species or provenances from southern Europe, the Balkans, or even further afield. Each comes with unknowns about pests, soils, frost tolerance, and biodiversity impact.

The ONF''s RENEssences project addresses this through experimental "gardens": small, dense plots in which dozens of species and provenances are planted side by side, then monitored for decades. The data feeds into national replanting recommendations as it accumulates. Plots have been established across the country, and the network is growing.

The strength of the approach is that it is empirical rather than guess-based. The weakness is time. Species selection decisions need to be informed by results that will not be available for 20 to 40 years — and many forests cannot wait that long. RENEssences is still the most rigorous source of guidance available, but the gap between when we need answers and when we will have them is the central tension of forest climate adaptation.',
   'a0000005-0000-4000-8000-000000000005', 'Priya Sharma',
   0, 1, 'approved', 'solution', 'global', 'in-progress',
   '2026-04-04T09:30:00.000Z', '2026-04-04T09:30:00.000Z')
ON CONFLICT DO NOTHING;

-- ── Solutions for Drought – Sundgau (parent_id = 41, regional) ──

INSERT INTO issues (id, parent_id, title, description, detailed_description, author_id, author_name, solution_count, sub_issue_count, status, type, location_name, location, scale, solution_status, created_at, updated_at) VALUES
  (72, 41, 'Plant climate-adapted species',
   'Use targeted subsidies to fund the planting of at least two climate-adapted tree species per intervention in declining communal forests. In Alsace this is delivered through the Collectivité européenne d''Alsace''s "Forêts d''Avenir d''Alsace" program, which has been running since 2021 and explicitly targets the Sundgau among other declining areas.',
   'When a beech, spruce, or ash stand collapses, communes face a choice: replant with the same species that failed, or experiment with something new. Most lack the budget and the expertise to do the second on their own. The "Forêts d''Avenir d''Alsace" program (FAA), launched in 2021 by the Collectivité européenne d''Alsace, exists to remove that barrier.

FAA subsidies cover the planting of climate-adapted species in communal forests, with one binding constraint: each intervention must include at least two species, complementing whatever natural regeneration occurs on the site. The aim is to start every new generation of trees as a small mosaic rather than a fragile monoculture. Communes apply through the Collectivité, choose from a list of candidate species recommended for their soil and climate, and receive support for both the planting and the early maintenance.

In the Sundgau the program is now active in several communal forests. It does not solve the drought problem itself — the trees still need water — but it changes the trajectory of the next generation, giving the new forest a better chance of standing up to the climate of 2050 and beyond. The big open question is which species will actually succeed on Sundgau''s heavy clay soils, and only time will tell.',
   'a0000008-0000-4000-8000-000000000008', 'Elena Popescu',
   0, 1, 'approved', 'solution',
   'Sundgau, Grand Est, Metropolitan France', ST_SetSRID(ST_MakePoint(7.2541, 47.6413), 4326), 'region', 'in-progress',
   '2026-04-04T10:00:00.000Z', '2026-04-04T10:00:00.000Z'),

  (73, 41, 'Drought-period water restrictions',
   'Impose binding restrictions on non-essential water use during drought, and coordinate emergency drinking-water supply between communes when local sources fail. In the Sundgau this has been delivered by the Communauté de Communes Sundgau through prefectural alerts since 2018, with reinforced restrictions extended across all 64 communes from August 2025.',
   'When the Sundgau''s small aquifers run low, the Communauté de Communes Sundgau (CC Sundgau), which manages drinking-water service for the area''s communes including Waldighoffen and Ferrette, has the authority to enforce demand-side measures. Since 2018 these have been triggered repeatedly: bans on watering gardens, washing cars, filling pools, and irrigating non-essential land, layered into prefectural arrêtés as the situation worsens.

The 2023 episode is the clearest case: Waldighoffen was placed under reinforced drought alert, and Ferrette had to be supplied by tanker truck after its local sources ran dry — a logistically demanding operation that showed the system can stretch in an emergency. The August 2025 arrêté extended reinforced water-use restrictions across every commune in the CC Sundgau territory, the broadest measure the area has seen.

These measures work for what they are designed to do: keep taps running through the worst weeks of summer. But they explicitly do not, and cannot, address the underlying problem. Drought restrictions reduce human water use; they do not put water back into the aquifer or the forest soil. They are a coping mechanism for the human-water system, not a solution for the forests, and CC Sundgau and the prefecture both acknowledge this openly.',
   'a0000002-0000-4000-8000-000000000002', 'Marcus Johnson',
   0, 1, 'approved', 'solution',
   'Sundgau, Grand Est, Metropolitan France', ST_SetSRID(ST_MakePoint(7.2541, 47.6413), 4326), 'region', 'done',
   '2026-04-04T10:30:00.000Z', '2026-04-04T10:30:00.000Z')
ON CONFLICT DO NOTHING;

-- ── Sub-issues attached to drought solutions (74–76) ──

INSERT INTO issues (id, parent_id, title, description, detailed_description, author_id, author_name, solution_count, sub_issue_count, status, type, scale, created_at, updated_at) VALUES
  (74, 71, 'Trials too slow for dying stands',
   'Multi-decade species trials produce reliable data only after 20–40 years, but many forests are dying now. There is no mechanism to give foresters actionable guidance on the timescale at which they actually need to make replanting decisions.',
   'RENEssences and similar long-term species trials are scientifically rigorous: dozens of species and provenances grown side by side, monitored for survival, growth, pest resistance, and frost tolerance over multiple decades. The results that come out of them are trustworthy precisely because they take this long.

The problem is that foresters in the Grand Est and elsewhere need to make replanting decisions every year. A communal forest that lost its spruce in 2018 is being replanted right now, in 2026, with whichever species the local ONF agent thinks has the best chance — and that decision will not be validated by trial data until 2046 at the earliest. By then it will be too late to reverse a bad choice. There is currently no formalized process for translating partial, in-progress trial results into shorter-term recommendations, and no fallback if the species chosen today turns out to be wrong.',
   'a0000005-0000-4000-8000-000000000005', 'Priya Sharma',
   0, 0, 'approved', 'issue', 'global',
   '2026-04-04T11:00:00.000Z', '2026-04-04T11:00:00.000Z')
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title;

INSERT INTO issues (id, parent_id, title, description, detailed_description, author_id, author_name, solution_count, sub_issue_count, status, type, location_name, location, scale, created_at, updated_at) VALUES
  (75, 72, 'Species suitability on clay unknown',
   'The Sundgau''s heavy clay soils, which become rock-hard and impenetrable when dry, are very different from the sandy or loamy soils where most candidate replacement species have been tested. There is no published guidance on which FAA-recommended species will actually succeed on Sundgau clay.',
   'The FAA program''s candidate species list is drawn from regional and national recommendations developed for the Grand Est and France as a whole. But the Sundgau''s defining feature is its clay soils — soils that hold water in wet periods but seal up and crack in dry ones, cutting tree roots off from any moisture that does fall. Beech historically thrived on these soils, which is why it was so dominant; the species being trialled as replacements have mostly not been tested on equivalent ground.

A 2023 study documented widespread beech dieback specifically on Sundgau soils, but no equivalent study has tracked how oak, cedar, or other proposed alternatives perform on the same ground. Foresters in Altkirch and elsewhere are planting these species on faith. If the choices turn out to be wrong, the cost is another generation of failed forest — and the time loss is measured in decades, not years.',
   'a0000008-0000-4000-8000-000000000008', 'Elena Popescu',
   0, 0, 'approved', 'issue',
   'Sundgau, Grand Est, Metropolitan France', ST_SetSRID(ST_MakePoint(7.2541, 47.6413), 4326), 'region',
   '2026-04-04T11:30:00.000Z', '2026-04-04T11:30:00.000Z')
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title;

INSERT INTO issues (id, parent_id, title, description, detailed_description, author_id, author_name, solution_count, sub_issue_count, status, type, location_name, location, scale, created_at, updated_at) VALUES
  (76, 73, 'Restrictions don''t refill aquifers',
   'Demand-side water restrictions keep human supply running through dry summers but do nothing to recharge the Sundgau''s small aquifers or relieve forest water stress. The forests continue to decline regardless of how strict the bans on garden watering become.',
   'The Sundgau''s drought response is built around protecting human drinking-water supply: prefectural alerts, watering bans, tanker deliveries when sources run dry. Within that narrow goal, the system works — taps stay on and acute crises are managed. But it is not, and cannot be, a forest solution.

Aquifer recharge in the Sundgau depends on winter rainfall slowly soaking into the ground. Reducing summer water use does not put water back into the ground; at best it prevents the existing reserves from being drawn down faster. The forest, meanwhile, depends entirely on direct rainfall and soil moisture, neither of which is affected by what humans pump from taps. Every dry summer the forest draws down its own moisture reserves and loses more trees, regardless of how strict the human-side restrictions are. Closing this gap requires intervening in the landscape itself, not just on the demand side.',
   'a0000002-0000-4000-8000-000000000002', 'Marcus Johnson',
   0, 0, 'approved', 'issue',
   'Sundgau, Grand Est, Metropolitan France', ST_SetSRID(ST_MakePoint(7.2541, 47.6413), 4326), 'region',
   '2026-04-04T12:00:00.000Z', '2026-04-04T12:00:00.000Z')
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title;

-- Backfill solution counts on parent issues whose existing rows were
-- created before the drought solutions were seeded.
UPDATE issues SET solution_count = 4 WHERE id = 40;
UPDATE issues SET solution_count = 2 WHERE id = 41;

-- Reset serial sequence after explicit ID inserts
SELECT setval('issues_id_seq', (SELECT MAX(id) FROM issues));
