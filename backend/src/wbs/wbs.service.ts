import { BadRequestException, ConflictException, Injectable, NotFoundException, Optional } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { WbsTask, TaskStatus, Dependency, DepType } from './wbs-task.entity'
import { WbsBaseline, BaselineActivity } from './wbs-baseline.entity'
import { LiaisonFile, LiaisonStatus } from '../liaison/liaison-file.entity'
import { SiteDiary } from '../diary/diary.entity'
import { Project } from '../projects/project.entity'
import { PertRiskEngineService } from './services/pert-risk-engine.service'
import { DayClock, isCalendarId, CALENDARS } from './cpm/calendar'
import { schedule, SchedActivity, ScheduleResult, ScheduleIssue } from './cpm/scheduler'

// ── Contract dates ────────────────────────────────────────────────────────
// The project record is the source of truth. These are used only when it has
// no start or end date, and the schedule says so in its issues: the product
// has carried two different completion dates (07 May 2028 here, 27 Mar 2028 on
// the PM dashboard and Compliance page), and only the tender and the agreement
// can say which is right.
export const DEFAULT_CONTRACT_START = '2025-11-07'
export const DEFAULT_CONTRACT_COMPLETION = '2028-05-07'

export interface ContractDates { start: string; completion: string; source: 'project' | 'default' }

// ── Seed ──────────────────────────────────────────────────────────────────
// A placeholder programme, not the contract programme — that comes from the
// four-pass rebuild (activity register → durations → logic → CPM). What it gets
// right that the old seed did not: durations and logic are the input and dates
// are only the plan to compare against; the trial run and O&M sit after
// completion, outside the 30 months; and completion waits for every branch.
type SeedTask = Partial<WbsTask> & { wbsCode: string; title: string; dependencies?: Dependency[] }
const FS = (code: string, lag = 0): Dependency => ({ code, type: 'FS', lag })
const SS = (code: string, lag: number): Dependency => ({ code, type: 'SS', lag })

const SEED_TASKS: SeedTask[] = [
  { wbsCode: 'CC', title: 'MILESTONE: Contract Commencement (Day 0)', level: 1, sortOrder: 0, plannedStart: '2025-11-07', plannedEnd: '2025-11-07', plannedDuration: 0, isMilestone: true },
  { wbsCode: '1',  title: 'Survey, Design & Vetting',          level: 1, sortOrder: 1,  plannedStart: '2025-11-07', plannedEnd: '2026-01-31', plannedDuration: 86,  paymentPct: 5,   paymentMilestone: 'Survey & Vetting of Design (5%)', dependencies: [FS('CC')] },
  { wbsCode: '2',  title: 'Sewer Network — Civil Works',       level: 1, sortOrder: 2,  plannedStart: '2026-02-01', plannedEnd: '2027-03-31', plannedDuration: 0,   paymentPct: 35,  paymentMilestone: 'Pipe Laying & Civil Network (35%)' },
  { wbsCode: '3',  title: 'IPS Construction — Civil',          level: 1, sortOrder: 3,  plannedStart: '2026-02-01', plannedEnd: '2027-03-31', plannedDuration: 0,   paymentPct: 16,  paymentMilestone: 'Civil Structure Work (16%)' },
  { wbsCode: '4',  title: 'STP Construction',                  level: 1, sortOrder: 4,  plannedStart: '2026-02-01', plannedEnd: '2027-06-30', plannedDuration: 514, paymentPct: 18,  paymentMilestone: 'STP Civil Structure (18%)', dependencies: [FS('1')] },
  { wbsCode: '5',  title: 'Rising Mains & Appurtenances',      level: 1, sortOrder: 5,  plannedStart: '2026-04-01', plannedEnd: '2027-03-31', plannedDuration: 365, paymentPct: 5,   paymentMilestone: 'Rising Main Laying (5%)', dependencies: [FS('1')] },
  { wbsCode: '6',  title: 'E&M Works — IPS & STP',             level: 1, sortOrder: 6,  plannedStart: '2026-10-01', plannedEnd: '2027-10-31', plannedDuration: 396, paymentPct: 14,  paymentMilestone: 'E&M Equipment & SCADA (14%)', dependencies: [FS('3'), SS('4', 240)] },
  { wbsCode: '7',  title: 'Road Reinstatement',                level: 1, sortOrder: 7,  plannedStart: '2026-07-01', plannedEnd: '2028-01-31', plannedDuration: 400, paymentPct: 2,   paymentMilestone: 'Permanent Road Reinstatement (2%)', dependencies: [SS('2.1', 120)] },
  { wbsCode: '8',  title: 'Testing & Commissioning',           level: 1, sortOrder: 8,  plannedStart: '2027-10-01', plannedEnd: '2028-03-31', plannedDuration: 182, paymentPct: 2.5, paymentMilestone: 'Sectional Flow Testing (2.5%)', dependencies: [FS('6'), FS('2'), FS('5')] },
  { wbsCode: 'M6', title: 'MILESTONE: Completion (30 months)', level: 1, sortOrder: 9,  plannedStart: '2028-05-07', plannedEnd: '2028-05-07', plannedDuration: 0, isMilestone: true, paymentMilestone: 'Completion Certificate by UEED', dependencies: [FS('8'), FS('7'), FS('4')] },
  { wbsCode: '9',  title: 'Free Trial Run (6 Months)',         level: 1, sortOrder: 10, plannedStart: '2028-05-08', plannedEnd: '2028-11-07', plannedDuration: 184, paymentPct: 2.5, paymentMilestone: 'Trial Run Completion (2.5%)', scheduleScope: 'post_completion', dependencies: [FS('M6')] },
  { wbsCode: '10', title: 'O&M Period (5 Years)',              level: 1, sortOrder: 11, plannedStart: '2028-11-08', plannedEnd: '2033-11-07', plannedDuration: 1826, paymentPct: 0,  paymentMilestone: 'O&M (Billed Separately)', scheduleScope: 'post_completion', dependencies: [FS('9')] },

  { wbsCode: '2.1', title: '200mm dia RCC NP3 Pipes (184,793m)', level: 2, sortOrder: 12, parentId: '2', plannedStart: '2026-02-01', plannedEnd: '2027-01-31', plannedDuration: 365, responsible: 'Civil Team', dependencies: [FS('1')] },
  { wbsCode: '2.2', title: '300-500mm dia Pipes',                level: 2, sortOrder: 13, parentId: '2', plannedStart: '2026-03-01', plannedEnd: '2027-02-28', plannedDuration: 365, responsible: 'Civil Team', dependencies: [FS('1')] },
  { wbsCode: '2.3', title: '700-1000mm dia Pipes',               level: 2, sortOrder: 14, parentId: '2', plannedStart: '2026-05-01', plannedEnd: '2027-03-31', plannedDuration: 334, responsible: 'Civil Team', dependencies: [FS('1')] },
  { wbsCode: '2.4', title: 'RCC Manholes (3,728 Nos)',           level: 2, sortOrder: 15, parentId: '2', plannedStart: '2026-02-01', plannedEnd: '2027-03-31', plannedDuration: 423, responsible: 'Civil Team', dependencies: [SS('2.1', 7)] },
  { wbsCode: '2.5', title: 'Masonry Chambers (15,814 Nos)',      level: 2, sortOrder: 16, parentId: '2', plannedStart: '2026-03-01', plannedEnd: '2027-03-31', plannedDuration: 395, responsible: 'Civil Team', dependencies: [SS('2.1', 14)] },
  { wbsCode: '3.1', title: 'IPS-1 at Node 102',                  level: 2, sortOrder: 17, parentId: '3', plannedStart: '2026-02-01', plannedEnd: '2026-11-30', plannedDuration: 302, responsible: 'Civil Team', dependencies: [FS('1')] },
  { wbsCode: '3.2', title: 'IPS-3 at Node 1053',                 level: 2, sortOrder: 18, parentId: '3', plannedStart: '2026-03-01', plannedEnd: '2027-02-28', plannedDuration: 365, responsible: 'Civil Team', dependencies: [FS('1')] },
  { wbsCode: '3.3', title: 'IPS-5 at Node 1532',                 level: 2, sortOrder: 19, parentId: '3', plannedStart: '2026-05-01', plannedEnd: '2027-03-31', plannedDuration: 334, responsible: 'Civil Team', dependencies: [FS('1')] },
  { wbsCode: '3.4', title: 'IPS-9 at Node 4011 (Largest)',       level: 2, sortOrder: 20, parentId: '3', plannedStart: '2026-03-01', plannedEnd: '2027-03-31', plannedDuration: 395, responsible: 'Civil Team', dependencies: [FS('1')] },
  { wbsCode: '3.5', title: 'MPS at Habak',                       level: 2, sortOrder: 21, parentId: '3', plannedStart: '2026-08-01', plannedEnd: '2027-03-31', plannedDuration: 242, responsible: 'Civil Team', dependencies: [FS('1')] },

  { wbsCode: 'M1', title: 'MILESTONE: Design Approval from UEED',  level: 1, sortOrder: 22, plannedStart: '2026-01-31', plannedEnd: '2026-01-31', plannedDuration: 0, isMilestone: true, paymentMilestone: 'Design Approval', dependencies: [FS('1')] },
  { wbsCode: 'M4', title: 'MILESTONE: All IPS Civil Complete',     level: 1, sortOrder: 23, plannedStart: '2027-03-31', plannedEnd: '2027-03-31', plannedDuration: 0, isMilestone: true, paymentMilestone: 'Civil Completion', dependencies: [FS('3')] },
  { wbsCode: 'M5', title: 'MILESTONE: STP Commissioned',           level: 1, sortOrder: 24, plannedStart: '2028-03-31', plannedEnd: '2028-03-31', plannedDuration: 0, isMilestone: true, paymentMilestone: 'STP Testing & Commissioning', dependencies: [FS('8')] },
]

