import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { OmLog, EFFLUENT_LIMITS } from './om-log.entity'
import { OmEvent, OmEventType, OmEventStatus, BREAKDOWN_GRACE_HOURS, BREAKDOWN_PENALTY_PER_DAY } from './om-event.entity'

// Which effluent readings breach the discharge norms (nulls ignored).
export function effluentBreaches(l: Partial<OmLog>): string[] {
  const b: string[] = []
  const n = (v: any) => (v == null ? null : Number(v))
  if (n(l.outBod) != null && n(l.outBod)! > EFFLUENT_LIMITS.outBod) b.push('BOD')
  if (n(l.outCod) != null && n(l.outCod)! > EFFLUENT_LIMITS.outCod) b.push('COD')
  if (n(l.outTss) != null && n(l.outTss)! > EFFLUENT_LIMITS.outTss) b.push('TSS')
  if (n(l.outPh) != null && (n(l.outPh)! < EFFLUENT_LIMITS.outPhMin || n(l.outPh)! > EFFLUENT_LIMITS.outPhMax)) b.push('pH')
  if (n(l.outFecalColiform) != null && n(l.outFecalColiform)! > EFFLUENT_LIMITS.outFecalColiform) b.push('Fecal Coliform')
  if (n(l.outAmmN) != null && n(l.outAmmN)! > EFFLUENT_LIMITS.outAmmN) b.push('NH3-N')
  if (n(l.outTotalN) != null && n(l.outTotalN)! > EFFLUENT_LIMITS.outTotalN) b.push('Total N')
  if (n(l.outTotalP) != null && n(l.outTotalP)! > EFFLUENT_LIMITS.outTotalP) b.push('Total P')
  return b
}

function downtimeHours(e: OmEvent): number {
  const end = e.endAt ? new Date(e.endAt).getTime() : Date.now()
  return Math.max(0, (end - new Date(e.startAt).getTime()) / 3600000)
}
function breakdownPenalty(e: OmEvent): number {
  if (e.type !== OmEventType.BREAKDOWN) return 0
  const over = downtimeHours(e) - BREAKDOWN_GRACE_HOURS
  if (over <= 0) return 0
  return Math.ceil(over / 24) * BREAKDOWN_PENALTY_PER_DAY
}

@Injectable()
export class OmService {
  constructor(
    @InjectRepository(OmLog)   private readonly logRepo: Repository<OmLog>,
    @InjectRepository(OmEvent) private readonly evtRepo: Repository<OmEvent>,
  ) {}

  // ── Process logs ──────────────────────────────────────────────────────────
  async createLog(data: Partial<OmLog>): Promise<OmLog> {
    return this.logRepo.save(this.logRepo.create(data))
  }
  async updateLog(id: string, data: Partial<OmLog>): Promise<OmLog> {
    await this.logRepo.update(id, data)
    const l = await this.logRepo.findOne({ where: { id } })
    if (!l) throw new NotFoundException('Log not found')
    return l
  }
  async deleteLog(id: string) { return this.logRepo.delete(id) }
  async listLogs(p: { projectId?: string; from?: string; to?: string }) {
    const qb = this.logRepo.createQueryBuilder('l').orderBy('l.date', 'DESC')
    if (p.projectId) qb.andWhere('l.projectId = :pid', { pid: p.projectId })
    if (p.from) qb.andWhere('l.date >= :from', { from: p.from })
    if (p.to) qb.andWhere('l.date <= :to', { to: p.to })
    const rows = await qb.getMany()
    return rows.map(l => ({ ...l, breaches: effluentBreaches(l) }))
  }

  // ── Events (breakdown / maintenance) ──────────────────────────────────────
  async createEvent(data: Partial<OmEvent>): Promise<OmEvent> {
    return this.evtRepo.save(this.evtRepo.create(data))
  }
  async updateEvent(id: string, data: Partial<OmEvent>): Promise<OmEvent> {
    await this.evtRepo.update(id, data)
    const e = await this.evtRepo.findOne({ where: { id } })
    if (!e) throw new NotFoundException('Event not found')
    return e
  }
  async deleteEvent(id: string) { return this.evtRepo.delete(id) }
  async listEvents(p: { projectId?: string; type?: string; status?: string }) {
    const qb = this.evtRepo.createQueryBuilder('e').orderBy('e.startAt', 'DESC')
    if (p.projectId) qb.andWhere('e.projectId = :pid', { pid: p.projectId })
    if (p.type) qb.andWhere('e.type = :t', { t: p.type })
    if (p.status) qb.andWhere('e.status = :s', { s: p.status })
    const rows = await qb.getMany()
    return rows.map(e => ({ ...e, downtimeHours: +downtimeHours(e).toFixed(1), penalty: breakdownPenalty(e) }))
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────
  async dashboard(projectId?: string) {
    const logs = await this.logRepo.find(projectId ? { where: { projectId } } : {})
    const events = await this.evtRepo.find(projectId ? { where: { projectId } } : {})

    const withEff = logs.filter(l => l.outBod != null || l.outCod != null || l.outTss != null)
    const compliant = withEff.filter(l => effluentBreaches(l).length === 0).length
    const avg = (key: keyof OmLog) => {
      const vals = logs.map(l => l[key]).filter(v => v != null).map(Number)
      return vals.length ? +(vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(1) : null
    }
    const sum = (key: keyof OmLog) => logs.reduce((s, l) => s + (Number(l[key]) || 0), 0)

    const breakdowns = events.filter(e => e.type === OmEventType.BREAKDOWN)
    const openBreakdowns = breakdowns.filter(e => e.status === OmEventStatus.OPEN)
    const totalDowntime = breakdowns.reduce((s, e) => s + downtimeHours(e), 0)
    const penaltyExposure = breakdowns.reduce((s, e) => s + breakdownPenalty(e), 0)

    return {
      logDays: logs.length,
      effluentDays: withEff.length,
      compliantDays: compliant,
      compliancePct: withEff.length ? Math.round((compliant / withEff.length) * 100) : null,
      avgOutBod: avg('outBod'), avgOutCod: avg('outCod'), avgOutTss: avg('outTss'),
      avgInflow: avg('inflowMld'), avgOutflow: avg('outflowMld'),
      totalPowerKwh: +sum('powerKwh').toFixed(0),
      totalSludgeM3: +sum('sludgeM3').toFixed(1),
      totalDgHours: +sum('dgHours').toFixed(0),
      openBreakdowns: openBreakdowns.length,
      totalBreakdowns: breakdowns.length,
      totalDowntimeHours: +totalDowntime.toFixed(1),
      breakdownPenaltyExposure: penaltyExposure,
      limits: EFFLUENT_LIMITS,
    }
  }
}
