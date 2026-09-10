import {
  createCipheriv, createDecipheriv, createHash, createHmac,
  hkdfSync, randomBytes, timingSafeEqual,
} from 'crypto'

const PREFIX = 'enc:v1:'

function keyFromSecret(secret: string) {
  return createHash('sha256').update(secret).digest()
}

/**
 * A purpose-bound subkey.
 *
 * One process secret ends up protecting several unrelated things — session
 * JWTs, file links, stored credentials. Deriving a labelled subkey per purpose
 * means a weakness or a leak in one use cannot be carried into another, and it
 * costs one function call.
 */
export function deriveKey(secret: string, label: string): Buffer {
  return Buffer.from(hkdfSync('sha256', keyFromSecret(secret), Buffer.alloc(0), label, 32))
}

export function sealSecret(plain: string, secret: string): string {
  if (!plain) return plain
  if (plain.startsWith(PREFIX)) return plain
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', keyFromSecret(secret), iv)
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return PREFIX + Buffer.concat([iv, tag, enc]).toString('base64url')
}

export function openSecret(stored: string, secret: string): string {
  if (!stored) return stored
  if (!stored.startsWith(PREFIX)) return stored
  const buf = Buffer.from(stored.slice(PREFIX.length), 'base64url')
  const iv = buf.subarray(0, 12)
  const tag = buf.subarray(12, 28)
  const enc = buf.subarray(28)
  const decipher = createDecipheriv('aes-256-gcm', keyFromSecret(secret), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8')
}

/** The label separating file-link signing from every other use of the secret. */
export const FILE_TOKEN_LABEL = 'kipl.file-link.v1'

/**
 * What a file link actually signs.
 *
 * The object key is caller-supplied and may contain any character, the
 * separator included. Joining it to the expiry with a bare delimiter lets one
 * (key, exp) pair serialise identically to another — a key ending in ".9999"
 * signed with exp=1 produces the same string as that key without the suffix
 * signed with exp=9999.1. Prefixing the key's length removes the ambiguity:
 * the reader knows where the key stops without having to search for a
 * delimiter.
 */
function payload(key: string, exp: number) {
  return `${key.length}:${key}:${exp}`
}

/**
 * Signs a link to one stored object.
 *
 * `exp` of 0 means the link does not expire, which is the default for a URL
 * written into a record. Photo URLs are persisted — QA inspections store the
 * bare URL string with no object key beside it — so a link that expires is a
 * link that cannot be regenerated from what the row holds. The signature is
 * still what authorises the read: the URL is an unguessable capability, the
 * same model the Cloudinary and S3 paths already use. Pass a TTL only for a
 * link that is genuinely meant to lapse.
 */
export function signFileToken(key: string, exp: number, secret: string) {
  return createHmac('sha256', deriveKey(secret, FILE_TOKEN_LABEL))
    .update(payload(key, exp))
    .digest('hex')
    .slice(0, 32)
}

export function verifyFileToken(key: string, exp: number, sig: string, secret: string) {
  // Integer only: a fractional expiry is the other half of the collision the
  // length prefix closes — ("a", 1.5) and ("a.1", 5) serialise alike under any
  // scheme that just joins the two with a dot.
  if (!key || !sig || !Number.isInteger(exp) || exp < 0) return false
  if (exp > 0 && exp * 1000 < Date.now()) return false
  const expected = signFileToken(key, exp, secret)
  // Compared over fixed-width buffers: `===` on strings returns as soon as two
  // characters differ, which leaks how much of a guess was correct.
  if (expected.length !== sig.length) return false
  return timingSafeEqual(Buffer.from(expected), Buffer.from(sig))
}

export function readCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined
  for (const part of header.split(';')) {
    const [k, ...rest] = part.trim().split('=')
    if (k === name) return decodeURIComponent(rest.join('='))
  }
  return undefined
}
