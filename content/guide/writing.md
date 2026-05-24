---
title: Writing Guide
description: How to write high-quality issues, solutions, and case studies on CommunityFix.
---

# Writing Guide

How to write high-quality issues, solutions, and case studies on CommunityFix.

---

## Issues

An issue describes a **problem worth solving** — not a solution in disguise. Good issues enable diverse solution proposals by framing what's wrong without prescribing what to do about it.

### Summary (required, max 280 characters)

Follow this pattern:

> [Affected group/area] experiences [specific problem] [context/frequency], causing [primary impact].

**Good:** "Pedestrians on Rue de Rivoli face dangerous crossings at 3 unsignalized intersections, causing 12 injuries per year."

**Bad:** "We need a traffic light on Rue de Rivoli." *(This is a solution, not a problem.)*

### Description (optional, markdown)

Structure your description with these elements:

1. **Observable evidence** — What can be seen, measured, or documented. Separate facts from interpretation.
2. **Who is affected** — Specific population, approximate numbers, nature of the harm.
3. **Scope boundaries** — Where and when the problem occurs. Explicitly state what is and isn't included.
4. **Current state vs. desired state** — The gap: "Response time averages 48 hours; residents expect under 4 hours."
5. **Impact** — Consequences if the problem remains unaddressed.

### Common mistakes

| Mistake | Example | Fix |
|---------|---------|-----|
| Solution disguised as issue | "We need a bike lane" | "Cyclists face unsafe conditions due to [hazards]" |
| Too vague | "Roads are bad" | Specify which roads, what's wrong, who's affected |
| Too broad | "Climate change" | Narrow to a specific, actionable facet |
| Emotional venting | "The mayor doesn't care" | Describe the observable problem objectively |
| No scope | "Pollution" | "PM2.5 levels in [district] exceed WHO limits 180 days/year" |

### Sub-issues

When decomposing a large issue:

- Each sub-issue should be understandable without reading the parent
- Sub-issues shouldn't overlap with each other
- Each should be narrow enough that a single solution could address it

---

## Solutions

A solution is a **specific proposed intervention** to address a parent issue. It should be actionable, evidence-informed, and honest about trade-offs.

### Summary (required, max 280 characters)

Follow this pattern:

> [Action verb] [specific intervention] [by/for whom] to [expected outcome].

**Good:** "Install protected bike infrastructure on the 2km stretch of Avenue X to reduce cyclist injuries by an estimated 60%."

**Bad:** "Make cycling safer." *(Too vague — no intervention specified.)*

### Description (optional, markdown)

Structure your description:

1. **The proposal** — Lead with the specific action. Name who would implement it, at what scale, and in what timeframe.
2. **Why it would work** — The causal logic. What mechanism connects this action to the desired outcome? State assumptions explicitly.
3. **Evidence** — What existing research, data, or precedents support this approach? Link to sources.
4. **Implementation path** — Practical steps, responsible parties, estimated timeline and resources.
5. **Trade-offs and limitations** — What won't this solve? What could go wrong? What conditions must be met?

### Links

Use the links field to point to supporting resources: academic papers, technical specs, cost estimates, reference implementations, or precedent projects in other cities.

### Key principles

- **Be specific** — Name the intervention, the actor, the scale, and the timeline
- **Name the responsible party** — Who has the authority and resources to implement this?
- **Cite evidence** — Even one relevant precedent is better than none
- **Acknowledge limitations** — Credibility comes from honesty about what you don't know
- **Stay proportionate** — The solution's scope should match the parent issue's scope

---

## Case Studies

A case study documents a **real-world implementation** of a solution — what was tried, what happened, and what others can learn from it. Failed implementations are especially valuable.

### Outcome

Choose honestly:

| Outcome | When to use |
|---------|-------------|
| **Success** | Clear evidence that stated goals were met |
| **Partial** | Some goals met, others not — specify which |
| **Failed** | Goals were not met — document why |
| **Inconclusive** | Not enough data or time to determine results |
| **Ongoing** | Still in progress — include interim indicators |

"Partial" is often the most accurate outcome. Don't inflate results.

### Location

Be as specific as meaningful. Neighborhood-level is usually better than city-level for local interventions. Precise locations enable comparison between similar contexts.

### Description

Write a narrative of **what actually happened** (not what was planned):

- Timeline of key events and decisions
- How the implementation deviated from the original plan and why
- Context that influenced outcomes (political, economic, social factors)
- Challenges encountered and how they were handled

### Metrics

Each metric should include:

- **Indicator name** — What you measured
- **Baseline** — The value before the intervention
- **Actual result** — The value after
- **Data source** — Where this number comes from
- **Comparison** — "Compared to the previous year..." or "vs. a control area..."

Distinguish **outputs** (what was produced: "3 km of bike lane built") from **outcomes** (what changed: "cyclist injuries dropped 40%").

### Cost

Report:

- Total cost AND per-unit cost where meaningful (cost per beneficiary, per km, etc.)
- Direct costs and known indirect costs
- Funding source — others need to know where money came from to assess reproducibility

### Sources

Apply the verifiability standard: claims must be backed by independent, reliable sources.

**Prefer:** Government reports, audited financials, peer-reviewed evaluations, reputable media.

**Avoid:** Promotional materials from the implementer, unverified social media, sources with conflicts of interest.

### Lessons learned

Answer these questions:

- What would you do differently next time?
- What surprised you?
- What conditions were necessary for this to work (or fail)?
- What's transferable to other contexts vs. context-specific?

### Documenting failure

When an implementation didn't work, distinguish between:

- **Failure of concept** — The idea was wrong
- **Failure of execution** — The idea was sound but implementation was poor
- **Failure of context** — The idea might work elsewhere, but local conditions prevented it

Include enough detail for others to avoid the same mistakes.

---

## Tags

- Use **noun phrases**, not sentences ("public transit", not "we should improve public transit")
- Be **specific** — use both broad ("transport") and narrow ("bus frequency") tags where appropriate
- Maximum **5-7 tags** per issue
- Avoid subjective or opinion tags ("broken system", "government failure")

---

## Quality standards

### Minimum requirements

All content must be:

- Written in intelligible language
- On-topic (describes a real public problem, intervention, or implementation)
- Not a duplicate of existing content
- Free of hate speech, harassment, or private personal information
- Factually plausible

### What makes content stand out

- **Verifiable** — Claims correspond to checkable sources
- **Specific** — Names locations, populations, timeframes, magnitudes
- **Neutral tone** — Represents the situation fairly, without editorial bias
- **Properly scoped** — Not too broad, not too narrow
- **Evidence-based** — Cites data, research, or documented precedent
- **Acknowledges alternatives** — Shows awareness of other perspectives

---

## Quick reference

| Field | Pattern | Example |
|-------|---------|---------|
| Issue summary | [Who] experiences [what] [where/when], causing [impact] | "Residents of District 5 lack grocery access within 1km, leading to food insecurity for 2,000 households" |
| Solution summary | [Verb] [intervention] [by whom] to [outcome] | "Establish a weekly mobile market serving 3 underserved neighborhoods to provide affordable fresh produce" |
| Case study outcome | Honest assessment based on evidence | "Partial — food access improved but vendor sustainability remains uncertain after 18 months" |