// Tender Schedule of Payments (Tenderdocument Dal Lake.pdf) — contract weights
// of the level-1 packages, 100% in total.
export const TENDER_WEIGHTS: Record<string, number> = {
  '1': 5.0, '2': 35.0, '3': 16.0, '4': 18.0, '5': 5.0, '6': 14.0, '7': 2.0, '8': 2.5, '9': 2.5,
}

// Clause 16.3 — share of the work required at each fraction of the contract time.
const CLAUSE_16_3 = [
  { stage: 'Stage 1 (1/4 Time)', fraction: 0.25, targetProgressPct: 12.5, rule: '1/8th of work' },
  { stage: 'Stage 2 (1/2 Time)', fraction: 0.5,  targetProgressPct: 37.5, rule: '3/8ths of work' },
  { stage: 'Stage 3 (3/4 Time)', fraction: 0.75, targetProgressPct: 75.0, rule: '3/4ths of work' },
  { stage: 'Stage 4 (Full Completion)', fraction: 1, targetProgressPct: 100.0, rule: '100% of work' },
]

interface Built {
  tasks: WbsTask[]
  result: ScheduleResult
  clock: DayClock
  dates: ContractDates
  dataDate: number
  issues: ScheduleIssue[]
}

/** What the API sends for one activity: the stored row plus the live forecast. */
export type ScheduledTask = WbsTask & {
  forecastStart: string | null
  forecastFinish: string | null
  isSummary: boolean
  scheduleStatus: string | null
  drivenBy: string | null
  remainingDuration: number | null
}

@Injectable()
export class WbsService {
  private readonly riskEngine: PertRiskEngineService

  constructor(
    @InjectRepository(WbsTask)     private repo: Repository<WbsTask>,
    @InjectRepository(LiaisonFile) private liaisonRepo: Repository<LiaisonFile>,
    @Optional() @InjectRepository(SiteDiary) private diaryRepo?: Repository<SiteDiary>,
    @Optional() riskEngine?: PertRiskEngineService,
    @Optional() @InjectRepository(Project) private projectRepo?: Repository<Project>,
    @Optional() @InjectRepository(WbsBaseline) private baselineRepo?: Repository<WbsBaseline>,
  ) {
    this.riskEngine = riskEngine ?? new PertRiskEngineService()
  }

  // ── Helpers ────────────────────────────────────────────────────────────
  private resolveDeps(t: WbsTask): Dependency[] {
    if (Array.isArray(t.dependencies) && t.dependencies.length > 0) {
      return t.dependencies
        .filter(d => d && d.code)
        .map(d => ({ code: String(d.code).trim(), type: (d.type ?? 'FS') as DepType, lag: Number(d.lag) || 0 }))
    }
    return (t.predecessors ?? '')
      .split(',').map(s => s.trim()).filter(Boolean)
      .map(code => ({ code, type: 'FS' as DepType, lag: 0 }))
  }

  private depsToString(deps?: Dependency[]): string {
    if (!Array.isArray(deps)) return ''
    return deps
      .filter(d => d && d.code)
      .map(d => {
        const type = (d.type ?? 'FS') as string
        const lag = Number(d.lag) || 0
        const suffix = type === 'FS' && lag === 0 ? '' : `(${type}${lag ? (lag > 0 ? '+' + lag : lag) : ''})`
        return `${d.code}${suffix}`
      })
      .join(', ')
  }

  /** Inclusive day count between two ISO dates — how long a plan says a task takes. */
  static durationFromDates(start?: string | null, end?: string | null): number {
    if (!start || !end) return 0
    const ms = Date.parse(String(end).slice(0, 10)) - Date.parse(String(start).slice(0, 10))
    return Number.isFinite(ms) ? Math.max(0, Math.round(ms / 86_400_000) + 1) : 0
  }

  /**
   * The duration the CPM schedules on. A stored duration wins; a task created
   * with only dates (as the app's Add form used to send) gets the span of its
   * dates rather than zero; a milestone is always zero.
   */
  private durationOf(t: WbsTask): number {
    if (t.isMilestone && !(Number(t.plannedDuration) > 0)) return 0
    const stored = Math.round(Number(t.plannedDuration) || 0)
    if (stored > 0) return stored
    return t.isMilestone ? 0 : WbsService.durationFromDates(t.plannedStart, t.plannedEnd)
  }

