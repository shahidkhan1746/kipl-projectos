import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Between, EntityManager, IsNull, Not, Repository } from 'typeorm'
import { ProjectsService } from '../projects/projects.service'
import { User } from '../users/user.entity'
import { FleetLog } from '../fleet/fleet-log.entity'
import { FuelEntry, FuelMachine } from './fuel.entity'
import { FuelEntryDto, FuelMachineDto, FuelRegisterQueryDto, FuelVoidDto } from './fuel.dto'
import { MachineInput, matchLogbookName, normaliseName, runLedger, summarise } from './fuel-math'

/** Today on site. The server runs in UTC; a fill at 2 a.m. in Srinagar belongs to that day. */
export const siteToday = (now = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now)

const n = (v: unknown) => (v === null || v === undefined || v === '' ? null : Number(v))
const text = (v: string | null | undefined) => (v?.trim() ? v.trim() : null)

export interface FuelEntryWarning { kind: 'negative_stock' | 'possible_duplicate' | 'meter_backwards'; message: string }

function serialise(e: FuelEntry) {
  return { ...e, litres: Number(e.litres), rate: n(e.rate), amount: n(e.amount), meterReading: n(e.meterReading) }
}
const machineInput = (m: FuelMachine): MachineInput => ({
  id: m.id, name: m.name, ownership: m.ownership, ownerName: m.ownerName, operator: m.operator,
  fuelType: m.fuelType, meterUnit: m.meterUnit, logbookNames: m.logbookNames, active: m.active,
})
const litresText = (l: number) => `${l.toLocaleString('en-IN', { maximumFractionDigits: 2 })} L`

@Injectable()
export class FuelService {
  constructor(
    @InjectRepository(FuelEntry) private readonly entries: Repository<FuelEntry>,
    @InjectRepository(FuelMachine) private readonly machines: Repository<FuelMachine>,
    @InjectRepository(FleetLog) private readonly fleetLogs: Repository<FleetLog>,
    private readonly projects: ProjectsService,
  ) {}

  /** Project checks here, not only in the guard: an empty assignment list must fail closed. */
  async authorize(projectId: string, user: User) {
    if (!projectId || !user?.id) throw new ForbiddenException('An authenticated project context is required')
    const allowed = await this.projects.allowedProjectIds(user)
    if (allowed !== null && !allowed.includes(projectId)) throw new ForbiddenException('Not assigned to this project')
    await this.projects.findById(projectId, user)
  }

  // ─── The register ─────────────────────────────────────────────────────────

  async register(q: FuelRegisterQueryDto, user: User) {
    await this.authorize(q.projectId, user)
    const to = q.to?.slice(0, 10) ?? siteToday()
    const from = q.from?.slice(0, 10) ?? `${to.slice(0, 8)}01`
    if (from > to) throw new BadRequestException('The start date is after the end date')
    const [machines, all, voided] = await Promise.all([
      this.machines.find({ where: { projectId: q.projectId }, order: { active: 'DESC', name: 'ASC' } }),
      this.entries.find({ where: { projectId: q.projectId, voidedAt: IsNull() } }),
      this.entries.find({ where: { projectId: q.projectId, voidedAt: Not(IsNull()), date: Between(from, to) }, order: { voidedAt: 'DESC' } }),
    ])
    const inputs = machines.map(machineInput)
    const rows = runLedger(all.map(serialise), inputs)
    const summary = summarise(rows, inputs, from, to, await this.logbookUse(q.projectId, from, to, machines))
    return {
      from, to, today: siteToday(), machines,
      entries: rows.filter(r => r.entry.date >= from && r.entry.date <= to)
        .map(r => ({ ...r.entry, machineId: r.machineId, balance: r.balance, cost: r.cost, averageRate: r.averageRate })),
      summary,
      voided: voided.map(serialise),
    }
  }

