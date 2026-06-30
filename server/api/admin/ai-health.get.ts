import { sql } from 'drizzle-orm'
import { auditLogs, issues } from '../../database/schema'

interface DailyPoint {
  day: string
  total: number
  overridden: number
  needsReview: number
}

export default defineEventHandler(async (event) => {
  const db = useDB()
  const query = getQuery(event)
  const days = Math.min(90, Math.max(1, Number(query.days) || 30))

  const [overall, byAiDecision, dailyRaw, appealStats, recentAccuracy] = await Promise.all([
    // High-level moderation funnel over the window.
    db.execute(sql`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'auto_resolved') AS auto_resolved,
        COUNT(*) FILTER (WHERE status = 'needs_review') AS needs_review,
        COUNT(*) FILTER (WHERE status = 'reviewed')     AS reviewed,
        COUNT(*) FILTER (WHERE status = 'overridden')   AS overridden,
        AVG(NULLIF((details->>'confidence')::numeric, NULL)) AS avg_confidence
      FROM ${auditLogs}
      WHERE type = 'moderation'
        AND created_at > NOW() - (${days}::int * INTERVAL '1 day')
    `) as unknown as Array<{
      total: number
      auto_resolved: number
      needs_review: number
      reviewed: number
      overridden: number
      avg_confidence: number | null
    }>,

    // Average confidence broken out by ultimate outcome.
    db.execute(sql`
      SELECT
        action,
        COUNT(*) AS n,
        AVG((details->>'confidence')::numeric) AS avg_confidence
      FROM ${auditLogs}
      WHERE type = 'moderation'
        AND created_at > NOW() - (${days}::int * INTERVAL '1 day')
        AND details ? 'confidence'
      GROUP BY action
    `) as unknown as Array<{ action: string; n: number; avg_confidence: number | null }>,

    // Daily series for the chart.
    db.execute(sql`
      SELECT
        DATE_TRUNC('day', created_at) AS day,
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'overridden') AS overridden,
        COUNT(*) FILTER (WHERE status = 'needs_review') AS needs_review
      FROM ${auditLogs}
      WHERE type = 'moderation'
        AND created_at > NOW() - (${days}::int * INTERVAL '1 day')
      GROUP BY 1
      ORDER BY 1 ASC
    `) as unknown as Array<{
      day: string
      total: number
      overridden: number
      needs_review: number
    }>,

    // Appeals are the cleanest false-positive signal.
    db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE appeal_status = 'pending')  AS pending,
        COUNT(*) FILTER (WHERE appeal_status = 'approved') AS granted,
        COUNT(*) FILTER (WHERE appeal_status = 'denied')   AS denied
      FROM ${issues}
      WHERE appealed_at IS NOT NULL
        AND appealed_at > NOW() - (${days}::int * INTERVAL '1 day')
    `) as unknown as Array<{ pending: number; granted: number; denied: number }>,

    // Of moderation calls that were eventually `reviewed` or `overridden` by
    // admins, how often did the admin disagree (overridden)?
    db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'overridden') AS disagreed,
        COUNT(*) FILTER (WHERE status IN ('overridden','reviewed')) AS adjudicated
      FROM ${auditLogs}
      WHERE type = 'moderation'
        AND created_at > NOW() - (${days}::int * INTERVAL '1 day')
    `) as unknown as Array<{ disagreed: number; adjudicated: number }>,
  ])

  const o = overall[0] ?? {
    total: 0,
    auto_resolved: 0,
    needs_review: 0,
    reviewed: 0,
    overridden: 0,
    avg_confidence: null,
  }
  const appeals = appealStats[0] ?? { pending: 0, granted: 0, denied: 0 }
  const accuracy = recentAccuracy[0] ?? { disagreed: 0, adjudicated: 0 }

  const adjudicated = Number(accuracy.adjudicated)
  const disagreed = Number(accuracy.disagreed)
  const disagreementRate = adjudicated > 0 ? disagreed / adjudicated : null

  const granted = Number(appeals.granted)
  const denied = Number(appeals.denied)
  const resolved = granted + denied
  const appealGrantRate = resolved > 0 ? granted / resolved : null

  const daily: DailyPoint[] = dailyRaw.map((d) => ({
    day: typeof d.day === 'string' ? d.day : new Date(d.day).toISOString(),
    total: Number(d.total),
    overridden: Number(d.overridden),
    needsReview: Number(d.needs_review),
  }))

  return {
    windowDays: days,
    overall: {
      total: Number(o.total),
      autoResolved: Number(o.auto_resolved),
      needsReview: Number(o.needs_review),
      reviewed: Number(o.reviewed),
      overridden: Number(o.overridden),
      avgConfidence: o.avg_confidence == null ? null : Number(o.avg_confidence),
    },
    byAction: byAiDecision.map((b) => ({
      action: b.action,
      n: Number(b.n),
      avgConfidence: b.avg_confidence == null ? null : Number(b.avg_confidence),
    })),
    appeals: {
      pending: Number(appeals.pending),
      granted,
      denied,
      grantRate: appealGrantRate,
    },
    disagreementRate,
    daily,
  }
})
