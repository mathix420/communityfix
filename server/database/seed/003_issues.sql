-- ── Top-level issues ──────────────────────────────────────────

INSERT OR IGNORE INTO issues (id, title, description, detailed_description, author_id, author_name, solution_count, sub_issue_count, comment_count, source_count, status, type, created_at, updated_at) VALUES
  (1, 'Reduce household waste',
   'Every year, millions of tons of waste end up in landfills. We need innovative solutions to reduce household waste and promote recycling.',
   'The average household generates over 4 pounds of waste per day, with less than 35% being recycled or composted. Landfills are reaching capacity in many regions, and incineration creates air quality concerns. Tackling this requires rethinking packaging, making recycling more accessible, and building composting infrastructure. Community-driven approaches have shown promise in cities like San Francisco and Kamikatsu, Japan, which have achieved near-zero-waste goals through comprehensive programs.',
   'a0000001-0000-4000-8000-000000000001', 'Sarah Chen',
   3, 3, 0, 0, 'approved', 'issue',
   '2025-09-01T10:00:00.000Z', '2025-09-01T10:00:00.000Z'),

  (2, 'Improve local public transport',
   'Our public transport system is outdated and inefficient. We need ideas to enhance its reliability and accessibility for all residents.',
   'Many cities suffer from underfunded public transit that fails to connect suburbs, has unreliable schedules, and lacks accessibility features. This pushes residents toward car dependency, increasing congestion, emissions, and costs for low-income households who can least afford alternatives. Successful transit systems like those in Zurich, Seoul, and Curitiba show that political will combined with smart design can create networks people actually prefer over driving.',
   'a0000002-0000-4000-8000-000000000002', 'Marcus Johnson',
   3, 2, 0, 0, 'approved', 'issue',
   '2025-09-05T14:30:00.000Z', '2025-09-05T14:30:00.000Z'),

  (3, 'Cheaper access to clean water',
   'Access to clean water is a basic human right. We need to find ways to make it more affordable and accessible for every community.',
   'Globally, 2 billion people lack safely managed drinking water, and even in developed countries, aging infrastructure leads to contamination events like the Flint water crisis. Rural communities and low-income neighborhoods are disproportionately affected. Solutions range from decentralized filtration to rainwater harvesting, but the core challenge is funding infrastructure upgrades while keeping water bills affordable for the most vulnerable populations.',
   'a0000003-0000-4000-8000-000000000003', 'Amara Okafor',
   2, 2, 0, 0, 'approved', 'issue',
   '2025-09-10T08:15:00.000Z', '2025-09-10T08:15:00.000Z'),

  (4, 'Affordable housing solutions',
   'Housing prices are skyrocketing, making it difficult for many to find affordable places to live. We need creative solutions to this crisis.',
   'In major cities worldwide, housing costs consume over 50% of income for low- and middle-income households. The causes are multifaceted: restrictive zoning, rising construction costs, speculative investment, and the conversion of long-term rentals to short-term vacation listings. Without intervention, essential workers—teachers, nurses, service workers—are being pushed further from the communities they serve, increasing commute times and reducing quality of life.',
   'a0000004-0000-4000-8000-000000000004', 'Leo Martinez',
   3, 3, 0, 0, 'approved', 'issue',
   '2025-09-15T11:00:00.000Z', '2025-09-15T11:00:00.000Z'),

  (5, 'Accessible hydroponics systems',
   'Hydroponics can revolutionize urban farming, but current systems are too expensive and complex for most people. We need affordable, beginner-friendly solutions.',
   'Hydroponic growing uses up to 90% less water than traditional agriculture and can produce food year-round in any climate. However, commercial systems cost thousands of dollars, and the technical knowledge required creates a steep learning curve. Making hydroponics accessible could transform food deserts, reduce transportation emissions from food supply chains, and give communities more control over their food security.',
   'a0000005-0000-4000-8000-000000000005', 'Priya Sharma',
   2, 2, 0, 0, 'approved', 'issue',
   '2025-09-20T16:45:00.000Z', '2025-09-20T16:45:00.000Z'),

  (6, 'Curbing greenhouse gas emissions',
   'Climate change is accelerating. We need actionable, community-level ideas to reduce greenhouse gas emissions where we live and work.',
   'While international agreements set broad targets, actual emissions reductions happen at the local level—in buildings, transportation networks, and industrial facilities. Cities account for over 70% of global CO2 emissions. Many municipalities lack the tools, funding, or political frameworks to act decisively. Community-driven approaches can fill this gap by creating accountability, piloting innovative solutions, and building public support for larger policy changes.',
   'a0000006-0000-4000-8000-000000000006', 'James Whitfield',
   4, 3, 0, 0, 'approved', 'issue',
   '2025-09-25T09:30:00.000Z', '2025-09-25T09:30:00.000Z');

