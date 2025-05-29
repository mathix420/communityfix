export default defineEventHandler((event) => {
  const issueId = getRouterParam(event, 'id')
  if (!issueId || isNaN(parseInt(issueId, 10))) return null
  return issues.find(issue => issue.id === parseInt(issueId, 10)) || null
})
