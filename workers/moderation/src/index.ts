import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep, type WorkflowStepConfig } from 'cloudflare:workers'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { createDb, type Ctx } from './lib'
import {
  prepareIssue, moderateIssue, classifyTags, mapSdgs, finalizeIssue,
  prepareStructure, structureVerdict, applyStructure,
  moderateCaseStudy, curateCaseStudy, finalizeCaseStudy,
} from './pipelines'

interface Env {
  HYPERDRIVE: { connectionString: string }
  NUXT_OPENAI_API_KEY: string
  NUXT_ANTHROPIC_API_KEY: string
  NUXT_ADMIN_EMAILS: string
}

export type ModerationKind = 'issue' | 'case-study' | 'structure'
export interface ModerationParams {
  kind: ModerationKind
  id: number
}

const STEP: WorkflowStepConfig = {
  retries: { limit: 5, delay: '5 seconds', backoff: 'exponential' },
  timeout: '2 minutes',
}

export class ModerationWorkflow extends WorkflowEntrypoint<Env, ModerationParams> {
  async run(event: WorkflowEvent<ModerationParams>, step: WorkflowStep) {
    const { kind, id } = event.payload
    const ctx: Ctx = {
      db: createDb(this.env.HYPERDRIVE.connectionString),
      openai: new OpenAI({ apiKey: this.env.NUXT_OPENAI_API_KEY }),
      anthropic: new Anthropic({ apiKey: this.env.NUXT_ANTHROPIC_API_KEY }),
      adminEmails: this.env.NUXT_ADMIN_EMAILS ?? '',
    }

    if (kind === 'issue') {
      await this.reviewIssue(ctx, step, id)
    }
    else if (kind === 'case-study') {
      await this.reviewCaseStudy(ctx, step, id)
    }
    else if (kind === 'structure') {
      await this.reviewStructure(ctx, step, id)
    }
  }

  private async reviewIssue(ctx: Ctx, step: WorkflowStep, id: number) {
    const prep = await step.do('prepare', STEP, () => prepareIssue(ctx, id))
    if (!prep) return

    const [moderation, tagResult, sdgResult] = await Promise.all([
      step.do('moderate', STEP, () => moderateIssue(ctx, prep)),
      step.do('classify-tags', STEP, () => classifyTags(ctx, prep)),
      step.do('map-sdgs', STEP, () => mapSdgs(ctx, prep)),
    ])

    const { approved } = await step.do('finalize', STEP, () => finalizeIssue(ctx, prep, moderation, tagResult, sdgResult))
    if (approved) await this.reviewStructure(ctx, step, id)
  }

  private async reviewStructure(ctx: Ctx, step: WorkflowStep, id: number) {
    const prep = await step.do('structure-prepare', STEP, () => prepareStructure(ctx, id))
    if (!prep) return
    const verdict = await step.do('structure-verdict', STEP, () => structureVerdict(ctx, prep))
    await step.do('structure-apply', STEP, () => applyStructure(ctx, prep, verdict))
  }

  private async reviewCaseStudy(ctx: Ctx, step: WorkflowStep, id: number) {
    const outcome = await step.do('moderate', STEP, () => moderateCaseStudy(ctx, id))
    if (outcome.decision !== 'approved' || !outcome.cs || !outcome.moderation) return

    const cs = outcome.cs
    const solution = outcome.solution ?? null
    const moderation = outcome.moderation
    const curated = await step.do('curate', STEP, () => curateCaseStudy(ctx, cs, solution))
    await step.do('finalize', STEP, () => finalizeCaseStudy(ctx, cs, solution, moderation, curated))
  }
}

export default {
  async fetch(): Promise<Response> {
    return new Response('communityfix moderation workflow', { status: 200 })
  },
}
