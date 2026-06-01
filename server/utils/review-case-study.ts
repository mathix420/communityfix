import { eq } from 'drizzle-orm'
import { caseStudies, issues, LOCATION_SCALES, type LocationScale } from '../database/schema'
import { chatJson } from './ai'
import { generateEmbedding } from './embeddings'
import { createAuditLog } from './audit-log'
import { reconcileNodeInBackground } from './standard-site'

interface ModerationResult {
  approved: boolean
  reason: string
  isSpam: boolean
}

type Metric = { label: string, baseline?: string | null, result?: string | null, unit?: string | null }
type Source = { url: string, title?: string | null }
type LinkRow = { url: string, title?: string | null }

interface CurationResult {
  description: string | null
  lessonsLearned: string[] | null
  implementer: string | null
  fundingSource: string | null
  cost: string | null
  currency: string | null
  scale: LocationScale | null
  startDate: string | null
  endDate: string | null
  metrics: Metric[] | null
  sources: Source[] | null
  links: LinkRow[] | null
  notes: string
}

export async function reviewCaseStudy(caseStudyId: number) {
  const db = useDB()

  const cs = await db.query.caseStudies.findFirst({
    where: eq(caseStudies.id, caseStudyId),
  })
  if (!cs) {
    console.error(`[review-case-study] Case study ${caseStudyId} not found`)
    return
  }

  if (cs.status !== 'pending') return

  const solution = await db.query.issues.findFirst({
    where: eq(issues.id, cs.solutionId),
    columns: { title: true, summary: true },
  })

  const caseStudyText = [
    solution ? `Parent solution: ${solution.title}` : '',
    `Location: ${cs.locationName}`,
    `Outcome: ${cs.outcome}`,
    cs.scale ? `Scale: ${cs.scale}` : '',
    cs.implementer ? `Implementer: ${cs.implementer}` : '',
    cs.description ? `Description: ${cs.description}` : '',
    cs.fundingSource ? `Funding source: ${cs.fundingSource}` : '',
    Array.isArray(cs.lessonsLearned) && cs.lessonsLearned.length
      ? `Lessons learned: ${(cs.lessonsLearned as string[]).join('; ')}`
      : '',
  ].filter(Boolean).join('\n')

  let moderation: ModerationResult

  try {
    moderation = await chatJson<ModerationResult>({
      system: `You are a content moderator for a community problem-solving platform. You are reviewing a case study — a real-world implementation report attached to a solution.

Approve legitimate case studies that document real or plausible implementations with coherent details. Reject:
- Spam, gibberish, or bot-generated nonsense
- Hate speech, harassment, or offensive content
- Clearly fabricated or incoherent content that doesn't describe a real implementation
- Promotional spam disguised as a case study

Be permissive for good-faith submissions — even incomplete or brief case studies should be approved if they appear to describe a genuine effort.`,
      user: caseStudyText,
      schema: {
        type: 'object',
        properties: {
          approved: { type: 'boolean' },
          reason: { type: 'string' },
          isSpam: { type: 'boolean' },
        },
        required: ['approved', 'reason', 'isSpam'],
        additionalProperties: false,
      },
      context: `moderation for case study ${caseStudyId}`,
    })
  }
  catch (err) {
    console.error(`[review-case-study] AI review failed for case study ${caseStudyId}:`, err)
    throw err
  }

  if (!moderation.approved) {
    await db.update(caseStudies)
      .set({
        status: 'rejected',
        rejectionReason: moderation.reason,
        rejectedAt: new Date(),
        isSpam: moderation.isSpam ?? false,
      })
      .where(eq(caseStudies.id, caseStudyId))

    await createAuditLog({
      type: 'moderation',
      action: moderation.isSpam ? 'flag_spam' : 'reject',
      userId: cs.authorId,
      reason: moderation.reason,
      details: { caseStudyId, solutionId: cs.solutionId, isSpam: moderation.isSpam },
    })

    if (cs.authorId) {
      await checkAndApplyBan(cs.authorId)
      await updateUserTrustScore(cs.authorId)
    }
    // Rejected/spammed → ensure no standard.site document lingers.
    reconcileNodeInBackground('case_study', caseStudyId)
    return
  }

  // Curation pass: rewrite text fields and null out structured fields that
  // carry no replication value. A case study only earns its place if it tells
  // a future implementer something they couldn't have guessed from the parent
  // solution — concrete details, real numbers, real lessons. Everything else
  // is noise and gets stripped here.
  const curated = await curateForReplication(cs, solution?.title ?? null, solution?.summary ?? null, caseStudyId)

  const cleanedText = [
    solution ? `Solution: ${solution.title}` : '',
    solution?.summary ?? '',
    `Location: ${cs.locationName}`,
    curated.implementer ? `Implementer: ${curated.implementer}` : '',
    `Outcome: ${cs.outcome}`,
    curated.description ?? '',
    curated.lessonsLearned?.join('\n') ?? '',
  ].filter(Boolean).join('\n').trim()

  let newEmbedding: number[] | null = null
  try {
    newEmbedding = await generateEmbedding(cleanedText)
  }
  catch (err) {
    console.error(`[review-case-study] Embedding regeneration failed for case study ${caseStudyId}:`, err)
  }

  const cleanedMetrics = curated.metrics?.map(m => ({
    label: m.label,
    ...(m.baseline != null ? { baseline: m.baseline } : {}),
    ...(m.result != null ? { result: m.result } : {}),
    ...(m.unit != null ? { unit: m.unit } : {}),
  })) ?? null
  const cleanedSources = curated.sources?.map(s => ({
    url: s.url,
    ...(s.title != null ? { title: s.title } : {}),
  })) ?? null
  const cleanedLinks = curated.links?.map(l => ({
    url: l.url,
    ...(l.title != null ? { title: l.title } : {}),
  })) ?? null

  await db.update(caseStudies)
    .set({
      status: 'approved',
      description: curated.description,
      lessonsLearned: curated.lessonsLearned,
      implementer: curated.implementer,
      fundingSource: curated.fundingSource,
      cost: curated.cost,
      currency: curated.currency,
      scale: curated.scale,
      startDate: curated.startDate,
      endDate: curated.endDate,
      metrics: cleanedMetrics,
      sources: cleanedSources,
      links: cleanedLinks,
      ...(newEmbedding ? { embedding: newEmbedding } : {}),
    })
    .where(eq(caseStudies.id, caseStudyId))

  await createAuditLog({
    type: 'moderation',
    action: 'approve',
    userId: cs.authorId,
    reason: moderation.reason,
    details: {
      caseStudyId,
      solutionId: cs.solutionId,
      curation: {
        notes: curated.notes,
        strippedFields: diffStripped(cs, curated),
      },
    },
  })

  if (cs.authorId) {
    await updateUserTrustScore(cs.authorId)
  }

  // Approved → mirror to standard.site as a public document.
  reconcileNodeInBackground('case_study', caseStudyId)
}

