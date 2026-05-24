import { reviewStructure } from '../../utils/review-structure'

export default defineTask({
  meta: {
    name: 'review:structure',
    description: 'Detect duplicates, suggest reparenting, and flag case-study candidates',
  },
  async run({ payload }) {
    const issueId = Number(payload?.issueId)
    if (!issueId) return { result: 'Missing issueId' }
    await reviewStructure(issueId)
    return { result: `Structural review done for ${issueId}` }
  },
})
