// Agent-skills discovery index (Agent Skills Discovery RFC v0.2.0).
// Lists the skills available at /.well-known/agent-skills/<slug>/SKILL.md
// with sha256 digests so agents can verify integrity.
import { AGENT_SKILLS, digestSkillBody } from '../../../utils/agent-skills'
import { getOrigin } from '../../../utils/oauth'

export default defineEventHandler(async (event) => {
  const origin = getOrigin(event)

  const skills = await Promise.all(
    AGENT_SKILLS.map(async (s) => {
      const url = `${origin}/.well-known/agent-skills/${s.slug}/SKILL.md`
      const digest = await digestSkillBody(s.body)
      return {
        name: s.name,
        type: s.type,
        description: s.description,
        url,
        sha256: digest,
      }
    }),
  )

  setHeader(event, 'content-type', 'application/json; charset=utf-8')
  setHeader(event, 'cache-control', 'public, max-age=3600')

  return {
    $schema: 'https://agentskills.io/schemas/agent-skills-index/v0.2.0',
    issuer: origin,
    updatedAt: new Date().toISOString(),
    skills,
  }
})
