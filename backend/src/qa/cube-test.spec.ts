jest.mock('../storage/storage.service', () => ({
  StorageService: class StorageService {},
}))

import { QaService } from './qa.service'
import { ConcreteStrengthPredictorService } from './services/concrete-strength-predictor.service'

describe('QaService - Cube Tests Laboratory', () => {
  let service: QaService
  let cubeRepo: any
  let concretePredictor: ConcreteStrengthPredictorService
  let cubesInDb: any[]

  beforeEach(() => {
    cubesInDb = []

    cubeRepo = {
      create: jest.fn((dto: any) => ({
        id: `cube-${Date.now()}-${Math.random()}`,
        ...dto,
        createdAt: new Date(),
      })),
      save: jest.fn(async (item: any) => {
        const idx = cubesInDb.findIndex(c => c.id === item.id)
        if (idx >= 0) {
          cubesInDb[idx] = { ...cubesInDb[idx], ...item }
          return cubesInDb[idx]
        }
        cubesInDb.push(item)
        return item
      }),
      findOne: jest.fn(async ({ where }: any) => {
        return cubesInDb.find(c => c.id === where.id) || null
      }),
      delete: jest.fn(async (id: string) => {
        cubesInDb = cubesInDb.filter(c => c.id !== id)
      }),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn(async () => [...cubesInDb]),
      })),
    }

    concretePredictor = new ConcreteStrengthPredictorService()

    service = new QaService(
      {} as any, // clRepo
      {} as any, // inRepo
      {} as any, // ncrRepo
      cubeRepo,
      concretePredictor,
    )
  })

  it('creates a new cube test set with auto-calculated 7d and 28d dates and required fck', async () => {
    const cube = await service.createCubeTest({
      projectId: 'proj-1',
      sampleCode: 'CUBE-M25-001',
      pourLocation: 'Dal STP - Aeration Tank 2',
      structureElement: 'Raft Foundation',
      grade: 'M25',
      cementType: 'OPC_53',
      castDate: '2026-09-01',
    })

    expect(cube.id).toBeDefined()
    expect(cube.fckRequiredMpa).toBe(25.0)
    expect(cube.test7dDate).toBe('2026-09-08')
    expect(cube.test28dDate).toBe('2026-09-29')
    expect(cube.status7d).toBe('PENDING')
    expect(cube.status28d).toBe('PENDING')
    expect(cube.overallStatus).toBe('CAST')
    expect(cubesInDb).toHaveLength(1)
  })

  it('records 7-day break, converts kN to MPa, predicts 28d strength, and marks ON_TRACK', async () => {
    const created = await service.createCubeTest({
      projectId: 'proj-1',
      sampleCode: 'CUBE-M25-002',
      pourLocation: 'Dal STP - Raft Bay 1',
      grade: 'M25',
      castDate: '2026-09-01',
    })

    // 450 kN on 150mm cube = 450,000 / 22,500 = 20.0 MPa (which is ~80% of 25 MPa, well above 7d target)
    const updated = await service.record7DayBreak(created.id, {
      loads7dKn: [450, 455, 445],
    })

    expect(updated.avgStrength7dMpa).toBeCloseTo(20.0, 1)
    expect(updated.predicted28dMpa).toBeGreaterThanOrEqual(25.0)
    expect(updated.status7d).toBe('ON_TRACK')
    expect(updated.overallStatus).toBe('7D_TESTED')
  })

  it('flags 7-day break as AT_RISK or FAILED if crushing load is too low', async () => {
    const created = await service.createCubeTest({
      projectId: 'proj-1',
      sampleCode: 'CUBE-M25-WEAK',
      pourLocation: 'Culvert Wall',
      grade: 'M25',
      castDate: '2026-09-01',
    })

    // Very low load: 200 kN = 8.89 MPa at 7 days for M25 (projected to fail 28-day 25 MPa requirement)
    const updated = await service.record7DayBreak(created.id, {
      loads7dKn: [200, 205, 195],
    })

    expect(updated.avgStrength7dMpa).toBeLessThan(12.0)
    expect(updated.predicted28dMpa).toBeLessThan(25.0)
    expect(['AT_RISK', 'FAILED']).toContain(updated.status7d)
  })

  it('records 28-day break and evaluates characteristic compliance PASSED', async () => {
    const created = await service.createCubeTest({
      projectId: 'proj-1',
      sampleCode: 'CUBE-M25-FINAL',
      pourLocation: 'Slab Pour S-12',
      grade: 'M25',
      castDate: '2026-08-01',
    })

    // 600 kN = 26.67 MPa on 150mm cube (> 25.0 MPa required)
    const updated = await service.record28DayBreak(created.id, {
      loads28dKn: [600, 610, 595],
    })

    expect(updated.avgStrength28dMpa).toBeGreaterThanOrEqual(25.0)
    expect(updated.status28d).toBe('PASSED')
    expect(updated.overallStatus).toBe('COMPLETED_PASSED')
  })

  it('records 28-day break and evaluates FAILED if average strength is below fck', async () => {
    const created = await service.createCubeTest({
      projectId: 'proj-1',
      sampleCode: 'CUBE-M25-FAIL',
      pourLocation: 'Column C-4',
      grade: 'M25',
      castDate: '2026-08-01',
    })

    // 500 kN = 22.22 MPa (< 25.0 MPa required)
    const updated = await service.record28DayBreak(created.id, {
      loads28dKn: [500, 505, 495],
    })

    expect(updated.avgStrength28dMpa).toBeLessThan(25.0)
    expect(updated.status28d).toBe('FAILED')
    expect(updated.overallStatus).toBe('COMPLETED_FAILED')
  })
})
