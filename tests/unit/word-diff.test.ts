import { describe, it, expect } from 'vitest'
import { wordDiff, type WordDiffPart } from '../../app/utils/word-diff'

// Helpers: reconstruct each side from the diff parts. The "before" side is the
// removed + unchanged tokens; the "after" side is the added + unchanged tokens.
function before(parts: WordDiffPart[]): string {
  return parts.filter(p => p.type !== 'added').map(p => p.value).join('')
}
function after(parts: WordDiffPart[]): string {
  return parts.filter(p => p.type !== 'removed').map(p => p.value).join('')
}

describe('wordDiff', () => {
  it('returns no parts for two empty strings', () => {
    expect(wordDiff('', '')).toEqual([])
  })

  it('marks the whole after-string as added when before is empty', () => {
    expect(wordDiff('', 'hello world')).toEqual([{ type: 'added', value: 'hello world' }])
  })

  it('marks the whole before-string as removed when after is empty', () => {
    expect(wordDiff('hello world', '')).toEqual([{ type: 'removed', value: 'hello world' }])
  })

  it('marks identical strings as entirely unchanged', () => {
    expect(wordDiff('the quick fox', 'the quick fox')).toEqual([
      { type: 'unchanged', value: 'the quick fox' },
    ])
  })

  it('diffs a single changed word in the middle', () => {
    const parts = wordDiff('the quick brown fox', 'the quick red fox')
    // The reconstructed sides round-trip to the originals exactly.
    expect(before(parts)).toBe('the quick brown fox')
    expect(after(parts)).toBe('the quick red fox')
    // And it found something added and something removed.
    expect(parts.some(p => p.type === 'added')).toBe(true)
    expect(parts.some(p => p.type === 'removed')).toBe(true)
  })

  it('round-trips both sides for an append', () => {
    const parts = wordDiff('hello', 'hello there world')
    expect(before(parts)).toBe('hello')
    expect(after(parts)).toBe('hello there world')
  })

  it('round-trips both sides for a deletion', () => {
    const parts = wordDiff('one two three four', 'one four')
    expect(before(parts)).toBe('one two three four')
    expect(after(parts)).toBe('one four')
  })

  it('preserves whitespace so output re-joins to the originals', () => {
    const a = '  leading and   inner spaces '
    const b = '  leading and   other spaces '
    const parts = wordDiff(a, b)
    expect(before(parts)).toBe(a)
    expect(after(parts)).toBe(b)
  })

  it('coalesces adjacent tokens of the same type into one part', () => {
    // No shared tokens (not even whitespace) → exactly one removed run and one
    // added run, each merged from the individual word tokens.
    const parts = wordDiff('alpha', 'omega')
    expect(parts.filter(p => p.type === 'removed')).toHaveLength(1)
    expect(parts.filter(p => p.type === 'added')).toHaveLength(1)
    expect(before(parts)).toBe('alpha')
    expect(after(parts)).toBe('omega')
  })

  it('treats shared whitespace as unchanged when words differ', () => {
    // 'a b c' and 'x y z' share the single-space tokens, so those stay
    // unchanged and the round-trip still reproduces both originals exactly.
    const parts = wordDiff('a b c', 'x y z')
    expect(before(parts)).toBe('a b c')
    expect(after(parts)).toBe('x y z')
  })

  it('handles newlines as whitespace tokens', () => {
    const a = 'line one\nline two'
    const b = 'line one\nline three'
    const parts = wordDiff(a, b)
    expect(before(parts)).toBe(a)
    expect(after(parts)).toBe(b)
  })
})
