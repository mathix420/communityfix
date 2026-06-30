import { and, count, eq } from 'drizzle-orm'
import { qualifications, qualificationEndorsements } from '../../../database/schema'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  await assertNotBanned(session.user.id)
  const viewerId = session.user.id

  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isFinite(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid id' })
  }

  const db = useDB()

  const target = await db.query.qualifications.findFirst({
    where: eq(qualifications.id, id),
    columns: { id: true, userId: true },
  })
  if (!target) {
    throw createError({ statusCode: 404, statusMessage: 'Qualification not found' })
  }
  if (target.userId === viewerId) {
    throw createError({ statusCode: 403, statusMessage: 'You cannot endorse your own credentials' })
  }

  // Endorser gating: the viewer must themselves have received at least one
  // endorsement on any of their own qualifications. This breaks the cold-start
  // ring problem — endorsements only flow outward from already-trusted users.
  // Admins bypass this so the team can endorse on behalf of users who emailed
  // proofs to support (see the verification CTA on /settings).
  if (!isAdminEmail(session.user.email)) {
    const [trustRow] = await db
      .select({ n: count(qualificationEndorsements.id).as('n') })
      .from(qualificationEndorsements)
      .innerJoin(qualifications, eq(qualifications.id, qualificationEndorsements.qualificationId))
      .where(eq(qualifications.userId, viewerId))

    if (Number(trustRow?.n ?? 0) === 0) {
      throw createError({
        statusCode: 403,
        statusMessage:
          'You need at least one endorsement on your own credentials before you can endorse others.',
      })
    }
  }

  // Admins create 'verification' rows (verified badge, no vote count bump);
  // everyone else creates standard peer 'endorsement' rows.
  const kind = isAdminEmail(session.user.email) ? 'verification' : 'endorsement'

  // Idempotent insert — unique constraint protects against double-clicks.
  await db
    .insert(qualificationEndorsements)
    .values({ qualificationId: id, endorserId: viewerId, kind })
    .onConflictDoNothing()

  // endorsementCount excludes verifications — verification is surfaced
  // separately as a boolean badge on the qualification.
  const [countRow] = await db
    .select({ n: count(qualificationEndorsements.id).as('n') })
    .from(qualificationEndorsements)
    .where(
      and(
        eq(qualificationEndorsements.qualificationId, id),
        eq(qualificationEndorsements.kind, 'endorsement'),
      ),
    )

  return { ok: true, endorsementCount: Number(countRow?.n ?? 0), kind }
})
