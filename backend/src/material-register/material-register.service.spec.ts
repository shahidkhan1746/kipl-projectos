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

  it('does not truncate project register entries when limit is omitted', async () => {
    const manyRows = Array.from({ length: 250 }, (_, i) =>
      row({
        id: `r${i}`,
        projectId: 'P1',
        material: i < 10 ? 'Khak Bajri' : 'CTSB',
        receivedQty: 100,
        date: `2026-01-${String((i % 28) + 1).padStart(2, '0')}`,
        createdAt: `${i}`,
      }),
    )
    const { svc } = serviceOver(manyRows)
    const listed = await svc.list('P1')
    expect(listed).toHaveLength(250)
    const materials = new Set(listed.map((r: any) => r.material))
    expect(materials.has('Khak Bajri')).toBe(true)
    expect(materials.has('CTSB')).toBe(true)
  })

  it('respects caller-supplied limit when explicitly requested', async () => {
    const manyRows = Array.from({ length: 100 }, (_, i) =>
      row({ id: `r${i}`, projectId: 'P1', material: 'CTSB', receivedQty: 100, date: '2026-01-01', createdAt: `${i}` }),
    )
    const { svc } = serviceOver(manyRows)
    const listed = await svc.list('P1', 25)
    expect(listed).toHaveLength(25)
  })

  it('returns all records when limit is "all"', async () => {
    const manyRows = Array.from({ length: 250 }, (_, i) =>
      row({ id: `r${i}`, projectId: 'P1', material: 'CTSB', receivedQty: 100, date: '2026-01-01', createdAt: `${i}` }),
    )
    const { svc } = serviceOver(manyRows)
    const listed = await svc.list('P1', 'all')
    expect(listed).toHaveLength(250)
  })
})

/**
 * Consumption without a purpose is a quantity leaving stock with no account of
 * where it went — the first question a client's engineer asks of a Clause 55
 * register. A nudge in the form does not answer it: the row is written either
 * way, and the gap surfaces months later when whoever issued the material has
 * no memory of it.
 */
describe('a purpose is required when material is consumed', () => {
  it('refuses consumption with no purpose', async () => {
    const { svc } = serviceOver([])
    await expect(svc.create({ projectId: 'P1', material: 'Cement', consumedQty: 50 } as any))
      .rejects.toThrow(/purpose is required/i)
  })

  it('refuses a purpose that is only whitespace', async () => {
    const { svc } = serviceOver([])
    await expect(svc.create({ projectId: 'P1', material: 'Cement', consumedQty: 50, purpose: '   ' } as any))
      .rejects.toThrow(/purpose is required/i)
  })

  it('accepts consumption that says what it was used on', async () => {
    const { svc, saved } = serviceOver([])
    await svc.create({
      projectId: 'P1', material: 'Cement', consumedQty: 50,
      purpose: 'Aeration tank wall shuttering', wbsCode: '2.3',
    } as any)
    expect(saved[0].purpose).toBe('Aeration tank wall shuttering')
  })

  // Receipts are a different thing: what arrived is a fact on its own, and
  // procurement fills the purpose in from the order anyway.
  it('does not demand one for a receipt', async () => {
    const { svc, saved } = serviceOver([])
    await svc.create({ projectId: 'P1', material: 'Cement', receivedQty: 500 } as any)
    expect(saved).toHaveLength(1)
  })

  it('holds on update too, not only on create', async () => {
    const existing = row({ id: 'r1', projectId: 'P1', material: 'Cement', receivedQty: 500 })
    const { svc } = serviceOver([existing])
    await expect(svc.update('r1', { receivedQty: 0, consumedQty: 50 } as any))
      .rejects.toThrow(/purpose is required/i)
  })
})