-- ── Sub-issues for "Reduce household waste" (parent_id = 1) ──

INSERT OR IGNORE INTO issues (id, parent_id, title, description, author_id, author_name, solution_count, sub_issue_count, comment_count, source_count, status, type, created_at, updated_at) VALUES
  (7, 1, 'Lack of accessible recycling infrastructure',
   'Many neighborhoods have no curbside recycling, and drop-off centers are too far away for people without cars. This makes even willing residents unable to recycle effectively.',
   'a0000002-0000-4000-8000-000000000002', 'Marcus Johnson',
   0, 0, 0, 0, 'approved', 'issue',
   '2025-09-08T12:00:00.000Z', '2025-09-08T12:00:00.000Z'),

  (8, 1, 'Single-use plastic alternatives are too expensive',
   'Reusable and biodegradable alternatives exist but cost 3-5x more than plastic equivalents. For families on tight budgets, choosing sustainable options is a luxury they cannot afford.',
   'a0000003-0000-4000-8000-000000000003', 'Amara Okafor',
   0, 0, 0, 0, 'approved', 'issue',
   '2025-09-12T15:20:00.000Z', '2025-09-12T15:20:00.000Z'),

  (9, 1, 'Low awareness of composting in urban areas',
   'Most urban residents don''t know how to compost or think it requires a backyard. Apartment dwellers especially lack options and knowledge about indoor composting methods like vermicomposting or bokashi.',
   'a0000005-0000-4000-8000-000000000005', 'Priya Sharma',
   0, 0, 0, 0, 'approved', 'issue',
   '2025-09-18T09:45:00.000Z', '2025-09-18T09:45:00.000Z');

-- ── Solutions for "Reduce household waste" (parent_id = 1) ──

INSERT OR IGNORE INTO issues (id, parent_id, title, description, author_id, author_name, solution_count, sub_issue_count, comment_count, source_count, status, type, created_at, updated_at) VALUES
  (10, 1, 'Community composting hubs in every neighborhood',
   'Set up shared composting stations in parks, community gardens, or parking lots. Residents drop off food scraps and yard waste, and the finished compost is available free to local gardeners. Cities like Portland and Copenhagen have proven this model works at scale.',
   'a0000004-0000-4000-8000-000000000004', 'Leo Martinez',
   0, 0, 0, 0, 'approved', 'solution',
   '2025-09-15T10:30:00.000Z', '2025-09-15T10:30:00.000Z'),

  (11, 1, 'Deposit-return scheme for all packaging',
   'Expand bottle deposit programs to cover all consumer packaging—cans, bottles, cartons, and containers. A small refundable deposit (10-25 cents) creates a financial incentive to return packaging for recycling rather than tossing it in the trash.',
   'a0000007-0000-4000-8000-000000000007', 'Yuki Tanaka',
   0, 0, 0, 0, 'approved', 'solution',
   '2025-09-22T14:00:00.000Z', '2025-09-22T14:00:00.000Z'),

  (12, 1, 'Municipal zero-waste starter kits',
   'Cities distribute free starter kits to households containing reusable bags, a countertop compost bin, a recycling guide for the local system, and coupons for refill stores. Lowers the barrier to entry and makes the first step easy.',
   'a0000008-0000-4000-8000-000000000008', 'Elena Popescu',
   0, 0, 0, 0, 'approved', 'solution',
   '2025-10-01T11:15:00.000Z', '2025-10-01T11:15:00.000Z');

