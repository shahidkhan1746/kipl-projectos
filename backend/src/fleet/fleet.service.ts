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

  async list(params: { projectId?: string; logType?: string; from?: string; to?: string; limit?: string | number }) {
    const q = this.repo.createQueryBuilder('f')
      .orderBy('f.date', 'DESC')
      .addOrderBy('f.created_at', 'DESC')
    if (params?.projectId) q.andWhere('f.project_id = :pid', { pid: params.projectId })
    if (params?.logType) q.andWhere('f.log_type = :t', { t: params.logType })
    if (params?.from && params?.to)
      q.andWhere('f.date BETWEEN :from AND :to', { from: params.from, to: params.to })
    return q.take(resolveListLimit(params?.limit)).getMany()
  }

  async dashboard(projectId?: string) {
    const today = new Date().toISOString().split('T')[0]
    const monthStart = today.slice(0, 7) + '-01'

    const effectiveProjectId = projectId

    const whereBase = effectiveProjectId ? { projectId: effectiveProjectId } : {}

    const [todayVehicle, todayPlant, monthVehicle, monthPlant, allVehicleKm, allPlantHours, allFuel, allPlant, vehicleCount, plantCount, breakdownCount] = await Promise.all([
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
        .addSelect('MAX(f.date)', 'lastDate')
        .where('f.log_type = :t' + (effectiveProjectId ? ' AND f.project_id = :pid' : ''), { pid: effectiveProjectId, t: 'plant' })
        .groupBy('f.machine_id').addGroupBy('f.machine_type')
        .getRawMany(),
      this.repo.count({ where: { ...(effectiveProjectId ? { projectId: effectiveProjectId } : {}), logType: 'vehicle' } as any }),
      this.repo.count({ where: { ...(effectiveProjectId ? { projectId: effectiveProjectId } : {}), logType: 'plant' } as any }),
      this.repo.count({ where: { ...(effectiveProjectId ? { projectId: effectiveProjectId } : {}), breakdown: true } as any }),
    ])

    const fleetFormatted = (allPlant || []).map((m: any) => ({
      machineId: m.machineId,
      machineType: m.machineType,
      lastReading: Number(m.lastReading || 0),
      lastClosingHour: Number(m.lastReading || 0),
      totalHours: Number(m.totalHours || 0),
      lastDate: m.lastDate,
    }))

    return {
      counts: {
        vehicleLogs: vehicleCount,
        plantLogs: plantCount,
        activeMachines: fleetFormatted.length,
        breakdowns: breakdownCount,
      },
      totals: {
        plantHours: Number(+(allPlantHours?.totalHours || 0)),
        vehicleKm: Number(+(allVehicleKm?.totalKm || 0)),
        totalFuel: Number(+(allFuel?.totalFuel || 0)),
        plantFuel: Number(+(allPlantHours?.totalFuel || 0)),
        vehicleFuel: Number(+(allVehicleKm?.totalFuel || 0)),
      },
      monthStats: {
        vehicle: { km: +(monthVehicle?.totalKm || 0), fuel: +(monthVehicle?.totalFuel || 0) },
        plant:   { hours: +(monthPlant?.totalHours || 0), fuel: +(monthPlant?.totalFuel || 0) },
      },
      today: { vehicle: todayVehicle, plant: todayPlant },
      fleet: fleetFormatted,
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
