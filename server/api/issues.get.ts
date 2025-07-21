export default defineEventHandler((event) => {
  const query = getQuery(event)
  const tagFilter = query.tag as string | undefined

  if (tagFilter) {
    return issues.filter(issue =>
      issue.tags && issue.tags.includes(tagFilter),
    )
  }

  return issues
})
