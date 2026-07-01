/**
 * Single-user session auth — zero-dependency, edge-safe.
 *
 * The session cookie holds an HMAC-SHA256 signature of the configured username,
 * signed with SESSION_SECRET. It contains no secret itself, is httpOnly, and is
 * verified both in middleware (edge runtime) and in server actions (node runtime)
 * using the Web Crypto API available in both.
 */

export const SESSION_COOKIE = 'tm_session'
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

const encoder = new TextEncoder()

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required env var: ${name}`)
  return value
}

function toBase64Url(bytes: ArrayBuffer): string {
  let binary = ''
  const arr = new Uint8Array(bytes)
  for (let i = 0; i < arr.length; i++) binary += String.fromCharCode(arr[i])
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function sign(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(requireEnv('SESSION_SECRET')),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data))
  return toBase64Url(signature)
}

/** Constant-time-ish string comparison. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let mismatch = 0
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return mismatch === 0
}

/** Token for the currently configured user. Deterministic per (username, secret). */
export async function createSessionToken(): Promise<string> {
  return sign(`auth:${requireEnv('APP_USERNAME')}`)
}

/** True iff the cookie value matches the expected signature for the configured user. */
export async function verifySessionToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false
  try {
    const expected = await sign(`auth:${requireEnv('APP_USERNAME')}`)
    return safeEqual(token, expected)
  } catch {
    return false
  }
}

/** Validates a login attempt against the configured credentials. */
export function credentialsValid(username: string, password: string): boolean {
  return (
    safeEqual(username, requireEnv('APP_USERNAME')) &&
    safeEqual(password, requireEnv('APP_PASSWORD'))
  )
}
