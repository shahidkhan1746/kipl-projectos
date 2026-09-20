import { auditPayload, entityFromPath, MAX_PAYLOAD_BYTES } from './audit-payload'

describe('auditPayload: credentials never reach the audit table', () => {
  it('redacts a password', () => {
    expect(auditPayload({ email: 'a@b.com', password: 'hunter2' }))
      .toEqual({ email: 'a@b.com', password: '[redacted]' })
  })

  it('redacts every credential-shaped key, whatever its casing', () => {
    const got: any = auditPayload({
      currentPassword: 'x', newPassword: 'y', refresh_token: 'z',
      accessToken: 'a', apiKey: 'b', Authorization: 'Bearer c', secret: 'd',
    })
    for (const value of Object.values(got)) expect(value).toBe('[redacted]')
  })

  // Credential keys are rarely named exactly "password". An exact-match list
  // passes smtpPassword, vendorApiKey and db_secret straight into the table.
  it('redacts a credential key that merely contains a credential word', () => {
    const got: any = auditPayload({
      smtpPassword: 'x', vendorApiKey: 'y', db_secret: 'z',
      mailerRefreshToken: 'w', userPasswordHash: 'v',
    })
    for (const [key, value] of Object.entries(got)) {
      expect([key, value]).toEqual([key, '[redacted]'])
    }
  })

  it('does not redact an ordinary field whose name merely looks busy', () => {
    const got: any = auditPayload({ vehicleNumber: 'JK01-AB-1234', challanNumber: 'CH-888' })
    expect(got.vehicleNumber).toBe('JK01-AB-1234')
    expect(got.challanNumber).toBe('CH-888')
  })

  it('redacts them when nested', () => {
    const got: any = auditPayload({ user: { name: 'Shahid', password: 'hunter2' } })
    expect(got.user.name).toBe('Shahid')
    expect(got.user.password).toBe('[redacted]')
  })

  it('keeps everything that is not a credential', () => {
    expect(auditPayload({ material: 'Khak Bajri', receivedQty: 400 }))
      .toEqual({ material: 'Khak Bajri', receivedQty: 400 })
  })
})

describe('auditPayload: size is capped', () => {
  it('replaces an oversized payload with a note of its size', () => {
    // Many fields rather than one long value: a single long string is
    // truncated first, which keeps its beginning and is the better outcome.
    const wide: Record<string, string> = {}
    for (let i = 0; i < 400; i++) wide[`field_${i}`] = 'x'.repeat(40)
    const got: any = auditPayload(wide)
    expect(got.note).toContain('payload omitted')
    expect(JSON.stringify(got).length).toBeLessThan(MAX_PAYLOAD_BYTES)
  })

  it('truncates a long string rather than storing all of it', () => {
    const got: any = auditPayload({ remarks: 'y'.repeat(5000) })
    expect(String(got.remarks).length).toBeLessThan(2100)
  })

  it('summarises a long array', () => {
    const got: any = auditPayload({ items: Array.from({ length: 100 }, (_, i) => i) })
    expect(got.items.length).toBe(21)
    expect(got.items.at(-1)).toBe('[+80 more]')
  })

  it('stops walking very deep structures', () => {
    let deep: any = 'bottom'
    for (let i = 0; i < 12; i++) deep = { next: deep }
    expect(() => auditPayload(deep)).not.toThrow()
    expect(JSON.stringify(auditPayload(deep))).toContain('nested')
  })

  it('records that a circular payload could not be captured, rather than nothing', () => {
    const circular: any = { material: 'Cement' }
    circular.self = circular
    const got: any = auditPayload(circular)
    expect(got).not.toBeNull()
  })
})

describe('auditPayload: nothing worth storing', () => {
  it('is null for an empty or absent body', () => {
    expect(auditPayload(undefined)).toBeNull()
    expect(auditPayload(null)).toBeNull()
    expect(auditPayload({})).toBeNull()
    expect(auditPayload([])).toBeNull()
  })

  it('is null for a body that is not an object', () => {
    expect(auditPayload('text')).toBeNull()
    expect(auditPayload(42)).toBeNull()
  })

  it('renders a date readably instead of as an empty object', () => {
    const got: any = auditPayload({ at: new Date('2026-09-20T10:00:00Z') })
    expect(got.at).toBe('2026-09-20T10:00:00.000Z')
  })
})

describe('entityFromPath', () => {
  const uuid = '3f1b6d2e-8a4c-4f21-9c77-2b5e0a9d4c31'

  it('names the record a write acted on', () => {
    expect(entityFromPath(`/api/v1/material-register/${uuid}`))
      .toEqual({ table: 'material-register', id: uuid })
  })

  it('looks past a trailing verb to the record it acts on', () => {
    expect(entityFromPath(`/api/v1/procurement/orders/${uuid}/grn`))
      .toEqual({ table: 'procurement/orders', id: uuid })
  })

  it('ignores a query string', () => {
    expect(entityFromPath(`/api/v1/material-register/${uuid}?reason=keyed+twice`)?.id).toBe(uuid)
  })

  it('is nothing for a collection route', () => {
    expect(entityFromPath('/api/v1/material-register')).toBeNull()
    expect(entityFromPath('/api/v1/material-register/summary')).toBeNull()
  })

  it('does not mistake a word for an id', () => {
    expect(entityFromPath('/api/v1/material-register/withdrawn')).toBeNull()
  })
})
