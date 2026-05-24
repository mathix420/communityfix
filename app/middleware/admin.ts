export default defineNuxtRouteMiddleware(async (to) => {
  const { loggedIn } = useUserSession()
  if (!loggedIn.value) {
    return navigateTo({ path: '/login', query: { redirect: to.fullPath } })
  }

  const { data } = await useFetch('/api/admin/me')
  if (!data.value?.isAdmin) {
    return navigateTo('/')
  }
})
