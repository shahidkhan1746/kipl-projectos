import { describe, expect, it } from 'vitest'
import type { OfficeAsset } from '@/api/assets.api'
import {
  addYears, describeChanges, formatRupees, initialValues, locationSuggestions, parseRupees,
  showsSerial, toPayload, validateAsset,
} from './assetForm'
import { localToday } from './assetHelpers'

const laptop = {
  id: 'a1', projectId: 'p1', assetTag: 'KIPL-AST-000001', name: 'Dell Latitude 5440', category: 'laptop',
  location: 'Site office, Nishat', status: 'assigned', condition: 'good', brand: 'Dell', model: 'Latitude 5440',
  serialNumber: 'CN-0X7H2K', supplier: 'Kashmir Computers', invoiceNumber: 'KC/2026/118', purchaseDate: '2026-04-12',
  purchaseCost: '78500.00', warrantyUntil: '2029-04-11', registrationNumber: null, insuranceUntil: null, serviceDue: null,
  photoUrl: null, documentUrl: null, notes: null, assignedEmployeeId: 'e1', assignedTo: 'Bilal Ahmad', lastVerified: null, version: 3,
} as OfficeAsset

const blank = () => ({ ...initialValues(null), name: 'Executive desk', location: 'Head office' })

describe('rupee input', () => {
  it('accepts the ways people type money', () => {
    expect(parseRupees('78500')).toBe(78500)
    expect(parseRupees('78,500.50')).toBe(78500.5)
    expect(parseRupees('₹ 9,85,000')).toBe(985000)
  })
  it('rejects what the API would reject', () => {
    expect(parseRupees('78.555')).toBeNaN()
    expect(parseRupees('-5')).toBeNaN()
    expect(parseRupees('1e5')).toBeNaN()
    expect(parseRupees('abc')).toBeNaN()
  })
  it('groups digits the Indian way, so a missing zero is visible', () => {
    expect(formatRupees(985000)).toBe('₹9,85,000')
    expect(formatRupees(78500.5)).toBe('₹78,500.50')
  })
})

describe('validation beside each field', () => {
  it('needs only a name and a location to register', () => {
    expect(validateAsset(blank(), 'create')).toEqual({})
    const errors = validateAsset({ ...blank(), name: ' ', location: '' }, 'create')
    expect(Object.keys(errors).sort()).toEqual(['location', 'name'])
  })
  it('refuses a warranty that ends before the purchase', () => {
    const errors = validateAsset({ ...blank(), purchaseDate: '2026-04-12', warrantyUntil: '2026-04-11' }, 'create')
    expect(errors.warrantyUntil).toBeTruthy()
  })
  it('refuses a purchase date in the future', () => {
    const tomorrow = addYears(localToday(), 1)
    expect(validateAsset({ ...blank(), purchaseDate: tomorrow }, 'create').purchaseDate).toBeTruthy()
  })
  it('only accepts https links, like the API', () => {
    expect(validateAsset({ ...blank(), documentUrl: 'http://drive.example/x' }, 'create').documentUrl).toBeTruthy()
    expect(validateAsset({ ...blank(), photoUrl: 'drive.google.com/file' }, 'create').photoUrl).toBeTruthy()
    expect(validateAsset({ ...blank(), photoUrl: 'https://drive.google.com/file/d/1' }, 'create').photoUrl).toBeUndefined()
  })
  it('requires a reason only when correcting an existing record', () => {
    expect(validateAsset(blank(), 'create').reason).toBeUndefined()
    expect(validateAsset(blank(), 'edit').reason).toBeTruthy()
  })
})

describe('payload', () => {
  it('sends cleared optional fields as null, so clearing a value actually clears it', () => {
    const body = toPayload({ ...initialValues(laptop), serialNumber: '  ', reason: 'Typo' }, 'p1', laptop)
    expect(body.serialNumber).toBeNull()
    expect(body.version).toBe(3)
    expect(body.reason).toBe('Typo')
  })
  it('never changes the location on edit — the API only allows that through a transfer', () => {
    const body = toPayload({ ...initialValues(laptop), location: 'Somewhere else', reason: 'x' }, 'p1', laptop)
    expect(body.location).toBe('Site office, Nishat')
  })
  it('parses the cost and omits edit-only fields when registering', () => {
    const body = toPayload({ ...blank(), purchaseCost: '24,000' }, 'p1', null)
    expect(body.purchaseCost).toBe(24000)
    expect(body).not.toHaveProperty('version')
    expect(body).not.toHaveProperty('reason')
  })
  it('drops vehicle-only fields from a record that is not a vehicle', () => {
    const body = toPayload({ ...blank(), category: 'furniture', registrationNumber: 'JK01AB1234', insuranceUntil: '2027-01-01' }, 'p1', null)
    expect(body.registrationNumber).toBeNull()
    expect(body.insuranceUntil).toBeNull()
    const van = toPayload({ ...blank(), category: 'vehicle', registrationNumber: 'JK01AB1234' }, 'p1', null)
    expect(van.registrationNumber).toBe('JK01AB1234')
  })
})

describe('review of changes before saving an edit', () => {
  it('lists only real changes, in words', () => {
    const before = initialValues(laptop)
    const changes = describeChanges(before, { ...before, condition: 'fair', serialNumber: 'CN-0X7H2L', purchaseCost: '78,500' })
    expect(changes.map(c => c.field)).toEqual(['condition', 'serialNumber'])
    expect(changes[0]).toMatchObject({ from: 'Good', to: 'Fair' })
  })
  it('shows nothing when nothing changed', () => {
    const before = initialValues(laptop)
    expect(describeChanges(before, { ...before, reason: 'just looking' })).toEqual([])
  })
  it('shows vehicle details being removed when a vehicle is recategorised', () => {
    const before = { ...initialValues(laptop), category: 'vehicle' as const, registrationNumber: 'JK01AB1234' }
    const changes = describeChanges(before, { ...before, category: 'other' })
    expect(changes.map(c => c.field)).toEqual(['category', 'registrationNumber'])
  })
})

describe('small helpers', () => {
  it('suggests each existing location once, whatever its case or spacing', () => {
    expect(locationSuggestions([{ location: 'Site office' }, { location: 'site office ' }, { location: 'Head office' }]))
      .toEqual(['Head office', 'Site office'])
  })
  it('adds warranty years, keeping 29 Feb valid', () => {
    expect(addYears('2026-04-12', 3)).toBe('2029-04-12')
    expect(addYears('2028-02-29', 1)).toBe('2029-02-28')
  })
  it('hides the serial number for furniture unless one is already recorded', () => {
    expect(showsSerial('furniture', '')).toBe(false)
    expect(showsSerial('furniture', 'SN-1')).toBe(true)
    expect(showsSerial('laptop', '')).toBe(true)
  })
  it('carries category and location into "Register another"', () => {
    const next = initialValues(null, { category: 'laptop', location: 'Site office' })
    expect(next).toMatchObject({ category: 'laptop', location: 'Site office', name: '' })
  })
})
