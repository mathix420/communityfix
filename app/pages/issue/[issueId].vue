<template>
  <div class="container pt-12 mb-auto mx-auto">
    <div class="flex flex-col items-center justify-center">
      <div class="bg-white shadow-md rounded-lg p-6 max-w-md w-full">
        <h1 class="text-2xl font-bold mb-4">
          Issue Details
        </h1>
        <p class="text-gray-700 mb-2">
          Issue ID: {{ issueId }}
        </p>
        <p class="text-gray-700 mb-4">
          This is where the issue details will be displayed.
        </p>
        <NuxtLink
          to="/"
          class="text-blue-500 hover:underline"
        >
          Back to Home
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
