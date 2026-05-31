import { describe, it, expect } from 'vitest'
import { generateTid } from '../../server/utils/atproto'

// standard.site lexicon records use `tid` record keys. A TID is a 13-character
// base32-sortable identifier; rkeys must be unique and monotonically increasing
// so reusing one across updates keeps the record stable while new records sort
// after old ones.
const TID_RE = /^[234567abcdefghijklmnopqrstuvwxyz]{13}$/

describe('generateTid', () => {
  it('produces a 13-char base32-sortable key', () => {
    expect(generateTid()).toMatch(TID_RE)
  })

  it('produces unique keys across rapid calls', () => {
    const keys = new Set<string>()
    for (let i = 0; i < 1000; i++) keys.add(generateTid())
    expect(keys.size).toBe(1000)
  })

  it('produces monotonically increasing keys (lexicographic == chronological)', () => {
    const a = generateTid()
    const b = generateTid()
    const c = generateTid()
    expect(a < b).toBe(true)
    expect(b < c).toBe(true)
  })
})
