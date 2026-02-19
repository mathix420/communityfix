export default defineEventHandler(async () => {
  const db = useDB()
  return db.query.tags.findMany()
})
