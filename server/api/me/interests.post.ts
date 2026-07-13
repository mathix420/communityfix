// Add a free-text interest for the signed-in user. The label is embedded so
// newsletters can match it semantically against tags/issues later; if the
// embedding call fails the row is stored anyway with a null embedding — adding
// an interest must never block on OpenAI availability. Duplicates are rejected
// case-insensitively via the unique index on (user_id, lower(label)) — see
// custom migration 0008.
import { eq, sql } from 'drizzle-orm'
import { userInterests } from '../../database/schema'
import { assertNotBanned } from '../../utils/check-ban'
import { generateEmbedding } from '../../utils/embeddings'

const MIN_LABEL = 2
const MAX_LABEL = 60
const MAX_PER_USER = 10

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  await assertNotBanned(session.user.id)

  const body = await readBody<{ label?: string }>(event)
  const label = body?.label?.trim()
  if (!label || label.length < MIN_LABEL) {
    throw createError({
      statusCode: 400,
      statusMessage: `Interest must be at least ${MIN_LABEL} characters`,
    })
  }
  if (label.length > MAX_LABEL) {
    throw createError({ statusCode: 400, statusMessage: `Interest too long (max ${MAX_LABEL})` })
  }

  const db = useDB()
  const existing = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(userInterests)
    .where(eq(userInterests.userId, session.user.id))
  if (Number(existing[0]?.n ?? 0) >= MAX_PER_USER) {
    throw createError({
      statusCode: 400,
      statusMessage: `You can list at most ${MAX_PER_USER} interests`,
    })
  }

  let embedding: number[] | null = null
  try {
    embedding = await generateEmbedding(label)
  } catch (err) {
    console.error('[me.interests] embedding failed, storing without vector:', err)
  }

  // The unique index handles duplicate detection (including concurrent adds):
  // insert and treat a unique violation as "already listed".
  try {
    const [row] = await db
      .insert(userInterests)
      .values({ userId: session.user.id, label, embedding })
      .returning({
        id: userInterests.id,
        label: userInterests.label,
        createdAt: userInterests.createdAt,
      })
    return row!
  } catch (err: any) {
    // drizzle wraps driver errors in DrizzleQueryError; the postgres error
    // code lives on the cause.
    if (err?.code === '23505' || err?.cause?.code === '23505') {
      throw createError({ statusCode: 400, statusMessage: 'This interest is already listed' })
    }
    throw err
  }
})
