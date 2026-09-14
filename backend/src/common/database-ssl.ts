/**
 * How the database connection is secured.
 *
 * This is the line that stopped every deploy for two days, so it is worth
 * stating what happened.
 *
 * The hardening pass changed `ssl: { rejectUnauthorized: false }` to verify the
 * certificate by default. A managed Postgres presents a certificate signed by
 * the provider's own CA, which is not in Node's trust store, so verification
 * cannot succeed without being given that CA. The process therefore threw
 * SELF_SIGNED_CERT_IN_CHAIN on startup, every deploy failed its health check,
 * and the host went on serving the last build that booted. Builds were green
 * throughout, which is what made it look like the code was at fault: the
 * frontend moved on to a cookie-based session while the backend stayed frozen
 * on the commit before cookies existed, and every symptom pointed at code that
 * was never running.
 *
 * So verification is not turned on by a default that cannot work. It is turned
 * on by supplying the CA that makes it work, and off otherwise — loudly.
 *
 *   DB_SSL=false                     no TLS at all (also implied by localhost)
 *   DB_SSL_CA=<pem|base64>           verify against this CA — the right answer
 *   DB_SSL_REJECT_UNAUTHORIZED=true  verify without one, for a CA installed
 *                                    out of band via NODE_EXTRA_CA_CERTS
 *   (nothing)                        encrypted but unverified, with a warning
 *
 * Unverified TLS still encrypts the connection. It does not prove the host at
 * the other end is the database, which is why it warns rather than staying
 * quiet about it.
 */

export type Lookup = (key: string) => string | undefined

export interface DatabaseTls {
  /** Handed straight to TypeORM as its `ssl` option. */
  ssl: false | { ca?: string; rejectUnauthorized: boolean }
  /** Worth saying at startup, or null when the setup needs no comment. */
  warning: string | null
}

const NO_CA_WARNING =
  'Database TLS is encrypted but UNVERIFIED: the connection is not proven to be ' +
  'the database. Set DB_SSL_CA to the provider CA certificate (PEM or base64) to ' +
  'verify it.'

const NO_CA_BUT_STRICT_WARNING =
  'DB_SSL_REJECT_UNAUTHORIZED is on with no DB_SSL_CA set. The certificate must ' +
  'already be trusted by the process (NODE_EXTRA_CA_CERTS), or startup will fail ' +
  'with SELF_SIGNED_CERT_IN_CHAIN.'

/** A CA given as base64 rather than pasted with its newlines intact. */
function decodeCa(raw: string): string | undefined {
  const value = raw.trim()
  if (!value) return undefined
  if (value.includes('BEGIN CERTIFICATE')) return value
  try {
    const decoded = Buffer.from(value, 'base64').toString('utf8')
    return decoded.includes('BEGIN CERTIFICATE') ? decoded : undefined
  } catch {
    return undefined
  }
}

export function databaseTls(get: Lookup): DatabaseTls {
  if (get('DB_SSL') === 'false' || get('DB_HOST') === 'localhost') {
    return { ssl: false, warning: null }
  }

  const ca = decodeCa(get('DB_SSL_CA') ?? '')
  if (ca) return { ssl: { ca, rejectUnauthorized: true }, warning: null }

  const badCa = (get('DB_SSL_CA') ?? '').trim()
  const caWarning = badCa
    ? 'DB_SSL_CA is set but is not a PEM certificate (no BEGIN CERTIFICATE, and ' +
      'not valid base64 for one). It is being ignored. '
    : ''

  // Only an explicit opt-in verifies without a CA. Defaulting to it is what
  // produced the crash loop this file exists to explain.
  if (get('DB_SSL_REJECT_UNAUTHORIZED') === 'true') {
    return { ssl: { rejectUnauthorized: true }, warning: caWarning + NO_CA_BUT_STRICT_WARNING }
  }

  return { ssl: { rejectUnauthorized: false }, warning: caWarning + NO_CA_WARNING }
}
