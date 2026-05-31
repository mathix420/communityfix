// Minimal AT Protocol (atproto) XRPC client.
//
// CommunityFix publishes standard.site lexicon records to a Personal Data
// Server (PDS) so its content is discoverable across the ATmosphere. We don't
// pull in `@atproto/api` — it assumes a Node runtime and is far heavier than we
// need. This wrapper speaks the handful of XRPC methods we use directly over
// `fetch`, which works unchanged on Cloudflare Workers.
//
// Credentials come from runtimeConfig (Doppler):
//   atprotoService   – PDS base URL (default https://bsky.social)
//   atprotoIdentifier – handle or DID of the publishing account
//   atprotoPassword  – app password (NOT the account password)
//
// When any of these are unset the client is considered unconfigured and the
// standard.site sync no-ops, so the feature stays dormant until an operator
// provisions an identity.

interface SessionConfig {
  service: string
  identifier: string
  password: string
}

export interface AtpSession {
  service: string
  did: string
  handle: string
  accessJwt: string
  refreshJwt: string
}

export interface PutRecordResult {
  uri: string
  cid: string
}

export interface BlobRef {
  $type: 'blob'
  ref: { $link: string }
  mimeType: string
  size: number
}

function readConfig(): SessionConfig | null {
  const cfg = useRuntimeConfig()
  const identifier = cfg.atprotoIdentifier?.trim()
  const password = cfg.atprotoPassword?.trim()
  if (!identifier || !password) return null
  const service = (cfg.atprotoService?.trim() || 'https://bsky.social').replace(/\/+$/, '')
  return { service, identifier, password }
}

/**
 * Whether atproto credentials are present. Callers use this to skip the whole
 * standard.site publishing path cleanly when the feature isn't provisioned.
 */
export function isAtprotoConfigured(): boolean {
  return readConfig() !== null
}

async function xrpc<T>(
  service: string,
  nsid: string,
  init: { method: 'GET', params?: Record<string, string | undefined> }
    | { method: 'POST', body: unknown, accessJwt?: string, contentType?: string },
): Promise<T> {
  let url = `${service}/xrpc/${nsid}`
  const headers: Record<string, string> = {}
  let body: BodyInit | undefined

  if (init.method === 'GET') {
    const qs = new URLSearchParams()
    for (const [k, v] of Object.entries(init.params ?? {})) {
      if (v !== undefined) qs.set(k, v)
    }
    const q = qs.toString()
    if (q) url += `?${q}`
  }
  else {
    if (init.accessJwt) headers.Authorization = `Bearer ${init.accessJwt}`
    if (init.body instanceof Uint8Array) {
      headers['Content-Type'] = init.contentType ?? 'application/octet-stream'
      body = init.body as unknown as BodyInit
    }
    else {
      headers['Content-Type'] = 'application/json'
      body = JSON.stringify(init.body)
    }
  }

  const res = await fetch(url, { method: init.method, headers, body })
  const text = await res.text()
  if (!res.ok) {
    let message = text
    try {
      const parsed = JSON.parse(text) as { error?: string, message?: string }
      message = parsed.message || parsed.error || text
    }
    catch { /* keep raw text */ }
    throw new Error(`atproto ${nsid} failed (${res.status}): ${message}`)
  }
  return (text ? JSON.parse(text) : {}) as T
}

/**
 * Authenticate with the configured PDS via com.atproto.server.createSession.
 * Returns null when credentials are not configured.
 */
export async function createAtpSession(): Promise<AtpSession | null> {
  const config = readConfig()
  if (!config) return null

  const data = await xrpc<{ did: string, handle: string, accessJwt: string, refreshJwt: string }>(
    config.service,
    'com.atproto.server.createSession',
    { method: 'POST', body: { identifier: config.identifier, password: config.password } },
  )
  return { service: config.service, ...data }
}

/** Upload a binary blob (e.g. the publication icon) and return its blob ref. */
export async function uploadAtpBlob(
  session: AtpSession,
  bytes: Uint8Array,
  mimeType: string,
): Promise<BlobRef> {
  const data = await xrpc<{ blob: BlobRef }>(
    session.service,
    'com.atproto.repo.uploadBlob',
    { method: 'POST', body: bytes, accessJwt: session.accessJwt, contentType: mimeType },
  )
  return data.blob
}

/** Fetch a single record. Returns null on RecordNotFound, rethrows otherwise. */
export async function getAtpRecord(
  session: AtpSession,
  collection: string,
  rkey: string,
): Promise<{ uri: string, cid: string, value: Record<string, unknown> } | null> {
  try {
    return await xrpc(
      session.service,
      'com.atproto.repo.getRecord',
      { method: 'GET', params: { repo: session.did, collection, rkey } },
    )
  }
  catch (err) {
    if (err instanceof Error && /RecordNotFound/i.test(err.message)) return null
    throw err
  }
}

/**
 * Create or overwrite a record at a known rkey via com.atproto.repo.putRecord.
 * `swapCid`, when supplied, guards against lost updates by requiring the
 * existing record to still be at that CID.
 */
export async function putAtpRecord(
  session: AtpSession,
  collection: string,
  rkey: string,
  record: Record<string, unknown>,
  swapCid?: string | null,
): Promise<PutRecordResult> {
  const body: Record<string, unknown> = {
    repo: session.did,
    collection,
    rkey,
    record,
  }
  if (swapCid) body.swapRecord = swapCid

  return await xrpc<PutRecordResult>(
    session.service,
    'com.atproto.repo.putRecord',
    { method: 'POST', body, accessJwt: session.accessJwt },
  )
}

/** Delete a record. Tolerates an already-absent record. */
export async function deleteAtpRecord(
  session: AtpSession,
  collection: string,
  rkey: string,
): Promise<void> {
  await xrpc(
    session.service,
    'com.atproto.repo.deleteRecord',
    { method: 'POST', body: { repo: session.did, collection, rkey }, accessJwt: session.accessJwt },
  )
}

// --- TID record keys --------------------------------------------------------
// standard.site records use the `tid` key type. A TID is a 13-char base32-sortable
// timestamp identifier (53-bit microsecond clock + 10-bit random clock id). This
// mirrors the reference generator closely enough for unique, monotonic rkeys.

const TID_ALPHABET = '234567abcdefghijklmnopqrstuvwxyz'
let lastTidTimestamp = 0
const tidClockId = Math.floor(Math.random() * 1024)

export function generateTid(): string {
  let now = Date.now() * 1000 // microseconds
  if (now <= lastTidTimestamp) now = lastTidTimestamp + 1
  lastTidTimestamp = now

  // 53-bit timestamp followed by 10-bit clock id = 63 bits, encoded big-endian
  // into 13 base32 chars (the top bit is always 0).
  const value = BigInt(now) * 1024n + BigInt(tidClockId)
  let s = ''
  let v = value
  for (let i = 0; i < 13; i++) {
    s = TID_ALPHABET[Number(v & 31n)] + s
    v >>= 5n
  }
  return s
}
