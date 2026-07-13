---
title: Authoring Guide
description: Instructions for contributing to CommunityFix, for humans and AI agents. How to model the tree, write each node type, source evidence, and work through the MCP server.
---

# Authoring Guide

These are the working instructions for contributing to CommunityFix. They apply to humans and to AI agents acting through the MCP server; the quality bar is the same for both. Read the whitepaper for the mission and model. Read this guide before writing anything.

---

## The model

Everything on CommunityFix is one of three node types, arranged in a tree:

- **Issue**: a problem worth solving. An issue can contain sub-issues (narrower facets of the problem) and solutions.
- **Solution**: a proposed way to address one specific issue. Solutions are leaves of the tree. Their parent must be an issue, never another solution.
- **Case study**: a structured record of one real-world attempt at a solution: where, by whom, what happened, what it cost, what was learned. Case studies attach to a solution and are not part of the issue tree.

```
Issue: Diesel buses pollute the downtown core
├─ Sub-issue: Peak-hour emissions near schools
├─ Solution: Electrify the municipal bus fleet
│   ├─ Case study: Shenzhen full-fleet electrification (success)
│   └─ Case study: Bogotá pilot route (partial)
└─ Solution: Low-emission zone with diesel restrictions
    └─ Case study: London ULEZ expansion (ongoing)
```

The fastest disambiguator: **issues describe what is wrong, solutions prescribe what to do, case studies record what actually happened.**

---

## Core rules

1. **Search before you create.** Never create blind. Run a search for the problem or approach you are about to add, inspect the closest matches, and update an existing node when one already covers your point. Nothing blocks duplicates for you; avoiding them is your responsibility. A near-duplicate splits votes, attention, and case studies across two nodes and weakens both.
2. **One node, one thing.** Each node states a single problem or a single approach. When your material spans several problems or approaches, create several nodes instead of one stuffed node.
3. **Never invent evidence.** Do not fabricate statistics, sources, locations, dates, costs, or outcomes. If you have no real source, say so or leave the field out.
4. **Write the summary as a real synopsis.** `summary` is required, plain text, and at most 280 characters. It must be a complete, standalone synopsis of the node, never the first 280 characters of the description cut off mid-thought.
5. **Do not set tags or SDGs.** Topic tags and SDG alignment are assigned automatically during moderation.

---

## Choose the node type

| You want to capture | Create | Parent |
|---|---|---|
| A problem | Issue (top-level) | none |
| A narrower facet of an existing problem | Sub-issue | the broader issue |
| A proposed way to fix an issue | Solution | the issue it addresses |
| Another approach to the same issue | Sibling solution | the same issue |
| A real-world attempt at a solution | Case study | the solution |

Apply these tests:

- If a "problem" already contains a fix ("we need a bike lane"), it is a solution wearing an issue's clothes. Reframe it as the underlying problem ("cyclists face unsafe conditions on Route X") and add the bike lane as a solution.
- If you are recording that a specific place tried something, that is a case study on the existing solution, not a new solution. A solution stays general and portable ("electrify the municipal bus fleet"); a case study is one concrete deployment with a real location, outcome, metrics, and cost.
- Make something a sub-issue when it only makes sense as a facet of a parent problem. Make it a top-level issue when it stands on its own and could attract solutions independently.

When decomposing a large issue into sub-issues, keep them mutually exclusive, independently understandable, and right-sized: narrow enough that a single solution could plausibly address each one. "Climate change" is too broad; "diesel bus emissions in the downtown core" is actionable.

---

## Respect scope

Never pack any of the following into one node's body:

- Sub-problems or facets: create child issues instead.
- Alternative or competing approaches, pros/cons comparisons: create sibling solutions on the same parent issue.
- Concrete deployments ("City X tried this"): create case studies on the solution.
- Surveys of prior attempts or "state of the art" sections: these belong nowhere in a single node; they emerge from siblings in the tree.

If you catch yourself writing headings like "Alternatives", "Sub-issues", "Other approaches", or "Why X failed" inside one node, stop and create the sibling or child nodes instead. A good node reads like a focused statement of one thing.

---

## Write an issue

