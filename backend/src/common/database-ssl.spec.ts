import { databaseTls, type Lookup } from './database-ssl'

const env = (vars: Record<string, string>): Lookup => key => vars[key]

const PEM = [
  '-----BEGIN CERTIFICATE-----',
  'MIIBkTCB+wIJAOxbCg==',
  '-----END CERTIFICATE-----',
].join('\n')

describe('databaseTls', () => {
  describe('when TLS is off', () => {
    it('is off when DB_SSL says so', () => {
      expect(databaseTls(env({ DB_SSL: 'false' }))).toEqual({ ssl: false, warning: null })
    })

    it('is off against localhost, which has no certificate to verify', () => {
      expect(databaseTls(env({ DB_HOST: 'localhost' }))).toEqual({ ssl: false, warning: null })
    })

    it('stays on for any other host', () => {
      expect(databaseTls(env({ DB_HOST: 'dpg-xyz.oregon-postgres.render.com' })).ssl)
        .not.toBe(false)
    })

    it('needs DB_SSL to say exactly false, not merely be present', () => {
      expect(databaseTls(env({ DB_SSL: 'true' })).ssl).not.toBe(false)
      expect(databaseTls(env({ DB_SSL: '0' })).ssl).not.toBe(false)
    })
  })

  describe('with a CA, which is the arrangement worth having', () => {
    it('verifies against a PEM and says nothing', () => {
      expect(databaseTls(env({ DB_SSL_CA: PEM })))
        .toEqual({ ssl: { ca: PEM, rejectUnauthorized: true }, warning: null })
    })

    it('accepts the CA base64-encoded, which is how it survives a dashboard field', () => {
      const encoded = Buffer.from(PEM, 'utf8').toString('base64')
      expect(databaseTls(env({ DB_SSL_CA: encoded })))
        .toEqual({ ssl: { ca: PEM, rejectUnauthorized: true }, warning: null })
    })

    it('trims a pasted certificate', () => {
      expect(databaseTls(env({ DB_SSL_CA: `\n  ${PEM}  \n` })).ssl)
        .toEqual({ ca: PEM, rejectUnauthorized: true })
    })

    it('a CA beats an explicit reject flag rather than being ignored by it', () => {
      const tls = databaseTls(env({ DB_SSL_CA: PEM, DB_SSL_REJECT_UNAUTHORIZED: 'false' }))
      expect(tls.ssl).toEqual({ ca: PEM, rejectUnauthorized: true })
    })
  })

  describe('with no usable CA', () => {
    // The regression this file exists for: verifying by default against a
    // certificate that cannot be verified crashes the process on startup, which
    // failed every deploy while the builds stayed green.
    it('does not verify by default, because verification could not succeed', () => {
      const tls = databaseTls(env({ DB_HOST: 'dpg-xyz.render.com' }))
      expect(tls.ssl).toEqual({ rejectUnauthorized: false })
    })

    it('says the connection is unverified rather than passing silently', () => {
      const tls = databaseTls(env({ DB_HOST: 'dpg-xyz.render.com' }))
      expect(tls.warning).toContain('UNVERIFIED')
      expect(tls.warning).toContain('DB_SSL_CA')
    })

    it('still honours an explicit opt-in to verification', () => {
      const tls = databaseTls(env({ DB_SSL_REJECT_UNAUTHORIZED: 'true' }))
      expect(tls.ssl).toEqual({ rejectUnauthorized: true })
      expect(tls.warning).toContain('SELF_SIGNED_CERT_IN_CHAIN')
    })

    it('treats DB_SSL_REJECT_UNAUTHORIZED=false the same as unset', () => {
      expect(databaseTls(env({ DB_SSL_REJECT_UNAUTHORIZED: 'false' })).ssl)
        .toEqual({ rejectUnauthorized: false })
    })

    it('ignores a DB_SSL_CA that is not a certificate, and says it is ignoring it', () => {
      const tls = databaseTls(env({ DB_SSL_CA: 'not-a-certificate' }))
      expect(tls.ssl).toEqual({ rejectUnauthorized: false })
      expect(tls.warning).toContain('not a PEM certificate')
    })

    it('ignores base64 that decodes to something other than a certificate', () => {
      const encoded = Buffer.from('hello world', 'utf8').toString('base64')
      expect(databaseTls(env({ DB_SSL_CA: encoded })).ssl).toEqual({ rejectUnauthorized: false })
    })

    it('treats an empty DB_SSL_CA as absent rather than as a broken one', () => {
      expect(databaseTls(env({ DB_SSL_CA: '   ' })).warning).not.toContain('not a PEM')
    })
  })

  it('reproduces what the last working deploy did, given the same environment', () => {
    // 3efeb0ae ran with `ssl: { rejectUnauthorized: false }` and connected.
    expect(databaseTls(env({ DB_HOST: 'dpg-xyz.render.com' })).ssl)
      .toEqual({ rejectUnauthorized: false })
  })
})