  async contractDates(projectId: string): Promise<ContractDates> {
    const p = this.projectRepo ? await this.projectRepo.findOne({ where: { id: projectId } }).catch(() => null) : null
    const start = p?.startDate ? String(p.startDate).slice(0, 10) : null
    const end = p?.endDate ? String(p.endDate).slice(0, 10) : null
    if (start && end) return { start, completion: end, source: 'project' }
    return { start: start ?? DEFAULT_CONTRACT_START, completion: end ?? DEFAULT_CONTRACT_COMPLETION, source: 'default' }
  }

  private todayIso(): string {
    return new Date().toISOString().slice(0, 10)
  }

  // ── Build the schedule (no writes) ─────────────────────────────────────
  private async build(projectId: string): Promise<Built> {
    const tasks = await this.list(projectId)
    const dates = await this.contractDates(projectId)
    const clock = new DayClock(dates.start)
    const today = this.todayIso()
    const dataDate = Math.max(0, clock.index(today))
    const issues: ScheduleIssue[] = []

    if (dates.source === 'default') {
      issues.push({
        severity: 'warning', rule: 'contract-dates-unset',
        message: `The project record has no contract start or completion date, so the schedule uses ${dates.start} → ${dates.completion}. The PM dashboard and Compliance page state 27 Sep 2025 → 27 Mar 2028. Set the dates on the project from the tender and the agreement; every float figure and every day of liquidated damages is measured from them.`,
      })
    }

    // External approval floors: an activity gated by a clearance cannot start
    // before the clearance exists.
    const floors = new Map<string, number[]>()
    const liaisonFiles = await this.liaisonRepo.find({ where: { projectId } })
    const settledStatuses = [LiaisonStatus.APPROVED, LiaisonStatus.CLOSED]
    for (const f of liaisonFiles) {
      if (!f.linkedWbsCode) continue
      // An actual date means the clearance landed, whatever the status says.
      // Settled with no date imposes nothing. Pending waits for its expected
      // date, or for today once that date has passed.
      const settled = settledStatuses.includes(f.currentStatus)
      let floorIso: string | null = null
      if (f.actualDate) floorIso = String(f.actualDate).slice(0, 10)
      else if (settled) floorIso = null
      else if (f.expectedDate) floorIso = String(f.expectedDate).slice(0, 10) > today ? String(f.expectedDate).slice(0, 10) : today
      else {
        floorIso = today
        issues.push({
          severity: 'warning', rule: 'approval-undated', activity: f.linkedWbsCode,
          message: `Approval ${f.fileNumber ?? ''} gates ${f.linkedWbsCode} and is pending with no expected date. It is held at today; give it an expected date.`,
        })
      }
      if (floorIso === null) continue
      const list = floors.get(f.linkedWbsCode) ?? []
      list.push(clock.index(floorIso))
      floors.set(f.linkedWbsCode, list)
    }

    // A parent link may hold either the parent's code or its id.
    const codeById = new Map(tasks.map(t => [t.id, t.wbsCode]))
    const acts: SchedActivity[] = tasks.map(t => {
      const duration = this.durationOf(t)
      const pct = Number(t.progressPct) || 0
      const status = t.status
      let actualStart = t.actualStart ? clock.index(String(t.actualStart).slice(0, 10)) : null
      let actualFinish = t.actualEnd ? clock.index(String(t.actualEnd).slice(0, 10)) + (duration > 0 ? 1 : 0) : null

      // Marked complete, or 100%, without an actual finish: finish it on its
      // planned end, or today if that is still in the future.
      if (actualFinish === null && (status === TaskStatus.COMPLETED || pct >= 100)) {
        const end = t.plannedEnd ? Math.min(clock.index(String(t.plannedEnd).slice(0, 10)), dataDate - 1) : dataDate - 1
        actualFinish = end + (duration > 0 ? 1 : 0)
        issues.push({ severity: 'info', rule: 'complete-without-actuals', activity: t.wbsCode, message: 'Marked complete with no actual finish date; its planned finish is used. Record the actual dates.' })
      }
      // Started, by progress or status, without an actual start.
      if (actualStart === null && (actualFinish !== null || pct > 0 || status === TaskStatus.IN_PROGRESS)) {
        actualStart = t.plannedStart ? Math.min(clock.index(String(t.plannedStart).slice(0, 10)), dataDate) : dataDate
        if (actualFinish === null) issues.push({ severity: 'info', rule: 'progress-without-actuals', activity: t.wbsCode, message: 'Shows progress but has no actual start date; its planned start is used. Record the actual start.' })
      }
      const parent = t.parentId ? (codeById.get(t.parentId) ?? t.parentId) : null
      return {
        code: t.wbsCode,
        title: t.title,
        duration,
        isMilestone: !!t.isMilestone,
        parentCode: parent,
        links: this.resolveDeps(t),
        calendar: isCalendarId(t.calendar) ? t.calendar : 'seven_day',
        scope: t.scheduleScope === 'post_completion' ? 'post_completion' : 'contract',
        constraint: t.constraintType && t.constraintDate
          ? { type: t.constraintType, day: clock.index(String(t.constraintDate).slice(0, 10)) + (t.constraintType === 'FNLT' && duration > 0 ? 1 : 0) }
          : null,
        floors: floors.get(t.wbsCode) ?? [],
        actualStart,
        actualFinish,
        percentComplete: pct,
        plannedStart: t.plannedStart ? clock.index(String(t.plannedStart).slice(0, 10)) : null,
      }
    })

    const result = schedule(acts, clock, { dataDate, mustFinishBy: clock.index(dates.completion) + 1 })
    return { tasks, result, clock, dates, dataDate, issues: [...issues, ...result.issues] }
  }

  /** Write a computed schedule onto the task objects (not to the database). */
  private overlay(built: Built): ScheduledTask[] {
    const { tasks, result, clock } = built
    return tasks.map(t => {
      const s = result.activities.get(t.wbsCode)
      if (s) {
        t.earliestStart = s.es; t.earliestFinish = s.ef
        t.latestStart = s.ls;   t.latestFinish = s.lf
        t.totalFloat = s.totalFloat; t.freeFloat = s.freeFloat
        t.isCritical = s.critical
        // Slippage of the forecast against the plan — derived, never typed.
        if (t.plannedEnd) {
          const dur = this.durationOf(t)
          const plannedEf = clock.index(String(t.plannedEnd).slice(0, 10)) + (dur > 0 ? 1 : 0)
          t.delayDays = Math.max(0, s.ef - plannedEf)
        }
      }
      return Object.assign(t, {
        forecastStart: s ? clock.iso(this.displayStart(s)) : null,
        forecastFinish: s ? clock.iso(s.ef > s.es ? s.ef - 1 : this.displayStart(s)) : null,
        isSummary: s?.isSummary ?? false,
        scheduleStatus: s?.status ?? null,
        drivenBy: s?.drivenBy ?? null,
        remainingDuration: s?.remaining ?? null,
      }) as ScheduledTask
    })
  }

  /** Call after overlay(): winter exposure is judged on forecast dates, not on the plan. */
  /**
   * The calendar date to show for an activity's start. A milestone reached
   * when its predecessor finishes is shown on the day that work ends — how
   * this programme has always dated its milestones — not on the next morning.
   */
  private displayStart(s: { es: number; ef: number; drivenBy: string; isSummary: boolean }): number {
    const finishMilestone = s.ef === s.es && !s.isSummary && s.es > 0
      && !['project-start', 'data-date', 'approval', 'constraint', 'actual'].includes(s.drivenBy)
    return finishMilestone ? s.es - 1 : s.es
  }