  /** Hours (plant) or km (vehicles) the Fleet logbook records per machine, matched by the names it goes by. */
  private async logbookUse(projectId: string, from: string, to: string, machines: FuelMachine[]) {
    const use = new Map<string, number>()
    if (!machines.length) return use
    const [plant, vehicles] = await Promise.all([
      this.fleetLogs.createQueryBuilder('f').select('f.machine_id', 'name').addSelect('SUM(f.hours_worked)', 'total')
        .where('f.project_id = :pid AND f.log_type = :t AND f.date BETWEEN :from AND :to', { pid: projectId, t: 'plant', from, to })
        .groupBy('f.machine_id').getRawMany<{ name: string; total: string }>(),
      this.fleetLogs.createQueryBuilder('f').select('f.vehicle', 'name').addSelect('SUM(f.distance_km)', 'total')
        .where('f.project_id = :pid AND f.log_type = :t AND f.date BETWEEN :from AND :to', { pid: projectId, t: 'vehicle', from, to })
        .groupBy('f.vehicle').getRawMany<{ name: string; total: string }>(),
    ])
    const add = (rows: { name: string; total: string }[], unit: 'hours' | 'km') => {
      for (const r of rows) {
        const m = matchLogbookName(r.name, machines.filter(x => x.meterUnit === unit))
        const total = Number(r.total) || 0
        if (m && total > 0) use.set(m.id, Math.round(((use.get(m.id) ?? 0) + total) * 10) / 10)
      }
    }
    add(plant, 'hours'); add(vehicles, 'km')
    return use
  }

  // ─── Entries ──────────────────────────────────────────────────────────────

  async createEntry(dto: FuelEntryDto, user: User) {
    await this.authorize(dto.projectId, user)
    const data = await this.validate(dto)
    const saved = await this.entries.save(this.entries.create({ ...data, recordedById: user.id, recordedByName: user.name ?? null }))
    return { entry: serialise(saved), warnings: await this.warningsFor(saved) }
  }

  async updateEntry(id: string, dto: FuelEntryDto, user: User) {
    await this.authorize(dto.projectId, user)
    const existing = await this.entries.findOne({ where: { id, projectId: dto.projectId } })
    if (!existing) throw new NotFoundException('Fuel entry not found')
    if (existing.voidedAt) throw new BadRequestException('A voided entry cannot be changed')
    if (existing.fleetLogId) throw new BadRequestException('This came from a Fleet logbook entry. Change it there, so the two stay the same.')
    Object.assign(existing, await this.validate(dto))
    const saved = await this.entries.save(existing)
    return { entry: serialise(saved), warnings: await this.warningsFor(saved) }
  }

  async voidEntry(id: string, dto: FuelVoidDto, user: User) {
    await this.authorize(dto.projectId, user)
    const existing = await this.entries.findOne({ where: { id, projectId: dto.projectId } })
    if (!existing) throw new NotFoundException('Fuel entry not found')
    if (existing.voidedAt) throw new BadRequestException('This entry is already voided')
    existing.voidedAt = new Date()
    existing.voidedByName = user.name ?? null
    existing.voidReason = dto.reason.trim()
    return serialise(await this.entries.save(existing))
  }

