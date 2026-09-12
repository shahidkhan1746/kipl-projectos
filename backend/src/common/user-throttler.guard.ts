import { Injectable } from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'

/**
 * Rate limiting keyed by who is asking, not by which proxy relayed them.
 *
 * Every browser request reaches this service through the Vercel rewrite of
 * /api/v1/*, so the socket address is Vercel's edge for everyone. The default
 * tracker is req.ip, which meant one shared bucket for the whole company: the
 * twenty-per-minute limit on /auth/refresh was twenty across all staff, not
 * twenty each. Eleven people opening a dashboard that fires several queries
 * exhausted it in seconds, and a 429 on refresh signs the user out.
 *
 * Three keys, in order of how much they can be trusted:
 *
 *   subject   The `sub` of the bearer token. Read without verifying it,
 *             because this guard runs before the JWT guard — deliberately, so
 *             that unauthenticated traffic is counted too — and req.user is
 *             therefore not populated yet. Not verifying is safe here: the key
 *             only chooses a counter. A forged token buys its holder a private
 *             bucket and still fails authentication a moment later.
 *   email     Login and password reset are unauthenticated but name an
 *             account. Keying on it limits attempts per account rather than
 *             per source, which is what brute-force protection actually wants,
 *             and unlike an IP an attacker cannot rotate it.
 *   ip        Everything else. X-Forwarded-For is honoured (see trust proxy in
 *             main.ts) so this is the caller rather than the proxy, at the cost
 *             of being client-supplied and so spoofable. Acceptable only
 *             because the two cases worth defending are covered above.
 */
@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const subject = subjectOf(req?.headers?.authorization)
    if (subject) return `user:${subject}`

    const email = req?.body?.email
    if (typeof email === 'string' && email.trim()) {
      return `email:${email.trim().toLowerCase()}`
    }

    return `ip:${req?.ip ?? 'unknown'}`
  }
}

/**
 * The `sub` claim of a bearer token, or undefined.
 *
 * Deliberately does not verify the signature — see the note above. Everything
 * here is defensive because the input is a header: a malformed token must
 * yield undefined and fall through to the next key, never throw and turn rate
 * limiting into a 500.
 */
export function subjectOf(authorization: unknown): string | undefined {
  if (typeof authorization !== 'string') return undefined
  const [scheme, token] = authorization.split(' ')
  if (!token || scheme?.toLowerCase() !== 'bearer') return undefined

  const parts = token.split('.')
  if (parts.length !== 3) return undefined

  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'))
    const sub = payload?.sub
    return typeof sub === 'string' && sub ? sub : undefined
  } catch {
    return undefined
  }
}