-- ── Sub-issues for "Improve local public transport" (parent_id = 2) ──

INSERT OR IGNORE INTO issues (id, parent_id, title, description, author_id, author_name, solution_count, sub_issue_count, comment_count, source_count, status, type, created_at, updated_at) VALUES
  (13, 2, 'Bus routes don''t serve suburban neighborhoods',
   'Suburban residents often live more than a mile from the nearest bus stop, making transit impractical for daily commuting. Routes are designed around downtown corridors, ignoring the suburb-to-suburb trips that most people actually make.',
   'a0000001-0000-4000-8000-000000000001', 'Sarah Chen',
   0, 0, 0, 0, 'approved', 'issue',
   '2025-09-12T08:30:00.000Z', '2025-09-12T08:30:00.000Z'),

  (14, 2, 'Unreliable schedules and frequent delays',
   'Buses and trains regularly run 10-20 minutes late, making it impossible to plan trips reliably. Without real-time information, riders are left waiting at stops with no idea when their bus will arrive, pushing people back to cars.',
   'a0000006-0000-4000-8000-000000000006', 'James Whitfield',
   0, 0, 0, 0, 'approved', 'issue',
   '2025-09-18T17:00:00.000Z', '2025-09-18T17:00:00.000Z');

-- ── Solutions for "Improve local public transport" (parent_id = 2) ──

INSERT OR IGNORE INTO issues (id, parent_id, title, description, author_id, author_name, solution_count, sub_issue_count, comment_count, source_count, status, type, created_at, updated_at) VALUES
  (15, 2, 'On-demand micro-transit for underserved areas',
   'Deploy small shuttle vans that operate on flexible routes within suburban zones. Riders request pickups via an app, and an algorithm optimizes routes in real-time. This model (used by Via, ArrivaClick) fills gaps where fixed routes are inefficient.',
   'a0000005-0000-4000-8000-000000000005', 'Priya Sharma',
   0, 0, 0, 0, 'approved', 'solution',
   '2025-09-20T13:00:00.000Z', '2025-09-20T13:00:00.000Z'),

  (16, 2, 'Real-time tracking and open data for transit',
   'Require transit agencies to publish real-time vehicle positions using the GTFS-realtime standard. This enables accurate arrival predictions in apps like Google Maps and Transit, and lets the community build tools to hold agencies accountable for on-time performance.',
   'a0000004-0000-4000-8000-000000000004', 'Leo Martinez',
   0, 0, 0, 0, 'approved', 'solution',
   '2025-09-28T10:00:00.000Z', '2025-09-28T10:00:00.000Z'),

  (17, 2, 'Dedicated bus lanes on major corridors',
   'Paint and enforce dedicated bus-only lanes on the busiest corridors. This simple infrastructure change can cut bus travel times by 30-50% and dramatically improve reliability, as shown by BRT systems in Bogota, Istanbul, and Brisbane.',
   'a0000003-0000-4000-8000-000000000003', 'Amara Okafor',
   0, 0, 0, 0, 'approved', 'solution',
   '2025-10-05T15:30:00.000Z', '2025-10-05T15:30:00.000Z');

-- ── Sub-issues for "Cheaper access to clean water" (parent_id = 3) ──

INSERT OR IGNORE INTO issues (id, parent_id, title, description, author_id, author_name, solution_count, sub_issue_count, comment_count, source_count, status, type, created_at, updated_at) VALUES
  (18, 3, 'Aging water infrastructure causes contamination',
   'Many cities still use lead pipes and decades-old treatment facilities. Replacing this infrastructure costs billions, but delays mean continued exposure to contaminants like lead, PFAS, and bacteria for millions of residents.',
   'a0000008-0000-4000-8000-000000000008', 'Elena Popescu',
   0, 0, 0, 0, 'approved', 'issue',
   '2025-09-18T11:30:00.000Z', '2025-09-18T11:30:00.000Z'),

  (19, 3, 'Rural communities lack water treatment facilities',
   'Small towns and rural areas often rely on private wells or minimal treatment systems. They lack the tax base to fund modern treatment plants, leaving residents vulnerable to agricultural runoff, natural contaminants, and drought.',
   'a0000006-0000-4000-8000-000000000006', 'James Whitfield',
   0, 0, 0, 0, 'approved', 'issue',
   '2025-09-25T14:15:00.000Z', '2025-09-25T14:15:00.000Z');

