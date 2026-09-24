import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual, DataSource } from 'typeorm'
import { SystemLog } from './system-log.entity'
import { migrationStatus } from '../common/schema-migrations'

import { CreateSystemLogDto, ListLogsQueryDto } from './dto/system-log.dto'

export { CreateSystemLogDto, ListLogsQueryDto }

@Injectable()
export class SystemLogsService {
  private readonly logger = new Logger(SystemLogsService.name)

  constructor(
    @InjectRepository(SystemLog)
    private readonly repo: Repository<SystemLog>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Safe asynchronous error logging. Catches all internal errors to guarantee
   * that logging never interferes with or fails the underlying request flow.
   */
  async logError(dto: CreateSystemLogDto): Promise<SystemLog | null> {
    try {
      const cleanMessage = String(dto.message || 'Unknown error').slice(0, 10000)
      const cleanStack = dto.stack ? String(dto.stack).slice(0, 20000) : undefined
      const cleanPath = dto.path ? String(dto.path).slice(0, 500) : undefined

      const entry = this.repo.create({
        source: dto.source || 'backend',
        level: dto.level || 'error',
        errorName: dto.errorName ? String(dto.errorName).slice(0, 150) : undefined,
        message: cleanMessage,
        stack: cleanStack,
        path: cleanPath,
        method: dto.method ? String(dto.method).slice(0, 10).toUpperCase() : undefined,
        statusCode: dto.statusCode ? Number(dto.statusCode) : undefined,
        userId: dto.userId,
        userEmail: dto.userEmail ? String(dto.userEmail).slice(0, 255) : undefined,
        userRole: dto.userRole ? String(dto.userRole).slice(0, 50) : undefined,
        ipAddress: dto.ipAddress ? String(dto.ipAddress).slice(0, 100) : undefined,
        userAgent: dto.userAgent ? String(dto.userAgent).slice(0, 1000) : undefined,
        metadata: dto.metadata,
        resolved: false,
      })

      return await this.repo.save(entry)
    } catch (err: any) {
      this.logger.error(`Failed to persist system error log: ${err.message}`)
      return null
    }
  }

  /**
   * Retrieves paginated system error logs with flexible search and filtering.
   */
  async listLogs(query: ListLogsQueryDto) {
    const page = Math.max(1, Number(query.page) || 1)
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 25))
    const skip = (page - 1) * limit

    const qb = this.repo.createQueryBuilder('log')

    if (query.source && query.source !== 'all') {
      qb.andWhere('log.source = :source', { source: query.source })
    }

    if (query.level && query.level !== 'all') {
      qb.andWhere('log.level = :level', { level: query.level })
    }

    if (query.statusCode) {
      qb.andWhere('log.statusCode = :statusCode', { statusCode: Number(query.statusCode) })
    }

    if (query.resolved !== undefined) {
      qb.andWhere('log.resolved = :resolved', { resolved: query.resolved })
    }

    if (query.search) {
      qb.andWhere(
        '(log.message ILIKE :search OR log.path ILIKE :search OR log.userEmail ILIKE :search OR log.errorName ILIKE :search)',
        { search: `%${query.search.trim()}%` },
      )
    }

    if (query.startDate && query.endDate) {
      qb.andWhere('log.createdAt BETWEEN :start AND :end', {
        start: new Date(query.startDate),
        end: new Date(query.endDate),
      })
    } else if (query.startDate) {
      qb.andWhere('log.createdAt >= :start', { start: new Date(query.startDate) })
    } else if (query.endDate) {
      qb.andWhere('log.createdAt <= :end', { end: new Date(query.endDate) })
    }

    qb.orderBy('log.createdAt', 'DESC')
    qb.skip(skip).take(limit)

