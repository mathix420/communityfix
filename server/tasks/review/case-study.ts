import { reviewCaseStudy } from '../../utils/review-case-study'

export default defineTask({
  meta: {
    name: 'review:case-study',
    description: 'Run AI moderation on a single case study',
  },
  async run({ payload }) {
    const caseStudyId = Number(payload?.caseStudyId)
    if (!caseStudyId) {
      return { result: 'Missing caseStudyId' }
    }
    await reviewCaseStudy(caseStudyId)
    return { result: `Reviewed case study ${caseStudyId}` }
  },
})
