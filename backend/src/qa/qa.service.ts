import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { QaChecklist, ChecklistCategory } from './qa-checklist.entity'
import { QaInspection, InspectionStatus } from './qa-inspection.entity'
import { Ncr, NcrStatus, NcrSeverity } from './ncr.entity'

// Pre-loaded checklists based on tender specifications
const DEFAULT_CHECKLISTS = [
  {
    title: 'Pipe Laying — Pre-Laying Inspection',
    category: ChecklistCategory.PIPE_LAYING,
    workItem: 'RCC NP3 Pipe Laying',
    isTemplate: true,
    items: [
      { id:'pl1', question:'Trench excavated to correct width and depth as per drawing?', required:true, referenceSpec:'Clause 6.0 SCC' },
      { id:'pl2', question:'Trench bottom properly levelled and compacted?', required:true },
      { id:'pl3', question:'PCC bedding (1:4:8) laid to specified thickness?', required:true, referenceSpec:'BOQ Item 4.4.7' },
      { id:'pl4', question:'Pipe class (NP3) and diameter verified against drawing?', required:true },
      { id:'pl5', question:'Rubber gasket joints inspected and lubricated?', required:true },
      { id:'pl6', question:'Pipe laid to correct gradient — checked with level?', required:true },
      { id:'pl7', question:'Timbering/shoring provided where depth >1.5m?', required:true, referenceSpec:'Safety Clause' },
      { id:'pl8', question:'Traffic barricading and night lamps in place?', required:true },
    ],
  },
  {
    title: 'Pipe Laying — Post-Laying & Backfilling',
    category: ChecklistCategory.PIPE_LAYING,
    workItem: 'RCC NP3 Pipe Laying',
    isTemplate: true,
    items: [
      { id:'pb1', question:'Sectional flow test conducted and passed?', required:true, referenceSpec:'Clause 23.3 — 10% payment milestone' },
      { id:'pb2', question:'Backfilling done in 20cm layers with proper compaction?', required:true, referenceSpec:'BOQ Item 2.11' },
      { id:'pb3', question:'Surplus earth disposed within 8km as per BOQ?', required:true },
      { id:'pb4', question:'Temporary road reinstatement done?', required:true },
      { id:'pb5', question:'Pipe protected from damage during backfilling?', required:true },
    ],
  },
  {
    title: 'Manhole Construction — Pre-Pour Check',
    category: ChecklistCategory.MANHOLE,
    workItem: 'RCC Manholes',
    isTemplate: true,
    items: [
      { id:'mh1', question:'Excavation to correct depth and dia as per drawing?', required:true },
      { id:'mh2', question:'PCC base laid to correct thickness?', required:true },
      { id:'mh3', question:'Reinforcement as per approved drawing — dia and spacing?', required:true },
      { id:'mh4', question:'Shuttering properly fixed and leak-free?', required:true },
      { id:'mh5', question:'Cover slab reinforcement and embedments correct?', required:true },
      { id:'mh6', question:'M25 RCC mix design approved by UEED?', required:true, referenceSpec:'IS 456-2000, Clause 9' },
      { id:'mh7', question:'CI footrests positioned at correct spacing?', required:true },
    ],
  },
  {
    title: 'Concrete Pour — M25 RCC',
    category: ChecklistCategory.CONCRETE,
    workItem: 'RCC Work',
    isTemplate: true,
    items: [
      { id:'cc1', question:'RMC transit mixer batch ticket verified?', required:true, referenceSpec:'IS 456-2000' },
      { id:'cc2', question:'Slump test done — within acceptable range?', required:true },
      { id:'cc3', question:'Cube samples taken (3 cubes per pour)?', required:true },
      { id:'cc4', question:'Vibration done properly — no segregation?', required:true },
      { id:'cc5', question:'Pour done in one continuous operation?', required:true },
      { id:'cc6', question:'Curing arrangement in place (water/cover)?', required:true, referenceSpec:'Min 10 days curing' },
    ],
  },
  {
    title: 'Material Inspection — Incoming',
    category: ChecklistCategory.MATERIAL,
    workItem: 'Material Receipt',
    isTemplate: true,
    items: [
      { id:'mi1', question:'Cement brand approved — Ultratech/Ambuja/ACC?', required:true, referenceSpec:'Clause 21.23' },
      { id:'mi2', question:'TMT steel — TATA/SAIL/RINL/Jindal brand?', required:true, referenceSpec:'Clause 21.23' },
      { id:'mi3', question:'Test certificates from manufacturer available?', required:true },
      { id:'mi4', question:'Quantity as per delivery challan verified?', required:true },
      { id:'mi5', question:'Material stored properly — cement off ground?', required:true },
    ],
  },
  {
    title: 'Sectional Flow Testing — Sewer Network',
    category: ChecklistCategory.TESTING,
    workItem: 'Sewer Testing',
    isTemplate: true,
    items: [
      { id:'sf1', question:'Section isolated with plugs at manholes?', required:true },
      { id:'sf2', question:'Section filled with water and held for 30 minutes?', required:true },
      { id:'sf3', question:'Water loss within acceptable limits?', required:true },
      { id:'sf4', question:'All joints checked for leakage?', required:true },
      { id:'sf5', question:'CCTV inspection done for pipe interiors?', required:false },
      { id:'sf6', question:'Test report signed by AEE, UEED?', required:true, referenceSpec:'Clause 23.3 — 10% payment' },
    ],
  },
  {
    title: 'Road Reinstatement — Final',
    category: ChecklistCategory.ROAD_RESTORATION,
    workItem: 'Road Cutting & Reinstatement',
    isTemplate: true,
    items: [
      { id:'rr1', question:'Sub-base compacted to 95% Proctor density?', required:true },
      { id:'rr2', question:'Aggregate base course laid to correct thickness?', required:true },
      { id:'rr3', question:'Bituminous surface matching original road?', required:true, referenceSpec:'BOQ Item 16.14.1' },
      { id:'rr4', question:'Edges of reinstatement properly sealed?', required:true },
      { id:'rr5', question:'Road markings reinstated where applicable?', required:false },
      { id:'rr6', question:'Traffic police clearance obtained?', required:true, referenceSpec:'Clause 20.1' },
    ],
  },
  {
    title: 'Safety Inspection — Daily Site Check',
    category: ChecklistCategory.SAFETY,
    workItem: 'Site Safety',
    isTemplate: true,
    items: [
      { id:'sa1', question:'All excavations barricaded and lit at night?', required:true },
      { id:'sa2', question:'Workers wearing PPE — helmets, boots, gloves?', required:true, referenceSpec:'Labour Safety Clause' },
      { id:'sa3', question:'First Aid box stocked and accessible?', required:true, referenceSpec:'Clause 3.2.2' },
      { id:'sa4', question:'Drinking water provided at site?', required:true, referenceSpec:'Clause 4.1' },
      { id:'sa5', question:'Fire extinguisher available near fuel storage?', required:true },
      { id:'sa6', question:'Emergency contact numbers displayed?', required:true },
    ],
  },
]