async function curateForReplication(
  cs: typeof caseStudies.$inferSelect,
  parentTitle: string | null,
  parentSummary: string | null,
  caseStudyId: number,
): Promise<CurationResult> {
  const original = {
    outcome: cs.outcome,
    locationName: cs.locationName,
    scale: cs.scale,
    description: cs.description,
    implementer: cs.implementer,
    startDate: cs.startDate,
    endDate: cs.endDate,
    metrics: cs.metrics,
    cost: cs.cost,
    currency: cs.currency,
    fundingSource: cs.fundingSource,
    sources: cs.sources,
    lessonsLearned: cs.lessonsLearned,
    links: cs.links,
  }

  const parentContext = [
    parentTitle ? `Parent solution: ${parentTitle}` : '',
    parentSummary ? `Parent summary: ${parentSummary}` : '',
  ].filter(Boolean).join('\n')

  return chatJson<CurationResult>({
    system: `You are editing a case study attached to a solution on a community problem-solving platform. The case study documents one real-world implementation. Your single goal is to keep only data that helps someone **replicate this solution in another location** and strip everything else.

What counts as replication-relevant:
- Concrete implementation steps, prerequisites, dependencies, or the actor that did the work
- Real numbers: budget, beneficiaries, timeline, measurable outcomes with baseline → result
- Funding mechanics that another team could reuse (named programmes, grant types, financing models)
- Lessons learned that name a specific pitfall, decision, or trade-off — not platitudes
- Credible sources / external links that back the above

What is noise (strip it):
- Generic praise, marketing language, restatements of the parent solution
- Placeholders ("TBD", "varies", "lots", "n/a", "the community")
- Lessons that are universal truths ("communication is important", "plan ahead")
- Metrics with no baseline AND no result, or with non-numeric values that say nothing concrete
- Sources / links that don't resolve to something useful (bare homepages, broken-looking URLs)

Rules:
- Preserve the input language. If the description was written in French, return French.
- For \`description\` and \`lessonsLearned\`: rewrite to keep only sentences with replication value. Do NOT invent details. Return null if nothing useful remains. Do not just restate the parent solution.
- For \`implementer\`, \`fundingSource\`, \`cost\`, \`currency\`, \`startDate\`, \`endDate\`: return the original value if it is concrete and informative; return null otherwise. Do not invent.
- For \`scale\`: return one of ${LOCATION_SCALES.map(s => `"${s}"`).join(', ')} if clearly identifiable, else null.
- For \`metrics\`: keep only rows where the label is specific AND at least one of baseline/result is a real value (not a placeholder). Return null if none qualify.
- For \`sources\` and \`links\`: keep entries whose url looks like a real, specific resource. Return null if none qualify.
- \`notes\`: one short sentence describing what you stripped and why, for the audit log.

Never modify \`outcome\` or \`locationName\` — they are owned by the moderator.`,
    user: `${parentContext}\n\nCase study (original fields):\n${JSON.stringify(original, null, 2)}`,
    schema: {
      type: 'object',
      properties: {
        description: { type: ['string', 'null'] },
        lessonsLearned: { type: ['array', 'null'], items: { type: 'string' } },
        implementer: { type: ['string', 'null'] },
        fundingSource: { type: ['string', 'null'] },
        cost: { type: ['string', 'null'] },
        currency: { type: ['string', 'null'] },
        scale: {
          anyOf: [
            { type: 'string', enum: [...LOCATION_SCALES] },
            { type: 'null' },
          ],
        },
        startDate: { type: ['string', 'null'] },
        endDate: { type: ['string', 'null'] },
        metrics: {
          type: ['array', 'null'],
          items: {
            type: 'object',
            properties: {
              label: { type: 'string' },
              baseline: { type: ['string', 'null'] },
              result: { type: ['string', 'null'] },
              unit: { type: ['string', 'null'] },
            },
            required: ['label'],
            additionalProperties: false,
          },
        },
        sources: {
          type: ['array', 'null'],
          items: {
            type: 'object',
            properties: {
              url: { type: 'string' },
              title: { type: ['string', 'null'] },
            },
            required: ['url'],
            additionalProperties: false,
          },
        },
        links: {
          type: ['array', 'null'],
          items: {
            type: 'object',
            properties: {
              url: { type: 'string' },
              title: { type: ['string', 'null'] },
            },
            required: ['url'],
            additionalProperties: false,
          },
        },
        notes: { type: 'string' },
      },
      required: [
        'description', 'lessonsLearned', 'implementer', 'fundingSource',
        'cost', 'currency', 'scale', 'startDate', 'endDate',
        'metrics', 'sources', 'links', 'notes',
      ],
      additionalProperties: false,
    },
    context: `curation for case study ${caseStudyId}`,
  })
}

function diffStripped(
  before: typeof caseStudies.$inferSelect,
  after: CurationResult,
): string[] {
  const stripped: string[] = []
  const check = (name: string, b: unknown, a: unknown) => {
    const hadValue = Array.isArray(b) ? b.length > 0 : b != null && b !== ''
    const hasValue = Array.isArray(a) ? a !== null && a.length > 0 : a != null && a !== ''
    if (hadValue && !hasValue) stripped.push(name)
  }
  check('description', before.description, after.description)
  check('lessonsLearned', before.lessonsLearned, after.lessonsLearned)
  check('implementer', before.implementer, after.implementer)
  check('fundingSource', before.fundingSource, after.fundingSource)
  check('cost', before.cost, after.cost)
  check('currency', before.currency, after.currency)
  check('scale', before.scale, after.scale)
  check('startDate', before.startDate, after.startDate)
  check('endDate', before.endDate, after.endDate)
  check('metrics', before.metrics, after.metrics)
  check('sources', before.sources, after.sources)
  check('links', before.links, after.links)
  return stripped
}
