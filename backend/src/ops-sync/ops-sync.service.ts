import { Injectable, Logger } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { InjectRepository } from '@nestjs/typeorm'
import { ILike, Repository } from 'typeorm'
import { OpsEvents } from './ops-events'
import { Invoice } from '../accounting/invoice.entity'
import { Transaction } from '../accounting/transaction.entity'
import { AccountingService } from '../accounting/accounting.service'
import { TxnType } from '../accounting/transaction.entity'
import { Task, TaskPriority, TaskStatus } from '../tasks/task.entity'
import { FleetLog } from '../fleet/fleet-log.entity'
import { MaterialRegister } from '../material-register/material-register.entity'
import { WbsTask, TaskStatus as WbsStatus } from '../wbs/wbs-task.entity'
import { SiteDiary } from '../diary/diary.entity'
import { Employee } from '../hr/employee.entity'
import { HrService } from '../hr/hr.service'
import { RaBill, RaBillStatus } from '../epc/ra-bill.entity'
import { BoqItem } from '../epc/boq-item.entity'
import { Ncr, NcrSeverity, NcrStatus } from '../qa/ncr.entity'
import { Meeting } from '../meetings/meeting.entity'
import { SalaryRecord } from '../hr/salary-record.entity'
import { OmLog } from '../om/om-log.entity'
import { OmEvent, OmEventType, OmEventStatus } from '../om/om-event.entity'

const RA_TO_INVOICE_STATUS: Record<string, string> = {
  [RaBillStatus.DRAFT]: 'draft',
  [RaBillStatus.SUBMITTED]: 'submitted',
  [RaBillStatus.VERIFIED]: 'submitted',
  [RaBillStatus.APPROVED]: 'approved',
  [RaBillStatus.PAID]: 'paid',
  [RaBillStatus.REJECTED]: 'rejected',
}

@Injectable()
export class OpsSyncService {
  private readonly log = new Logger(OpsSyncService.name)

  constructor(
    @InjectRepository(Invoice) private readonly invoices: Repository<Invoice>,
    @InjectRepository(Transaction) private readonly txns: Repository<Transaction>,
    @InjectRepository(Task) private readonly tasks: Repository<Task>,
    @InjectRepository(FleetLog) private readonly fleet: Repository<FleetLog>,
    @InjectRepository(MaterialRegister) private readonly materials: Repository<MaterialRegister>,
    @InjectRepository(WbsTask) private readonly wbs: Repository<WbsTask>,
    @InjectRepository(SiteDiary) private readonly diaries: Repository<SiteDiary>,
    @InjectRepository(Employee) private readonly employees: Repository<Employee>,
    @InjectRepository(OmLog) private readonly omLogs: Repository<OmLog>,
    @InjectRepository(OmEvent) private readonly omEvents: Repository<OmEvent>,
    @InjectRepository(RaBill) private readonly raBills: Repository<RaBill>,
    @InjectRepository(Ncr) private readonly ncrs: Repository<Ncr>,
    private readonly accounting: AccountingService,
    private readonly hr: HrService,
  ) {}

  @OnEvent(OpsEvents.RA_BILL_CHANGED, { async: true })
  async onRaBillChanged(bill: RaBill) {
    try {
      if (bill?.status === RaBillStatus.DRAFT) {
        bill = await this.applyOpenNcrDeductions(bill)
      }
      await this.syncRaBillToInvoice(bill)
    } catch (e: any) {
      this.log.error(`RA bill ${bill?.billNo} → invoice failed: ${e?.message}`)
    }
  }

  @OnEvent(OpsEvents.SALARY_PAID, { async: true })
  async onSalaryPaid(rec: SalaryRecord) {
    try {
      await this.postSalaryPayment(rec)
    } catch (e: any) {
      this.log.error(`Salary ${rec?.id} ledger post failed: ${e?.message}`)
    }
  }

  @OnEvent(OpsEvents.DIARY_SUBMITTED, { async: true })
  async onDiarySubmitted(diary: SiteDiary) {
    try {
      await this.syncDiaryToOperations(diary)
    } catch (e: any) {
      this.log.error(`Diary ${diary?.id} operational sync failed: ${e?.message}`)
    }
  }

  @OnEvent(OpsEvents.MEETING_CIRCULATED, { async: true })
  async onMeetingCirculated(meeting: Meeting) {
    try {
      await this.syncMeetingActionsToTasks(meeting)
    } catch (e: any) {
      this.log.error(`Meeting ${meeting?.id} → tasks failed: ${e?.message}`)
    }
  }