  private computePert(tasks: WbsTask[], gated: Set<string>) {
    for (const t of tasks) {
      const M = this.durationOf(t)
      const f = t as Partial<ScheduledTask>
      const view = { ...t, plannedStart: f.forecastStart ?? t.plannedStart, plannedEnd: f.forecastFinish ?? t.plannedEnd } as WbsTask
      const risk = this.riskEngine.assessTaskRisk(view, gated.has(t.wbsCode))
      // Winter-restricted work already has its stoppage in the calendar; do not
      // widen it a second time for the same winter.
      const beta = t.calendar === 'winter_restricted' && risk.isWinterScheduled ? risk.betaDyn / 1.3 : risk.betaDyn
      const O = +(M * risk.alphaDyn).toFixed(2)
      const P = +(M * beta).toFixed(2)
      const TE = +((O + 4 * M + P) / 6).toFixed(2)
      const V = +(((P - O) / 6) ** 2).toFixed(4)
      t.optimisticDuration = O
      t.mostLikelyDuration = M
      t.pessimisticDuration = P
      t.expectedDuration = TE
      t.variance = V
      t.standardDeviation = +Math.sqrt(V).toFixed(4)
    }
  }

  // ── Read endpoints: compute, never write ──────────────────────────────
  async list(projectId: string) {
    return this.repo.find({ where: { projectId }, order: { sortOrder: 'ASC' } })
  }

  /** The activities with the live forecast laid over them. Nothing is saved. */
  async listScheduled(projectId: string): Promise<ScheduledTask[]> {
    const built = await this.build(projectId)
    const tasks = built.result.ok ? this.overlay(built) : built.tasks as ScheduledTask[]
    this.computePert(tasks, await this.gatedCodes(projectId))
    return tasks
  }

  async scheduleIssues(projectId: string) {
    const built = await this.build(projectId)
    return { ok: built.result.ok, issues: built.issues }
  }

  private async gatedCodes(projectId: string): Promise<Set<string>> {
    const files = await this.liaisonRepo.find({ where: { projectId } })
    return new Set(files.map(f => f.linkedWbsCode).filter(Boolean) as string[])
  }

  // ── Recalculate: the only path that saves the schedule ────────────────
  async recalculate(projectId: string) {
    const built = await this.build(projectId)
    if (built.result.ok) this.overlay(built)
    this.computePert(built.tasks, await this.gatedCodes(projectId))
    await this.repo.save(built.tasks)
    const { result, clock } = built
    return {
      ok: result.ok,
      critical: result.longestPath,
      projectDuration: result.forecastFinish,
      forecastFinish: result.forecastFinish === null ? null : clock.iso(result.forecastFinish - 1),
      contractVarianceDays: result.contractVariance,
      issues: built.issues,
    }
  }

  // ── Seed ────────────────────────────────────────────────────────────────
  async seed(projectId: string, force = false): Promise<{ seeded: number }> {
    if (force) {
      await this.repo.delete({ projectId })
    } else {
      const existing = await this.repo.count({ where: { projectId } })
      if (existing > 0) return { seeded: 0 }
    }
    const tasks = SEED_TASKS.map(t => this.repo.create({
      ...t,
      projectId,
      dependencies: t.dependencies ?? [],
      predecessors: this.depsToString(t.dependencies ?? []),
      scheduleScope: t.scheduleScope ?? 'contract',
      status: TaskStatus.NOT_STARTED,
      progressPct: 0,
    }))
    await this.repo.save(tasks)
    await this.recalculate(projectId)
    return { seeded: tasks.length }
  }

  // ── Phase 0: Land & Statutory Enabling ───────────────────────────────────
  // The pre-construction gates that delayed design and mobilisation. The DSP
  // seal (0.6) now holds site possession: previously nothing followed it, so
  // stretching it moved nothing and the delay KIPL most needs to claim for had
  // no effect on the programme.
  async addEnablingPhase(projectId: string): Promise<{ added: number }> {
    const exists = await this.repo.findOne({ where: { projectId, wbsCode: '0.1' } })
    if (exists) return { added: 0 }

    const P0: any[] = [
      { wbsCode: '0.1', title: 'Land Identification & Allotment Decision (UEED / DC / LCMA)', plannedStart: '2025-11-07', plannedEnd: '2025-11-21', plannedDuration: 14, responsible: 'Liaison', dependencies: [] },
      { wbsCode: '0.2', title: 'Statutory Land Transfer & Paperwork (Govt Land)',             plannedStart: '2025-11-22', plannedEnd: '2025-12-06', plannedDuration: 14, responsible: 'Liaison', dependencies: [FS('0.1')] },
      { wbsCode: '0.3', title: 'Tree Enumeration, Felling Clearance & Auction (Forest Dept + LCMA)', plannedStart: '2025-12-07', plannedEnd: '2026-01-05', plannedDuration: 30, responsible: 'Liaison', dependencies: [FS('0.2')] },
      { wbsCode: '0.4', title: 'Site Clearance, Ground-Improvement Enabling & Possession',    plannedStart: '2026-01-06', plannedEnd: '2026-01-20', plannedDuration: 14, responsible: 'Civil',   dependencies: [FS('0.3')] },
      { wbsCode: '0.5', title: 'Material Procurement / Quarrying Permissions',                plannedStart: '2025-11-22', plannedEnd: '2025-12-21', plannedDuration: 30, responsible: 'Liaison', dependencies: [FS('0.2')] },
      { wbsCode: '0.6', title: 'Enforcement Hold — Site Sealed by DSP (LCMA)',                plannedStart: '2026-01-06', plannedEnd: '2026-01-20', plannedDuration: 14, responsible: 'Liaison', dependencies: [FS('0.4')], eotApplied: true, delayReason: 'Site sealed by DSP enforcement (LCMA). Enter actual seal/release dates.' },
      { wbsCode: 'M0', title: 'MILESTONE: Site Handover / Possession to KIPL', plannedStart: '2026-01-20', plannedEnd: '2026-01-20', plannedDuration: 0, isMilestone: true, dependencies: [FS('0.4'), FS('0.5'), FS('0.6')] },
    ]
    const hasCommencement = !!(await this.repo.findOne({ where: { projectId, wbsCode: 'CC' } }))
    if (hasCommencement) { P0[0].dependencies = [FS('CC')] }

    let order = -100
    const rows: any[] = P0.map(t => ({
      ...t, projectId, level: 1, sortOrder: order++,
      status: TaskStatus.NOT_STARTED, progressPct: 0, scheduleScope: 'contract',
      predecessors: this.depsToString(t.dependencies),
    }))
    await this.repo.save(rows)

    // Survey & Design waits for possession; replace a bare commencement link.
    const t1 = await this.repo.findOne({ where: { projectId, wbsCode: '1' } })
    const t1deps = t1 ? this.resolveDeps(t1) : []
    if (t1 && (t1deps.length === 0 || (t1deps.length === 1 && t1deps[0].code === 'CC'))) {
      t1.dependencies = [FS('M0')] as any
      t1.predecessors = 'M0'
      await this.repo.save(t1)
    }

    await this.recalculate(projectId)
    return { added: rows.length }
  }

