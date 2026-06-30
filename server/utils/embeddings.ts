import { sql, type SQL } from 'drizzle-orm'
import { getOpenAIClient } from './ai'

export async function generateEmbedding(text: string): Promise<number[]> {
  const client = getOpenAIClient()
  const response = await client.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  })
  return response.data[0]!.embedding
}

export function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(',')}]`
}

export async function findSimilar<T extends { similarity: number }>(opts: {
  table: string
  columns?: string
  embedding: number[]
  where?: SQL
  limit?: number
  threshold?: number
}): Promise<T[]> {
  const db = useDB()
  const vec = toVectorLiteral(opts.embedding)
  const cols = opts.columns ?? 'id'
  const limit = Math.min(Math.max(opts.limit ?? 5, 1), 25)
  const where = opts.where ?? sql`TRUE`

  const results = await db.execute<T>(
    sql`SELECT ${sql.raw(cols)}, 1 - (embedding <=> ${vec}::vector) AS similarity
        FROM ${sql.raw(opts.table)}
        WHERE embedding IS NOT NULL AND ${where}
        ORDER BY embedding <=> ${vec}::vector
        LIMIT ${limit}`,
  )

  const rows = results as unknown as T[]
  if (opts.threshold != null) {
    return rows.filter((r) => r.similarity > opts.threshold!)
  }
  return rows
}
