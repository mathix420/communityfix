// Zod schemas that enforce the JSON Schema advertised in `tools/list`.
// MCP treats inputSchema as advisory, so the server validates here — enums,
// coordinate ranges, integer bounds and required fields — before any tool runs.
import { z } from 'zod'
import { CASE_STUDY_OUTCOMES, LOCATION_SCALES } from '../database/schema'

const scale = z.enum(LOCATION_SCALES as unknown as [string, ...string[]])
const outcome = z.enum(CASE_STUDY_OUTCOMES as unknown as [string, ...string[]])
const proposeKind = z.enum(['issue', 'solution', 'case_study'])
const latitude = z.number().min(-90).max(90)
const longitude = z.number().min(-180).max(180)
const id = z.number().int().positive()
const link = z.object({ url: z.string().min(1), title: z.string().optional() })
const metric = z.object({
  label: z.string().min(1),
  baseline: z.string().optional(),
  result: z.string().optional(),
  unit: z.string().optional(),
})

const locationFields = {
  locationName: z.string().optional(),
  latitude: latitude.optional(),
  longitude: longitude.optional(),
  scale: scale.optional(),
}

export const mcpToolInputSchemas = {
  search_issues_solutions: z.object({
    query: z.string().min(1),
    type: z.enum(['issue', 'solution', 'any']).optional(),
    limit: z.number().int().min(1).max(25).optional(),
  }),
  get_issue: z.object({ id }),
  get_tree: z.object({ id }),
  create_issue: z.object({
    title: z.string().min(1),
    summary: z.string().min(1),
    description: z.string().optional(),
    parentId: id.optional(),
    ...locationFields,
  }),
  create_solution: z.object({
    title: z.string().min(1),
    summary: z.string().min(1),
    description: z.string().optional(),
    parentId: id,
    links: z.array(link).optional(),
    ...locationFields,
  }),
  update_issue: z.object({
    id,
    title: z.string().min(1).optional(),
    summary: z.string().min(1).optional(),
    description: z.string().nullish(),
    ...locationFields,
  }),
  update_solution: z.object({
    id,
    title: z.string().min(1).optional(),
    summary: z.string().min(1).optional(),
    description: z.string().nullish(),
    solutionStatus: z.enum(['plan', 'in-progress', 'done']).optional(),
    links: z.array(link).optional(),
    ...locationFields,
  }),
  suggest_more: z.object({ id, limit: z.number().int().min(1).max(25).optional() }),
  whoami: z.object({}),
  get_user: z.object({ id: z.string().min(1) }),
  search_tags: z.object({
    query: z.string().optional(),
    limit: z.number().int().min(1).max(100).optional(),
  }),
  get_case_study: z.object({ id }),
  list_case_studies: z.object({ id }),
  create_case_study: z.object({
    solutionId: id,
    outcome,
    locationName: z.string().min(1),
    latitude,
    longitude,
    scale: scale.optional(),
    description: z.string().optional(),
    implementer: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    metrics: z.array(metric).optional(),
    cost: z.union([z.number(), z.string()]).optional(),
    currency: z.string().optional(),
    fundingSource: z.string().optional(),
    sources: z.array(link).optional(),
    lessonsLearned: z.array(z.string()).optional(),
    links: z.array(link).optional(),
  }),
  update_case_study: z.object({
    id,
    outcome: outcome.optional(),
    locationName: z.string().min(1).optional(),
    latitude: latitude.optional(),
    longitude: longitude.optional(),
    scale: scale.optional(),
    description: z.string().nullish(),
    implementer: z.string().nullish(),
    startDate: z.string().nullish(),
    endDate: z.string().nullish(),
    metrics: z.array(metric).nullish(),
    cost: z.union([z.number(), z.string()]).nullish(),
    currency: z.string().nullish(),
    fundingSource: z.string().nullish(),
    sources: z.array(link).nullish(),
    lessonsLearned: z.array(z.string()).nullish(),
    links: z.array(link).nullish(),
    verified: z.boolean().optional(),
  }),
  // Unified edit across kinds. Only `kind` + `id` are required; the remaining
  // fields are the union of the per-kind edit fields and are validated when
  // present. The handler routes to the right update_* path by `kind`.
  propose_edit: z.object({
    kind: proposeKind,
    id,
    note: z.string().nullish(),
    title: z.string().min(1).optional(),
    summary: z.string().min(1).optional(),
    description: z.string().nullish(),
    solutionStatus: z.enum(['plan', 'in-progress', 'done']).optional(),
    outcome: outcome.optional(),
    locationName: z.string().nullish(),
    latitude: latitude.optional(),
    longitude: longitude.optional(),
    scale: scale.optional(),
    implementer: z.string().nullish(),
    startDate: z.string().nullish(),
    endDate: z.string().nullish(),
    metrics: z.array(metric).nullish(),
    cost: z.union([z.number(), z.string()]).nullish(),
    currency: z.string().nullish(),
    fundingSource: z.string().nullish(),
    sources: z.array(link).nullish(),
    lessonsLearned: z.array(z.string()).nullish(),
    links: z.array(link).nullish(),
    parentId: id.optional(),
    solutionId: id.optional(),
  }),
  list_revisions: z.object({ kind: proposeKind, id }),
  review_revision: z.object({
    revisionId: id,
    action: z.enum(['approve', 'reject']),
    reason: z.string().nullish(),
  }),
  get_whitepaper: z.object({}),
  get_guide: z.object({ slug: z.string().optional() }),
} as const

export type McpToolName = keyof typeof mcpToolInputSchemas

export function formatZodIssues(error: z.ZodError): string {
  return error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`).join('; ')
}