  @OnEvent(OpsEvents.NCR_OPENED, { async: true })
  async onNcrOpened(ncr: Ncr) {
    try {
      await this.holdWbsForNcr(ncr)
      await this.applyNcrDeductionToDraftRa(ncr)
    } catch (e: any) {
      this.log.error(`NCR ${ncr?.ncrNo} WBS hold failed: ${e?.message}`)
    }
  }

  @OnEvent(OpsEvents.NCR_CLOSED, { async: true })
  async onNcrClosed(ncr: Ncr) {
    try {
      await this.releaseWbsForNcr(ncr)
      await this.reverseNcrDeductionFromDraftRa(ncr)
    } catch (e: any) {
      this.log.error(`NCR ${ncr?.ncrNo} WBS release failed: ${e?.message}`)
    }
  }

  @OnEvent(OpsEvents.FLEET_LOGGED, { async: true })
  async onFleetLogged(log: FleetLog) {
    try {
      await this.syncFleetToOm(log)
    } catch (e: any) {
      this.log.error(`Fleet ${log?.id} → O&M failed: ${e?.message}`)
    }
  }

  @OnEvent(OpsEvents.BOQ_MEASURED, { async: true })
  async onBoqMeasured(item: BoqItem) {
    try {
      await this.syncBoqProgressToWbs(item)
    } catch (e: any) {
      this.log.error(`BOQ ${item?.id} → WBS progress failed: ${e?.message}`)
    }
  }

  async syncRaBillToInvoice(bill: RaBill): Promise<Invoice> {
    const status = RA_TO_INVOICE_STATUS[bill.status] ?? 'draft'
    const payload = {
      projectId: bill.projectId,
      raNumber: bill.billNo,
      billDate: bill.billDate,
      periodFrom: bill.periodFrom,
      periodTo: bill.periodTo,
      grossToDate: Number(bill.prevBilled || 0) + Number(bill.netThisBill || bill.grossAmount || 0),
      previousBillAmount: Number(bill.prevBilled || 0),
      gstPercent: Number(bill.gstPct || 0),
      tdsPercent: Number(bill.tdsPct || 0),
      retentionPercent: Number(bill.securityDepositPct || 0),
      remarks: bill.remarks,
      status,
    }
    const existing = await this.invoices.findOne({
      where: { projectId: bill.projectId, raNumber: bill.billNo },
    })
    if (!existing) {
      const created = await this.one(this.accounting.createInvoice(payload))
      if (status === 'paid' && created?.id) {
        return this.one(this.accounting.updateInvoice(created.id, {
          status: 'paid',
          paidAmount: Number(bill.netPayable),
          paidDate: bill.paidDate ?? new Date().toISOString().slice(0, 10),
        }) as Promise<Invoice>)
      }
      return created
    }
    return this.one(this.accounting.updateInvoice(existing.id, {
      ...payload,
      paidAmount: status === 'paid' ? Number(bill.netPayable) : existing.paidAmount,
      paidDate: status === 'paid' ? (bill.paidDate ?? existing.paidDate) : existing.paidDate,
    }) as Promise<Invoice>)
  }

  async postSalaryPayment(rec: SalaryRecord): Promise<Transaction | null> {
    const already = await this.txns.findOne({ where: { refType: 'salary', refId: rec.id } })
    if (already) return already
    const emp = await this.employees.findOne({ where: { id: rec.employeeId } })
    const projectId = emp?.projectId
    if (!projectId) {
      this.log.warn(`Salary ${rec.id} has no employee project — ledger not posted`)
      return null
    }
    const name = emp ? `${emp.firstName} ${emp.lastName ?? ''}`.trim() : rec.employeeId
    return this.one(this.accounting.addTransaction({
      projectId,
      date: rec.paidOn ?? new Date().toISOString().slice(0, 10),
      type: TxnType.PAYMENT,
      description: `Salary ${rec.month}/${rec.year} — ${name}`,
      refType: 'salary',
      refId: rec.id,
      debit: Number(rec.netSalary),
      paymentMode: rec.paymentMode,
    }))
  }

  async syncDiaryToOperations(diary: SiteDiary): Promise<void> {
    await this.fillDiaryLabourFromTimesheets(diary)
    await this.syncDiaryEquipmentToFleet(diary)
    await this.syncDiaryMaterialsToRegister(diary)
    await this.applyDiaryEotToWbs(diary)
  }

