---
title: Structuring Problems
description: How to model a problem as issues, sub-issues, solutions, and case studies — getting scope and granularity right, and avoiding duplicates.
---

# Structuring Problems

The value of CommunityFix comes from a *clean* tree: each node says one thing, sits in the right place, and isn't a duplicate of something that already exists. This guide is about modeling — deciding what to create and where it belongs — not about wording (that's the [Writing guide](/guide/writing)).

---

## The shape of the tree

- An **issue** can contain **sub-issues** (narrower facets) and **solutions** (proposed fixes).
- A **solution** is a leaf of the issue tree — it can't have sub-solutions — but it can carry **case studies**.
- A **case study** documents one real-world attempt at its parent solution.

Solutions always point at an **issue** as their parent (never another solution). Case studies always point at a **solution**.

---

## Which node am I creating?

| You want to capture… | Create a… | Parent |
|---|---|---|
| A problem | **Issue** (top-level) | none |
| A narrower facet of an existing problem | **Sub-issue** | the broader issue |
| A proposed way to fix an issue | **Solution** | the issue it addresses |
| Another approach to the *same* issue | **Sibling solution** | the same issue |
| A real-world attempt at a solution | **Case study** | the solution |

The fastest disambiguator:

> **Issues describe what is wrong. Solutions prescribe what to do. Case studies record what actually happened.**

If a "problem" already contains a fix ("we need a bike lane"), it's a solution wearing an issue's clothes — reframe it as the underlying problem ("cyclists face unsafe conditions on Route X") and put the bike lane forward as a solution.

---

## One node, one thing

A good node reads like a focused statement of a single problem or a single approach. Resist the urge to pack everything into one place:

- Multiple aspects of a problem → separate **sub-issues**.
- Several ways to solve it → separate **sibling solutions**.
- "We tried this in three cities" → three separate **case studies**.
- A survey of prior attempts, an "alternatives" list, or a pros/cons comparison → these don't belong inside any single node; they emerge naturally from siblings in the tree.

If you catch yourself writing headings like *Alternatives*, *Other approaches*, or *Why X failed* inside one node, stop and create the sibling nodes instead.

---

## Decomposing a large issue

Break a broad issue into sub-issues that are:

- **Mutually exclusive** — sub-issues shouldn't overlap each other.
- **Collectively meaningful** — together they cover the important facets (they don't have to be exhaustive).
- **Independently understandable** — each sub-issue makes sense without reading its siblings.
- **Right-sized** — narrow enough that a *single solution could plausibly address it*. That last test is the best granularity check.

**Too broad:** "Climate change" — nothing actionable hangs off it directly.
**Better:** "Diesel bus emissions in the downtown core" — a solution can target this.

### Sub-issue vs. new top-level issue

Make it a **sub-issue** when it only makes sense as a facet of a parent problem. Make it a **top-level issue** when it stands on its own and could attract solutions independently of any one parent.

---

## Solution vs. case study

This trips people up often:

- A **solution** is the *general* idea — "Electrify the municipal bus fleet." It stays abstract and portable across places.
- A **case study** is one *concrete deployment* of that idea — "Shenzhen electrified all 16,000 buses by 2017; here's what happened." It carries a real location, outcome, metrics, and cost.

If you're recording that a specific place tried something, that's a case study against the existing solution — not a new solution.

---

## Avoid duplicates

Before creating anything, **search**. A near-duplicate splits attention, votes, and case studies across two nodes and weakens both.

- Search by meaning, not just keywords, and skim the closest matches.
- If a node already covers your point, **improve it** (edit the summary/description, add a solution, attach a case study) instead of starting a new one.
- When you create through the API or an AI assistant, the platform actively blocks likely duplicates: it returns a `similar_found` response listing the close matches so you can review them before deciding to proceed.

---

## Place it on the map

Issues and solutions can carry an optional location and a **scale** — `neighborhood`, `city`, `region`, `national`, or `global`. Case studies *require* a precise location. Set the scale that matches the node's reach: a pothole is `neighborhood`; a carbon tax is `national`. Accurate location and scale make the catalog browsable by place and let similar contexts be compared.

---

## Common structural mistakes

| Mistake | Fix |
|---|---|
| Solution filed as an issue | Reframe as the underlying problem; add the fix as a solution |
| Mega-issue covering a whole domain | Split into right-sized sub-issues |
| Two sub-issues that overlap | Merge, or redraw the boundary so they're distinct |
| New solution that's really a deployment | Attach a case study to the existing solution |
| Duplicate of an existing node | Update the original instead |
| "Alternatives" section inside one node | Create sibling solutions |

---

## Quick checklist

- [ ] I picked the right node type (issue / sub-issue / solution / case study).
- [ ] It says exactly one thing.
- [ ] It's parented correctly (solution → issue, case study → solution).
- [ ] A single solution could address it (if it's an issue/sub-issue).
- [ ] I searched and it isn't a duplicate.
- [ ] Location and scale are set where they apply.
