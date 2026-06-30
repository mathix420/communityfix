// Schema.org JSON-LD builders. Return objects without "@context" so useJsonLd
// can compose them into one @graph. Entity @id/url use a stable production base.

export const SITE_URL = 'https://communityfix.org'
export const ORG_ID = `${SITE_URL}/#org`
export const WEBSITE_ID = `${SITE_URL}/#website`

type JsonLd = Record<string, unknown>

/** Drop keys whose value is undefined, null, '' or an empty array. */
function compact<T extends JsonLd>(obj: T): T {
  const out: JsonLd = {}
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) continue
    if (typeof value === 'string' && value.length === 0) continue
    if (Array.isArray(value) && value.length === 0) continue
    out[key] = value
  }
  return out as T
}

export function orgSchema(): JsonLd {
  return {
    '@type': 'Organization',
    '@id': ORG_ID,
    name: 'CommunityFix',
    url: SITE_URL,
    logo: `${SITE_URL}/_og/d/c_Home.png`,
    sameAs: ['https://github.com/mathix420/communityfix'],
  }
}

export function websiteSchema(): JsonLd {
  return {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url: SITE_URL,
    name: 'CommunityFix',
    publisher: { '@id': ORG_ID },
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  }
}

export interface BreadcrumbItem {
  name: string
  url: string
}

export function breadcrumbSchema(items: BreadcrumbItem[]): JsonLd {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }
}

export interface ArticleSchemaOptions {
  title: string
  description?: string
  url: string
  datePublished?: string
  dateModified?: string
  authorName?: string
}

export function articleSchema(opts: ArticleSchemaOptions): JsonLd {
  return compact({
    '@type': 'Article',
    headline: opts.title,
    description: opts.description,
    url: opts.url,
    mainEntityOfPage: opts.url,
    datePublished: opts.datePublished,
    dateModified: opts.dateModified,
    author: opts.authorName ? { '@type': 'Person', name: opts.authorName } : undefined,
    isPartOf: { '@id': WEBSITE_ID },
  })
}

export interface CreativeWorkSchemaOptions {
  title: string
  description?: string
  url: string
  locationName?: string
  latitude?: number
  longitude?: number
  startDate?: string
  endDate?: string
  implementer?: string
  sources?: string[]
  datePublished?: string
  dateModified?: string
}

export function creativeWorkSchema(opts: CreativeWorkSchemaOptions): JsonLd {
  const hasGeo = opts.latitude !== undefined && opts.longitude !== undefined

  const spatialCoverage = hasGeo
    ? compact({
        '@type': 'Place',
        name: opts.locationName,
        geo: {
          '@type': 'GeoCoordinates',
          latitude: opts.latitude,
          longitude: opts.longitude,
        },
      })
    : undefined

  const temporalCoverage = opts.startDate ? `${opts.startDate}/${opts.endDate ?? ''}` : undefined

  return compact({
    '@type': 'CreativeWork',
    name: opts.title,
    description: opts.description,
    url: opts.url,
    datePublished: opts.datePublished,
    dateModified: opts.dateModified,
    spatialCoverage: spatialCoverage,
    temporalCoverage: temporalCoverage,
    creator: opts.implementer ? { '@type': 'Person', name: opts.implementer } : undefined,
    citation: opts.sources && opts.sources.length > 0 ? opts.sources : undefined,
    isPartOf: { '@id': WEBSITE_ID },
  })
}

export interface PersonSchemaOptions {
  name: string
  url: string
  description?: string
}

export function personSchema(opts: PersonSchemaOptions): JsonLd {
  return compact({
    '@type': 'Person',
    name: opts.name,
    url: opts.url,
    description: opts.description,
  })
}

/** Inject Schema.org node(s) as one JSON-LD <script> (array → @graph). */
export function useJsonLd(node: JsonLd | JsonLd[]): void {
  const payload = Array.isArray(node)
    ? { '@context': 'https://schema.org', '@graph': node }
    : { '@context': 'https://schema.org', ...node }

  // Escape <>& to \uXXXX so the payload can't form </script> and break out.
  const bs = String.fromCharCode(92) // literal backslash
  const serialized = JSON.stringify(payload).replace(
    /[<>&]/g,
    (c) => bs + 'u' + c.charCodeAt(0).toString(16).padStart(4, '0'),
  )

  useHead({
    script: [
      {
        type: 'application/ld+json',
        innerHTML: serialized,
      },
    ],
  })
}
