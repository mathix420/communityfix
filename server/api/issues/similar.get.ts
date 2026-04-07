import { sql } from 'drizzle-orm'
import { generateEmbedding } from '../../utils/embeddings'

// Cosine-similarity threshold below which matches are too weak to surface.
// 0.3 ≈ tangentially related; 0.5+ ≈ near-duplicate for `text-embedding-3-small`.
const SIMILARITY_THRESHOLD = 0.3

interface SimilarMatch {
  id: number
  title: string
  description: string
  similarity: number
}

interface SimilarResponse {
  status: 'ok' | 'unavailable' | 'too_short'
  results: SimilarMatch[]
}

export default defineEventHandler(async (event): Promise<SimilarResponse> => {
  const query = getQuery(event)
  const title = (query.title as string)?.trim()
  const description = (query.description as string)?.trim()

  if (!title || title.length < 5 || !description || description.length < 10) {
    return { status: 'too_short', results: [] }
  }

  let embedding: number[]
  try {
    embedding = await generateEmbedding(`${title}\n${description}`)
  }
  catch (err) {
    // Surface unavailability so the frontend can tell the user the
    // similarity check is offline rather than silently claiming "no
    // duplicates" — that would defeat the purpose of dedup.
    console.error('[similar] Embedding generation failed:', err)
    return { status: 'unavailable', results: [] }
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

  const matches: SimilarMatch[] = (results as Array<{ id: number, title: string, description: string, similarity: number }>)
    .filter(r => r.similarity > SIMILARITY_THRESHOLD)
    .map(r => ({
      id: r.id,
      title: r.title,
      description: r.description,
      similarity: Math.round(r.similarity * 100),
    }))

  return { status: 'ok', results: matches }
})
