import { MaterialRegisterService } from './material-register.service'
import { canonicalMaterialName, materialKey, stockKey } from './material-key'

const row = (o: any) => ({ receivedQty: 0, consumedQty: 0, unit: 'cft', date: '2026-01-01', createdAt: '1', ...o })

function serviceOver(rows: any[]) {
  const saved: any[] = []
  const repo: any = {
    find: async () => rows,
    findOne: async ({ where }: any) => rows.find(r => r.id === where.id) ?? null,
    create: (d: any) => d,
    save: async (d: any) => { saved.push(d); return d },
    update: async (id: string, patch: any) => { saved.push({ id, ...patch }); return { affected: 1 } },
    delete: async () => ({ affected: 1 }),
  }
  return { svc: new MaterialRegisterService(repo), saved }
}

describe('material identity', () => {
  it('stores a canonical name', () => {
    expect(canonicalMaterialName('  Khak Bajri  ')).toBe('Khak Bajri')
    expect(canonicalMaterialName('Khak   Bajri')).toBe('Khak Bajri')
    expect(canonicalMaterialName(undefined)).toBe('')
  })

  it('treats case and spacing differences as one material', () => {
    const keys = ['Khak Bajri', 'Khak Bajri ', ' khak bajri', 'KHAK  BAJRI'].map(materialKey)
    expect(new Set(keys).size).toBe(1)
  })

  it('keeps genuinely different materials apart', () => {
    expect(materialKey('Cement OPC 43')).not.toBe(materialKey('Cement OPC 53'))
  })

  it('scopes stock to a project', () => {
    expect(stockKey('P1', 'Cement')).not.toBe(stockKey('P2', 'Cement'))
    expect(stockKey('P1', 'Cement')).toBe(stockKey('P1', ' cement '))
  })
})

describe('MaterialRegisterService.create', () => {
  it('saves the material trimmed, so a stray space cannot open a second stock line', async () => {
    const { svc, saved } = serviceOver([])
    await svc.create({ projectId: 'P1', material: ' Khak Bajri ', receivedQty: 400 } as any)
    expect(saved[0].material).toBe('Khak Bajri')
  })

  it('canonicalises on update too', async () => {
    const existing = row({ id: 'r1', projectId: 'P1', material: 'Khak Bajri', receivedQty: 400 })
    const { svc, saved } = serviceOver([existing])
    await svc.update('r1', { material: '  Khak   Bajri  ' } as any)
    expect(saved[0].material).toBe('Khak Bajri')
  })

  it('leaves the material alone when an update does not touch it', async () => {
    const existing = row({ id: 'r1', projectId: 'P1', material: 'Khak Bajri', receivedQty: 400 })
    const { svc, saved } = serviceOver([existing])
    await svc.update('r1', { remarks: 'corrected' } as any)
    expect(saved[0]).not.toHaveProperty('material')
  })
})

/**
 * Two deliveries of 400 in different units used to report "800 KG": cubic feet
 * added to kilograms, on a register both parties sign.
 */