    const [items, total] = await qb.getManyAndCount()

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }

  /**
   * Aggregates summary statistics for the troubleshooting dashboard.
   */
  async getStats() {
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const [
      totalCount,
      todayCount,
      weekCount,
      unresolvedCount,
      bySourceRaw,
      recentTopErrors,
    ] = await Promise.all([
      this.repo.count(),
      this.repo.count({ where: { createdAt: MoreThanOrEqual(startOfToday) } }),
      this.repo.count({ where: { createdAt: MoreThanOrEqual(sevenDaysAgo) } }),
      this.repo.count({ where: { resolved: false } }),
      this.repo
        .createQueryBuilder('log')
        .select('log.source', 'source')
        .addSelect('COUNT(*)', 'count')
        .groupBy('log.source')
        .getRawMany(),
      this.repo
        .createQueryBuilder('log')
        .select('log.path', 'path')
        .addSelect('log.statusCode', 'statusCode')
        .addSelect('COUNT(*)', 'count')
        .where('log.createdAt >= :week', { week: sevenDaysAgo })
        .andWhere('log.path IS NOT NULL')
        .groupBy('log.path')
        .addGroupBy('log.statusCode')
        .orderBy('count', 'DESC')
        .limit(5)
        .getRawMany(),
    ])

    const bySource: Record<string, number> = { backend: 0, frontend: 0, mobile: 0 }
    bySourceRaw.forEach(r => {
      bySource[r.source] = parseInt(r.count, 10) || 0
    })

    return {
      total: totalCount,
      today: todayCount,
      last7Days: weekCount,
      unresolved: unresolvedCount,
      bySource,
      topErrors: recentTopErrors.map(r => ({
        path: r.path,
        statusCode: r.statusCode ? parseInt(r.statusCode, 10) : 0,
        count: parseInt(r.count, 10) || 0,
      })),
    }
  }

  /**
   * Runs live system health diagnostic check across database, memory, and runtime.
   */
  async getDiagnostics() {
    const start = Date.now()
    let dbStatus = 'ok'
    let dbLatencyMs = 0
    let dbError: string | null = null

    try {
      const qStart = Date.now()
      await this.dataSource.query('SELECT 1')
      dbLatencyMs = Date.now() - qStart
    } catch (e: any) {
      dbStatus = 'error'
      dbError = e.message
    }

    const mem = process.memoryUsage()
    const uptimeSec = Math.round(process.uptime())
    const migrations = migrationStatus()

    return {
      timestamp: new Date().toISOString(),
      status: dbStatus === 'ok' ? 'healthy' : 'degraded',
      diagnostics: {
        database: {
          status: dbStatus,
          latencyMs: dbLatencyMs,
          error: dbError,
        },
        memory: {
          rssMb: Math.round(mem.rss / 1024 / 1024),
          heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
          heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024),
        },
        runtime: {
          uptimeSeconds: uptimeSec,
          uptimeFormatted: `${Math.floor(uptimeSec / 3600)}h ${Math.floor((uptimeSec % 3600) / 60)}m ${uptimeSec % 60}s`,
          nodeVersion: process.version,
          platform: process.platform,
          environment: process.env.NODE_ENV || 'production',
        },
        migrations: {
          appliedCount: migrations.applied.length,
          skippedCount: migrations.skipped.length,
          failedCount: migrations.failed.length,
          upToDate: migrations.failed.length === 0,
        },
      },
    }
  }

  /**
   * Resolves a single log entry.
   */
  async resolveLog(id: string, resolved = true) {
    await this.repo.update(id, { resolved })
    return { ok: true, id, resolved }
  }

  /**
   * Marks all unresolved error logs as resolved.
   */
  async resolveAll() {
    const result = await this.repo.update({ resolved: false }, { resolved: true })
    return { ok: true, updated: result.affected ?? 0 }
  }

  /**
   * Deletes logs older than a given number of days to keep database storage optimal.
   */
  async deleteOldLogs(days = 30) {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    const result = await this.repo.delete({ createdAt: LessThanOrEqual(cutoff) })
    return { ok: true, deleted: result.affected ?? 0 }
  }
}