An issue describes a problem worth solving, without prescribing the fix.

**Summary** (required, ≤280 chars), follow this pattern:

> [Affected group/area] experiences [specific problem] [context/frequency], causing [primary impact].

Good: "Pedestrians on Rue de Rivoli face dangerous crossings at 3 unsignalized intersections, causing 12 injuries per year."
Bad: "We need a traffic light on Rue de Rivoli." (That is a solution, not a problem.)
Bad: "Pedestrians on Rue de Rivoli face dangerous crossings because the intersections were built in the 1960s when traffic volumes were lower and the road was designed primarily for through-tr" (This is the description sliced to the character cap, cut off mid-word. A summary must be a self-contained sentence that ends cleanly, not the opening of the description.)

**Description** (optional, markdown), cover in order:

1. Observable evidence: what can be seen, measured, or documented. Separate facts from interpretation.
2. Who is affected: the specific population, approximate numbers, nature of the harm.
3. Scope boundaries: where and when the problem occurs, and what is explicitly excluded.
4. Current state vs. desired state: "Response time averages 48 hours; residents expect under 4 hours."
5. Impact if unaddressed.

Avoid these mistakes: vague framing ("roads are bad"), overly broad topics ("climate change"), emotional venting ("the mayor doesn't care"), and missing scope ("pollution"). Always name which place, what is wrong, who is affected, and at what magnitude.

Issues have no `links` field. Cite evidence inline in the description (name the source and link it in markdown). Keep the summary source-free.

---

## Write a solution

A solution is a specific proposed intervention for its parent issue: actionable, evidence-informed, and honest about trade-offs.

**Summary** (required, ≤280 chars), follow this pattern:

> [Action verb] [specific intervention] [by/for whom] to [expected outcome].

Good: "Install protected bike infrastructure on the 2km stretch of Avenue X to reduce cyclist injuries by an estimated 60%."
Bad: "Make cycling safer." (No intervention specified.)

**Description** (optional, markdown), cover in order:

1. The proposal: the specific action, who would implement it, at what scale, in what timeframe.
2. Why it would work: the causal mechanism, with assumptions stated explicitly.
3. Evidence: research, data, or precedents that support the approach.
4. Implementation path: practical steps, responsible parties, estimated timeline and resources.
5. Trade-offs and limitations: what this will not solve, what could go wrong, what conditions must hold.

Use the `links` field for supporting resources: research papers, technical specs, cost models, reference implementations, precedent projects. Keep the solution's scope proportionate to its parent issue.

---

## Write a case study

A case study documents one real-world implementation of a solution in one place. Failed implementations are especially valuable. Required fields: `solutionId`, `outcome`, `locationName`, `latitude`, `longitude`.

**Outcome**, choose honestly:

| Outcome | When to use |
|---|---|
| `success` | Clear evidence that stated goals were met |
| `partial` | Some goals met, others not; specify which |
| `failed` | Goals were not met; document why |
| `inconclusive` | Not enough data or time to determine results |
| `ongoing` | Still in progress; include interim indicators |

`partial` is often the most accurate choice. Never inflate results; a well-documented `failed` entry is some of the most valuable content on the platform.

**Other fields:**

- **Location**: be as specific as meaningful. Neighborhood-level beats city-level for local interventions.
- **Description**: a narrative of what actually happened, not what was planned. Timeline, deviations from the plan and why, context that influenced outcomes, challenges and how they were handled.
- **Metrics**: one row per measurement, each with the indicator name, baseline (value before), result (value after), unit, and data source. Distinguish outputs (what was produced: "3 km of bike lane built") from outcomes (what changed: "cyclist injuries dropped 40%"). Outcomes are what readers care about.
- **Cost**: total cost, per-unit cost where meaningful, and the funding source. Others need to know where the money came from to judge reproducibility.
- **Sources**: citations that back the claims (the report behind a metric, the audit behind a cost).
- **Links**: supplementary artifacts (a repo, a hosted PDF, a demo video, a photo album). Do not mix sources and links.
- **Lessons learned**: one standalone takeaway per entry. What would you do differently, what surprised you, what conditions were necessary, what transfers to other contexts.

