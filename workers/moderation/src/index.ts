import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep, type WorkflowStepConfig } from 'cloudflare:workers'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { createDb, type Ctx } from './lib'
import { runStep } from './steps'
import {
  prepareIssue, finalizeIssue, applyIssueCurate,
  prepareStructure, applyStructure,
  prepareCaseStudy, rejectCaseStudy, finalizeCaseStudy,
  resolveLocation, applyLocationFix,
  type IssuePrep, type ModerationResult, type TagResult, type SdgResult,
  type StructureVerdict, type CaseStudyModeration, type CurationResult,
  type IssueCurationResult, type LocationTarget,
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
      step.do('moderate', STEP, () => runStep<ModerationResult>(ctx.anthropic, 'issue.moderate', { issueText: prep.issueText, duplicateContext: prep.duplicateContext }, `issue ${id}`)),
      step.do('classify-tags', STEP, () => runStep<TagResult>(ctx.anthropic, 'issue.classify-tags', { issueText: prep.issueText, tagList: prep.tagList }, `issue ${id}`)),
      step.do('map-sdgs', STEP, () => runStep<SdgResult>(ctx.anthropic, 'issue.map-sdgs', { issueText: prep.issueText, sdgList: prep.sdgList }, `issue ${id}`)),
    ])

    const { approved } = await step.do('finalize', STEP, () => finalizeIssue(ctx, prep, moderation, tagResult, sdgResult))
    if (!approved) return

    await this.enrichIssue(ctx, step, prep)
    await this.reviewStructure(ctx, step, id)
  }

  private async enrichIssue(ctx: Ctx, step: WorkflowStep, prep: IssuePrep) {
    const id = prep.issue.id

    const curateArm = step.do('curate', STEP, () => runStep<IssueCurationResult>(ctx.anthropic, 'issue.curate', {
      kind: prep.issue.type,
      title: prep.title,
      summary: prep.summary,
      description: prep.description ?? 'none',
    }, `issue ${id}`))
      .then(curate => step.do('apply-curate', STEP, () => applyIssueCurate(ctx, prep, curate)))
      .catch(err => console.error(`[review-issue] curation failed for issue ${id}:`, err))

    let locationArm: Promise<unknown> = Promise.resolve()
    const loc = prep.location
    const locName = prep.locationName
    if (loc && locName) {
      const target: LocationTarget = { kind: 'issue', id, locationName: locName, scale: prep.scale, location: loc, authorId: prep.issue.authorId }
      locationArm = step.do('resolve-location', STEP, () => resolveLocation(ctx, target, prep.issueText))
        .then(verdict => step.do('apply-location', STEP, () => applyLocationFix(ctx, target, verdict)))
        .catch(err => console.error(`[review-issue] location resolve failed for issue ${id}:`, err))
    }

    await Promise.all([curateArm, locationArm])
  }

  private async reviewStructure(ctx: Ctx, step: WorkflowStep, id: number) {
    const prep = await step.do('structure-prepare', STEP, () => prepareStructure(ctx, id))
    if (!prep) return
    const verdict = await step.do('structure-verdict', STEP, () => runStep<StructureVerdict>(ctx.anthropic, 'structure.verdict', {
      issueId: String(prep.issue.id),
      issueType: prep.issue.type,
      parentId: prep.issue.parentId != null ? String(prep.issue.parentId) : 'none',
      issueText: prep.issueText,
      contextLines: prep.contextLines,
    }, `structure ${id}`))
    await step.do('structure-apply', STEP, () => applyStructure(ctx, prep, verdict))
  }

  private async reviewCaseStudy(ctx: Ctx, step: WorkflowStep, id: number) {
    const prep = await step.do('prepare', STEP, () => prepareCaseStudy(ctx, id))
    if (!prep) return

    const moderation = await step.do('moderate', STEP, () => runStep<CaseStudyModeration>(ctx.anthropic, 'case-study.moderate', { caseStudyText: prep.caseStudyText }, `case-study ${id}`))
    if (!moderation.approved) {
      await step.do('reject', STEP, () => rejectCaseStudy(ctx, prep.cs, moderation))
      return
    }

    let locationArm: Promise<unknown> = Promise.resolve()
    const loc = prep.cs.location as { x: number, y: number } | null
    if (loc) {
      const target: LocationTarget = { kind: 'case-study', id, locationName: prep.cs.locationName, scale: prep.cs.scale, location: loc, authorId: prep.cs.authorId }
      locationArm = step.do('resolve-location', STEP, () => resolveLocation(ctx, target, prep.caseStudyText))
        .then(verdict => step.do('apply-location', STEP, () => applyLocationFix(ctx, target, verdict)))
        .catch(err => console.error(`[review-case-study] location resolve failed for case study ${id}:`, err))
    }

    const [curated] = await Promise.all([
      step.do('curate', STEP, () => runStep<CurationResult>(ctx.anthropic, 'case-study.curate', { parentContext: prep.parentContext, originalJson: prep.originalJson }, `case-study ${id}`)),
      locationArm,
    ])
    await step.do('finalize', STEP, () => finalizeCaseStudy(ctx, prep.cs, prep.solution, moderation, curated))
  }
}

export default {
  async fetch(): Promise<Response> {
    return new Response('communityfix moderation workflow', { status: 200 })
  },
}
