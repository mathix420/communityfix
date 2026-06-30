<script setup lang="ts">
const { data: mcp } = await useAsyncData('/mcp', () =>
  queryCollection('content').path('/mcp').first(),
)

useSeoMeta({
  title: mcp.value?.title || 'MCP Server - CommunityFix',
  description:
    mcp.value?.description ||
    'Connect Claude Desktop, Claude Code, and other AI clients to CommunityFix through the Model Context Protocol.',
  keywords:
    'CommunityFix MCP, Model Context Protocol, Claude Desktop integration, AI agent, OAuth 2.1, community-driven solutions',
  ogTitle: mcp.value?.title || 'MCP Server - CommunityFix',
  ogDescription:
    mcp.value?.description ||
    'Browse, search, and create CommunityFix issues and solutions from any MCP-compatible AI client.',
  ogType: 'article',
  twitterCard: 'summary',
  twitterTitle: mcp.value?.title || 'MCP Server - CommunityFix',
  twitterDescription:
    mcp.value?.description ||
    'Plug CommunityFix into your AI client via the Model Context Protocol.',
})

defineOgImage('Editorial', {
  title: mcp.value?.title || 'MCP Server',
  category: 'Docs',
})
</script>

<template>
  <AppContainer>
    <!-- @vue-ignore Nuxt Content's ContentRenderer infers slot props as never; suppressed until upstream types are fixed -->
    <ContentRenderer v-if="mcp" class="prose-doc" :value="mcp" />
    <div v-else>
      Not found
    </div>
  </AppContainer>
</template>