  private async validate(dto: FuelEntryDto): Promise<Partial<FuelEntry>> {
    const date = dto.date.slice(0, 10)
    if (date > siteToday()) throw new BadRequestException('A fuel entry cannot be dated in the future')
    const litres = Number(dto.litres)
    if (!Number.isFinite(litres) || Math.abs(litres) > 100000) throw new BadRequestException('Enter the litres')
    const base = {
      projectId: dto.projectId, entryType: dto.entryType, date, remarks: text(dto.remarks), photoUrl: text(dto.photoUrl),
      rate: null, amount: null, supplier: null, billNo: null, machineId: null, operator: null, meterReading: null,
    } as Partial<FuelEntry>

    if (dto.entryType === 'adjustment') {
      if (litres === 0) throw new BadRequestException('Enter how many litres the stock is out by')
      if (!base.remarks) throw new BadRequestException('Say why the stock is being adjusted, for example "Opening stock" or "Stock check on 30 Nov"')
      return { ...base, fuelType: dto.fuelType ?? 'diesel', litres }
    }
    if (litres <= 0) throw new BadRequestException('Enter the litres')

    if (dto.entryType === 'receipt') {
      let rate = n(dto.rate), amount = n(dto.amount)
      if (rate !== null && amount === null) amount = Math.round(rate * litres * 100) / 100
      if (amount !== null && rate === null) rate = Math.round((amount / litres) * 100) / 100
      return { ...base, fuelType: dto.fuelType ?? 'diesel', litres, rate, amount, supplier: text(dto.supplier), billNo: text(dto.billNo) }
    }

    const machine = dto.machineId ? await this.machines.findOne({ where: { id: dto.machineId, projectId: dto.projectId } }) : null
    if (!machine) throw new BadRequestException('Choose the machine the fuel went into')
    if (!machine.active) throw new BadRequestException(`${machine.name} is marked as no longer on site`)
    return {
      ...base, fuelType: machine.fuelType, litres, machineId: machine.id,
      operator: text(dto.operator) ?? machine.operator, meterReading: n(dto.meterReading),
    }
  }

  /** What a person should know about the entry they just saved. None of these stop the save. */
  private async warningsFor(saved: FuelEntry): Promise<FuelEntryWarning[]> {
    const [all, machines] = await Promise.all([
      this.entries.find({ where: { projectId: saved.projectId, fuelType: saved.fuelType, voidedAt: IsNull() } }),
      this.machines.find({ where: { projectId: saved.projectId } }),
    ])
    const rows = runLedger(all.map(serialise), machines.map(machineInput))
    const warnings: FuelEntryWarning[] = []
    const negative = rows.find(r => r.entry.date >= saved.date && r.balance < 0)
    if (negative) {
      warnings.push({ kind: 'negative_stock', message: `${saved.fuelType === 'petrol' ? 'Petrol' : 'Diesel'} stock goes to ${litresText(negative.balance)} on ${negative.entry.date}. A purchase may not have been entered, or an issue is wrong.` })
    }
    if (saved.entryType === 'issue' && saved.machineId) {
      const same = rows.filter(r => r.entry.id !== saved.id && r.entry.entryType === 'issue' && r.machineId === saved.machineId && r.entry.date === saved.date && Number(r.entry.litres) === Number(saved.litres))
      if (same.length) warnings.push({ kind: 'possible_duplicate', message: `${litresText(Number(saved.litres))} for this machine is already recorded on ${saved.date}${same.some(r => r.entry.fleetLogId) ? ' through the Fleet logbook' : ''}. If it is the same fill, void one of them.` })
      const reading = n(saved.meterReading)
      if (reading !== null) {
        const mine = rows.filter(r => r.machineId === saved.machineId && r.entry.entryType === 'issue' && n(r.entry.meterReading) !== null)
        const at = mine.findIndex(r => r.entry.id === saved.id)
        const previous = at > 0 ? Number(mine[at - 1].entry.meterReading) : null
        if (previous !== null && reading < previous) warnings.push({ kind: 'meter_backwards', message: `The meter reading ${reading} is lower than the last one, ${previous}. Check the reading, or note it if the meter was changed.` })
      }
    }
    return warnings
  }

  // ─── Machines ─────────────────────────────────────────────────────────────

  async createMachine(dto: FuelMachineDto, user: User) {
    await this.authorize(dto.projectId, user)
    return this.machines.save(this.machines.create(await this.machineData(dto, null)))
  }

