// Serialises an error — including its `.cause` chain — into a plain object
// suitable for structured logging. The direct motivation: Cloudflare Workers'
// `console.error` only prints `err.message` + `err.stack` and drops
// `err.cause`, so Drizzle's `DrizzleQueryError` was landing in prod logs as
// just "Failed query: SELECT …" with no underlying Postgres error. Walking
// the cause chain (and pulling the libpq fields off `PostgresError`) surfaces
// the real diagnostic in one log line.

import postgres from 'postgres'

// Libpq error fields exposed by postgres-js's `PostgresError`. We copy them
// explicitly so the payload is readable and stable — `Object.keys` would
// also pick up internal bookkeeping fields.
const PG_ERROR_FIELDS = [
  'code',
  'severity',
  'detail',
  'hint',
  'where',
  'routine',
  'schema_name',
  'table_name',
  'column_name',
  'constraint_name',
  'type_name',
] as const

const MAX_CAUSE_DEPTH = 5

export interface FormattedError {
  name?: string
  message: string
  stack?: string
  causes?: unknown[]
  query?: unknown
  params?: unknown
}

function formatCauseLink(cur: Error): Record<string, unknown> {
  const entry: Record<string, unknown> = {
    name: cur.name,
    message: cur.message,
  }
  if (cur instanceof postgres.PostgresError) {
    for (const field of PG_ERROR_FIELDS) {
      const value = cur[field]
      if (value !== undefined) entry[field] = value
    }
    // `query` / `parameters` on PostgresError are only populated when the
    // postgres-js `debug` option is on, but include them if present.
    if (cur.query) entry.query = cur.query
    if (cur.parameters?.length) entry.parameters = cur.parameters
  }
  return entry
}

export function formatError(err: unknown): FormattedError | { raw: string } {
  if (!(err instanceof Error)) {
    return { raw: String(err) }
  }

  const out: FormattedError = {
    name: err.name,
    message: err.message,
    stack: err.stack,
  }

  const causes: unknown[] = []
  let cur: unknown = (err as { cause?: unknown }).cause
  let depth = 0
  while (cur && depth < MAX_CAUSE_DEPTH) {
    if (cur instanceof Error) {
      causes.push(formatCauseLink(cur))
      cur = (cur as { cause?: unknown }).cause
    }
    else {
      causes.push(cur)
      break
    }
    depth++
  }
  if (causes.length) out.causes = causes

  // Drizzle's `DrizzleQueryError` attaches the rendered SQL + params on the
  // wrapper itself (separate from the inner PostgresError), so surface them
  // alongside the cause chain.
  const extras = err as unknown as Record<string, unknown>
  if (extras.query !== undefined) out.query = extras.query
  if (extras.params !== undefined) out.params = extras.params

  return out
}
