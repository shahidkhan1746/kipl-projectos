import { subjectOf, UserThrottlerGuard } from './user-throttler.guard'

function bearer(payload: Record<string, unknown>): string {
  const part = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url')
  return `Bearer ${part({ alg: 'HS256' })}.${part(payload)}.signature-not-checked`
}

/** getTracker is protected; this reaches it the way the guard itself does. */
const track = (req: Record<string, any>) =>
  (new UserThrottlerGuard({} as any, {} as any, {} as any) as any).getTracker(req)

describe('subjectOf', () => {
  it('reads the subject out of a bearer token', () => {
    expect(subjectOf(bearer({ sub: 'u-42', role: 'engineer' }))).toBe('u-42')
  })

  // Every one of these arrives in a header, so none may throw — a tracker that
  // throws turns rate limiting into a 500 on every request.
  it('is undefined for anything that is not a usable token', () => {
    expect(subjectOf(undefined)).toBeUndefined()
    expect(subjectOf('')).toBeUndefined()
    expect(subjectOf('Basic abc')).toBeUndefined()
    // A non-bearer scheme carrying something JWT-shaped. Without the scheme
    // check this returns the subject, and Basic credentials become a bucket key.
    expect(subjectOf(bearer({ sub: 'u-7' }).replace('Bearer', 'Basic'))).toBeUndefined()
    expect(subjectOf('Bearer')).toBeUndefined()
    expect(subjectOf('Bearer not.a.jwt')).toBeUndefined()
    expect(subjectOf('Bearer a.b')).toBeUndefined()
    expect(subjectOf(bearer({ role: 'engineer' }))).toBeUndefined()
    expect(subjectOf(bearer({ sub: '' }))).toBeUndefined()
    expect(subjectOf(bearer({ sub: 42 }))).toBeUndefined()
    expect(subjectOf(12345)).toBeUndefined()
  })

  it('accepts the scheme in any case', () => {
    expect(subjectOf(bearer({ sub: 'u-1' }).replace('Bearer', 'bearer'))).toBe('u-1')
  })
})

describe('UserThrottlerGuard.getTracker', () => {
  const ip = '203.0.113.9'

  // The bug this exists to prevent: two signed-in people sharing one bucket
  // because every request arrives from the same proxy address.
  it('gives two users separate buckets from the same address', async () => {
    const a = await track({ headers: { authorization: bearer({ sub: 'u-1' }) }, ip })
    const b = await track({ headers: { authorization: bearer({ sub: 'u-2' }) }, ip })
    expect(a).not.toBe(b)
    expect(a).toBe('user:u-1')
  })

  it('keys an unauthenticated login on the account, not the source', async () => {
    const key = await track({ headers: {}, body: { email: 'Shahid@KIPL.com' }, ip })
    // Same account from a new address still counts against the same bucket,
    // which is the point: an attacker rotating IPs gains nothing.
    expect(key).toBe('email:shahid@kipl.com')
    expect(await track({ headers: {}, body: { email: 'shahid@kipl.com' }, ip: '198.51.100.7' }))
      .toBe(key)
  })

  it('falls back to the address when there is neither', async () => {
    expect(await track({ headers: {}, ip })).toBe(`ip:${ip}`)
    expect(await track({ headers: {} })).toBe('ip:unknown')
  })

  it('prefers the token over the body, so a login field cannot borrow a bucket', async () => {
    const key = await track({
      headers: { authorization: bearer({ sub: 'u-9' }) },
      body: { email: 'someone.else@kipl.com' },
      ip,
    })
    expect(key).toBe('user:u-9')
  })
})