@Injectable()
export class QaService {
  constructor(
    @InjectRepository(QaChecklist)  private clRepo:  Repository<QaChecklist>,
    @InjectRepository(QaInspection) private inRepo:  Repository<QaInspection>,
    @InjectRepository(Ncr)          private ncrRepo: Repository<Ncr>,
  ) {}

  // ── Seed default checklists ─────────────────────────────
  async seedChecklists(projectId: string): Promise<{ seeded: number }> {
    const existing = await this.clRepo.count({ where: { projectId, isTemplate: true } })
    if (existing > 0) return { seeded: 0 }
    const items = DEFAULT_CHECKLISTS.map(c => this.clRepo.create({ ...c, projectId }))
    await this.clRepo.save(items)
    return { seeded: items.length }
  }

  // ── Checklists ──────────────────────────────────────────
  async listChecklists(projectId: string, category?: string) {
    const qb = this.clRepo.createQueryBuilder('c')
      .where('c.projectId = :pid', { pid: projectId })
      .andWhere('c.isActive = true')
      .orderBy('c.category', 'ASC')
    if (category) qb.andWhere('c.category = :cat', { cat: category })
    return qb.getMany()
  }

  async createChecklist(data: Partial<QaChecklist>): Promise<QaChecklist> {
    return this.clRepo.save(this.clRepo.create(data))
  }

  async getChecklist(id: string): Promise<QaChecklist> {
    const c = await this.clRepo.findOne({ where: { id } })
    if (!c) throw new NotFoundException('Checklist not found')
    return c
  }

