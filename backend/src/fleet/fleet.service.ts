import { Injectable, BadRequestException, Optional } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { Repository } from 'typeorm'
import { FleetLog } from './fleet-log.entity'
import { resolveListLimit } from '../common/list-limit'
import { OpsEvents } from '../ops-sync/ops-events'

@Injectable()
export class FleetService {
  constructor(
    @InjectRepository(FleetLog) private repo: Repository<FleetLog>,
    @Optional() private readonly events?: EventEmitter2,
  ) {}

  private async sanitizeDto(dto: any): Promise<Partial<FleetLog>> {
    if (!dto) throw new BadRequestException('Payload is required.')

    if (!dto.projectId) {
      throw new BadRequestException('projectId is required')
    }

    // Sanitize numeric fields: convert "" or NaN to null, convert valid numeric strings to numbers
    const numFields = [
      'meterStart', 'meterEnd', 'distanceKm',
      'hourStart', 'hourClose', 'hoursWorked',
      'fuelLitres', 'fuelCost',
    ]
    for (const f of numFields) {
      if (!(f in dto)) continue
      if (dto[f] === '' || dto[f] === undefined || dto[f] === null) {
        dto[f] = null
      } else {
        const parsed = Number(dto[f])
        dto[f] = Number.isNaN(parsed) ? null : parsed
      }
    }

    // Auto-calculate derived fields
    if (dto.logType === 'vehicle' && dto.meterStart != null && dto.meterEnd != null) {
      if (dto.meterStart < 0 || dto.meterEnd < dto.meterStart) {
        throw new BadRequestException('Vehicle readings are invalid')
      }
      dto.distanceKm = Number((dto.meterEnd - dto.meterStart).toFixed(1))
    }
    if (dto.logType === 'plant' && dto.hourStart != null && dto.hourClose != null) {
      if (dto.hourStart < 0 || dto.hourClose < dto.hourStart) {
        throw new BadRequestException('Plant hour readings are invalid')
      }
      dto.hoursWorked = Number((dto.hourClose - dto.hourStart).toFixed(1))
    }
    if (dto.fuelLitres != null && dto.fuelLitres < 0) {
      throw new BadRequestException('Fuel quantity cannot be negative')
    }

    // Default booleans
    dto.breakdown = Boolean(dto.breakdown)

    return dto
  }

  private buildBaselines(logs: FleetLog[]) {
    const baselines: Record<string, { count: number; mean: number; stdDev: number; rates: number[] }> = {}

    for (const l of logs) {
      const fuel = Number(l.fuelLitres)
      if (!fuel || fuel <= 0) continue

      let rate: number | null = null
      let key = ''

      if (l.logType === 'plant' && Number(l.hoursWorked) > 0) {
        rate = fuel / Number(l.hoursWorked)
        key = `plant:${(l.machineId || l.machineType || 'plant').trim().toLowerCase()}`
      } else if (l.logType === 'vehicle' && Number(l.distanceKm) > 0) {
        rate = fuel / Number(l.distanceKm) // L/km
        key = `vehicle:${(l.vehicle || 'vehicle').trim().toLowerCase()}`
      }

      if (rate != null && key) {
        if (!baselines[key]) {
          baselines[key] = { count: 0, mean: 0, stdDev: 0, rates: [] }
        }
        baselines[key].rates.push(rate)
      }
    }

    // Compute sample mean and sample standard deviation
    for (const key of Object.keys(baselines)) {
      const b = baselines[key]
      const n = b.rates.length
      b.count = n
      const sum = b.rates.reduce((acc, v) => acc + v, 0)
      const mean = sum / n
      b.mean = mean

      if (n >= 2) {
        const variance = b.rates.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (n - 1)
        b.stdDev = Math.sqrt(variance)
      } else {
        b.stdDev = 0
      }
    }

    return baselines
  }

