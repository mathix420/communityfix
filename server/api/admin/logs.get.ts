import { eq, and, gte, lte, desc, sql, ilike, type SQL } from 'drizzle-orm'
import { auditLogs, type AuditLogType, type AuditLogStatus } from '../../database/schema'

export default defineEventHandler(async (event) => {
  const db = useDB()
  const query = getQuery(event)

  const page = Math.max(1, Number(query.page) || 1)
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 25))

  const conditions: SQL[] = []
  if (query.type) conditions.push(eq(auditLogs.type, query.type as AuditLogType))
  if (query.status) conditions.push(eq(auditLogs.status, query.status as AuditLogStatus))
  if (query.issueId) conditions.push(eq(auditLogs.issueId, Number(query.issueId)))
  if (query.userId) conditions.push(eq(auditLogs.userId, query.userId as string))
  if (query.from) conditions.push(gte(auditLogs.createdAt, new Date(query.from as string)))
  if (query.to) conditions.push(lte(auditLogs.createdAt, new Date(query.to as string)))
  if (typeof query.q === 'string' && query.q.trim()) {
    conditions.push(ilike(auditLogs.reason, `%${query.q.trim()}%`))
  }

  const where = conditions.length ? and(...conditions) : undefined

  const [rows, countResult] = await Promise.all([
    db.query.auditLogs.findMany({
      where,
      with: {
        issue: { columns: { id: true, title: true, type: true, status: true } },
        user: { columns: { id: true, name: true, email: true } },
        reviewer: { columns: { id: true, name: true } },
      },
      orderBy: desc(auditLogs.createdAt),
      limit,
      offset: (page - 1) * limit,
    }),
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(auditLogs)
      .where(where),
  ])

  return {
    logs: rows,
    total: Number(countResult[0]?.count ?? 0),
    page,
    limit,
  }
})
