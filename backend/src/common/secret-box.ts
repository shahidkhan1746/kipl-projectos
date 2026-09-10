import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from 'crypto'

const PREFIX = 'enc:v1:'

function keyFromSecret(secret: string) {
  return createHash('sha256').update(secret).digest()
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

export function signFileToken(key: string, exp: number, secret: string) {
  return createHmac('sha256', secret).update(`${key}.${exp}`).digest('hex').slice(0, 32)
}

export function verifyFileToken(key: string, exp: number, sig: string, secret: string) {
  if (!sig || !exp || exp * 1000 < Date.now()) return false
  const expected = signFileToken(key, exp, secret)
  return expected === sig
}

export function readCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined
  for (const part of header.split(';')) {
    const [k, ...rest] = part.trim().split('=')
    if (k === name) return decodeURIComponent(rest.join('='))
  }
  return undefined
}
