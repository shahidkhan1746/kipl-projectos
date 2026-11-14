import { describe, expect, it } from 'vitest'
import type { OfficeAsset } from '@/api/assets.api'
import { buildRegisterModel, describeScope, fetchAllAssets, registerFileName, renderRegisterPdf } from './assetRegisterPdf'

let n = 0
const asset = (extra: Partial<OfficeAsset>): OfficeAsset => ({
  id: `a${++n}`, projectId: 'p1', assetTag: `KIPL-AST-${String(n).padStart(6, '0')}`, name: 'Chair', category: 'furniture',
  location: 'Site office, Nishat', status: 'available', condition: 'good', brand: null, model: null, serialNumber: null,
  supplier: null, invoiceNumber: null, purchaseDate: null, purchaseCost: null, warrantyUntil: null, registrationNumber: null,
  insuranceUntil: null, serviceDue: null, photoUrl: null, documentUrl: null, notes: null, acquisition: null, sourceSite: null,
  assignedEmployeeId: null, assignedTo: null, lastVerified: null, version: 1, ...extra,
})

describe('register model', () => {
  const assets = [
    asset({ assetTag: 'KIPL-AST-000010', name: 'Chair' }),
    asset({ assetTag: 'KIPL-AST-000009', name: 'Komatsu PC210 excavator', category: 'plant_machinery', brand: 'Komatsu', model: 'PC210-10M0', acquisition: 'transferred', sourceSite: 'Ghaziabad site', registrationNumber: 'JK01AB1234', serialNumber: 'KMT-1' }),
    asset({ assetTag: 'OLD-7', name: 'Table' }),
    asset({ assetTag: 'KIPL-AST-000002', name: 'Chair', status: 'assigned', assignedTo: 'Bilal Ahmad' }),
    asset({ assetTag: 'KIPL-AST-000005', name: 'Brezza', category: 'vehicle' }),
  ]
  const model = buildRegisterModel(assets, {})

  it('groups by category in the app order, tags in number order, numbered straight through', () => {
    expect(model.groups.map(g => g.label)).toEqual(['Furniture', 'Vehicle', 'Plant & machinery'])
    expect(model.groups[0].rows.map(r => r.tag)).toEqual(['KIPL-AST-000002', 'KIPL-AST-000010', 'OLD-7'])
    expect(model.groups.flatMap(g => g.rows.map(r => r.no))).toEqual([1, 2, 3, 4, 5])
  })

  it('fills each row from the asset', () => {
    const plant = model.groups[2].rows[0]
    expect(plant).toMatchObject({ detail: 'Komatsu PC210-10M0', serial: 'KMT-1 · Reg. JK01AB1234', origin: 'Transferred from Ghaziabad site' })
    expect(model.groups[0].rows[0]).toMatchObject({ custodian: 'Bilal Ahmad', status: 'Assigned', origin: '—', serial: '—' })
  })

  it('does not repeat a brand and model the name already gives', () => {
    const rows = buildRegisterModel([
      asset({ name: 'Maruti Suzuki Brezza', category: 'vehicle', brand: 'Maruti Suzuki', model: 'Brezza' }),
      asset({ name: 'Bosch concrete breaker', category: 'plant_machinery', brand: 'Bosch' }),
      asset({ name: 'Water dispenser', category: 'office_equipment', brand: 'Blue Star' }),
    ], {}).groups.flatMap(g => g.rows.map(r => r.detail))
    expect(rows).toEqual(['', '', 'Blue Star'])
  })

  it('counts by status and says what the filters selected', () => {
    expect(model.byStatus).toEqual([['Available', 4], ['Assigned', 1]])
    expect(model.scope).toBe('All assets')
    expect(describeScope({ category: 'plant_machinery', status: 'available', search: ' JCB ' })).toBe('Category: Plant & machinery · Status: Available · Search: "JCB"')
  })
})

describe('fetching the whole register', () => {
  it('reads page after page until it has them all', async () => {
    const all = Array.from({ length: 60 }, (_, i) => asset({ name: `Chair ${i}` }))
    const pages: number[] = []
    const got = await fetchAllAssets(async page => { pages.push(page); return { items: all.slice((page - 1) * 25, page * 25), total: 60 } })
    expect(got).toHaveLength(60)
    expect(pages).toEqual([1, 2, 3])
  })
  it('stops on an empty page even if the total says otherwise', async () => {
    const got = await fetchAllAssets(async page => ({ items: page === 1 ? [asset({})] : [], total: 99 }))
    expect(got).toHaveLength(1)
  })
})

describe('PDF', () => {
  it('lays out a long register over numbered pages with the origin and a signature block', () => {
    const assets = Array.from({ length: 70 }, (_, i) => asset({ name: `Chair ${i}` }))
    assets.push(asset({ name: 'Porta cabin', category: 'other', acquisition: 'legacy', sourceSite: 'Achan Landfill Site' }))
    const pdf = renderRegisterPdf(buildRegisterModel(assets, {}), { projectName: 'Dal Lake Sewerage Scheme', generatedBy: 'Shahid Khan', now: new Date(2026, 10, 14, 10, 30) })
    const pages = pdf.getNumberOfPages()
    expect(pages).toBeGreaterThan(2)
    const text = pdf.output()
    expect(text).toContain('ASSET & INVENTORY REGISTER')
    expect(text).toContain(`Page 1 of ${pages}`)
    expect(text).toContain(`Page ${pages} of ${pages}`)
    expect(text).toContain('Legacy asset from Achan Landfill Site')
    expect(text).toContain('Physically verified by')
    expect(text).toContain('\\(continued\\)')
  })
  it('still produces a page when nothing matches', () => {
    const pdf = renderRegisterPdf(buildRegisterModel([], { status: 'lost' }), { projectName: 'P' })
    expect(pdf.output()).toContain('No assets match these filters.')
  })
  it('names the file by date', () => {
    expect(registerFileName(new Date(2026, 10, 14))).toBe('KIPL-asset-register-2026-11-14.pdf')
  })
})