  async fillDiaryLabourFromTimesheets(diary: SiteDiary): Promise<void> {
    if (Number(diary.labourTotal) > 0) return
    const man = await this.hr.dailyManpower(diary.projectId, diary.date)
    if (!man || man.present === 0) return
    await this.diaries.update(diary.id, {
      labourSkilled: man.skilled,
      labourUnskilled: man.unskilled,
      labourSupervisory: man.supervisory,
      labourTotal: man.present,
    })
    diary.labourSkilled = man.skilled
    diary.labourUnskilled = man.unskilled
    diary.labourSupervisory = man.supervisory
    diary.labourTotal = man.present
  }

  async syncDiaryEquipmentToFleet(diary: SiteDiary): Promise<number> {
    const items = Array.isArray(diary.equipment) ? diary.equipment : []
    let created = 0
    for (const raw of items) {
      const type = String(raw?.type ?? raw?.machineType ?? '').trim()
      if (!type) continue
      const hours = Number(raw?.hours ?? raw?.hoursWorked ?? 0)
      const remarks = `diary:${diary.id}:${type}`
      const existing = await this.fleet.findOne({ where: { projectId: diary.projectId, date: diary.date, remarks } })
      if (existing) continue
      const saved = await this.fleet.save(this.fleet.create({
        projectId: diary.projectId,
        logType: 'plant',
        date: diary.date,
        machineType: type,
        machineId: raw?.id ?? raw?.machineId ?? type,
        hoursWorked: hours || undefined,
        workDescription: raw?.remarks ?? 'From site diary',
        reportedBy: diary.submittedBy,
        reportedVia: 'diary',
        remarks,
      }))
      await this.syncFleetToOm(saved)
      created++
    }
    return created
  }

  async syncDiaryMaterialsToRegister(diary: SiteDiary): Promise<number> {
    const items = Array.isArray(diary.materialsReceived) ? diary.materialsReceived : []
    let created = 0
    for (const raw of items) {
      const material = String(raw?.material ?? '').trim()
      const qty = Number(raw?.quantity ?? raw?.receivedQty ?? 0)
      if (!material || qty <= 0) continue
      const remarks = `diary:${diary.id}:${material}`
      const existing = await this.materials.findOne({
        where: { projectId: diary.projectId, date: diary.date, remarks: ILike(`${remarks}%`) },
      })
      if (existing) continue
      await this.materials.save(this.materials.create({
        projectId: diary.projectId,
        date: diary.date,
        material,
        unit: raw?.unit || undefined,
        receivedQty: qty,
        consumedQty: 0,
        remarks: `${remarks}${raw?.supplier ? ` supplier=${raw.supplier}` : ''}`,
      }))
      created++
    }
    return created
  }

  async applyDiaryEotToWbs(diary: SiteDiary): Promise<void> {
    if (!diary.eotClaim) return
    const hours = Number(diary.hoursLost || 0)
    const days = hours > 0 ? Math.max(1, Math.round(hours / 8)) : 1
    const reasonTag = `diary-eot:${diary.id}`
    const already = await this.wbs.findOne({ where: { projectId: diary.projectId, delayReason: ILike(`%${reasonTag}%`) } })
    if (already) return
    const candidates = await this.wbs.find({
      where: { projectId: diary.projectId, isCritical: true },
    })
    const live = (candidates.length ? candidates : await this.wbs.find({ where: { projectId: diary.projectId } }))
      .filter(t => !t.isMilestone && t.status !== WbsStatus.COMPLETED)
    const target = live.find(t => t.status === WbsStatus.IN_PROGRESS) ?? live[0]
    if (!target) return
    await this.wbs.update(target.id, {
      eotApplied: true,
      eotDays: Number(target.eotDays || 0) + days,
      delayDays: Number(target.delayDays || 0) + days,
      delayReason: [target.delayReason, `${reasonTag} ${diary.eotReason || 'weather'}`.trim()]
        .filter(Boolean)
        .join(' | '),
    })
  }

