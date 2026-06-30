// Per-user proposal rate limit. Stops a single account from flooding owners
// (and the AI pre-screen) with revision proposals. Uses the same `useStorage`
// pattern as the email-pin cooldown — a small sliding window of recent
// proposal timestamps kept in KV, pruned on each check. Reused by the REST
// `PATCH` endpoints and the MCP propose paths.

// How many proposals a user may create per window.
export const PROPOSAL_RATE_LIMIT = 20
// Sliding window length (24h).
export const PROPOSAL_RATE_WINDOW_MS = 24 * 60 * 60 * 1000

function proposalKey(userId: string) {
  return `proposal-rate:${userId}`
}

/**
 * Throws a 429 when the user has already created `PROPOSAL_RATE_LIMIT`
 * proposals within the trailing `PROPOSAL_RATE_WINDOW_MS`. Otherwise records
 * the current attempt and returns. Best treated as advisory — KV is per-region
 * and not strongly consistent — but it's enough to blunt abuse.
 */
export async function checkProposalRateLimit(userId: string): Promise<void> {
  const storage = useStorage('auth')
  const key = proposalKey(userId)
  const now = Date.now()

  const recent = (await storage.getItem<number[]>(key)) ?? []
  const windowed = recent.filter((ts) => now - ts < PROPOSAL_RATE_WINDOW_MS)

  if (windowed.length >= PROPOSAL_RATE_LIMIT) {
    throw createError({
      statusCode: 429,
      message: `You can propose at most ${PROPOSAL_RATE_LIMIT} edits per day. Try again later.`,
    })
  }

  windowed.push(now)
  await storage.setItem(key, windowed)
}
