import { FleetService } from './fleet.service'
import { FleetLog } from './fleet-log.entity'

describe('FleetService - Efficiency & Anomaly Detection', () => {
  let service: FleetService
  let mockRepo: any

  beforeEach(() => {
    mockRepo = {
      createQueryBuilder: jest.fn(),
      find: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    }
    service = new FleetService(mockRepo)
  })

  describe('Anomaly Detection Algorithm', () => {
    it('flags high burn rate exceeding > 2σ baseline for plant equipment', async () => {
      // 5 baseline logs for JCB-01 with typical consumption of 10 L/hr (± 1 L/hr)
      // Rates: 9.5, 10.0, 10.5, 9.8, 10.2 -> mean ~ 10.0, stdDev ~ 0.38 -> 2σ ~ 0.76 -> threshold ~ 12.5 (due to min 25% buffer)
      const baselineLogs: Partial<FleetLog>[] = [
        { logType: 'plant', machineId: 'JCB-01', hoursWorked: 5, fuelLitres: 50, date: '2026-09-10' } as any, // 10.0 L/hr
        { logType: 'plant', machineId: 'JCB-01', hoursWorked: 4, fuelLitres: 38, date: '2026-09-11' } as any, // 9.5 L/hr
        { logType: 'plant', machineId: 'JCB-01', hoursWorked: 6, fuelLitres: 63, date: '2026-09-12' } as any, // 10.5 L/hr
        { logType: 'plant', machineId: 'JCB-01', hoursWorked: 5, fuelLitres: 49, date: '2026-09-13' } as any, // 9.8 L/hr
        { logType: 'plant', machineId: 'JCB-01', hoursWorked: 5, fuelLitres: 51, date: '2026-09-14' } as any, // 10.2 L/hr
      ]

      // Target log: 18.0 L/hr (severe outlier / suspected fuel theft or leak)
      const testLog: Partial<FleetLog> = {
        id: 'log-outlier',
        logType: 'plant',
        machineId: 'JCB-01',
        hoursWorked: 5,
        fuelLitres: 90, // 18 L/hr
        date: '2026-09-15',
      } as any

      const queryBuilderMock: any = {
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn()
          .mockResolvedValueOnce([testLog]) // First call for list()
          .mockResolvedValueOnce(baselineLogs), // Second call for 30-day baseline
      }

      mockRepo.createQueryBuilder.mockReturnValue(queryBuilderMock)

      const results = await service.list({})
      expect(results).toHaveLength(1)
      const annotated = results[0]

      expect(annotated.efficiency).toBeDefined()
      expect(annotated.efficiency?.rate).toBe(18)
      expect(annotated.efficiency?.unit).toBe('L/hr')
      expect(annotated.efficiency?.isAnomaly).toBe(true)
      expect(annotated.efficiency?.status).toBe('high_burn')
      expect(annotated.efficiency?.deviationPercent).toBeGreaterThan(50)
      expect(annotated.efficiency?.message).toContain('is +')
    })

    it('does not flag normal burn rates within baseline envelope', async () => {
      const baselineLogs: Partial<FleetLog>[] = [
        { logType: 'plant', machineId: 'EXC-01', hoursWorked: 8, fuelLitres: 96, date: '2026-09-10' } as any, // 12 L/hr
        { logType: 'plant', machineId: 'EXC-01', hoursWorked: 8, fuelLitres: 100, date: '2026-09-11' } as any, // 12.5 L/hr
        { logType: 'plant', machineId: 'EXC-01', hoursWorked: 8, fuelLitres: 92, date: '2026-09-12' } as any, // 11.5 L/hr
      ]

      const normalLog: Partial<FleetLog> = {
        id: 'log-normal',
        logType: 'plant',
        machineId: 'EXC-01',
        hoursWorked: 8,
        fuelLitres: 97, // 12.12 L/hr
        date: '2026-09-15',
      } as any

      const queryBuilderMock: any = {
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn()
          .mockResolvedValueOnce([normalLog])
          .mockResolvedValueOnce(baselineLogs),
      }
      mockRepo.createQueryBuilder.mockReturnValue(queryBuilderMock)

      const results = await service.list({})
      expect(results[0].efficiency?.isAnomaly).toBe(false)
      expect(results[0].efficiency?.status).toBe('normal')
    })

    it('marks status as insufficient_data when machine has fewer than 3 historical logs', async () => {
      const baselineLogs: Partial<FleetLog>[] = [
        { logType: 'plant', machineId: 'CRANE-01', hoursWorked: 4, fuelLitres: 40, date: '2026-09-10' } as any,
      ]

      const testLog: Partial<FleetLog> = {
        id: 'log-new-machine',
        logType: 'plant',
        machineId: 'CRANE-01',
        hoursWorked: 5,
        fuelLitres: 75, // 15 L/hr
        date: '2026-09-15',
      } as any

      const queryBuilderMock: any = {
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn()
          .mockResolvedValueOnce([testLog])
          .mockResolvedValueOnce(baselineLogs),
      }
      mockRepo.createQueryBuilder.mockReturnValue(queryBuilderMock)

      const results = await service.list({})
      expect(results[0].efficiency?.isAnomaly).toBe(false)
      expect(results[0].efficiency?.status).toBe('insufficient_data')
      expect(results[0].efficiency?.sampleCount).toBe(1)
    })
  })
})