describe('completeEntries: filling rate, purpose and WBS in bulk', () => {
  const unpriced = () => row({ id: 'r1', projectId: 'P1', material: 'Khak Bajri', receivedQty: 400, rate: null, amount: null })

  it('sets a rate and works out the value it implies', async () => {
    const { svc, saved } = serviceOver([unpriced()])
    const result = await svc.completeEntries([{ id: 'r1', rate: 25 }])
    expect(result.updated).toBe(1)
    expect(saved[0].rate).toBe(25)
    expect(saved[0].amount).toBe(10000)
  })

  // A receipt's stored value is a historical fact; a rate correction does not
  // get to rewrite what the delivery was worth.
  it('leaves an amount that is already recorded alone', async () => {
    const priced = row({ id: 'r1', projectId: 'P1', material: 'Cement', receivedQty: 100, rate: 400, amount: 40000 })
    const { svc, saved } = serviceOver([priced])
    await svc.completeEntries([{ id: 'r1', rate: 450 }])
    expect(saved[0].rate).toBe(450)
    expect(saved[0]).not.toHaveProperty('amount')
  })

  it('sets purpose and WBS', async () => {
    const { svc, saved } = serviceOver([unpriced()])
    await svc.completeEntries([{ id: 'r1', purpose: 'Sewer bedding, Shalimar', wbsCode: '3.1' }])
    expect(saved[0].purpose).toBe('Sewer bedding, Shalimar')
    expect(saved[0].wbsCode).toBe('3.1')
  })

  it('updates many rows in one call', async () => {
    const rows = ['r1', 'r2', 'r3'].map(id => row({ id, projectId: 'P1', material: 'Khak Bajri', receivedQty: 400 }))
    const { svc } = serviceOver(rows)
    const result = await svc.completeEntries(rows.map(r => ({ id: r.id, rate: 25 })))
    expect(result.updated).toBe(3)
  })

  it('reports the rows it could not touch instead of failing the whole call', async () => {
    const { svc } = serviceOver([unpriced()])
    const result = await svc.completeEntries([{ id: 'r1', rate: 25 }, { id: 'gone', rate: 25 }])
    expect(result.updated).toBe(1)
    expect(result.skipped).toEqual([{ id: 'gone', reason: 'Entry not found.' }])
  })

  it('refuses a negative or unparseable rate', async () => {
    const { svc } = serviceOver([unpriced()])
    const result = await svc.completeEntries([{ id: 'r1', rate: -5 }, { id: 'r1', rate: Number('x') }])
    expect(result.updated).toBe(0)
    expect(result.skipped).toHaveLength(2)
  })

  it('will not leave consumption without a purpose', async () => {
    const issue = row({ id: 'c1', projectId: 'P1', material: 'Cement', consumedQty: 50, purpose: null })
    const { svc } = serviceOver([issue])
    const result = await svc.completeEntries([{ id: 'c1', rate: 400 }])
    expect(result.updated).toBe(0)
    expect(result.skipped[0].reason).toMatch(/purpose/i)
  })

  it('accepts a rate on consumption once a purpose comes with it', async () => {
    const issue = row({ id: 'c1', projectId: 'P1', material: 'Cement', consumedQty: 50, purpose: null })
    const { svc } = serviceOver([issue])
    const result = await svc.completeEntries([{ id: 'c1', rate: 400, purpose: 'Raft pour' }])
    expect(result.updated).toBe(1)
  })

  // A bulk editor that can reach quantities or dates is a way to rewrite a
  // signed register in one action.
  it('touches nothing but rate, purpose and WBS', async () => {
    const { svc, saved } = serviceOver([unpriced()])
    await svc.completeEntries([
      { id: 'r1', rate: 25, receivedQty: 9999, date: '2020-01-01', material: 'Something else' } as any,
    ])
    expect(Object.keys(saved[0]).sort()).toEqual(['amount', 'id', 'rate'])
  })

  it('refuses an empty request', async () => {
    const { svc } = serviceOver([])
    await expect(svc.completeEntries([])).rejects.toThrow(/nothing to update/i)
  })

  it('refuses a request too large to be a considered edit', async () => {
    const { svc } = serviceOver([])
    const many = Array.from({ length: 501 }, (_, i) => ({ id: `r${i}`, rate: 1 }))
    await expect(svc.completeEntries(many)).rejects.toThrow(/at most 500/i)
  })
})