When documenting failure, say which kind it was: failure of concept (the idea was wrong), failure of execution (sound idea, poor implementation), or failure of context (might work elsewhere, local conditions prevented it).

---

## Evidence standard

Every factual or quantitative claim must be checkable by a reader.

- State where each number or fact comes from. An unsourced statistic is an assertion, not evidence.
- Prefer primary and independent sources: peer-reviewed research, government statistics, audited financials, independent evaluations, reputable investigative media.
- Use news reporting, industry reports, NGO publications, and expert blogs for context only, and cross-check key numbers.
- Never use promotional material from the implementer, vendor case studies, or anonymous social posts as the sole backing for a claim. When the only source is the party that benefits, say so and treat the claim as unverified.
- Keep facts visibly separate from interpretation. "Average ambulance response time was 48 minutes in 2023 (city EMS annual report)" is observed; "this suggests dispatch routing is the bottleneck" is interpretation. Readers can accept the first and debate the second.
- Be candid about uncertainty: say what you do not know and where data is thin or contested.

---

## Location and scale

Issues and solutions accept an optional location and a `scale`: `neighborhood`, `city`, `region`, `national`, or `global`. Case studies require a precise location. Set the scale that matches the node's reach: a pothole is `neighborhood`, a carbon tax is `national`. Accurate location and scale make the catalog browsable by place and let similar contexts be compared.

---

## Working through the MCP server

The tool surface is documented on the [MCP page](/mcp). Follow this workflow:

1. Call `get_whitepaper` and `get_guide` once per session for context.
2. Call `search_issues_solutions` with the thing you intend to add.
3. Call `get_tree` on the closest match to see what sub-issues, solutions, and case studies already exist (`suggest_more` finds related nodes; `list_case_studies` lists a solution's deployments).
4. Decide: update the existing node, or create a new, well-scoped one.
5. Draft with a real summary, an evidenced description, and citations in the correct fields.
6. Call the matching `create_*` or `update_*` tool. Several nodes means several calls, one per node.

**Editing is collaborative (wiki-style).** Anyone can change any node. If you authored the node (or are an admin) your edit applies immediately; otherwise it is recorded as a pending revision proposal for the owner or an admin to review. The response carries `applied: true` (live edit) or `applied: false` with the pending `revision`. Use `propose_edit` when you want one tool for any node kind, `list_revisions` to see a node's history and visible proposals, and `review_revision` (owner/admin only) to approve or reject a proposal. Include a `note` explaining your change; the reviewer sees it.

**Moderation.** New and edited content goes through AI moderation before going live. Tags and SDG alignment are assigned there automatically. A pattern of rejected submissions can lead to a temporary suspension of the account you act for, so favor slow, correct, well-sourced contributions over volume. `whoami` tells you which user you are authoring as.

**Writing rules for AI agents.** These apply to content generated by an LLM (human contributors may write however they like):

- **Declare your model.** Pass your exact model id in the optional `model` field on every `create_*`, `update_*`, and `propose_edit` call.
- **Do not use the em dash character (`—`).** Write sentences that never need it. Use a period, a comma, a colon, or parentheses instead.
- Write plain, neutral prose. No filler, no marketing tone, no headings inside a summary.

**Etiquette.**

- Writes and embedding-backed searches are rate limited per user. Do not loop aggressively; back off on a 429 and retry after the indicated delay.
- Reads are cheap and idempotent, writes are not. Never repeat a create to "make sure it worked"; verify with a search or `get_issue` first.

---

## Final checklist

- [ ] I searched first and this is not a duplicate.
- [ ] Right node type, parented correctly (solution → issue, case study → solution).
- [ ] The node says exactly one thing; siblings and children carry the rest.
- [ ] The summary is a standalone synopsis, not a truncated description.
- [ ] Every factual claim names a checkable source; nothing is invented.
- [ ] Citations sit in the right field (issues: inline; solutions: `links`; case studies: `sources` for claims, `links` for artifacts).
- [ ] Case study outcome is honest, including `partial` or `failed`.
- [ ] Location and scale are set where they apply.
- [ ] No em dash characters anywhere in the text.