  // ── Write endpoints ───────────────────────────────────────────────────
  private normaliseWrite(data: any, existing?: WbsTask) {
    for (const k of ['actualStart', 'actualEnd', 'constraintDate']) {
      if (data[k] === '') data[k] = null
    }
    if (data.constraintType === '') data.constraintType = null
    if (Array.isArray(data.dependencies)) {
      data.dependencies = data.dependencies
        .filter((d: any) => d && String(d.code ?? '').trim())
        .map((d: any) => ({ code: String(d.code).trim(), type: d.type ?? 'FS', lag: Math.round(Number(d.lag) || 0) }))
      data.predecessors = this.depsToString(data.dependencies)
    }
    if (data.calendar !== undefined && !isCalendarId(data.calendar)) {
      throw new BadRequestException(`Calendar must be one of: ${Object.keys(CALENDARS).join(', ')}`)
    }
    // Duration is the input. A write that gives only dates gets their span
    // rather than zero — which is what the Add form used to produce.
    const isMilestone = data.isMilestone ?? existing?.isMilestone ?? false
    if (data.plannedDuration === undefined || data.plannedDuration === null || data.plannedDuration === '') {
      const start = data.plannedStart ?? existing?.plannedStart
      const end = data.plannedEnd ?? existing?.plannedEnd
      if (!existing || data.plannedStart !== undefined || data.plannedEnd !== undefined) {
        data.plannedDuration = isMilestone ? 0 : WbsService.durationFromDates(start, end)
      } else {
        delete data.plannedDuration
      }
    } else {
      data.plannedDuration = Math.max(0, Math.round(Number(data.plannedDuration) || 0))
    }
    // The old engine derived delay days here from the payload. Delay is now
    // the forecast finish against the planned finish, set on recalculation.
    delete data.delayDays
    return data
  }

  private async assertUniqueCode(projectId: string, wbsCode: string, selfId?: string) {
    const clash = await this.repo.findOne({ where: { projectId, wbsCode } })
    if (clash && clash.id !== selfId) {
      throw new ConflictException(`Activity code ${wbsCode} is already used in this project. Codes must be unique for the logic to mean anything.`)
    }
  }

  async update(id: string, data: any): Promise<WbsTask> {
    const existing = await this.repo.findOne({ where: { id } })
    if (!existing) throw new NotFoundException('Activity not found')
    this.normaliseWrite(data, existing)
    if (data.wbsCode && data.wbsCode !== existing.wbsCode) await this.assertUniqueCode(existing.projectId, data.wbsCode, id)
    delete data.id; delete data.projectId
    await this.repo.update(id, data)
    await this.recalculate(existing.projectId)
    return (await this.repo.findOne({ where: { id } })) as WbsTask
  }

  async create(data: any): Promise<WbsTask> {
    if (!data.projectId) throw new BadRequestException('projectId is required')
    if (!data.wbsCode) throw new BadRequestException('wbsCode is required')
    this.normaliseWrite(data)
    await this.assertUniqueCode(data.projectId, data.wbsCode)
    if (!data.plannedStart) data.plannedStart = (await this.contractDates(data.projectId)).start
    if (!data.plannedEnd) data.plannedEnd = data.plannedStart
    const count = await this.repo.count({ where: { projectId: data.projectId } })
    const saved = await this.repo.save(this.repo.create({ ...data, sortOrder: data.sortOrder ?? count + 1 })) as any
    await this.recalculate(data.projectId)
    return saved
  }

  // ── Contract-weighted progress ─────────────────────────────────────────
  /**
   * Weight of each activity as a share of the contract (0–100).
   * Level-1 packages carry the tender Schedule of Payments; an activity inside
   * a package takes a share of it in proportion to its duration — a proxy until
   * activities carry their own values from the BOQ.
   */
  public activityWeights(tasks: WbsTask[]): Map<string, number> {
    const byCode = new Map(tasks.map(t => [t.wbsCode, t]))
    const codeById = new Map(tasks.map(t => [t.id, t.wbsCode]))
    const parentOf = (t: WbsTask) => t.parentId ? (codeById.get(t.parentId) ?? t.parentId) : null
    const children = new Map<string, WbsTask[]>()
    for (const t of tasks) {
      const p = parentOf(t)
      if (p && byCode.has(p)) children.set(p, [...(children.get(p) ?? []), t])
    }
    const level1 = tasks.filter(t => !parentOf(t) && !t.wbsCode.startsWith('0.'))
    const dbSum = level1.reduce((s, t) => s + (Number(t.paymentPct) || 0), 0)
    const useDb = dbSum >= 95 && dbSum <= 105
    const out = new Map<string, number>()
    const spread = (code: string, weight: number) => {
      const kids = children.get(code) ?? []
      if (!kids.length) { out.set(code, (out.get(code) ?? 0) + weight); return }
      const durs = kids.map(k => this.durationOf(k))
      const total = durs.reduce((a, b) => a + b, 0)
      kids.forEach((k, i) => spread(k.wbsCode, total > 0 ? weight * durs[i] / total : weight / kids.length))
    }
    for (const t of level1) {
      const w = useDb ? (Number(t.paymentPct) || 0) : (TENDER_WEIGHTS[t.wbsCode] ?? (Number(t.paymentPct) || 0))
      if (w > 0) spread(t.wbsCode, w)
    }
    return out
  }

  /**
   * Overall progress, weighted by contract value.
   * A package with activities takes its progress from them, weighted by their
   * share — its own figure is not consulted. The old rollup took the higher of
   * the two, which could only ever round progress up.
   */
  public computeWeightedProgress(tasks: WbsTask[]): number {
    if (!tasks || tasks.length === 0) return 0
    const weights = this.activityWeights(tasks)
    let weighted = 0
    let totalWeight = 0
    for (const t of tasks) {
      const w = weights.get(t.wbsCode) ?? 0
      if (w <= 0) continue
      weighted += w * (Number(t.progressPct) || 0)
      totalWeight += w
    }
    if (totalWeight <= 0) {
      const work = tasks.filter(t => !t.isMilestone && !t.wbsCode.startsWith('0.'))
      return work.length ? +(work.reduce((s, t) => s + Number(t.progressPct), 0) / work.length).toFixed(1) : 0
    }
    return +(weighted / Math.max(100, totalWeight)).toFixed(1)
  }

  /**
   * Planned progress at a day, from the forecast: each activity's value
   * accrues evenly between its early start and early finish.
   */
  private plannedProgressAt(day: number, tasks: WbsTask[], result: ScheduleResult, weights: Map<string, number>): number {
    let pct = 0
    for (const t of tasks) {
      const w = weights.get(t.wbsCode) ?? 0
      const s = result.activities.get(t.wbsCode)
      if (!w || !s || s.isSummary) continue
      const span = s.ef - s.es
      const done = span <= 0 ? (day >= s.ef ? 1 : 0) : Math.min(1, Math.max(0, (day - s.es) / span))
      pct += w * done
    }
    return +pct.toFixed(1)
  }

