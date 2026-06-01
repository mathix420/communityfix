import Anthropic from '@anthropic-ai/sdk'
import { parse as parseYaml } from 'yaml'
import { z } from 'zod'
import { chatJson } from './lib'

import issueModerateYaml from './steps/issue/moderate.yaml'
import issueClassifyTagsYaml from './steps/issue/classify-tags.yaml'
import issueMapSdgsYaml from './steps/issue/map-sdgs.yaml'
import structureVerdictYaml from './steps/structure/verdict.yaml'
import caseStudyModerateYaml from './steps/case-study/moderate.yaml'
import caseStudyCurateYaml from './steps/case-study/curate.yaml'
import issueCurateYaml from './steps/issue/curate.yaml'
import locationResolveYaml from './steps/location/resolve.yaml'

const StepFileSchema = z.object({
  id: z.string(),
  description: z.string(),
  version: z.number().int().positive(),
  model: z.string(),
  maxTokens: z.number().int().positive(),
  temperature: z.number().optional(),
  system: z.string(),
  user: z.string(),
  schema: z.record(z.string(), z.unknown()),
  tools: z.array(z.string()).optional(),
})
export type StepDef = z.infer<typeof StepFileSchema>

function loadStep(raw: string, expectedId: string): StepDef {
  let data: unknown
  try {
    data = parseYaml(raw)
  }
  catch (err) {
    throw new Error(`[steps] Failed to parse YAML for "${expectedId}": ${(err as Error).message}`)
  }
  const result = StepFileSchema.safeParse(data)
  if (!result.success) {
    throw new Error(`[steps] Invalid step file "${expectedId}": ${result.error.message}`)
  }
  if (result.data.id !== expectedId) {
    throw new Error(`[steps] Step id mismatch: file imported as "${expectedId}" declares id "${result.data.id}"`)
  }
  return result.data
}

export const STEPS = {
  'issue.moderate': loadStep(issueModerateYaml, 'issue.moderate'),
  'issue.classify-tags': loadStep(issueClassifyTagsYaml, 'issue.classify-tags'),
  'issue.map-sdgs': loadStep(issueMapSdgsYaml, 'issue.map-sdgs'),
  'structure.verdict': loadStep(structureVerdictYaml, 'structure.verdict'),
  'case-study.moderate': loadStep(caseStudyModerateYaml, 'case-study.moderate'),
  'case-study.curate': loadStep(caseStudyCurateYaml, 'case-study.curate'),
  'issue.curate': loadStep(issueCurateYaml, 'issue.curate'),
  'location.resolve': loadStep(locationResolveYaml, 'location.resolve'),
} as const

export type StepId = keyof typeof STEPS

const SLOT = /\{\{\s*(\w+)\s*\}\}/g

export function render(template: string, vars: Record<string, string>): string {
  return template.replace(SLOT, (_, key: string) => {
    if (!(key in vars)) throw new Error(`[steps] Missing template variable "${key}"`)
    return vars[key] ?? ''
  })
}

export async function runStep<T>(
  anthropic: Anthropic,
  id: StepId,
  vars: Record<string, string>,
  context?: string,
): Promise<T> {
  const step = STEPS[id]
  return chatJson<T>(anthropic, {
    system: render(step.system, vars),
    user: render(step.user, vars),
    schema: step.schema,
    model: step.model,
    maxTokens: step.maxTokens,
    temperature: step.temperature,
    context: context ?? id,
  })
}

export interface AgentTool {
  definition: { name: string, description: string, input_schema: Record<string, unknown> }
  run: (input: any) => Promise<unknown>
}

const AGENT_MAX_TURNS = 6

export async function runAgent<T>(
  anthropic: Anthropic,
  id: StepId,
  vars: Record<string, string>,
  tools: AgentTool[],
  context?: string,
): Promise<T> {
  const step = STEPS[id]
  const system = render(step.system, vars)
  const toolDefs: Anthropic.Tool[] = [
    ...tools.map(t => ({ ...t.definition, input_schema: t.definition.input_schema as Anthropic.Tool.InputSchema })),
    {
      name: 'submit_result',
      description: 'Call this exactly once, with your final answer, when you are done.',
      input_schema: step.schema as Anthropic.Tool.InputSchema,
    },
  ]
  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: render(step.user, vars) }]

  for (let turn = 0; turn < AGENT_MAX_TURNS; turn++) {
    const res = await anthropic.messages.create({
      model: step.model,
      max_tokens: step.maxTokens,
      ...(step.temperature != null ? { temperature: step.temperature } : {}),
      system,
      tools: toolDefs,
      messages,
    })
    messages.push({ role: 'assistant', content: res.content })

    const toolUses = res.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
    const submitted = toolUses.find(u => u.name === 'submit_result')
    if (submitted) return submitted.input as T
    if (toolUses.length === 0) {
      messages.push({ role: 'user', content: 'Call submit_result now with your final answer.' })
      continue
    }

    const toolResults = await Promise.all(toolUses.map(async (u) => {
      const tool = tools.find(t => t.definition.name === u.name)
      let content: string
      try {
        content = JSON.stringify(tool ? await tool.run(u.input) : { error: `unknown tool: ${u.name}` })
      }
      catch (err) {
        content = JSON.stringify({ error: (err as Error).message })
      }
      return { type: 'tool_result' as const, tool_use_id: u.id, content }
    }))
    messages.push({ role: 'user', content: toolResults })
  }

  throw new Error(`[runAgent] ${id} did not submit a result within ${AGENT_MAX_TURNS} turns${context ? ` (${context})` : ''}`)
}
