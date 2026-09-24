import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { SystemLogsService } from './system-logs.service'
import { SystemLog } from './system-log.entity'

describe('SystemLogsService', () => {
  let service: SystemLogsService
  let repo: any
  let dataSource: any

  const mockQueryBuilder = {
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[{ id: 'log-1', message: 'Test error' }], 1]),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    addGroupBy: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue([]),
  }

  beforeEach(async () => {
    repo = {
      create: jest.fn((dto) => ({ ...dto, id: 'mock-id', createdAt: new Date() })),
      save: jest.fn((entity) => Promise.resolve(entity)),
      createQueryBuilder: jest.fn(() => mockQueryBuilder),
      count: jest.fn().mockResolvedValue(10),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      delete: jest.fn().mockResolvedValue({ affected: 5 }),
    }

    dataSource = {
      query: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SystemLogsService,
        {
          provide: getRepositoryToken(SystemLog),
          useValue: repo,
        },
        {
          provide: DataSource,
          useValue: dataSource,
        },
      ],
    }).compile()

    service = module.get<SystemLogsService>(SystemLogsService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('logError', () => {
    it('creates and saves a log entry safely', async () => {
      const result = await service.logError({
        source: 'backend',
        level: 'error',
        errorName: 'HttpException',
        message: 'Something broke',
        statusCode: 500,
        path: '/api/v1/projects',
      })

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          source: 'backend',
          level: 'error',
          message: 'Something broke',
          statusCode: 500,
          resolved: false,
        }),
      )
      expect(repo.save).toHaveBeenCalled()
      expect(result).toHaveProperty('id', 'mock-id')
    })

    it('gracefully catches and logs errors without throwing if repository fails', async () => {
      repo.save.mockRejectedValueOnce(new Error('DB disconnect'))

      const result = await service.logError({
        message: 'Uncaught error',
      })

      expect(result).toBeNull()
    })
  })

  describe('listLogs', () => {
    it('applies filters and pagination correctly', async () => {
      const res = await service.listLogs({
        source: 'backend',
        level: 'error',
        statusCode: 500,
        resolved: false,
        search: 'timeout',
        startDate: '2026-09-01',
        endDate: '2026-09-24',
        page: 2,
        limit: 10,
      })

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(10)
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10)
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('log.createdAt', 'DESC')
      expect(res).toEqual({
        items: [{ id: 'log-1', message: 'Test error' }],
        total: 1,
        page: 2,
        limit: 10,
        totalPages: 1,
      })
    })
  })

  describe('getStats', () => {
    it('returns structured summary counts and top errors', async () => {
      mockQueryBuilder.getRawMany
        .mockResolvedValueOnce([{ source: 'backend', count: '8' }, { source: 'frontend', count: '2' }])
        .mockResolvedValueOnce([{ path: '/api/v1/auth/login', statusCode: '429', count: '5' }])

      const stats = await service.getStats()
      expect(stats.total).toBe(10)
      expect(stats.bySource.backend).toBe(8)
      expect(stats.bySource.frontend).toBe(2)
      expect(stats.topErrors).toHaveLength(1)
      expect(stats.topErrors[0].statusCode).toBe(429)
    })
  })

  describe('getDiagnostics', () => {
    it('pings the database and returns health status', async () => {
      const diag = await service.getDiagnostics()
      expect(diag.status).toBe('healthy')
      expect(diag.diagnostics.database.status).toBe('ok')
      expect(diag.diagnostics.runtime).toBeDefined()
      expect(dataSource.query).toHaveBeenCalledWith('SELECT 1')
    })

    it('returns degraded status if database ping fails', async () => {
      dataSource.query.mockRejectedValueOnce(new Error('Connection timeout'))

      const diag = await service.getDiagnostics()
      expect(diag.status).toBe('degraded')
      expect(diag.diagnostics.database.status).toBe('error')
      expect(diag.diagnostics.database.error).toBe('Connection timeout')
    })
  })

  describe('resolveLog & resolveAll', () => {
    it('resolves a specific log entry', async () => {
      const res = await service.resolveLog('log-123', true)
      expect(repo.update).toHaveBeenCalledWith('log-123', { resolved: true })
      expect(res).toEqual({ ok: true, id: 'log-123', resolved: true })
    })

    it('resolves all unresolved log entries', async () => {
      const res = await service.resolveAll()
      expect(repo.update).toHaveBeenCalledWith({ resolved: false }, { resolved: true })
      expect(res.ok).toBe(true)
    })
  })

  describe('deleteOldLogs', () => {
    it('deletes entries older than specified days', async () => {
      const res = await service.deleteOldLogs(30)
      expect(repo.delete).toHaveBeenCalled()
      expect(res).toEqual({ ok: true, deleted: 5 })
    })
  })
})
