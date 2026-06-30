import { describe, it, expect } from 'vitest'
import { diffSnapshots, staleConflictFields } from '../../server/utils/revision-write'

describe('diffSnapshots', () => {
  it('returns an empty object when nothing changed', () => {
    const snap = { title: 'A', summary: 'B', parentId: 1 }
    expect(diffSnapshots(snap, { ...snap })).toEqual({})
  })

  it('reports only the fields whose value changed', () => {
    const before = { title: 'A', summary: 'B', description: 'C' }
    const after = { title: 'A', summary: 'B2', description: 'C' }
    expect(diffSnapshots(before, after)).toEqual({ summary: 'B2' })
  })

  it('reports multiple changed fields', () => {
    const before = { title: 'A', summary: 'B', scale: 'city' }
    const after = { title: 'A2', summary: 'B', scale: 'region' }
    expect(diffSnapshots(before, after)).toEqual({ title: 'A2', scale: 'region' })
  })

  it('compares nested arrays and objects by value, not reference', () => {
    const before = { links: [{ url: 'https://x.test', title: 'X' }] }
    const after = { links: [{ url: 'https://x.test', title: 'X' }] }
    // Same content, different array instances → no change.
    expect(diffSnapshots(before, after)).toEqual({})

    const changed = { links: [{ url: 'https://y.test' }] }
    expect(diffSnapshots(before, changed)).toEqual({ links: [{ url: 'https://y.test' }] })
  })

  it('detects a change between a value and null', () => {
    expect(diffSnapshots({ description: 'C' }, { description: null })).toEqual({ description: null })
    expect(diffSnapshots({ description: null }, { description: 'C' })).toEqual({ description: 'C' })
  })

  it('detects a location (lat/lng) change', () => {
    const before = { location: { latitude: 50.8, longitude: 4.3 } }
    const after = { location: { latitude: 51.0, longitude: 4.3 } }
    expect(diffSnapshots(before, after)).toEqual({ location: { latitude: 51.0, longitude: 4.3 } })
  })

  it('only diffs keys present in `after` (absent key = leave as-is)', () => {
    const before = { title: 'A', summary: 'B' }
    // `after` omits summary entirely → not reported as a change.
    expect(diffSnapshots(before, { title: 'A2' })).toEqual({ title: 'A2' })
  })

  it('treats a reparent (parentId change) as a change', () => {
    expect(diffSnapshots({ parentId: 1 }, { parentId: 2 })).toEqual({ parentId: 2 })
  })
})

describe('staleConflictFields', () => {
  it('is empty when the live node still matches the base on the changed fields', () => {
    const changes = { summary: 'new' }
    const base = { title: 'A', summary: 'old' }
    const current = { title: 'A', summary: 'old' } // node untouched on these fields
    expect(staleConflictFields(changes, base, current)).toEqual([])
  })

  it('ignores concurrent edits to fields this proposal does not touch (they merge)', () => {
    const changes = { summary: 'new' }
    const base = { title: 'A', summary: 'old' }
    // title moved underneath us, but the proposal only changes summary → no conflict.
    const current = { title: 'A2', summary: 'old' }
    expect(staleConflictFields(changes, base, current)).toEqual([])
  })

  it('flags a field the proposal changes that has itself moved since proposal', () => {
    const changes = { summary: 'new' }
    const base = { summary: 'old' }
    const current = { summary: 'someone-else-changed-it' }
    expect(staleConflictFields(changes, base, current)).toEqual(['summary'])
  })

  it('reports every conflicting changed field', () => {
    const changes = { summary: 'new', scale: 'region' }
    const base = { summary: 'old', scale: 'city', title: 'A' }
    const current = { summary: 'moved', scale: 'moved', title: 'A' }
    expect(staleConflictFields(changes, base, current).sort()).toEqual(['scale', 'summary'])
  })

  it('compares nested values (location/links) structurally', () => {
    const changes = { location: { latitude: 51, longitude: 4 } }
    const base = { location: { latitude: 50, longitude: 4 } }
    // Live node's location equals the base by value → not a conflict.
    const current = { location: { latitude: 50, longitude: 4 } }
    expect(staleConflictFields(changes, base, current)).toEqual([])
    // Live node's location moved away from the base → conflict.
    const moved = { location: { latitude: 49, longitude: 4 } }
    expect(staleConflictFields(changes, base, moved)).toEqual(['location'])
  })
})