  /** Clause 16.3: does the forecast meet each stage, and does progress to date? */
  private clause16(built: Built, tasks: WbsTask[]) {
    const { clock, dates, result, dataDate } = built
    const contractDays = clock.index(dates.completion)
    const weights = this.activityWeights(tasks)
    const actualNow = this.computeWeightedProgress(tasks)
    return CLAUSE_16_3.map(stage => {
      const elapsedDays = Math.round(contractDays * stage.fraction)
      const forecastPct = result.ok ? this.plannedProgressAt(elapsedDays + 1, tasks, result, weights) : null
      const passed = dataDate >= elapsedDays
      return {
        stage: stage.stage,
        elapsedMonths: +(30 * stage.fraction).toFixed(1),
        elapsedDays,
        date: clock.iso(elapsedDays),
        targetProgressPct: stage.targetProgressPct,
        rule: stage.rule,
        forecastProgressPct: forecastPct,
        forecastMeets: forecastPct === null ? null : forecastPct >= stage.targetProgressPct,
        status: passed ? 'passed' : 'upcoming',
        // Progress today, for the stage that is live. Progress at a past stage
        // date was never recorded, so it is not reconstructed here.
        progressTodayPct: passed ? null : actualNow,
      }
    })
  }

  // ── Dashboard ──────────────────────────────────────────────────────────
  async dashboard(projectId: string) {
    const built = await this.build(projectId)
    const tasks = built.result.ok ? this.overlay(built) : built.tasks
    this.computePert(tasks, await this.gatedCodes(projectId))
    const { clock, dates, result, dataDate } = built
    const work = tasks.filter(t => !t.isMilestone)
    const milestones = tasks.filter(t => t.isMilestone)
    const isDone = (t: WbsTask) => t.status === TaskStatus.COMPLETED || !!t.actualEnd
    // A milestone is hit when it is achieved — not when its date has passed.
    const hit = milestones.filter(isDone)
    const overdue = milestones.filter(t => !isDone(t) && t.plannedEnd && clock.index(String(t.plannedEnd).slice(0, 10)) < dataDate)
    const completionDay = clock.index(dates.completion)
    const { expectedFinish, stdDev } = this.pertRollup(built)

    return {
      totalTasks: work.length,
      completed: work.filter(isDone).length,
      delayed: work.filter(t => t.status === TaskStatus.DELAYED || Number(t.delayDays) > 0).length,
      inProgress: work.filter(t => t.status === TaskStatus.IN_PROGRESS).length,
      overallProgress: this.computeWeightedProgress(tasks).toFixed(1),
      milestones: milestones.length,
      milestonesHit: hit.length,
      milestonesOverdue: overdue.length,
      daysRemaining: completionDay - clock.index(this.todayIso()),
      contractPct: Math.min(100, Math.max(0, (clock.index(this.todayIso()) / completionDay) * 100)).toFixed(1),
      contractStart: dates.start,
      contractEnd: dates.completion,
      contractDatesSource: dates.source,
      dataDate: clock.iso(dataDate),
      criticalTasks: result.longestPath.length,
      scheduleOk: result.ok,
      forecastFinish: result.forecastFinish === null ? null : clock.iso(result.forecastFinish - 1),
      contractVarianceDays: result.contractVariance,
      projectExpectedDuration: expectedFinish === null ? null : +(expectedFinish - 1).toFixed(2),
      projectStdDeviation: stdDev === null ? null : +stdDev.toFixed(2),
      issueCounts: {
        errors: built.issues.filter(i => i.severity === 'error').length,
        warnings: built.issues.filter(i => i.severity === 'warning').length,
      },
    }
  }

  // ── CPM ────────────────────────────────────────────────────────────────
  async getCPM(projectId: string) {
    const built = await this.build(projectId)
    const tasks = built.result.ok ? this.overlay(built) : (built.tasks as ScheduledTask[])
    const { result, clock, dates } = built
    const row = (t: ScheduledTask) => ({
      id: t.id,
      wbsCode: t.wbsCode,
      title: t.title,
      level: t.level,
      parentId: t.parentId,
      isMilestone: t.isMilestone,
      isSummary: t.isSummary,
      scope: t.scheduleScope ?? 'contract',
      calendar: t.calendar ?? 'seven_day',
      predecessors: t.predecessors,
      dependencies: this.resolveDeps(t),
      duration: this.durationOf(t),
      plannedStart: t.plannedStart,
      plannedEnd: t.plannedEnd,
      forecastStart: t.forecastStart,
      forecastFinish: t.forecastFinish,
      status: t.scheduleStatus,
      drivenBy: t.drivenBy,
      progressPct: Number(t.progressPct) || 0,
      es: result.ok ? t.earliestStart : null, ef: result.ok ? t.earliestFinish : null,
      ls: result.ok ? t.latestStart : null,   lf: result.ok ? t.latestFinish : null,
      float: result.ok ? t.totalFloat : null,
      freeFloat: result.ok ? t.freeFloat : null,
      isCritical: result.ok ? t.isCritical : false,
    })
    const all = tasks.map(row)
    return {
      ok: result.ok,
      issues: built.issues,
      projectStart: dates.start,
      projectEnd: dates.completion,
      contractCompletion: dates.completion,
      contractDatesSource: dates.source,
      dataDate: clock.iso(built.dataDate),
      forecastFinish: result.forecastFinish === null ? null : clock.iso(result.forecastFinish - 1),
      overallFinish: result.overallFinish === null ? null : clock.iso(result.overallFinish - 1),
      contractVarianceDays: result.contractVariance,
      longestPath: result.longestPath,
      criticalPath: all.filter(t => t.isCritical && !t.isSummary).map(t => ({
        wbsCode: t.wbsCode, title: t.title, duration: t.duration,
        earliestStart: t.es, earliestFinish: t.ef, latestStart: t.ls, latestFinish: t.lf, totalFloat: t.float,
        forecastStart: t.forecastStart, forecastFinish: t.forecastFinish,
      })),
      allTasks: all,
    }
  }