  private computeLogEfficiency(
    log: FleetLog,
    baselines: Record<string, { count: number; mean: number; stdDev: number }>,
  ) {
    const fuel = Number(log.fuelLitres)
    if (!fuel || fuel <= 0) return null

    const isPlant = log.logType === 'plant'
    const hours = Number(log.hoursWorked)
    const distance = Number(log.distanceKm)

    if (isPlant && (!hours || hours <= 0)) return null
    if (!isPlant && (!distance || distance <= 0)) return null

    const rate = isPlant ? fuel / hours : fuel / distance
    const unit = isPlant ? 'L/hr' : 'L/km'
    const kmPerLitre = !isPlant && rate > 0 ? Number((1 / rate).toFixed(2)) : null

    const key = isPlant
      ? `plant:${(log.machineId || log.machineType || 'plant').trim().toLowerCase()}`
      : `vehicle:${(log.vehicle || 'vehicle').trim().toLowerCase()}`

    const baseline = baselines[key]

    if (!baseline || baseline.count < 3) {
      return {
        rate: Number(rate.toFixed(2)),
        unit,
        kmPerLitre,
        baselineAvg: baseline ? Number(baseline.mean.toFixed(2)) : null,
        stdDev: baseline ? Number(baseline.stdDev.toFixed(2)) : null,
        sampleCount: baseline ? baseline.count : 0,
        isAnomaly: false,
        deviationPercent: null,
        status: 'insufficient_data',
      }
    }

    const mu = baseline.mean
    const sigma = baseline.stdDev
    // > 2σ outlier threshold (or at least +25% above mean to avoid noise on zero-variance)
    const threshold = Math.max(mu + 2 * sigma, mu * 1.25)
    const isAnomaly = rate > threshold
    const deviationPercent = mu > 0 ? Number((((rate - mu) / mu) * 100).toFixed(1)) : 0

    return {
      rate: Number(rate.toFixed(2)),
      unit,
      kmPerLitre,
      baselineAvg: Number(mu.toFixed(2)),
      stdDev: Number(sigma.toFixed(2)),
      sampleCount: baseline.count,
      isAnomaly,
      deviationPercent,
      status: isAnomaly ? 'high_burn' : 'normal',
      message: isAnomaly
        ? `Burn rate ${rate.toFixed(1)} ${unit} is ${deviationPercent > 0 ? '+' : ''}${deviationPercent}% above 30d baseline (${mu.toFixed(1)} ± ${(2 * sigma).toFixed(1)} ${unit})`
        : undefined,
    }
  }

  async list(params: { projectId?: string; logType?: string; from?: string; to?: string; limit?: string | number }) {
    const q = this.repo.createQueryBuilder('f')
      .orderBy('f.date', 'DESC')
      .addOrderBy('f.created_at', 'DESC')
    if (params?.projectId) q.andWhere('f.project_id = :pid', { pid: params.projectId })
    if (params?.logType) q.andWhere('f.log_type = :t', { t: params.logType })
    if (params?.from && params?.to)
      q.andWhere('f.date BETWEEN :from AND :to', { from: params.from, to: params.to })

    const logs = await q.take(resolveListLimit(params?.limit)).getMany()

    // Query 30-day baseline to annotate efficiency & anomaly detection
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const baselineQuery = this.repo.createQueryBuilder('f')
      .where('f.date >= :thirtyDaysAgo', { thirtyDaysAgo })
      .andWhere('f.fuel_litres > 0')
      .andWhere('(f.hours_worked > 0 OR f.distance_km > 0)')
    if (params?.projectId) baselineQuery.andWhere('f.project_id = :pid', { pid: params.projectId })

    const baselineLogs = await baselineQuery.getMany()
    const baselines = this.buildBaselines(baselineLogs)

    return logs.map(log => {
      const efficiency = this.computeLogEfficiency(log, baselines)
      return {
        ...log,
        efficiency,
      }
    })
  }

