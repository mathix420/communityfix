import { reviewIssue } from '../../utils/review-issue'

export default defineTask({
  meta: {
    name: 'review:issue',
    description: 'Run AI moderation on a single issue',
  },
  async run({ payload }) {
    const issueId = Number(payload?.issueId)
    if (!issueId) {
      return { result: 'Missing issueId' }
    }
    await reviewIssue(issueId)
    return { result: `Reviewed issue ${issueId}` }
  },
})