  // ── EOT register ───────────────────────────────────────────────────────
  /**
   * Everything that has delayed the project, with overlapping delays counted
   * once.
   *
   * This is not a time-impact analysis and says so. It fixes what made the old
   * register indefensible: weather stoppages were booked onto the O&M period
   * and then counted a second time; a diary with no hours lost claimed a day;
   * every weather day was declared critical; approval delays counted only when
   * their activity was critical, which on the old network was never; and
   * concurrent delays were added together.
   */
  async getEotRegister(projectId: string) {
    const built = await this.build(projectId)
    const tasks = built.result.ok ? this.overlay(built) : (built.tasks as ScheduledTask[])
    const { clock, result, dates } = built
    const byCode = new Map(tasks.map(t => [t.wbsCode, t]))
    const onPath = new Set(result.longestPath)
    const leavesOf = (code: string): string[] => {
      const kids = tasks.filter(t => (t.parentId === code || tasks.find(p => p.id === t.parentId)?.wbsCode === code))
      return kids.length ? kids.flatMap(k => leavesOf(k.wbsCode)) : [code]
    }
    const critical = (code: string | null | undefined): boolean | null => {
      if (!code || !byCode.has(code) || !result.ok) return null
      return leavesOf(code).some(c => onPath.has(c))
    }
    const today = this.todayIso()

    const liaisonFiles = await this.liaisonRepo.find({ where: { projectId } })
    const settledStatuses = [LiaisonStatus.APPROVED, LiaisonStatus.CLOSED]
    const approvalDelays = liaisonFiles
      .filter(f => (Number(f.delayDays) || 0) > 0 || f.isEotGround)
      .map(f => {
        const linked = f.linkedWbsCode ? byCode.get(f.linkedWbsCode) : undefined
        // Liaison counts delay as received − expected, so the delay runs from the
        // expected date up to the day before the approval arrived (or today).
        const from = f.expectedDate ? String(f.expectedDate).slice(0, 10) : null
        const until = f.actualDate ? String(f.actualDate).slice(0, 10) : today
        const to = from && clock.index(until) > clock.index(from) ? clock.iso(clock.index(until) - 1) : null
        return {
          source: 'approval' as const,
          ref: f.fileNumber,
          subject: f.subject,
          department: f.department,
          expectedDate: f.expectedDate,
          actualDate: f.actualDate,
          settled: settledStatuses.includes(f.currentStatus),
          delayDays: Number(f.delayDays) || 0,
          isEotGround: f.isEotGround,
          reason: f.eotReason,
          linkedWbsCode: f.linkedWbsCode ?? null,
          linkedTitle: linked?.title ?? null,
          criticalPathImpact: critical(f.linkedWbsCode),
          window: from && to ? { from, to } : null,
        }
      })

    // Diaries flagged as weather EOT.
    const diaries = this.diaryRepo?.find
      ? await this.diaryRepo.find({ where: { projectId, eotClaim: true } })
      : []
    const diaryDays = (d: SiteDiary) => {
      const hours = Number(d.hoursLost || 0)
      return hours > 0 ? Math.max(1, Math.round(hours / 8)) : 0
    }
    const weatherDelays = diaries.map(d => {
      const days = diaryDays(d)
      const date = String(d.date).slice(0, 10)
      return {
        source: 'weather' as const,
        ref: date,
        subject: `Site diary ${date}`,
        delayDays: days,
        eotApplied: days > 0,
        eotDays: days,
        reason: d.eotReason || 'Weather stoppage recorded in the site diary',
        // Whether the stopped work was critical is not recorded in the diary.
        criticalPathImpact: null as boolean | null,
        hoursNotRecorded: days === 0,
        window: days > 0 ? { from: date, to: clock.iso(clock.index(date) + days - 1) } : null,
      }
    })

    // Manual EOT on activities. Days that the old diary sync copied onto an
    // activity (tagged "diary-eot:<id>") are already in the weather list.
    const diaryById = new Map(diaries.map(d => [d.id, d]))
    const taskDelays = tasks
      .filter(t => t.scheduleScope !== 'post_completion' || t.eotApplied)
      .filter(t => !t.isMilestone && ((Number(t.delayDays) || 0) > 0 || t.eotApplied))
      .map(t => {
        const tags = [...String(t.delayReason ?? '').matchAll(/diary-eot:([0-9a-f-]{8,})/gi)].map(m => m[1])
        const copied = tags.reduce((s, id) => s + (diaryById.has(id) ? diaryDays(diaryById.get(id)!) || 1 : 1), 0)
        const eotDays = Math.max(0, (Number(t.eotDays) || 0) - copied)
        return {
          source: 'task' as const,
          ref: t.wbsCode,
          subject: t.title,
          responsible: t.responsible,
          delayDays: Number(t.delayDays) || 0,
          eotApplied: t.eotApplied && eotDays > 0,
          eotDays,
          copiedFromDiaries: copied,
          reason: String(t.delayReason ?? '').replace(/\s*\|?\s*diary-eot:[0-9a-f-]+[^|]*/gi, '').trim() || null,
          criticalPathImpact: critical(t.wbsCode),
        }
      })

    // Overlap: union of the dated windows of everything claimed as an EOT ground.
    const windows = [
      ...approvalDelays.filter(d => d.isEotGround && d.window).map(d => d.window!),
      ...weatherDelays.filter(d => d.window).map(d => d.window!),
    ].map(w => [clock.index(w.from), clock.index(w.to) + 1] as [number, number]).sort((a, b) => a[0] - b[0])
    let union = 0
    let curFrom = -Infinity, curTo = -Infinity
    for (const [from, to] of windows) {
      if (from > curTo) { if (curTo > curFrom) union += curTo - curFrom; curFrom = from; curTo = to }
      else curTo = Math.max(curTo, to)
    }
    if (curTo > curFrom) union += curTo - curFrom

    // Dated items are measured by their windows, so gross − overlap = net exactly.
    const span = (w: { from: string; to: string }) => clock.index(w.to) - clock.index(w.from) + 1
    const approvalDays = (d: { window: { from: string; to: string } | null; delayDays: number }) => d.window ? span(d.window) : d.delayDays
    const approvalEot = approvalDelays.filter(d => d.isEotGround).reduce((s, d) => s + approvalDays(d), 0)
    const weatherEot = weatherDelays.reduce((s, d) => s + d.eotDays, 0)
    const taskEot = taskDelays.filter(d => d.eotApplied).reduce((s, d) => s + d.eotDays, 0)
    const grossDated = approvalDelays.filter(d => d.isEotGround && d.window).reduce((s, d) => s + span(d.window!), 0) + weatherEot

    return {
      approvalDelays,
      taskDelays,
      weatherDelays,
      totals: {
        approvalDelayDays: approvalDelays.reduce((s, d) => s + d.delayDays, 0),
        taskDelayDays: taskEot,
        weatherDelayDays: weatherEot,
        grossEotDays: approvalEot + weatherEot + taskEot,
        overlapDays: Math.max(0, grossDated - union),
        netDatedEotDays: union,
        undatedEotDays: taskEot + approvalDelays.filter(d => d.isEotGround && !d.window).reduce((s, d) => s + d.delayDays, 0),
        claimableEotDays: union + taskEot + approvalDelays.filter(d => d.isEotGround && !d.window).reduce((s, d) => s + d.delayDays, 0),
      },
      basis: 'Overlapping delays are counted once. Criticality is taken from the current forecast, not the programme as it stood when each delay occurred, and weather criticality is not recorded. This is a register of grounds, not a time-impact analysis.',
      contractEnd: dates.completion,
    }
  }

  // ── PERT ───────────────────────────────────────────────────────────────
  /**
   * Expected finish and spread along the longest path, for the work that is
   * left. Returns nulls when there is no path to measure — the old code fell
   * through to z = 0 and reported a 50% chance of finishing on time.
   */
  private pertRollup(built: Built): { expectedFinish: number | null; variance: number | null; stdDev: number | null } {
    const { result, tasks } = built
    if (!result.ok || result.forecastFinish === null || !result.longestPath.length) return { expectedFinish: null, variance: null, stdDev: null }
    const byCode = new Map(tasks.map(t => [t.wbsCode, t]))
    let extra = 0
    let variance = 0
    for (const code of result.longestPath) {
      const t = byCode.get(code)
      const s = result.activities.get(code)
      if (!t || !s || s.status === 'complete') continue
      const M = this.durationOf(t)
      if (M <= 0) continue
      const frac = s.remaining / M
      extra += (Number(t.expectedDuration) - M) * frac
      variance += (Number(t.variance) || 0) * frac * frac
    }
    return { expectedFinish: result.forecastFinish + extra, variance, stdDev: Math.sqrt(variance) }
  }

