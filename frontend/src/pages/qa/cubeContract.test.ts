import { describe, it, expect } from 'vitest'
import {
  cubeCreatePayload, cubeBreakPayload, cubeLoads, strengthMpa, hasOutlier, num,
  type CubeForm, type BreakForm, type CubeRow,
} from './cubeContract'

const form: CubeForm = {
  castDate: '2026-09-24', structure: ' Wet Well Raft Bay-2 ', location: ' Habak IPS, Ch 0+150 ',
  grade: 'M30', mixType: 'design', cementBrand: 'UltraTech', cementType: 'OPC_43',
  waterCementRatio: '0.45', slumpMm: '100', curingCondition: 'lab_tank',
  cubeCount: 6, sampleNo: ' CUB-2026-042 ', supplierBatch: ' RMC-104 ', castBy: ' A. Wani ',
}

describe('cubeCreatePayload', () => {
  it('sends the field names the server actually accepts', () => {
    const p = cubeCreatePayload(form, 'proj-1')
    expect(p.sampleCode).toBe('CUB-2026-042')
    expect(p.pourLocation).toBe('Habak IPS, Ch 0+150')
    expect(p.structureElement).toBe('Wet Well Raft Bay-2')
    expect(p.batchOrMixId).toBe('RMC-104')
    expect(p.technicianName).toBe('A. Wani')
    expect(p.projectId).toBe('proj-1')
  })

  it('never sends a target strength', () => {
    // The server derives fck from the grade. A client-supplied value is how a
    // cube gets judged against the wrong one.
    expect(cubeCreatePayload(form, 'p')).not.toHaveProperty('fckRequiredMpa')
    expect(cubeCreatePayload(form, 'p')).not.toHaveProperty('targetStrengthMpa')
  })

  it('translates the curing option into the stored wording', () => {
    expect(cubeCreatePayload(form, 'p').curingMethod).toBe('Water Curing')
    expect(cubeCreatePayload({ ...form, curingCondition: 'site_cured' }, 'p').curingMethod)
      .toBe('Site Curing')
  })

  it('passes an unmapped curing option through rather than dropping it', () => {
    expect(cubeCreatePayload({ ...form, curingCondition: 'Autoclave' }, 'p').curingMethod)
      .toBe('Autoclave')
  })

  it('sends numbers for the numeric fields, not the form strings', () => {
    const p = cubeCreatePayload(form, 'p')
    expect(p.waterCementRatio).toBe(0.45)
    expect(p.slumpMm).toBe(100)
    expect(p.cubeCount).toBe(6)
  })

  it('omits a blank optional rather than sending zero', () => {
    // slump 0 is a real reading (a no-slump mix). Blank means unrecorded, and
    // storing it as 0 would be a measurement nobody took.
    const p = cubeCreatePayload({ ...form, slumpMm: '', waterCementRatio: '', supplierBatch: '  ' }, 'p')
    expect(p.slumpMm).toBeUndefined()
    expect(p.waterCementRatio).toBeUndefined()
    expect(p.batchOrMixId).toBeUndefined()
  })

  it('keeps a genuine zero slump', () => {
    expect(cubeCreatePayload({ ...form, slumpMm: '0' }, 'p').slumpMm).toBe(0)
  })

  it('defaults the cube count to the IS 456 minimum when blank', () => {
    expect(cubeCreatePayload({ ...form, cubeCount: '' }, 'p').cubeCount).toBe(6)
  })
})

describe('cubeBreakPayload', () => {
  const breakForm: BreakForm = {
    loadsKn: ['450', '462', '455'], breakDate: '2026-10-01',
    technician: ' S. Khan ', notes: ' Conical failure ',
  }

  it('uses loads7dKn at 7 days and loads28dKn at 28', () => {
    expect(cubeBreakPayload('7d', breakForm)).toMatchObject({ loads7dKn: [450, 462, 455] })
    expect(cubeBreakPayload('28d', breakForm)).toMatchObject({ loads28dKn: [450, 462, 455] })
  })

  it('does not send the other age key', () => {
    expect(cubeBreakPayload('7d', breakForm)).not.toHaveProperty('loads28dKn')
    expect(cubeBreakPayload('28d', breakForm)).not.toHaveProperty('loads7dKn')
  })

  it('carries the break date and technician the form collects', () => {
    const p = cubeBreakPayload('7d', breakForm)
    expect(p.breakDate).toBe('2026-10-01')
    expect(p.technicianName).toBe('S. Khan')
    expect(p.remarks).toBe('Conical failure')
  })

  it('drops blank, zero and non-numeric loads', () => {
    const p = cubeBreakPayload('7d', { ...breakForm, loadsKn: ['450', '', '0', 'abc'] })
    expect(p.loads7dKn).toEqual([450])
  })

  it('sends an empty list when nothing was entered, so the server can refuse it', () => {
    const p = cubeBreakPayload('28d', { ...breakForm, loadsKn: ['', '', ''] })
    expect(p.loads28dKn).toEqual([])
  })
})

describe('cubeLoads', () => {
  const row = {
    load7d1Kn: '450.00', load7d2Kn: '462.00', load7d3Kn: null,
    load28d1Kn: 600, load28d2Kn: null, load28d3Kn: null,
  } as unknown as CubeRow

  it('reassembles the three columns into a list', () => {
    expect(cubeLoads(row, '7d')).toEqual([450, 462])
    expect(cubeLoads(row, '28d')).toEqual([600])
  })

  it('returns empty for a cube not yet broken', () => {
    expect(cubeLoads({} as CubeRow, '7d')).toEqual([])
  })
})

describe('strengthMpa', () => {
  it('divides the load by the 150mm cube area', () => {
    // 450 kN over 22,500 mm² = 20 MPa.
    expect(strengthMpa(450)).toBe(20)
    expect(strengthMpa(562.5)).toBe(25)
  })
})

describe('hasOutlier', () => {
  it('flags a specimen more than 15% off the set average', () => {
    expect(hasOutlier([20, 20, 30])).toBe(true)
  })

  it('accepts a set within 15%', () => {
    expect(hasOutlier([20, 21, 22])).toBe(false)
  })

  it('does not judge an incomplete set', () => {
    // IS 456 Annex B is about a set of three. Two readings are a part-entered
    // form, not a failing sample.
    expect(hasOutlier([20, 30])).toBe(false)
    expect(hasOutlier([])).toBe(false)
  })

  it('does not divide by a zero mean', () => {
    expect(hasOutlier([0, 0, 0])).toBe(false)
  })

  it('is exclusive at exactly 15%', () => {
    // 17.0 / 20.0 / 23.0 has a mean of 20 and outliers at exactly 15%, which
    // IS 456 accepts.
    expect(hasOutlier([17, 20, 23])).toBe(false)
  })
})

describe('num', () => {
  it('reads a decimal column that arrived as a string', () => {
    expect(num('25.50')).toBe(25.5)
  })

  it('distinguishes not-recorded from zero', () => {
    expect(num(null)).toBeNull()
    expect(num(undefined)).toBeNull()
    expect(num('')).toBeNull()
    expect(num(0)).toBe(0)
    expect(num('0')).toBe(0)
  })

  it('returns null rather than NaN for junk', () => {
    expect(num('n/a')).toBeNull()
  })
})