  async updateMachine(id: string, dto: FuelMachineDto, user: User) {
    await this.authorize(dto.projectId, user)
    const existing = await this.machines.findOne({ where: { id, projectId: dto.projectId } })
    if (!existing) throw new NotFoundException('Machine not found')
    Object.assign(existing, await this.machineData(dto, id))
    return this.machines.save(existing)
  }

  private async machineData(dto: FuelMachineDto, id: string | null): Promise<Partial<FuelMachine>> {
    const name = dto.name.trim()
    const others = await this.machines.find({ where: { projectId: dto.projectId } })
    if (others.some(m => m.id !== id && normaliseName(m.name) === normaliseName(name))) throw new BadRequestException(`${name} is already on the list`)
    if (dto.assetId) {
      const found = await this.machines.query('SELECT 1 FROM office_assets WHERE id = $1 AND project_id = $2', [dto.assetId, dto.projectId])
      if (!found.length) throw new BadRequestException('That asset is not in this project\'s register')
    }
    const hired = dto.ownership === 'hired'
    return {
      projectId: dto.projectId, name, kind: text(dto.kind), ownership: dto.ownership,
      ownerName: hired ? text(dto.ownerName) : null, assetId: hired ? null : dto.assetId ?? null,
      operator: text(dto.operator), fuelType: dto.fuelType, meterUnit: dto.meterUnit,
      logbookNames: text(dto.logbookNames), active: dto.active ?? true,
    }
  }

  // ─── The Fleet logbook's "Diesel issued" ──────────────────────────────────

  /**
   * Diesel typed into a Fleet logbook entry is an issue from the store, so it
   * is kept as one: the same record, moved with the logbook entry, never a
   * second copy to fall out of step.
   *
   * Logbook entries dated before the register's first entry for the project
   * are left alone: they predate the stock count, and pulling them in would
   * take stock below zero.
   */
  async syncFromFleetLog(log: FleetLog, manager?: EntityManager) {
    const entries = manager ? manager.getRepository(FuelEntry) : this.entries
    const machines = manager ? manager.getRepository(FuelMachine) : this.machines
    const litres = Number(log.fuelLitres) || 0
    const linked = await entries.findOne({ where: { fleetLogId: log.id } })
    if (linked?.voidedAt) return null // voided on purpose in the register; do not bring it back
    if (litres <= 0) {
      if (linked) await entries.save(Object.assign(linked, { voidedAt: new Date(), voidedByName: log.reportedBy ?? null, voidReason: 'Diesel taken off the Fleet logbook entry' }))
      return null
    }
    if (!linked) {
      const first = await entries.findOne({ where: { projectId: log.projectId, voidedAt: IsNull() }, order: { date: 'ASC' } })
      if (!first || log.date < first.date) return null
    }
    const name = log.logType === 'plant' ? log.machineId : log.vehicle
    const machine = matchLogbookName(name, await machines.find({ where: { projectId: log.projectId } }))
    const meter = log.logType === 'plant' ? n(log.hourStart) : n(log.meterStart)
    const data: Partial<FuelEntry> = {
      projectId: log.projectId, entryType: 'issue', fuelType: machine?.fuelType ?? 'diesel', date: log.date, litres,
      machineId: machine?.id ?? null, logbookMachine: text(name), operator: text(log.operator ?? log.driver) ?? machine?.operator ?? null,
      meterReading: meter, fleetLogId: log.id, remarks: 'Recorded through the Fleet logbook',
    }
    if (linked) return entries.save(Object.assign(linked, data))
    return entries.save(entries.create({ ...data, recordedByName: log.reportedBy ?? null }))
  }

  async voidForFleetLog(fleetLogId: string, manager?: EntityManager) {
    const entries = manager ? manager.getRepository(FuelEntry) : this.entries
    const linked = await entries.findOne({ where: { fleetLogId } })
    if (!linked || linked.voidedAt) return
    await entries.save(Object.assign(linked, { voidedAt: new Date(), voidReason: 'The Fleet logbook entry was deleted' }))
  }
}
