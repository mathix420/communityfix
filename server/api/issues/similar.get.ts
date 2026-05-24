import { sql } from 'drizzle-orm'
import { generateEmbedding, findSimilar } from '../../utils/embeddings'

const SIMILARITY_THRESHOLD = 0.3

interface SimilarMatch {
  id: number
  title: string
  summary: string
  similarity: number
}

interface SimilarResponse {
  status: 'ok' | 'unavailable' | 'too_short'
  results: SimilarMatch[]
}

export default defineEventHandler(async (event): Promise<SimilarResponse> => {
  const query = getQuery(event)
  const title = (query.title as string)?.trim()
  const summary = (query.summary as string)?.trim()

  if (!title || title.length < 5 || !summary || summary.length < 10) {
    return { status: 'too_short', results: [] }
  }

  let embedding: number[]
  try {
    embedding = await generateEmbedding(`${title}\n${summary}`)
  }
  catch (err) {
    console.error('[similar] Embedding generation failed:', err)
    return { status: 'unavailable', results: [] }
  }

  const rows = await findSimilar<SimilarMatch>({
    table: 'issues',
    columns: 'id, title, summary',
    embedding,
    where: sql`status = 'approved' AND parent_id IS NULL`,
    limit: 5,
    threshold: SIMILARITY_THRESHOLD,
  })

  return {
    status: 'ok',
    results: rows.map(r => ({
      id: r.id,
      title: r.title,
      summary: r.summary,
      similarity: Math.round(r.similarity * 100),
    })),
  }
})