-- ── Solutions for "Cheaper access to clean water" (parent_id = 3) ──

INSERT OR IGNORE INTO issues (id, parent_id, title, description, author_id, author_name, solution_count, sub_issue_count, comment_count, source_count, status, type, created_at, updated_at) VALUES
  (20, 3, 'Low-cost ceramic water filters for households',
   'Distribute locally-manufactured ceramic pot filters that cost under $10 and last 2-3 years. These filters remove 99.9% of bacteria and are already used successfully across Southeast Asia and Central America. Pair with a community education program on maintenance.',
   'a0000001-0000-4000-8000-000000000001', 'Sarah Chen',
   0, 0, 0, 0, 'approved', 'solution',
   '2025-10-02T09:00:00.000Z', '2025-10-02T09:00:00.000Z'),

  (21, 3, 'Rainwater harvesting programs with municipal support',
   'Provide subsidies and free installation for rooftop rainwater collection systems. Harvested water can be used for irrigation and, with simple treatment, for non-potable household use. Reduces demand on the municipal supply and lowers water bills.',
   'a0000002-0000-4000-8000-000000000002', 'Marcus Johnson',
   0, 0, 0, 0, 'approved', 'solution',
   '2025-10-08T16:00:00.000Z', '2025-10-08T16:00:00.000Z');

-- ── Sub-issues for "Affordable housing solutions" (parent_id = 4) ──

INSERT OR IGNORE INTO issues (id, parent_id, title, description, author_id, author_name, solution_count, sub_issue_count, comment_count, source_count, status, type, created_at, updated_at) VALUES
  (22, 4, 'Zoning laws restrict high-density development',
   'Single-family zoning in most residential areas makes it illegal to build duplexes, triplexes, or small apartment buildings. This artificial scarcity drives up land costs and forces new construction to sprawl outward rather than building up in existing neighborhoods.',
   'a0000007-0000-4000-8000-000000000007', 'Yuki Tanaka',
   0, 0, 0, 0, 'approved', 'issue',
   '2025-09-22T10:00:00.000Z', '2025-09-22T10:00:00.000Z'),

  (23, 4, 'Construction costs are rising faster than wages',
   'Material costs, labor shortages, and regulatory compliance have pushed the cost of building a new housing unit up by 30-40% in the last decade. Traditional construction methods are slow and expensive, pricing out affordable development.',
   'a0000002-0000-4000-8000-000000000002', 'Marcus Johnson',
   0, 0, 0, 0, 'approved', 'issue',
   '2025-09-28T13:45:00.000Z', '2025-09-28T13:45:00.000Z'),

  (24, 4, 'Short-term rentals reduce housing supply',
   'Platforms like Airbnb have converted thousands of long-term rental units into vacation properties. In tourist-heavy cities, entire apartment buildings sit empty most of the year while locals compete for the remaining housing stock.',
   'a0000005-0000-4000-8000-000000000005', 'Priya Sharma',
   0, 0, 0, 0, 'approved', 'issue',
   '2025-10-03T08:30:00.000Z', '2025-10-03T08:30:00.000Z');

-- ── Solutions for "Affordable housing solutions" (parent_id = 4) ──