  async dashboard(projectId?: string) {
    const today = new Date().toISOString().split('T')[0]
    const monthStart = today.slice(0, 7) + '-01'
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const effectiveProjectId = projectId
    const whereBase = effectiveProjectId ? { projectId: effectiveProjectId } : {}

    const [
      todayVehicle,
      todayPlant,
      monthVehicle,
      monthPlant,
      allVehicleKm,
      allPlantHours,
      allFuel,
      allPlant,
      vehicleCount,
      plantCount,
      breakdownCount,
      recentLogs,
    ] = await Promise.all([
      this.repo.find({ where: { ...whereBase, logType: 'vehicle', date: today } as any }),
      this.repo.find({ where: { ...whereBase, logType: 'plant',   date: today } as any }),
      this.repo.createQueryBuilder('f')
        .select('SUM(f.distance_km)', 'totalKm')
        .addSelect('SUM(f.fuel_litres)', 'totalFuel')
        .where('f.log_type = :t AND f.date >= :from' + (effectiveProjectId ? ' AND f.project_id = :pid' : ''),
          { pid: effectiveProjectId, t: 'vehicle', from: monthStart }).getRawOne(),
      this.repo.createQueryBuilder('f')
        .select('SUM(f.hours_worked)', 'totalHours')
        .addSelect('SUM(f.fuel_litres)', 'totalFuel')
        .where('f.log_type = :t AND f.date >= :from' + (effectiveProjectId ? ' AND f.project_id = :pid' : ''),
          { pid: effectiveProjectId, t: 'plant', from: monthStart }).getRawOne(),
      this.repo.createQueryBuilder('f')
        .select('SUM(f.distance_km)', 'totalKm')
        .addSelect('SUM(f.fuel_litres)', 'totalFuel')
        .where('f.log_type = :t' + (effectiveProjectId ? ' AND f.project_id = :pid' : ''),
          { pid: effectiveProjectId, t: 'vehicle' }).getRawOne(),
      this.repo.createQueryBuilder('f')
        .select('SUM(f.hours_worked)', 'totalHours')
        .addSelect('SUM(f.fuel_litres)', 'totalFuel')
        .where('f.log_type = :t' + (effectiveProjectId ? ' AND f.project_id = :pid' : ''),
          { pid: effectiveProjectId, t: 'plant' }).getRawOne(),
      this.repo.createQueryBuilder('f')
        .select('SUM(f.fuel_litres)', 'totalFuel')
        .where('1=1' + (effectiveProjectId ? ' AND f.project_id = :pid' : ''),
          { pid: effectiveProjectId }).getRawOne(),
      this.repo.createQueryBuilder('f')
        .select('f.machine_id', 'machineId')
        .addSelect('f.machine_type', 'machineType')
        .addSelect('MAX(f.hour_close)', 'lastReading')
        .addSelect('SUM(f.hours_worked)', 'totalHours')
        .addSelect('SUM(f.fuel_litres)', 'totalFuel')
        .addSelect('MAX(f.date)', 'lastDate')
        .where('f.log_type = :t' + (effectiveProjectId ? ' AND f.project_id = :pid' : ''), { pid: effectiveProjectId, t: 'plant' })
        .groupBy('f.machine_id').addGroupBy('f.machine_type')
        .getRawMany(),
      this.repo.count({ where: { ...(effectiveProjectId ? { projectId: effectiveProjectId } : {}), logType: 'vehicle' } as any }),
      this.repo.count({ where: { ...(effectiveProjectId ? { projectId: effectiveProjectId } : {}), logType: 'plant' } as any }),
      this.repo.count({ where: { ...(effectiveProjectId ? { projectId: effectiveProjectId } : {}), breakdown: true } as any }),
      // Trailing 30 days logs for anomaly detection and baseline averages
      this.repo.createQueryBuilder('f')
        .where('f.date >= :thirtyDaysAgo', { thirtyDaysAgo })
        .andWhere('f.fuel_litres > 0')
        .andWhere('(f.hours_worked > 0 OR f.distance_km > 0)')
        .andWhere(effectiveProjectId ? 'f.project_id = :pid' : '1=1', { pid: effectiveProjectId })
        .orderBy('f.date', 'DESC')
        .getMany(),
    ])

    const baselines = this.buildBaselines(recentLogs)

    // Detect all anomalies in the trailing 30-day window
    const anomalies: any[] = []
    for (const log of recentLogs) {
      const eff = this.computeLogEfficiency(log, baselines)
      if (eff?.isAnomaly) {
        anomalies.push({
          id: log.id,
          date: log.date,
          logType: log.logType,
          machineId: log.machineId,
          machineType: log.machineType,
          vehicle: log.vehicle,
          operator: log.operator || log.driver,
          efficiency: eff,
        })
      }
    }

    // Machine-level burn rates
    const fleetFormatted = (allPlant || []).map((m: any) => {
      const key = `plant:${(m.machineId || m.machineType || 'plant').trim().toLowerCase()}`
      const base = baselines[key]
      const totalH = Number(m.totalHours || 0)
      const totalF = Number(m.totalFuel || 0)
      const overallRate = totalH > 0 && totalF > 0 ? Number((totalF / totalH).toFixed(2)) : null

      return {
        machineId: m.machineId,
        machineType: m.machineType,
        lastReading: Number(m.lastReading || 0),
        lastClosingHour: Number(m.lastReading || 0),
        totalHours: totalH,
        totalFuel: totalF,
        lastDate: m.lastDate,
        burnRateLitrePerHour: base?.mean ? Number(base.mean.toFixed(2)) : overallRate,
        sampleCount30d: base?.count || 0,
        hasAnomalies: anomalies.some(a => a.logType === 'plant' && a.machineId === m.machineId),
      }
    })

    // Fleet-wide efficiency indicators
    const totPlantH = Number(allPlantHours?.totalHours || 0)
    const totPlantF = Number(allPlantHours?.totalFuel || 0)
    const totVehKm = Number(allVehicleKm?.totalKm || 0)
    const totVehF = Number(allVehicleKm?.totalFuel || 0)

    const plantAvgLitrePerHour = totPlantH > 0 && totPlantF > 0 ? Number((totPlantF / totPlantH).toFixed(2)) : null
    const vehicleAvgKmPerLitre = totVehKm > 0 && totVehF > 0 ? Number((totVehKm / totVehF).toFixed(2)) : null
    const vehicleAvgLitrePerKm = totVehKm > 0 && totVehF > 0 ? Number((totVehF / totVehKm).toFixed(3)) : null

    return {
      counts: {
        vehicleLogs: vehicleCount,
        plantLogs: plantCount,
        activeMachines: fleetFormatted.length,
        breakdowns: breakdownCount,
      },
      totals: {
        plantHours: Number(totPlantH.toFixed(1)),
        vehicleKm: Number(totVehKm.toFixed(0)),
        totalFuel: Number(+(allFuel?.totalFuel || 0)),
        plantFuel: Number(totPlantF.toFixed(1)),
        vehicleFuel: Number(totVehF.toFixed(1)),
      },
      monthStats: {
        vehicle: { km: +(monthVehicle?.totalKm || 0), fuel: +(monthVehicle?.totalFuel || 0) },
        plant:   { hours: +(monthPlant?.totalHours || 0), fuel: +(monthPlant?.totalFuel || 0) },
      },
      today: { vehicle: todayVehicle, plant: todayPlant },
      fleet: fleetFormatted,
      efficiency: {
        plantAvgLitrePerHour,
        vehicleAvgKmPerLitre,
        vehicleAvgLitrePerKm,
        anomalyCount: anomalies.length,
        anomalies,
      },
    }
  }

  async create(dto: any) {
    const clean = await this.sanitizeDto(dto)
    const entity = this.repo.create(clean)
    const saved = await this.repo.save(entity)
    const row = Array.isArray(saved) ? saved[0] : saved
    this.events?.emit(OpsEvents.FLEET_LOGGED, row)
    return saved
  }

  async update(id: string, dto: any) {
    const existing = await this.repo.findOne({ where: { id } })
    if (!existing) throw new BadRequestException('Fleet log not found')
    const clean = await this.sanitizeDto({
      ...dto,
      projectId: dto.projectId ?? existing.projectId,
      logType: dto.logType ?? existing.logType,
    })
    await this.repo.update(id, clean)
    const row = await this.repo.findOne({ where: { id } })
    if (row) this.events?.emit(OpsEvents.FLEET_LOGGED, row)
    return row
  }

  async delete(id: string) { return this.repo.delete(id) }
}
