import { eq, and, desc, sql, isNotNull, isNull, or } from 'drizzle-orm'
import { issues, auditLogs, users } from '../../database/schema'

export default defineEventHandler(async () => {
  const db = useDB()

  const [uncertain, pendingAppeals, infoReceived, banAppeals] = await Promise.all([
    db.query.auditLogs.findMany({
      where: and(
        eq(auditLogs.status, 'needs_review'),
        or(
          eq(auditLogs.action, 'flag_uncertain'),
          eq(auditLogs.action, 'reparent'),
          eq(auditLogs.action, 'convert_to_case_study'),
        ),
      ),
      with: {
        issue: {
          columns: {
            id: true, title: true, summary: true, type: true, status: true,
            infoRequest: true, infoResponse: true, infoRequestedAt: true,
          },
        },
        user: { columns: { id: true, name: true, email: true } },
      },
      orderBy: desc(auditLogs.createdAt),
      limit: 50,
    }),

    db.query.issues.findMany({
      where: eq(issues.appealStatus, 'pending'),
      with: {
        author: { columns: { id: true, name: true, email: true } },
      },
      columns: {
        id: true, title: true, summary: true, type: true, status: true,
        rejectionReason: true, appealReason: true, appealedAt: true,
      },
      orderBy: desc(issues.appealedAt),
      limit: 50,
    }),

    db.query.issues.findMany({
      where: and(
        eq(issues.status, 'pending'),
        isNotNull(issues.infoRequest),
        isNotNull(issues.infoResponse),
      ),
      with: {
        author: { columns: { id: true, name: true, email: true } },
      },
      columns: {
        id: true, title: true, summary: true, type: true, status: true,
        infoRequest: true, infoResponse: true, infoRespondedAt: true,
      },
      orderBy: desc(issues.infoRespondedAt),
      limit: 50,
    }),

    db.query.users.findMany({
      where: eq(users.banAppealStatus, 'pending'),
      columns: {
        id: true, name: true, email: true,
        banReason: true, banAppealReason: true, banAppealedAt: true,
      },
      limit: 50,
    }),
  ])

  return { uncertain, pendingAppeals, infoReceived, banAppeals }
})