  async getPERT(projectId: string) {
    const built = await this.build(projectId)
    const tasks = built.result.ok ? this.overlay(built) : (built.tasks as ScheduledTask[])
    this.computePert(tasks, await this.gatedCodes(projectId))
    const { clock, dates } = built
    const { expectedFinish, variance, stdDev } = this.pertRollup(built)
    const contractDays = clock.index(dates.completion)

    const erf = (x: number) => {
      const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911
      const sign = x < 0 ? -1 : 1
      const t = 1.0 / (1.0 + p * Math.abs(x))
      return sign * (1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x))
    }
    const normCdf = (z: number) => 0.5 * (1 + erf(z / Math.SQRT2))
    let probability: number | null = null
    let probabilityNote: string
    if (expectedFinish === null || stdDev === null) {
      probabilityNote = 'Not computed: the schedule has errors or no longest path.'
    } else if (stdDev <= 0) {
      probability = expectedFinish <= contractDays + 1 ? 100 : 0
      probabilityNote = 'No spread on the remaining longest path, so this is a yes/no answer, not a probability.'
    } else {
      probability = +(normCdf((contractDays + 1 - expectedFinish) / stdDev) * 100).toFixed(1)
      probabilityNote = 'Single-path PERT. O and P are rule-based estimates, and merge bias where parallel branches converge makes the true figure lower. Use a Monte Carlo run before quoting it.'
    }
    const span = (k: number) => expectedFinish === null || stdDev === null ? null
      : { lower: +(expectedFinish - 1 - k * stdDev).toFixed(2), upper: +(expectedFinish - 1 + k * stdDev).toFixed(2) }

    return {
      ok: built.result.ok,
      projectExpectedDuration: expectedFinish === null ? null : +(expectedFinish - 1).toFixed(2),
      projectStdDeviation: stdDev === null ? null : +stdDev.toFixed(2),
      projectVariance: variance === null ? null : +variance.toFixed(2),
      contractTargetDays: contractDays,
      contractOnTimeProbPct: probability,
      probabilityNote,
      clause16Milestones: this.clause16(built, tasks),
      probability68: span(1),
      probability95: span(2),
      probability99: span(3),
      tasks: tasks.filter(t => !t.isMilestone && !(t as ScheduledTask).isSummary).map(t => {
        const risk = this.riskEngine.assessTaskRisk(t, false)
        return {
          wbsCode: t.wbsCode,
          title: t.title,
          optimistic: Number(t.optimisticDuration),
          mostLikely: Number(t.mostLikelyDuration),
          pessimistic: Number(t.pessimisticDuration),
          expected: Number(t.expectedDuration),
          variance: Number(t.variance),
          stdDeviation: Number(t.standardDeviation),
          isCritical: t.isCritical,
          workCategory: risk.workCategory,
          riskScore: risk.riskScore,
          riskCategory: risk.riskCategory,
          weatherVulnerability: risk.weatherVulnerability,
          riskDrivers: risk.riskDrivers,
        }
      }),
    }
  }

  async getRiskForecast(projectId: string) {
    const tasks = await this.listScheduled(projectId)
    return this.riskEngine.generateProjectRiskForecast(tasks, await this.gatedCodes(projectId))
  }

  // ── Baselines ──────────────────────────────────────────────────────────
  async listBaselines(projectId: string) {
    if (!this.baselineRepo) return []
    const rows = await this.baselineRepo.find({ where: { projectId }, order: { createdAt: 'DESC' } })
    return rows.map(({ activities, ...b }) => ({ ...b, activityCount: activities?.length ?? 0 }))
  }

  async createBaseline(projectId: string, name: string, notes?: string, createdBy?: string) {
    if (!this.baselineRepo) throw new BadRequestException('Baselines are not available')
    if (!name?.trim()) throw new BadRequestException('A baseline needs a name, e.g. "Clause 17 submission"')
    const built = await this.build(projectId)
    if (!built.result.ok) {
      throw new BadRequestException(`The schedule has ${built.issues.filter(i => i.severity === 'error').length} error(s) and cannot be baselined until they are fixed.`)
    }
    const tasks = this.overlay(built)
    const weights = this.activityWeights(tasks)
    const activities: BaselineActivity[] = tasks.map(t => ({
      wbsCode: t.wbsCode,
      title: t.title,
      plannedDuration: this.durationOf(t),
      forecastStart: t.forecastStart,
      forecastFinish: t.forecastFinish,
      isCritical: t.isCritical,
      totalFloat: t.totalFloat,
      weight: +(weights.get(t.wbsCode) ?? 0).toFixed(4),
    }))
    const saved = await this.baselineRepo.save(this.baselineRepo.create({
      projectId,
      name: name.trim(),
      notes: notes?.trim() || null,
      dataDate: built.clock.iso(built.dataDate),
      contractStart: built.dates.start,
      contractCompletion: built.dates.completion,
      forecastFinish: built.result.forecastFinish === null ? null : built.clock.iso(built.result.forecastFinish - 1),
      createdBy: createdBy ?? null,
      activities,
    }))
    const { activities: _a, ...summary } = saved
    return { ...summary, activityCount: activities.length }
  }

  /** Current forecast against a baseline, activity by activity. */
  async baselineVariance(baselineId: string) {
    if (!this.baselineRepo) throw new NotFoundException('Baseline not found')
    const base = await this.baselineRepo.findOne({ where: { id: baselineId } })
    if (!base) throw new NotFoundException('Baseline not found')
    const tasks = await this.listScheduled(base.projectId)
    const now = new Map(tasks.map(t => [t.wbsCode, t]))
    const days = (a: string | null, b: string | null) => a && b ? Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000) : null
    const rows = base.activities.map(b => {
      const t = now.get(b.wbsCode)
      return {
        wbsCode: b.wbsCode,
        title: t?.title ?? b.title,
        baselineStart: b.forecastStart,
        baselineFinish: b.forecastFinish,
        currentStart: t?.forecastStart ?? null,
        currentFinish: t?.forecastFinish ?? null,
        startVarianceDays: days(b.forecastStart, t?.forecastStart ?? null),
        finishVarianceDays: days(b.forecastFinish, t?.forecastFinish ?? null),
        removed: !t,
      }
    })
    const added = tasks.filter(t => !base.activities.some(b => b.wbsCode === t.wbsCode)).map(t => t.wbsCode)
    const currentFinish = tasks.reduce<string | null>((m, t) => t.scheduleScope !== 'post_completion' && t.forecastFinish && (!m || t.forecastFinish > m) ? t.forecastFinish : m, null)
    return {
      baseline: { id: base.id, name: base.name, dataDate: base.dataDate, forecastFinish: base.forecastFinish, createdAt: base.createdAt },
      currentForecastFinish: currentFinish,
      finishVarianceDays: days(base.forecastFinish, currentFinish),
      activities: rows,
      added,
    }
  }
}