INSERT OR IGNORE INTO issues (id, parent_id, title, description, author_id, author_name, solution_count, sub_issue_count, comment_count, source_count, status, type, created_at, updated_at) VALUES
  (25, 4, 'Community land trusts to keep housing affordable permanently',
   'Create community land trusts (CLTs) where a nonprofit owns the land and residents own the buildings. When homes are resold, price caps ensure they remain affordable for the next buyer. Over 250 CLTs in the US have proven this model preserves affordability across generations.',
   'a0000003-0000-4000-8000-000000000003', 'Amara Okafor',
   0, 0, 0, 0, 'approved', 'solution',
   '2025-10-05T11:00:00.000Z', '2025-10-05T11:00:00.000Z'),

  (26, 4, 'Modular prefab construction to cut building costs',
   'Factory-built modular housing units can be produced 30-50% faster and 10-20% cheaper than traditional construction. Units are built in controlled environments (no weather delays), transported to site, and assembled in days. Companies like Factory OS and Katerra have demonstrated this at scale.',
   'a0000001-0000-4000-8000-000000000001', 'Sarah Chen',
   0, 0, 0, 0, 'approved', 'solution',
   '2025-10-10T14:30:00.000Z', '2025-10-10T14:30:00.000Z'),

  (27, 4, 'Inclusionary zoning requiring affordable units',
   'Require that new residential developments above a certain size include 15-20% affordable units. Developers can alternatively pay into an affordable housing fund. Cities like Montreal, New York, and London use this approach to ensure new construction contributes to affordability rather than displacing it.',
   'a0000008-0000-4000-8000-000000000008', 'Elena Popescu',
   0, 0, 0, 0, 'approved', 'solution',
   '2025-10-15T09:15:00.000Z', '2025-10-15T09:15:00.000Z');

-- ── Sub-issues for "Accessible hydroponics systems" (parent_id = 5) ──

INSERT OR IGNORE INTO issues (id, parent_id, title, description, author_id, author_name, solution_count, sub_issue_count, comment_count, source_count, status, type, created_at, updated_at) VALUES
  (28, 5, 'High initial setup costs for home systems',
   'A basic home hydroponic system costs $200-500, and a serious setup runs $1,000+. For families in food deserts who would benefit most, this upfront cost is prohibitive even though the long-term savings on groceries are significant.',
   'a0000004-0000-4000-8000-000000000004', 'Leo Martinez',
   0, 0, 0, 0, 'approved', 'issue',
   '2025-09-28T15:00:00.000Z', '2025-09-28T15:00:00.000Z'),

  (29, 5, 'Lack of educational resources for beginners',
   'Most hydroponics content online is targeted at commercial growers or experienced hobbyists. Beginners face jargon-heavy guides, conflicting advice, and no local support. Without hands-on learning opportunities, people give up after their first failed crop.',
   'a0000008-0000-4000-8000-000000000008', 'Elena Popescu',
   0, 0, 0, 0, 'approved', 'issue',
   '2025-10-05T12:30:00.000Z', '2025-10-05T12:30:00.000Z');

-- ── Solutions for "Accessible hydroponics systems" (parent_id = 5) ──

INSERT OR IGNORE INTO issues (id, parent_id, title, description, author_id, author_name, solution_count, sub_issue_count, comment_count, source_count, status, type, created_at, updated_at) VALUES
  (30, 5, 'Open-source DIY hydroponics kits',
   'Design and publish open-source plans for hydroponic systems built from common hardware store materials (PVC pipes, plastic bins, aquarium pumps). Total cost under $50. Include step-by-step video tutorials and a community forum for troubleshooting. Projects like OpenAg and Farmbot have shown open-source agriculture works.',
   'a0000007-0000-4000-8000-000000000007', 'Yuki Tanaka',
   0, 0, 0, 0, 'approved', 'solution',
   '2025-10-08T10:00:00.000Z', '2025-10-08T10:00:00.000Z'),

  (31, 5, 'School and community center hydroponic gardens',
   'Install demonstration hydroponic gardens in schools and community centers. These serve as hands-on learning labs where residents can learn techniques, take home seedlings, and get ongoing mentorship. The produce supplements school lunch programs or community food banks.',
   'a0000006-0000-4000-8000-000000000006', 'James Whitfield',
   0, 0, 0, 0, 'approved', 'solution',
   '2025-10-12T16:00:00.000Z', '2025-10-12T16:00:00.000Z');

-- ── Sub-issues for "Curbing greenhouse gas emissions" (parent_id = 6) ──

