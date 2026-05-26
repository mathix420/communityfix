const PENDING_IDS = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29]
const BASE = 'http://localhost:3000'

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      await fetch(`${BASE}/_nitro/tasks`)
      return true
    }
    catch {
      await new Promise(r => setTimeout(r, 2000))
    }
  }
  throw new Error('Dev server did not start in time')
}

async function reviewIssue(issueId: number) {
  const res = await fetch(`${BASE}/_nitro/tasks/review:issue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ payload: { issueId } }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`)
  return res.json()
}

console.log('Waiting for dev server...')
await waitForServer()
console.log('Server ready. Reviewing', PENDING_IDS.length, 'pending items.\n')

for (const id of PENDING_IDS) {
  try {
    console.log(`Reviewing issue #${id}...`)
    const result = await reviewIssue(id)
    console.log(`  ✓ ${JSON.stringify(result.result ?? result)}\n`)
  }
  catch (err) {
    console.error(`  ✗ Issue #${id} failed:`, err, '\n')
  }
}

console.log('Done.')
process.exit(0)