  async syncMeetingActionsToTasks(meeting: Meeting): Promise<number> {
    const actions = Array.isArray(meeting.actionItems) ? meeting.actionItems : []
    let created = 0
    for (let i = 0; i < actions.length; i++) {
      const action = actions[i]
      const text = String(action?.action ?? action?.item ?? '').trim()
      if (!text) continue
      const marker = `[MOM:${meeting.id}:${i}]`
      const existing = await this.tasks.findOne({ where: { projectId: meeting.projectId, description: ILike(`%${marker}%`) } })
      if (existing) {
        if (action.status === 'closed' && existing.status !== TaskStatus.DONE) {
          await this.tasks.update(existing.id, {
            status: TaskStatus.DONE,
            completedDate: action.closedDate ?? new Date().toISOString().slice(0, 10),
            progressPct: 100,
          })
        }
        continue
      }
      await this.tasks.save(this.tasks.create({
        projectId: meeting.projectId,
        title: text.slice(0, 200),
        description: `${marker} ${text}`,
        assignedName: action.responsible ?? null,
        dueDate: action.dueDate || null,
        category: 'meeting',
        priority: TaskPriority.MEDIUM,
        status: action.status === 'closed' ? TaskStatus.DONE : TaskStatus.TODO,
        createdBy: meeting.minutedBy,
      }))
      created++
    }
    return created
  }

  async holdWbsForNcr(ncr: Ncr): Promise<void> {
    const task = await this.findWbsForWorkItem(ncr.projectId, ncr.workItem)
    if (!task) return
    const tag = `NCR:${ncr.ncrNo}`
    if ((task.delayReason || '').includes(tag)) return
    await this.wbs.update(task.id, {
      status: WbsStatus.ON_HOLD,
      delayReason: [task.delayReason, `${tag} ${ncr.description}`.trim()].filter(Boolean).join(' | '),
    })
  }

  async releaseWbsForNcr(ncr: Ncr): Promise<void> {
    const tag = `NCR:${ncr.ncrNo}`
    const held = await this.wbs.find({
      where: { projectId: ncr.projectId, delayReason: ILike(`%${tag}%`) },
    })
    for (const task of held) {
      const nextStatus = Number(task.progressPct) > 0 ? WbsStatus.IN_PROGRESS : WbsStatus.NOT_STARTED
      const cleaned = (task.delayReason || '')
        .split('|')
        .map(s => s.trim())
        .filter(s => s && !s.includes(tag))
        .join(' | ')
      await this.wbs.update(task.id, {
        status: nextStatus,
        delayReason: cleaned || null as any,
      })
    }
  }

  async syncBoqProgressToWbs(item: BoqItem): Promise<void> {
    const est = Number(item.estimatedQty || 0)
    const measured = Number(item.measuredQty || 0)
    if (est <= 0) return
    const pct = Math.max(0, Math.min(100, Math.round((measured / est) * 1000) / 10))
    let matches: WbsTask[] = []
    if (item.paymentMilestone) {
      matches = await this.wbs.find({
        where: { projectId: item.projectId, paymentMilestone: item.paymentMilestone },
      })
    }
    if (!matches.length && item.subCategory) {
      matches = await this.wbs.find({
        where: { projectId: item.projectId, title: ILike(`%${item.subCategory}%`) },
      })
    }
    for (const task of matches.filter(t => !t.isMilestone)) {
      const status = pct >= 100
        ? WbsStatus.COMPLETED
        : pct > 0
          ? WbsStatus.IN_PROGRESS
          : task.status
      await this.wbs.update(task.id, {
        progressPct: pct,
        status,
        ...(pct > 0 && !task.actualStart ? { actualStart: new Date().toISOString().slice(0, 10) } : {}),
        ...(pct >= 100 ? { actualEnd: new Date().toISOString().slice(0, 10) } : {}),
      })
    }
  }

  async syncFleetToOm(log: FleetLog): Promise<void> {
    if (!log || log.logType !== 'plant') return
    const hours = Number(log.hoursWorked || 0)
    const label = `${log.machineType || ''} ${log.machineId || ''}`.trim()
    const isDg = /dg|generator|diesel/i.test(label)
    const tag = `fleet:${log.id}`

    if (hours > 0) {
      const existing = await this.omLogs.findOne({ where: { projectId: log.projectId, date: log.date } })
      const line = `${tag} ${label || 'plant'} ${hours}h`
      if (!existing) {
        await this.omLogs.save(this.omLogs.create({
          projectId: log.projectId,
          date: log.date,
          dgHours: isDg ? hours : undefined,
          remarks: line,
          operator: log.operator || log.reportedBy,
        }))
      } else if (!(existing.remarks || '').includes(tag)) {
        await this.omLogs.update(existing.id, {
          dgHours: isDg ? Number(existing.dgHours || 0) + hours : existing.dgHours,
          remarks: [existing.remarks, line].filter(Boolean).join(' | '),
        })
      }
    }

    if (log.breakdown) {
      const already = await this.omEvents.findOne({ where: { projectId: log.projectId, remarks: tag } })
      if (!already) {
        await this.omEvents.save(this.omEvents.create({
          projectId: log.projectId,
          type: OmEventType.BREAKDOWN,
          equipment: label || 'plant',
          startAt: new Date(`${log.date}T00:00:00.000Z`),
          cause: log.breakdownDetails,
          remarks: tag,
          attendedBy: log.reportedBy,
          status: OmEventStatus.OPEN,
        }))
      }
    }
  }

