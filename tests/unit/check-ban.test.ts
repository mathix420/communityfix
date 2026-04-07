import { describe, it, expect } from 'vitest'
import {
  shouldBan,
  computeBanExpiry,
  BAN_REJECTION_THRESHOLD,
  BAN_LOOKBACK_WINDOW,
} from '../../server/utils/check-ban'

describe('shouldBan', () => {
  it('does not ban below the threshold', () => {
    for (let i = 0; i < BAN_REJECTION_THRESHOLD; i++) {
      expect(shouldBan(i)).toBe(false)
    }
  })

  it('bans exactly at the threshold', () => {
    expect(shouldBan(BAN_REJECTION_THRESHOLD)).toBe(true)
  })

  it('bans above the threshold', () => {
    for (let i = BAN_REJECTION_THRESHOLD + 1; i <= BAN_LOOKBACK_WINDOW; i++) {
      expect(shouldBan(i)).toBe(true)
    }
  })

  it('threshold is currently 4 of last 10 posts', () => {
    // Pin the policy — a regression that loosens the rule should fail loudly.
    expect(BAN_REJECTION_THRESHOLD).toBe(4)
    expect(BAN_LOOKBACK_WINDOW).toBe(10)
  })
})

describe('computeBanExpiry', () => {
  it('returns a Date in the future', () => {
    const now = new Date('2026-04-07T12:00:00.000Z')
    const expiry = computeBanExpiry(now)
    expect(expiry.getTime()).toBeGreaterThan(now.getTime())
  })

  it('returns roughly 28 days in the future', () => {
    const now = new Date('2026-04-07T12:00:00.000Z')
    const expiry = computeBanExpiry(now)
    const diffMs = expiry.getTime() - now.getTime()
    const diffDays = diffMs / (1000 * 60 * 60 * 24)
    expect(diffDays).toBe(28)
  })

  it('handles Jan 31 without rolling into March', () => {
    // The previous Date#setMonth(+1) implementation rolled Jan 31 into
    // early March (because Feb has 28-29 days). The fixed-day offset
    // approach lands in late February instead.
    const jan31 = new Date('2026-01-31T12:00:00.000Z')
    const expiry = computeBanExpiry(jan31)
    expect(expiry.getUTCMonth()).toBe(1) // February (0-indexed)
  })

  it('defaults to "now" when called without an argument', () => {
    const before = Date.now()
    const expiry = computeBanExpiry()
    const after = Date.now()
    const expiryMs = expiry.getTime()
    expect(expiryMs).toBeGreaterThanOrEqual(before + 27 * 24 * 60 * 60 * 1000)
    expect(expiryMs).toBeLessThanOrEqual(after + 28 * 24 * 60 * 60 * 1000 + 1)
  })
})
