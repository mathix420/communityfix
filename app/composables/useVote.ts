interface VoteResponse {
  score: number
  userVote: 1 | -1 | null
}

export function useVote(issueId: number | Ref<number>, initialScore = 0) {
  const score = ref(initialScore)
  const userVote = ref<1 | -1 | null>(null)
  const loading = ref(false)

  const id = computed(() => toValue(issueId))

  async function fetchVotes() {
    try {
      const data = await $fetch<VoteResponse>(`/api/issue/${id.value}/votes`)
      score.value = data.score
      userVote.value = data.userVote
    }
    catch {
      // Silently fail — score stays at initial value
    }
  }

  async function vote(value: 1 | -1) {
    if (loading.value) return

    // If clicking the same vote, remove it
    if (userVote.value === value) {
      return removeVote()
    }

    // Optimistic update
    const prevScore = score.value
    const prevVote = userVote.value
    score.value += value - (prevVote ?? 0)
    userVote.value = value
    loading.value = true

    try {
      const data = await $fetch<VoteResponse>(`/api/issue/${id.value}/vote`, {
        method: 'POST',
        body: { value },
      })
      score.value = data.score
      userVote.value = data.userVote
    }
    catch {
      // Revert on failure
      score.value = prevScore
      userVote.value = prevVote
    }
    finally {
      loading.value = false
    }
  }

  async function removeVote() {
    if (loading.value) return

    const prevScore = score.value
    const prevVote = userVote.value
    score.value -= prevVote ?? 0
    userVote.value = null
    loading.value = true

    try {
      const data = await $fetch<VoteResponse>(`/api/issue/${id.value}/vote`, {
        method: 'DELETE',
      })
      score.value = data.score
      userVote.value = null
    }
    catch {
      score.value = prevScore
      userVote.value = prevVote
    }
    finally {
      loading.value = false
    }
  }

  return { score, userVote, loading, vote, removeVote, fetchVotes }
}
