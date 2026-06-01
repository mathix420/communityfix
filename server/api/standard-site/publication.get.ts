// Public read of the standard.site publication AT-URI, so the app shell can
// emit the optional <link rel="site.standard.publication"> discovery hint in
// <head>. Returns { uri: null } until the publication record is published.
import { getPublicationUri } from '../../utils/standard-site'

export default defineEventHandler(async () => {
  return { uri: await getPublicationUri() }
})