  // ── Inspections ─────────────────────────────────────────
  async createInspection(data: any): Promise<QaInspection> {
    const responses = data.responses ?? []
    const passCount = responses.filter((r: any) => r.result === 'pass').length
    const failCount = responses.filter((r: any) => r.result === 'fail').length
    const naCount   = responses.filter((r: any) => r.result === 'na').length
    let overallResult = InspectionStatus.DRAFT
    if (data.submitted) {
      overallResult = failCount === 0 ? InspectionStatus.PASSED
        : failCount <= 2 ? InspectionStatus.CONDITIONAL
        : InspectionStatus.FAILED
    }
    return (this.inRepo.save(this.inRepo.create({
      ...data, passCount, failCount, naCount, overallResult,
    })) as any) as any
  }

  async listInspections(p: { projectId?: string; workItem?: string; result?: string; fromDate?: string; toDate?: string }) {
    const qb = this.inRepo.createQueryBuilder('i').orderBy('i.date', 'DESC')
    if (p.projectId) qb.andWhere('i.projectId = :pid', { pid: p.projectId })
    if (p.workItem)  qb.andWhere('i.workItem ILIKE :w', { w: '%'+p.workItem+'%' })
    if (p.result)    qb.andWhere('i.overallResult = :r', { r: p.result })
    if (p.fromDate)  qb.andWhere('i.date >= :from', { from: p.fromDate })
    if (p.toDate)    qb.andWhere('i.date <= :to', { to: p.toDate })
    return qb.getMany()
  }

  async getInspection(id: string): Promise<QaInspection> {
    const i = await this.inRepo.findOne({ where: { id } })
    if (!i) throw new NotFoundException('Inspection not found')
    return i
  }

  async updateInspection(id: string, data: any): Promise<QaInspection> {
    const responses = data.responses ?? []
    const passCount = responses.filter((r: any) => r.result === 'pass').length
    const failCount = responses.filter((r: any) => r.result === 'fail').length
    const naCount   = responses.filter((r: any) => r.result === 'na').length
    let overallResult = InspectionStatus.SUBMITTED
    if (failCount === 0) overallResult = InspectionStatus.PASSED
    else if (failCount <= 2) overallResult = InspectionStatus.CONDITIONAL
    else overallResult = InspectionStatus.FAILED
    await this.inRepo.update(id, { ...data, passCount, failCount, naCount, overallResult })
    return this.getInspection(id)
  }

  // ── NCRs ────────────────────────────────────────────────
  async createNcr(data: any): Promise<Ncr> {
    // Auto-generate NCR number
    const count = await this.ncrRepo.count({ where: { projectId: data.projectId } })
    const ncrNo = 'NCR-' + String(count + 1).padStart(4, '0')
    return this.ncrRepo.save(this.ncrRepo.create({ ...data, ncrNo })) as any as any
  }

  async listNcrs(p: { projectId?: string; status?: string; severity?: string }) {
    const qb = this.ncrRepo.createQueryBuilder('n').orderBy('n.date', 'DESC')
    if (p.projectId) qb.andWhere('n.projectId = :pid', { pid: p.projectId })
    if (p.status)    qb.andWhere('n.status = :s', { s: p.status })
    if (p.severity)  qb.andWhere('n.severity = :sev', { sev: p.severity })
    return qb.getMany()
  }

  async closeNcr(id: string, data: { correctiveAction: string; closedBy: string }): Promise<Ncr> {
    await this.ncrRepo.update(id, {
      ...data,
      status: NcrStatus.CLOSED,
      closedDate: new Date().toISOString().split('T')[0],
    })
    return this.ncrRepo.findOne({ where: { id } }) as Promise<Ncr>
  }

  // ── Dashboard ────────────────────────────────────────────
  async dashboard(projectId: string) {
    const inspections = await this.listInspections({ projectId })
    const ncrs        = await this.listNcrs({ projectId })
    const passed    = inspections.filter(i => i.overallResult === InspectionStatus.PASSED).length
    const failed    = inspections.filter(i => i.overallResult === InspectionStatus.FAILED).length
    const openNcrs  = ncrs.filter(n => n.status === NcrStatus.OPEN).length
    const critNcrs  = ncrs.filter(n => n.severity === 'critical' && n.status === NcrStatus.OPEN).length
    return {
      totalInspections: inspections.length,
      passed, failed,
      passRate: inspections.length > 0 ? (passed / inspections.length * 100).toFixed(1) : '0',
      totalNcrs: ncrs.length,
      openNcrs, critNcrs,
      closedNcrs: ncrs.filter(n => n.status === NcrStatus.CLOSED).length,
    }
  }
}