INSERT OR IGNORE INTO issues (id, parent_id, title, description, author_id, author_name, solution_count, sub_issue_count, comment_count, source_count, status, type, created_at, updated_at) VALUES
  (32, 6, 'Industrial emissions lack local accountability',
   'Factories and industrial facilities are regulated at the state or federal level, but local communities bear the health and environmental burden. Residents near industrial zones have limited visibility into what is being emitted and no mechanism to demand reductions.',
   'a0000001-0000-4000-8000-000000000001', 'Sarah Chen',
   0, 0, 0, 0, 'approved', 'issue',
   '2025-10-01T08:00:00.000Z', '2025-10-01T08:00:00.000Z'),

  (33, 6, 'Buildings account for significant energy waste',
   'Residential and commercial buildings account for nearly 40% of energy consumption. Most existing buildings have poor insulation, outdated HVAC systems, and no smart energy management. Retrofitting is expensive, and landlords have little incentive when tenants pay the energy bills.',
   'a0000002-0000-4000-8000-000000000002', 'Marcus Johnson',
   0, 0, 0, 0, 'approved', 'issue',
   '2025-10-06T11:30:00.000Z', '2025-10-06T11:30:00.000Z'),

  (34, 6, 'Transportation sector relies heavily on fossil fuels',
   'Personal vehicles and freight trucks run almost entirely on gasoline and diesel. Even as EV adoption grows, charging infrastructure is sparse outside wealthy urban areas, and public transit electrification is slow due to budget constraints.',
   'a0000005-0000-4000-8000-000000000005', 'Priya Sharma',
   0, 0, 0, 0, 'approved', 'issue',
   '2025-10-10T14:00:00.000Z', '2025-10-10T14:00:00.000Z');

-- ── Solutions for "Curbing greenhouse gas emissions" (parent_id = 6) ──

INSERT OR IGNORE INTO issues (id, parent_id, title, description, author_id, author_name, solution_count, sub_issue_count, comment_count, source_count, status, type, created_at, updated_at) VALUES
  (35, 6, 'Mandatory building energy audits and retrofits',
   'Require energy audits for all buildings at point of sale or lease renewal. Buildings below a minimum efficiency rating must complete retrofits within 3 years, with low-interest municipal loans available. New York City''s Local Law 97 is a model—it sets emissions caps for large buildings with escalating penalties.',
   'a0000003-0000-4000-8000-000000000003', 'Amara Okafor',
   0, 0, 0, 0, 'approved', 'solution',
   '2025-10-12T09:00:00.000Z', '2025-10-12T09:00:00.000Z'),

  (36, 6, 'Community solar programs for renters and low-income households',
   'Build shared solar arrays on public land or rooftops and allow residents to subscribe for a share of the energy produced. Subscribers get credits on their electricity bills without needing to own property or install panels. Programs in Minnesota and Colorado have enrolled thousands of low-income households.',
   'a0000004-0000-4000-8000-000000000004', 'Leo Martinez',
   0, 0, 0, 0, 'approved', 'solution',
   '2025-10-18T13:30:00.000Z', '2025-10-18T13:30:00.000Z'),

  (37, 6, 'Car-free zones in city centers',
   'Permanently close select downtown streets to private vehicles, converting them to pedestrian plazas, bike lanes, and transit-only corridors. This reduces emissions directly while making walking, cycling, and transit more attractive. Cities like Oslo, Barcelona (superblocks), and Ghent have seen air quality improvements and increased retail activity.',
   'a0000007-0000-4000-8000-000000000007', 'Yuki Tanaka',
   0, 0, 0, 0, 'approved', 'solution',
   '2025-10-22T10:45:00.000Z', '2025-10-22T10:45:00.000Z'),

  (38, 6, 'Local carbon offset marketplace for small businesses',
   'Create a municipal platform where small businesses can purchase verified local carbon offsets—tree planting, building retrofits, methane capture from waste facilities. Keeps offset dollars in the community and creates local green jobs. Businesses get a visible "climate-positive" certification to display.',
   'a0000008-0000-4000-8000-000000000008', 'Elena Popescu',
   0, 0, 0, 0, 'approved', 'solution',
   '2025-10-28T15:00:00.000Z', '2025-10-28T15:00:00.000Z');
