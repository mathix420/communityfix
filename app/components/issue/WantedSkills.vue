<script setup lang="ts">
// Demand side of skill matching: a compact list of skills this node is looking
// for. Anyone logged in can add one; the chip creator, node author, or an
// admin can remove one (server enforced — the ✕ only shows for own/author).
const props = defineProps<{
  issueId: number
  title: string
  authorId?: string | null
}>()

const { track } = useUmami()
const toast = useToast()

const MAX_SKILLS = 10

const { data: skills, refresh } = await useFetch(`/api/issue/${props.issueId}/wanted-skills`, {
  default: () => [],
})

const newSkill = ref('')
const adding = ref(false)
const removingId = ref<number | null>(null)

const canAddMore = computed(() => (skills.value?.length ?? 0) < MAX_SKILLS)

function canDelete(skill: { createdById: string | null }, userId?: string | null) {
  if (!userId) return false
  return skill.createdById === userId || props.authorId === userId
}

async function addSkill() {
  const skill = newSkill.value.trim()
  if (skill.length < 2 || adding.value) return
  adding.value = true
  try {
    await $fetch(`/api/issue/${props.issueId}/wanted-skills`, {
      method: 'POST',
      body: { skill },
    })
    track('Add wanted skill', { issueId: props.issueId })
    newSkill.value = ''
    await refresh()
  } catch (error: any) {
    toast.add({
      title: 'Could not add skill',
      description: error?.data?.message || error?.message || 'Please try again.',
      color: 'error',
    })
  } finally {
    adding.value = false
  }
}

async function removeSkill(skillId: number) {
  removingId.value = skillId
  try {
    await $fetch(`/api/issue/${props.issueId}/wanted-skills/${skillId}`, {
      method: 'DELETE',
    })
    track('Remove wanted skill', { issueId: props.issueId })
    await refresh()
  } catch (error: any) {
    toast.add({
      title: 'Could not remove skill',
      description: error?.data?.message || error?.message || 'Please try again.',
      color: 'error',
    })
  } finally {
    removingId.value = null
  }
}

async function shareSkills() {
  const url = `${window.location.origin}/issue/${props.issueId}`
  const list = (skills.value ?? []).map((s) => s.skill).join(', ')
  const text = `"${props.title}" on CommunityFix is looking for: ${list}. Can you help? ${url}`

  if (navigator.share) {
    try {
      await navigator.share({ text })
      track('Share wanted skills', { issueId: props.issueId, method: 'native' })
    } catch {}
  } else {
    try {
      await navigator.clipboard.writeText(text)
      track('Share wanted skills', { issueId: props.issueId, method: 'clipboard' })
      toast.add({
        title: 'Copied!',
        description: 'The call for skills has been copied to clipboard',
        color: 'success',
      })
    } catch (error) {
      console.error('Failed to copy:', error)
      toast.add({
        title: 'Copy failed',
        description: 'Unable to copy to clipboard',
        color: 'error',
      })
    }
  }
}
</script>

<template>
  <AuthState v-slot="{ loggedIn, user }">
    <section
      v-if="skills.length || loggedIn"
      class="rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:p-6"
    >
      <div class="flex items-center gap-2 mb-2.5">
        <UIcon class="size-4 text-gray-400" name="lucide:hand-helping" />
        <p class="text-xs font-mono uppercase tracking-wide text-gray-400">
          Skills wanted
        </p>
        <UButton
          v-if="skills.length"
          aria-label="Share this call for skills"
          class="ml-auto"
          color="neutral"
          icon="lucide:share-2"
          size="xs"
          variant="ghost"
          @click="shareSkills"
        >
          Share
        </UButton>
      </div>
      <div v-if="skills.length" class="flex flex-wrap gap-2" :class="loggedIn && 'mb-3'">
        <UiTag
          v-for="s in skills"
          :key="s.id"
          rounded="md"
          variant="neutral"
          :interactive="false"
          :title="s.createdBy ? `Added by ${s.createdBy}` : undefined"
        >
          {{ s.skill }}
          <button
            v-if="canDelete(s, user?.id)"
            class="ml-1.5 -mr-0.5 text-gray-400 hover:text-red-600 transition-colors cursor-pointer disabled:opacity-50"
            type="button"
            :aria-label="`Remove ${s.skill}`"
            :disabled="removingId === s.id"
            @click="removeSkill(s.id)"
          >
            <UIcon class="size-3 block" name="lucide:x" />
          </button>
        </UiTag>
      </div>
      <p v-else-if="loggedIn" class="text-sm text-gray-500 mb-3">
        Know what expertise this needs? List it so the right people can find it.
      </p>
      <form v-if="loggedIn && canAddMore" class="flex items-center gap-2" @submit.prevent="addSkill">
        <UInput
          v-model="newSkill"
          class="flex-1 max-w-64"
          maxlength="60"
          placeholder="e.g. GIS mapping"
          size="sm"
        />
        <UButton
          color="primary"
          size="sm"
          type="submit"
          variant="soft"
          :disabled="newSkill.trim().length < 2"
          :loading="adding"
        >
          Add
        </UButton>
      </form>
    </section>
  </AuthState>
</template>
