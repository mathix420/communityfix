# Ranking & Trust

## Trending algorithm

Adapted from the [Hacker News formula](https://medium.com/hacking-and-gonzo/how-hacker-news-ranking-algorithm-works-1d9b0cf2c08d) (`score / (age + 2)^gravity`) with multi-signal engagement scoring.

### Formula

```
engagement = voteScore + (solutionCount × 3) + (subIssueCount × 2) + commentCount
trending   = engagement / (age_hours + 2) ^ 1.5
```

### Signals

| Signal | Weight | Rationale |
|---|---|---|
| `voteScore` | 1× | Already trust-weighted (see Weighted Voting below) |
| `solutionCount` | 3× | Highest-value engagement — someone proposed a fix |
| `subIssueCount` | 2× | Issue is being actively decomposed into sub-problems |
| `commentCount` | 1× | Basic engagement signal |

### Parameters

- **Gravity = 1.5** — gentler than HN's 1.8 because community issues stay relevant longer than tech news. A higher value makes old content drop off faster.
- **+2 offset** — prevents division-by-zero and gives new posts a brief boost window before decay kicks in.

### Usage

Used on three endpoints, all accepting `?sort=trending|newest|oldest|most_voted`:

| Endpoint | Default sort |
|---|---|
| `GET /api/issues` | `newest` |
| `GET /api/issue/:id/issues` | `trending` |
| `GET /api/issue/:id/solutions` | `trending` |

### SQL implementation

```sql
(vote_score + solution_count * 3 + sub_issue_count * 2 + comment_count)::float
  / POWER(EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600 + 2, 1.5)
```

---

## Trust score

Each user has a trust score (0–100) stored in `users.trust_score`, computed from their activity and history.

### Factors

| Factor | Max points | Scale |
|---|---|---|
| Account age | 15 | Logarithmic, caps at ~1 year |
| Approved contributions | 30 | Logarithmic, caps at ~50 contributions |
| Approval rate | 15 | Linear ratio of approved / total submissions |
| Weighted votes received | 20 | Logarithmic, caps at ~200 net votes; negatives deduct up to −10 |
| Solutions authored | 10 | Logarithmic bonus, caps at ~20 solutions |
| Voting engagement | 10 | Logarithmic, caps at ~100 votes cast |
| Ban history | −20 | Flat penalty if user was ever banned |

### When it's recalculated

- **On issue approval or rejection** — in `server/utils/review-issue.ts`
- **On vote cast or removed** — in `server/api/issue/[id]/vote.post.ts` and `vote.delete.ts`
- **Daily cron fallback** — `compute:trust-scores` Nitro task runs at 3:00 AM UTC

### Implementation

- Computation logic: `server/utils/trust-score.ts`
- Batch recomputation task: `server/tasks/compute/trust-scores.ts`
- Exposed in: `GET /api/user/:id` response as `trustScore`

---

## Weighted voting

A voter's trust score determines how much their vote counts. Higher-trust users have more influence on issue rankings.

### Weight mapping

```
weight = floor(trustScore / 20) + 1
```

| Trust score range | Vote weight |
|---|---|
| 0–19 | 1 |
| 20–39 | 2 |
| 40–59 | 3 |
| 60–79 | 4 |
| 80–100 | 5 |

### How it works

1. When a user votes, their current trust score is converted to a weight (1–5).
2. The weight is stored on the vote record (`votes.weight` column).
3. The issue's `voteScore` is recalculated as `SUM(value × weight)` — a weighted sum rather than a simple count.
4. Since `voteScore` feeds into the trending formula, trusted users' votes carry more influence in rankings.
5. Since `voteScore` also feeds into other users' trust scores (via "weighted votes received"), the system is self-reinforcing: trusted users amplify trustworthy content.

### Example

A user with trust score 72 (weight 4) upvotes an issue:
- Their vote contributes **+4** to the issue's `voteScore` (vs +1 from a new user with score 5).
- The issue author's trust score increases more from this high-weight upvote.