describe('MaterialRegisterService.summary: units are never added together', () => {
  it('reports each unit separately and flags the conflict', async () => {
    const { svc } = serviceOver([
      row({ id: '1', projectId: 'P1', material: 'Khak Bajri', receivedQty: 400, unit: 'cft' }),
      row({ id: '2', projectId: 'P1', material: 'Khak Bajri', receivedQty: 400, unit: 'KG' }),
    ])
    const s = (await svc.summary('P1'))['Khak Bajri']
    expect(s.unitConflict).toBe(true)
    expect(s.byUnit.cft.received).toBe(400)
    expect(s.byUnit.KG.received).toBe(400)
    expect(s.received).not.toBe(800)
  })

  it('does not flag a material recorded consistently', async () => {
    const { svc } = serviceOver([
      row({ id: '1', projectId: 'P1', material: 'Khak Bajri', receivedQty: 400, unit: 'cft' }),
      row({ id: '2', projectId: 'P1', material: 'Khak Bajri', receivedQty: 600, unit: 'cft' }),
    ])
    const s = (await svc.summary('P1'))['Khak Bajri']
    expect(s.unitConflict).toBe(false)
    expect(s.received).toBe(1000)
    expect(s.unit).toBe('cft')
    expect(s.units).toEqual(['cft'])
  })

  it('reports the figures of the unit most rows were entered in', async () => {
    const { svc } = serviceOver([
      row({ id: '1', projectId: 'P1', material: 'Cement', receivedQty: 100, unit: 'Bags' }),
      row({ id: '2', projectId: 'P1', material: 'Cement', receivedQty: 100, unit: 'Bags' }),
      row({ id: '3', projectId: 'P1', material: 'Cement', receivedQty: 5, unit: 'MT' }),
    ])
    const s = (await svc.summary('P1'))['Cement']
    expect(s.unit).toBe('Bags')
    expect(s.received).toBe(200)
  })

  it('nets consumption within a unit', async () => {
    const { svc } = serviceOver([
      row({ id: '1', projectId: 'P1', material: 'Cement', receivedQty: 500, unit: 'Bags' }),
      row({ id: '2', projectId: 'P1', material: 'Cement', consumedQty: 120, unit: 'Bags' }),
    ])
    const s = (await svc.summary('P1'))['Cement']
    expect(s.balance).toBe(380)
  })

  it('folds spelling variants into one stock line', async () => {
    const { svc } = serviceOver([
      row({ id: '1', projectId: 'P1', material: 'Khak Bajri', receivedQty: 400 }),
      row({ id: '2', projectId: 'P1', material: 'Khak Bajri ', receivedQty: 400 }),
      row({ id: '3', projectId: 'P1', material: 'khak bajri', receivedQty: 400 }),
    ])
    const s = await svc.summary('P1')
    expect(Object.keys(s)).toEqual(['Khak Bajri'])
    expect(s['Khak Bajri'].received).toBe(1200)
  })
})

describe('stock never crosses a project boundary', () => {
  const twoProjects = [
    row({ id: 'a', projectId: 'P1', material: 'Cement', receivedQty: 100, unit: 'Bags', date: '2026-01-01' }),
    row({ id: 'b', projectId: 'P2', material: 'Cement', receivedQty: 250, unit: 'Bags', date: '2026-01-02' }),
  ]

  // Called without a projectId — which the controller permits, and which an
  // admin bypassing project scoping reaches — one project's cement was summed
  // into the other's and returned as a single figure belonging to neither.
  it('keeps the running balance separate with no projectId given', async () => {
    const { svc } = serviceOver(twoProjects)
    const listed = await svc.list(undefined)
    const byProject = Object.fromEntries(listed.map((r: any) => [r.projectId, r.balance]))
    expect(byProject.P1).toBe(100)
    expect(byProject.P2).toBe(250)
  })

  it('does not merge two projects into one summary line', async () => {
    const { svc } = serviceOver(twoProjects)
    const s = await svc.summary(undefined)
    expect(s['Cement'].received).not.toBe(350)
  })
})

describe('the running balance still accumulates within a material', () => {
  it('carries forward across dated rows', async () => {
    const { svc } = serviceOver([
      row({ id: '1', projectId: 'P1', material: 'Khak Bajri', receivedQty: 400, date: '2025-12-26', createdAt: '1' }),
      row({ id: '2', projectId: 'P1', material: 'Khak Bajri', receivedQty: 600, date: '2025-12-27', createdAt: '2' }),
      row({ id: '3', projectId: 'P1', material: 'Khak Bajri', consumedQty: 200, date: '2025-12-28', createdAt: '3' }),
    ])
    const listed = await svc.list('P1')
    expect(Object.fromEntries(listed.map((r: any) => [r.id, r.balance])))
      .toEqual({ '1': 400, '2': 1000, '3': 800 })
  })
})
