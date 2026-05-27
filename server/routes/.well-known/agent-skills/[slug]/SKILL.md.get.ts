// Serve the raw SKILL.md body for one agent skill.
import { AGENT_SKILLS } from '../../../../utils/agent-skills'

export default defineEventHandler((event) => {
  const slug = getRouterParam(event, 'slug')
  const skill = AGENT_SKILLS.find(s => s.slug === slug)
  if (!skill) throw createError({ statusCode: 404, statusMessage: 'Skill not found' })

  setHeader(event, 'content-type', 'text/markdown; charset=utf-8')
  setHeader(event, 'cache-control', 'public, max-age=3600')
  return skill.body
})
