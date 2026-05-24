import { auditLogs, type AuditLogType, type AuditLogAction, type AuditLogStatus } from '../database/schema'

export async function createAuditLog(entry: {
  type: AuditLogType
  action: AuditLogAction
  status?: AuditLogStatus
  issueId?: number | null
  userId?: string | null
  reason?: string | null
  details?: Record<string, unknown> | null
}): Promise<void> {
  try {
    const db = useDB()
    await db.insert(auditLogs).values({
      type: entry.type,
      action: entry.action,
      status: entry.status ?? 'auto_resolved',
      issueId: entry.issueId ?? null,
      userId: entry.userId ?? null,
      reason: entry.reason ?? null,
      details: entry.details ?? null,
    })
  }
  catch (err) {
    console.error('[audit-log] Failed to write audit log:', err)
  }
}