  ncrDeductionAmount(ncr: Pick<Ncr, 'severity'>, netThisBill: number): number {
    const base = Number(netThisBill || 0)
    if (ncr.severity === NcrSeverity.CRITICAL) return Math.max(10000, Math.round(base * 0.01))
    if (ncr.severity === NcrSeverity.MAJOR) return Math.max(5000, Math.round(base * 0.005))
    return 0
  }

  async applyOpenNcrDeductions(bill: RaBill): Promise<RaBill> {
    if (!bill?.id || bill.status !== RaBillStatus.DRAFT) return bill
    const open = await this.ncrs.find({
      where: { projectId: bill.projectId, status: NcrStatus.OPEN },
    })
    let current = bill
    for (const ncr of open) {
      current = await this.applyNcrDeductionToDraftRa(ncr, current)
    }
    return current
  }

  async applyNcrDeductionToDraftRa(ncr: Ncr, existingBill?: RaBill): Promise<RaBill> {
    const bill = existingBill ?? await this.latestDraftRa(ncr.projectId)
    if (!bill || bill.status !== RaBillStatus.DRAFT) return bill as any
    const deductAmt = this.ncrDeductionAmount(ncr, Number(bill.netThisBill || 0))
    if (deductAmt <= 0) return bill
    const rows = Array.isArray(bill.ncrDeductions) ? [...bill.ncrDeductions] : []
    if (rows.some(d => d.ncrNo === ncr.ncrNo)) return bill
    rows.push({
      ncrNo: ncr.ncrNo,
      amount: deductAmt,
      severity: ncr.severity,
      status: 'draft_withhold',
      recommendation: 'PM review required — draft withhold recommended pending NCR resolution',
    })
    return this.persistRaDeductions(bill, rows)
  }

  async reverseNcrDeductionFromDraftRa(ncr: Ncr): Promise<RaBill | null> {
    const bill = await this.latestDraftRa(ncr.projectId)
    if (!bill) return null
    const rows = (Array.isArray(bill.ncrDeductions) ? bill.ncrDeductions : [])
      .filter(d => d.ncrNo !== ncr.ncrNo)
    if (rows.length === (bill.ncrDeductions || []).length) return bill
    return this.persistRaDeductions(bill, rows)
  }

  private async latestDraftRa(projectId: string): Promise<RaBill | null> {
    return this.raBills.findOne({
      where: { projectId, status: RaBillStatus.DRAFT },
      order: { createdAt: 'DESC' },
    })
  }

  private async persistRaDeductions(
    bill: RaBill,
    rows: Array<{ ncrNo: string; amount: number; severity: string; status?: string; recommendation?: string }>,
  ): Promise<RaBill> {
    const other = rows.reduce((s, d) => s + Number(d.amount || 0), 0)
    const netPayable = Number(bill.netThisBill || 0)
      + Number(bill.gstAmount || 0)
      - Number(bill.tdsAmount || 0)
      - Number(bill.securityDepositAmount || 0)
      - other
    await this.raBills.update(bill.id, {
      ncrDeductions: rows,
      otherDeductions: other,
      netPayable,
    })
    return { ...bill, ncrDeductions: rows, otherDeductions: other, netPayable }
  }

  private async one<T>(value: T | T[] | Promise<T | T[]>): Promise<T> {
    const resolved = await value
    return (Array.isArray(resolved) ? resolved[0] : resolved) as T
  }

  private async findWbsForWorkItem(projectId: string, workItem: string): Promise<WbsTask | null> {
    const needle = (workItem || '').trim()
    if (!needle) return null
    const byCode = await this.wbs.findOne({ where: { projectId, wbsCode: needle } })
    if (byCode) return byCode
    return this.wbs.findOne({ where: { projectId, title: ILike(`%${needle}%`) } })
  }
}
