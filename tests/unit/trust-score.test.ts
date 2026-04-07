import { describe, it, expect } from 'vitest'
import { computeScore, trustScoreToVoteWeight, type TrustScoreFactors } from '../../server/utils/trust-score'

const baseline: TrustScoreFactors = {
  accountAgeDays: 0,
  approvedCount: 0,
  rejectedCount: 0,
  solutionCount: 0,
  totalVotesReceived: 0,
  votesCast: 0,
  wasBanned: false,
}

describe('computeScore', () => {
  it('returns 0 for a brand-new user with zero activity', () => {
    expect(computeScore(baseline)).toBe(0)
  })

  it('clamps the final score to [0, 100]', () => {
    const fullyTrusted = computeScore({
      accountAgeDays: 5000,
      approvedCount: 10000,
      rejectedCount: 0,
      solutionCount: 1000,
      totalVotesReceived: 100000,
      votesCast: 10000,
      wasBanned: false,
    })
    expect(fullyTrusted).toBeLessThanOrEqual(100)
    expect(fullyTrusted).toBeGreaterThanOrEqual(0)
  })

  it('applies the ban penalty when wasBanned is true', () => {
    const withoutBan = computeScore({ ...baseline, accountAgeDays: 365, approvedCount: 50, totalVotesReceived: 100, votesCast: 100, solutionCount: 20, wasBanned: false })
    const withBan = computeScore({ ...baseline, accountAgeDays: 365, approvedCount: 50, totalVotesReceived: 100, votesCast: 100, solutionCount: 20, wasBanned: true })
    expect(withBan).toBe(Math.max(0, withoutBan - 20))
  })

  it('reaches the 15-point account-age cap exactly at 365 days', () => {
    const at365 = computeScore({ ...baseline, accountAgeDays: 365 })
    const at730 = computeScore({ ...baseline, accountAgeDays: 730 })
    expect(at365).toBe(15)
    expect(at730).toBe(15)
  })

  it('awards zero approval points when the user has never submitted', () => {
    // Edge case: zero submissions should NOT trigger the approval bonus,
    // even though the fallback approvalRate is 1.
    const score = computeScore({ ...baseline, accountAgeDays: 365 })
    // 15 (age) + 0 (everything else) = 15
    expect(score).toBe(15)
  })

  it('credits a perfect approval rate when there are submissions', () => {
    const allApproved = computeScore({ ...baseline, approvedCount: 10, rejectedCount: 0 })
    const halfApproved = computeScore({ ...baseline, approvedCount: 5, rejectedCount: 5 })
    expect(allApproved).toBeGreaterThan(halfApproved)
  })

  it('penalises negative weighted vote sums down to -10', () => {
    const slightlyNegative = computeScore({ ...baseline, totalVotesReceived: -3 })
    const veryNegative = computeScore({ ...baseline, totalVotesReceived: -100 })
    // Negative votes deduct directly, then the 0..100 clamp pulls back to 0.
    expect(slightlyNegative).toBe(0)
    expect(veryNegative).toBe(0)
  })

  it('rounds the final score to an integer', () => {
    const score = computeScore({ ...baseline, accountAgeDays: 100, approvedCount: 7, totalVotesReceived: 12, votesCast: 30 })
    expect(Number.isInteger(score)).toBe(true)
  })

  it('higher activity yields a higher score than baseline', () => {
    const baselineScore = computeScore(baseline)
    const activeScore = computeScore({
      accountAgeDays: 200,
      approvedCount: 25,
      rejectedCount: 2,
      solutionCount: 5,
      totalVotesReceived: 60,
      votesCast: 40,
      wasBanned: false,
    })
    expect(activeScore).toBeGreaterThan(baselineScore)
  })
})

describe('trustScoreToVoteWeight', () => {
  it.each([
    [0, 1],
    [19, 1],
    [20, 2],
    [39, 2],
    [40, 3],
    [59, 3],
    [60, 4],
    [79, 4],
    [80, 5],
    [100, 5],
  ])('maps trust score %i to weight %i', (score, expected) => {
    expect(trustScoreToVoteWeight(score)).toBe(expected)
  })

  it('clamps out-of-range high inputs to weight 5', () => {
    expect(trustScoreToVoteWeight(150)).toBe(5)
    expect(trustScoreToVoteWeight(Number.MAX_SAFE_INTEGER)).toBe(5)
  })

  it('clamps out-of-range low inputs to weight 1', () => {
    // Without the Math.max guard, a negative score would yield 0 or less,
    // breaking the schema's implicit weight >= 1 invariant.
    expect(trustScoreToVoteWeight(-5)).toBe(1)
    expect(trustScoreToVoteWeight(-100)).toBe(1)
  })
})
