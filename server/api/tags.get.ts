export default defineEventHandler(async () => {
  const db = useDB()
  // Exclude the 1536-dim `embedding` vector — no client needs it, and it would
  // otherwise dominate the payload (notably for the public OpenAPI/GPT Action).
  return db.query.tags.findMany({ columns: { embedding: false } })
})
