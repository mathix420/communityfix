<script setup lang="ts">
const issues = [
  {
    id: 1,
    title: 'Reduce household waste',
    description: 'Every year, millions of tons of waste end up in landfills. We need innovative solutions to reduce household waste and promote recycling.',
    author: 'Jane Doe',
    date: '2023-10-01',
    solutionCount: 523,
    subIssueCount: 212,
  },
  {
    id: 2,
    title: 'Improve local public transport',
    description: 'Our public transport system is outdated and inefficient. We need ideas to enhance its reliability and accessibility.',
    author: 'John Smith',
    date: '2023-10-02',
    solutionCount: 312,
    subIssueCount: 145,
  },
  {
    id: 3,
    title: 'Cheaper access to clean water',
    description: 'Access to clean water is a basic human right. We need to find ways to make it more affordable and accessible for everyone.',
    author: 'Alice Johnson',
    date: '2023-10-03',
    solutionCount: 198,
    subIssueCount: 87,
  },
  {
    id: 4,
    title: 'Affordable housing solutions',
    description: 'Housing prices are skyrocketing, making it difficult for many to find affordable places to live. We need creative solutions to this crisis.',
    author: 'Bob Brown',
    date: '2023-10-04',
    solutionCount: 410,
    subIssueCount: 175,
  },
  {
    id: 5,
    title: 'Accessible hydroponics systems',
    description: 'Hydroponics can revolutionize urban farming, but current systems are too expensive for many. We need to develop affordable hydroponics solutions.',
    author: 'Charlie Green',
    date: '2023-10-05',
    solutionCount: 256,
    subIssueCount: 98,
  },
  {
    id: 6,
    title: 'Curbing greenhouse gas emissions',
    description: 'Climate change is a pressing issue. We need innovative ideas to reduce greenhouse gas emissions in our community.',
    author: 'Diana White',
    date: '2023-10-06',
    solutionCount: 678,
    subIssueCount: 300,
  },
]
</script>

<template>
  <div class="container mx-auto p-4">
    <div class="w-full my-28 gap-4 sm:gap-6 text-center flex flex-col items-center justify-center">
      <h1 class="font-mono text-4xl sm:text-7xl underline decoration-primary">
        communityfix.org
      </h1>
      <p class="text-lg sm:text-2xl font-title text-primary-950">
        Let's put our skills to work.
      </p>
    </div>

    <p class="text-center text-lg sm:text-xl font-title text-primary-950 mb-8">
      Here are some of the issues we are currently working on:
    </p>
    <div class="flex flex-col max-w-3xl mx-auto gap-6">
      <CardIssue
        v-for="issue in issues"
        :key="issue.id"
        :issue="issue"
      />
    </div>
  </div>
</template>
