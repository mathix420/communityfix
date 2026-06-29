---
title: Evidence & Sourcing
description: How to back your contributions with credible, verifiable sources — the evidence standard CommunityFix holds all content to.
---

# Evidence & Sourcing

CommunityFix is only as trustworthy as the claims inside it. Decisions about what to prioritize, fund, and incubate rest on the catalog being accurate — so every contribution should be grounded in evidence a reader can check. This guide applies to issues, solutions, **and** case studies.

---

## The verifiability standard

A claim is only as strong as a reader's ability to confirm it independently.

- State **where a number or fact comes from**. An unsourced statistic is treated as an assertion, not evidence.
- Prefer **primary and independent** sources over second-hand summaries.
- Separate what is **observed/measured** from what is **inferred/argued** — don't present interpretation as fact.

---

## Source quality hierarchy

| Tier | Examples | Use for |
|---|---|---|
| **Prefer** | Peer-reviewed research, government statistics, audited financials, independent evaluations, reputable investigative media | Any factual or quantitative claim |
| **Use with caution** | News reporting, industry reports, NGO publications, expert blogs | Context and corroboration; cross-check key numbers |
| **Avoid as proof** | Promotional material from the implementer, vendor case studies, anonymous social posts, sources with a conflict of interest | At most, illustration — never as the sole backing for a claim |

When the only available source is the party that benefits from the claim, say so explicitly and treat the claim as unverified.

---

## Fact vs. interpretation

Keep the two visibly separate:

> **Observed:** "Average ambulance response time was 48 minutes in 2023 (city EMS annual report)."
> **Interpretation:** "This suggests dispatch routing is the bottleneck."

Readers can accept the first and debate the second. Blending them buries the evidence.

---

## Where citations go (by node type)

- **Issues** — there is no links field on an issue. Cite evidence *inline in the description* (name the source, link it in markdown) and describe what it shows. Keep the summary clean and source-free.
- **Solutions** — use the **`links`** field for supporting resources: research, technical specs, cost models, reference implementations, precedent projects.
- **Case studies** — keep **`sources`** for citations that *back the claims* (the report behind a metric, the audit behind a cost). Use **`links`** for supplementary *artifacts* (a repo, a hosted PDF, a demo video, a photo album). Don't mix the two.

---

## Quantitative claims

A number is only useful with its context. For every metric, give:

- **Indicator** — what was measured.
- **Baseline** — the value *before* (or a control to compare against).
- **Result** — the value *after*.
- **Unit** — so the magnitude is unambiguous.
- **Source** — where the figure comes from.

Distinguish **outputs** (what was produced — "3 km of bike lane built") from **outcomes** (what changed — "cyclist injuries fell 40%"). Outcomes are what readers care about; outputs alone can mislead.

---

## Be honest about uncertainty

Credibility comes from candor, not confidence.

- Say what you **don't** know, and where the data is thin or contested.
- For case studies, pick the outcome honestly — **`partial`** is often the most accurate, and a well-documented **`failed`** result is some of the most valuable content on the platform. Don't inflate results.
- Note the conditions a result depended on, so others can judge whether it transfers to their context.

---

## What will not pass review

Moderation and the community filter out content that undermines trust:

- Fabricated, misattributed, or unverifiable statistics.
- Promotional spin presented as neutral evidence.
- Hate speech, harassment, or private personal information.
- Implausible claims with no checkable backing.

If you wouldn't stake your own credibility on a claim, don't publish it without a source — or frame it explicitly as an open question.

---

## Quick checklist

- [ ] Every factual/quantitative claim names a source.
- [ ] Sources lean toward the **Prefer** tier; conflicts of interest are disclosed.
- [ ] Facts are separated from interpretation.
- [ ] Metrics include baseline, result, unit, and source.
- [ ] Outcome (for case studies) is honest, including partial or failed.
- [ ] Citations are in the right field for the node type.
