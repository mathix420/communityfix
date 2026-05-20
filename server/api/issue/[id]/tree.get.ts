import { getIssueTree } from '../../../utils/issue-tree'
import type { TreeNode } from '../../../utils/issue-tree'

export type { TreeNode }

export default defineEventHandler(async (event): Promise<TreeNode[]> => {
  const id = getRouterParam(event, 'id')
  if (!id || isNaN(parseInt(id, 10))) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid issue ID' })
  }
  return getIssueTree(parseInt(id, 10))
})
