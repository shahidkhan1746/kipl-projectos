import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, Between } from 'typeorm'
import { FleetLog } from './fleet-log.entity'

@Injectable()
export class FleetService {
  constructor(@InjectRepository(FleetLog) private repo: Repository<FleetLog>) {}

  async list(params: { projectId: string; logType?: string; from?: string; to?: string }) {
    const q = this.repo.createQueryBuilder('f')
      .where('f.project_id = :pid', { pid: params.projectId })
      .orderBy('f.date', 'DESC')
      .addOrderBy('f.created_at', 'DESC')
    if (params.logType) q.andWhere('f.log_type = :t', { t: params.logType })
    if (params.from && params.to)
      q.andWhere('f.date BETWEEN :from AND :to', { from: params.from, to: params.to })
    return q.getMany()
  }

  async dashboard(projectId: string) {
    const today = new Date().toISOString().split('T')[0]
    const monthStart = today.slice(0, 7) + '-01'

    const [todayVehicle, todayPlant, monthVehicle, monthPlant, allPlant] = await Promise.all([
      this.repo.find({ where: { projectId, logType: 'vehicle', date: today } }),
      this.repo.find({ where: { projectId, logType: 'plant',   date: today } }),
      this.repo.createQueryBuilder('f')
        .select('SUM(f.distance_km)', 'totalKm')
        .addSelect('SUM(f.fuel_litres)', 'totalFuel')
        .where('f.project_id = :pid AND f.log_type = :t AND f.date >= :from',
          { pid: projectId, t: 'vehicle', from: monthStart }).getRawOne(),
      this.repo.createQueryBuilder('f')
        .select('SUM(f.hours_worked)', 'totalHours')
        .addSelect('SUM(f.fuel_litres)', 'totalFuel')
        .where('f.project_id = :pid AND f.log_type = :t AND f.date >= :from',
          { pid: projectId, t: 'plant', from: monthStart }).getRawOne(),
      this.repo.createQueryBuilder('f')
        .select('f.machine_id', 'machineId')
        .addSelect('f.machine_type', 'machineType')
        .addSelect('MAX(f.hour_close)', 'lastReading')
        .addSelect('SUM(f.hours_worked)', 'totalHours')
        .addSelect('MAX(f.date)', 'lastDate')
        .where('f.project_id = :pid AND f.log_type = :t', { pid: projectId, t: 'plant' })
        .groupBy('f.machine_id').addGroupBy('f.machine_type')
        .getRawMany(),
    ])

    return {
      today: { vehicle: todayVehicle, plant: todayPlant },
      monthStats: {
        vehicle: { km: +(monthVehicle?.totalKm || 0), fuel: +(monthVehicle?.totalFuel || 0) },
        plant:   { hours: +(monthPlant?.totalHours || 0), fuel: +(monthPlant?.totalFuel || 0) },
      },
      fleet: allPlant,
    }
  }

  async create(dto: Partial<FleetLog>) {
    // Auto-calculate derived fields
    if (dto.logType === 'vehicle' && dto.meterStart && dto.meterEnd)
      dto.distanceKm = +(dto.meterEnd) - +(dto.meterStart)
    if (dto.logType === 'plant' && dto.hourStart && dto.hourClose)
      dto.hoursWorked = +(dto.hourClose) - +(dto.hourStart)
    return this.repo.save(this.repo.create(dto))
  }

  async update(id: string, dto: Partial<FleetLog>) {
    if (dto.meterStart && dto.meterEnd) dto.distanceKm = +(dto.meterEnd) - +(dto.meterStart)
    if (dto.hourStart  && dto.hourClose) dto.hoursWorked = +(dto.hourClose) - +(dto.hourStart)
    await this.repo.update(id, dto)
    return this.repo.findOne({ where: { id } })
  }

  async delete(id: string) { return this.repo.delete(id) }
}
