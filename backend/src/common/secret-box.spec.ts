import { createHmac } from 'crypto'
import {
  deriveKey, sealSecret, openSecret, signFileToken, verifyFileToken,
  readCookie, FILE_TOKEN_LABEL,
} from './secret-box'

const SECRET = 'a-test-secret-of-reasonable-length'

describe('sealSecret / openSecret', () => {
  it('round-trips', () => {
    const sealed = sealSecret('AIzaSyExampleKey', SECRET)
    expect(sealed.startsWith('enc:v1:')).toBe(true)
    expect(openSecret(sealed, SECRET)).toBe('AIzaSyExampleKey')
  })

  it('does not double-seal an already sealed value', () => {
    const once = sealSecret('k', SECRET)
    expect(sealSecret(once, SECRET)).toBe(once)
  })

  it('passes through a value that was never sealed', () => {
    expect(openSecret('plaintext-legacy-key', SECRET)).toBe('plaintext-legacy-key')
  })

  it('refuses to open under the wrong secret', () => {
    expect(() => openSecret(sealSecret('k', SECRET), 'other')).toThrow()
  })

  it('uses a fresh IV, so the same plaintext seals differently each time', () => {
    expect(sealSecret('same', SECRET)).not.toBe(sealSecret('same', SECRET))
  })
})

describe('file link signing', () => {
  const later = Math.floor(Date.now() / 1000) + 3600

  it('accepts a signature it produced', () => {
    const sig = signFileToken('updates/a.jpg', later, SECRET)
    expect(verifyFileToken('updates/a.jpg', later, sig, SECRET)).toBe(true)
  })

  it('rejects a signature made for a different key', () => {
    const sig = signFileToken('updates/a.jpg', later, SECRET)
    expect(verifyFileToken('updates/b.jpg', later, sig, SECRET)).toBe(false)
  })

  it('rejects a signature made under a different secret', () => {
    const sig = signFileToken('updates/a.jpg', later, 'other-secret')
    expect(verifyFileToken('updates/a.jpg', later, sig, SECRET)).toBe(false)
  })

  it('rejects an expired link', () => {
    const past = Math.floor(Date.now() / 1000) - 1
    const sig = signFileToken('updates/a.jpg', past, SECRET)
    expect(verifyFileToken('updates/a.jpg', past, sig, SECRET)).toBe(false)
  })

  // exp=0 is what every stored URL carries: a QA inspection keeps the bare URL
  // string with no object key beside it, so a link that lapses there can never
  // be rebuilt from the row.
  it('treats exp=0 as no expiry rather than as already expired', () => {
    const sig = signFileToken('qa/ncr-4.jpg', 0, SECRET)
    expect(verifyFileToken('qa/ncr-4.jpg', 0, sig, SECRET)).toBe(true)
  })

  it('rejects a missing or malformed signature without throwing', () => {
    expect(verifyFileToken('a', 0, '', SECRET)).toBe(false)
    expect(verifyFileToken('a', 0, 'short', SECRET)).toBe(false)
    expect(verifyFileToken('', 0, signFileToken('', 0, SECRET), SECRET)).toBe(false)
    expect(verifyFileToken('a', Number.NaN, 'x'.repeat(32), SECRET)).toBe(false)
    expect(verifyFileToken('a', -1, 'x'.repeat(32), SECRET)).toBe(false)
  })

  it('rejects a signature with one character changed', () => {
    const sig = signFileToken('updates/a.jpg', 0, SECRET)
    const bent = (sig[0] === '0' ? '1' : '0') + sig.slice(1)
    expect(verifyFileToken('updates/a.jpg', 0, bent, SECRET)).toBe(false)
  })

  // The key is caller-supplied and may contain the separator. Without the
  // length prefix, ("a", 9999) and ("a.9999", 0)-style pairs serialise to the
  // same bytes, so one valid link could be re-read as a link to another object
  // or with another expiry.
  it('does not let a key containing the separator impersonate another pair', () => {
    // Joined with a bare dot, ("a.1", 5) and ("a", 1.5) both render "a.1.5",
    // so a link to one object and expiry validates as a link to the other.
    expect(signFileToken('a.1', 5, SECRET)).not.toBe(signFileToken('a', 1.5, SECRET))
    expect(verifyFileToken('a', 1.5, signFileToken('a.1', 5, SECRET), SECRET)).toBe(false)
  })

  it('rejects a fractional expiry outright', () => {
    // Has to sit in the future, or it is rejected for being expired and the
    // assertion says nothing about whether fractions are refused at all.
    const fractional = later + 0.5
    expect(verifyFileToken('a', fractional, signFileToken('a', fractional, SECRET), SECRET)).toBe(false)
  })

  // One process secret protects session JWTs and file links both. A labelled
  // subkey means a file link can never be produced from, or used to reason
  // about, the key that signs sessions.
  it('signs with a derived subkey, not the raw secret', () => {
    // Built from the same inputs the real payload uses — a hand-typed length
    // that did not match made this assertion true no matter what signed it.
    const key = 'updates/a.jpg'
    const raw = createHmac('sha256', SECRET).update(`${key.length}:${key}:0`).digest('hex').slice(0, 32)
    expect(signFileToken(key, 0, SECRET)).not.toBe(raw)
  })

  it('derives a different subkey per label', () => {
    expect(deriveKey(SECRET, FILE_TOKEN_LABEL).toString('hex'))
      .not.toBe(deriveKey(SECRET, 'kipl.other.v1').toString('hex'))
  })
})

describe('readCookie', () => {
  it('finds a cookie among others', () => {
    expect(readCookie('a=1; kipl_refresh=tok; b=2', 'kipl_refresh')).toBe('tok')
  })

  it('keeps "=" inside the value', () => {
    expect(readCookie('kipl_refresh=a.b=c', 'kipl_refresh')).toBe('a.b=c')
  })

  it('does not match on a prefix of the name', () => {
    expect(readCookie('kipl_refresh_old=nope', 'kipl_refresh')).toBeUndefined()
  })

  it('is undefined with no header', () => {
    expect(readCookie(undefined, 'kipl_refresh')).toBeUndefined()
  })
})
