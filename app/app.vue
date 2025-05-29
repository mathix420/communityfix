<script setup lang="ts">
useScript({
  'src': 'https://cloud.umami.dev/script.js',
  'defer': true,
  'async': true,
  'data-website-id': 'a04836b7-0c67-401d-8c45-f072fdc2e221',
}, { trigger: onMounted })
</script>

<template>
  <Html>
    <Body class="grainy">
      <Head>
        <Title>Community Fix</Title>
        <Meta
          name="description"
          content="A community-driven platform for sharing skills and knowledge."
        />
        <Link
          rel="icon"
          type="image/png"
          href="/favicon-96x96.png"
          sizes="96x96"
        />
        <Link
          rel="icon"
          type="image/svg+xml"
          href="/favicon.svg"
        />
        <Link
          rel="shortcut icon"
          href="/favicon.ico"
        />
        <Link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/apple-touch-icon.png"
        />
      </Head>

      <UApp>
        <AppHeader />
        <NuxtPage />
        <AppFooter />
      </UApp>
    </Body>
  </Html>
</template>
