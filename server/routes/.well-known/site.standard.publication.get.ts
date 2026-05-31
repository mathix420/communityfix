// standard.site publication verification endpoint.
//
// The spec's domain↔record verification: a publication serves its AT-URI at
// /.well-known/site.standard.publication, and the record's `url` points back at
// this domain. Indexers fetch both directions to confirm the link is mutual.
//
// Returns the AT-URI as plain text. 404 until the publication record has been
// published (i.e. the sync:standard-site task has run with credentials set).
import { getPublicationUri } from '../../utils/standard-site'

export default defineEventHandler(async (event) => {
  const uri = await getPublicationUri()
  if (!uri) {
    throw createError({ statusCode: 404, statusMessage: 'No standard.site publication record published yet' })
  }
  setHeader(event, 'content-type', 'text/plain; charset=utf-8')
  setHeader(event, 'cache-control', 'public, max-age=300')
  return uri
})
