import { sql } from 'drizzle-orm'
import { generateEmbedding } from '../../utils/embeddings'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const title = (query.title as string)?.trim()
  const description = (query.description as string)?.trim()

  if (!title || title.length < 5 || !description || description.length < 10) {
    return []
  }

  let embedding: number[]
  try {
    embedding = await generateEmbedding(`${title}\n${description}`)
  }
  catch (err) {
    console.error('[similar] Embedding generation failed:', err)
    return []
  }

  const db = useDB()
  const embeddingStr = `[${embedding.join(',')}]`

  const results = await db.execute<{ id: number, title: string, description: string, similarity: number }>(
    sql`SELECT id, title, description, 1 - (embedding <=> ${embeddingStr}::vector) as similarity
        FROM issues
        WHERE status = 'approved'
          AND embedding IS NOT NULL
          AND parent_id IS NULL
        ORDER BY embedding <=> ${embeddingStr}::vector
        LIMIT 5`,
  )

  return (results as any[])
    .filter(r => r.similarity > 0.3)
    .map(r => ({
      id: r.id,
      title: r.title,
      description: r.description,
      similarity: Math.round(r.similarity * 100),
    }))
})
