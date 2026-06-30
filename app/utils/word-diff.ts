// A tiny, dependency-free word-level diff for the revision Diff view. Splits
// each string into tokens on whitespace boundaries (keeping the whitespace as
// its own tokens) so the diff can be re-joined back into the originals exactly,
// then runs a classic LCS to mark each token as added / removed / unchanged.
//
// Kept here (app/utils, auto-imported) so the presentational `revision/Diff.vue`
// component can render inline before/after text diffs without pulling in a
// diffing dependency.

export type WordDiffType = 'added' | 'removed' | 'unchanged'

export interface WordDiffPart {
  type: WordDiffType
  value: string
}

// Split into an alternating-ish run of word tokens and whitespace tokens.
// Whitespace is preserved as standalone tokens so `parts.map(p => p.value)`
// re-joins to the original string with no normalisation.
function tokenize(text: string): string[] {
  if (!text) return []
  // One token per run of whitespace OR run of non-whitespace.
  return text.match(/\s+|\S+/g) ?? []
}

/**
 * Word-level LCS diff between `before` and `after`.
 *
 * Returns an ordered list of parts that, when filtered to `removed | unchanged`
 * and joined, reproduce `before`; and when filtered to `added | unchanged` and
 * joined, reproduce `after`. Empty inputs are handled (an empty string yields no
 * parts on its side).
 */
export function wordDiff(before: string, after: string): WordDiffPart[] {
  const a = tokenize(before ?? '')
  const b = tokenize(after ?? '')

  // Fast paths for the common (and empty) cases.
  if (a.length === 0 && b.length === 0) return []
  if (a.length === 0) return b.length ? [{ type: 'added', value: b.join('') }] : []
  if (b.length === 0) return a.length ? [{ type: 'removed', value: a.join('') }] : []

  // LCS length table: lcs[i][j] = LCS length of a[i..] and b[j..].
  const n = a.length
  const m = b.length
  const lcs: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i]![j] =
        a[i] === b[j] ? lcs[i + 1]![j + 1]! + 1 : Math.max(lcs[i + 1]![j]!, lcs[i]![j + 1]!)
    }
  }

  // Walk the table to emit ordered parts, coalescing consecutive tokens of the
  // same type into a single part so the output stays compact.
  const raw: WordDiffPart[] = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      raw.push({ type: 'unchanged', value: a[i]! })
      i++
      j++
    } else if (lcs[i + 1]![j]! >= lcs[i]![j + 1]!) {
      raw.push({ type: 'removed', value: a[i]! })
      i++
    } else {
      raw.push({ type: 'added', value: b[j]! })
      j++
    }
  }
  while (i < n) raw.push({ type: 'removed', value: a[i++]! })
  while (j < m) raw.push({ type: 'added', value: b[j++]! })

  return coalesce(raw)
}

// Merge adjacent parts of the same type into one, so e.g. a removed word and
// the trailing space it dragged along render as a single struck-through span.
function coalesce(parts: WordDiffPart[]): WordDiffPart[] {
  const out: WordDiffPart[] = []
  for (const part of parts) {
    const last = out[out.length - 1]
    if (last && last.type === part.type) last.value += part.value
    else out.push({ ...part })
  }
  return out
}
