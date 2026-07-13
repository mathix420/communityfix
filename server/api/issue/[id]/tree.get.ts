import { getIssueTree } from '../../../utils/issue-tree'
import type { TreeNode } from '../../../utils/issue-tree'

export type { TreeNode }

export default defineEventHandler(async (event): Promise<TreeNode[]> => {
  return getIssueTree(requireIdParam(event))
})
