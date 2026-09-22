import { Injectable, NotFoundException, BadRequestException, Optional } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { OpsEvents } from '../ops-sync/ops-events'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { StorageService } from '../storage/storage.service'
import { QaChecklist, ChecklistCategory } from './qa-checklist.entity'
import { QaInspection, InspectionStatus } from './qa-inspection.entity'
import { Ncr, NcrStatus, NcrSeverity } from './ncr.entity'
import { CubeTest } from './cube-test.entity'
import { ConcreteStrengthPredictorService, CONCRETE_GRADE_CONFIGS } from './services/concrete-strength-predictor.service'
import { ConcreteGrade } from './dto/concrete-prediction.dto'
import { resolveListLimit } from '../common/list-limit'

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
    @InjectRepository(CubeTest)     private cubeRepo: Repository<CubeTest>,
    @Optional() private readonly concretePredictor?: ConcreteStrengthPredictorService,
    @Optional() private readonly events?: EventEmitter2,
    @Optional() private readonly storage?: StorageService,
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
    if (data.responses !== undefined && !Array.isArray(data.responses)) {
      throw new BadRequestException('responses must be an array')
    }
    const responses = data.responses ?? []
    if (responses.some((r: any) => !['pass', 'fail', 'na'].includes(r?.result))) {
      throw new BadRequestException('Inspection responses contain an invalid result')
    }
    if (!data.projectId) throw new BadRequestException('projectId is required')
    if (!data.workItem) throw new BadRequestException('workItem is required')
    if (!data.inspectedBy) throw new BadRequestException('inspectedBy is required')
    const passCount = responses.filter((r: any) => r.result === 'pass').length
    const failCount = responses.filter((r: any) => r.result === 'fail').length
    const naCount   = responses.filter((r: any) => r.result === 'na').length
    let overallResult = InspectionStatus.DRAFT
    if (data.submitted) {
      overallResult = failCount === 0 ? InspectionStatus.PASSED
        : failCount <= 2 ? InspectionStatus.CONDITIONAL
        : InspectionStatus.FAILED
    }
    const pending = data.pendingPhotos
    const rest = { ...data }
    delete rest.pendingPhotos
    const extraPhotos = this.storage ? await this.storage.ingestPendingPhotos(pending, 'qa') : []
    const photos = [...(Array.isArray(rest.photos) ? rest.photos : []), ...extraPhotos]
    return (this.inRepo.save(this.inRepo.create({
      ...rest, photos, passCount, failCount, naCount, overallResult,
    })) as any) as any
  }

  async listInspections(p: { projectId?: string; workItem?: string; result?: string; fromDate?: string; toDate?: string; limit?: string | number }) {
    const qb = this.inRepo.createQueryBuilder('i').orderBy('i.date', 'DESC')
    if (p.projectId) qb.andWhere('i.projectId = :pid', { pid: p.projectId })
    if (p.workItem)  qb.andWhere('i.workItem ILIKE :w', { w: '%'+p.workItem+'%' })
    if (p.result)    qb.andWhere('i.overallResult = :r', { r: p.result })
    if (p.fromDate)  qb.andWhere('i.date >= :from', { from: p.fromDate })
    if (p.toDate)    qb.andWhere('i.date <= :to', { to: p.toDate })
    return qb.take(resolveListLimit(p.limit)).getMany()
  }

  async getInspection(id: string): Promise<QaInspection> {
    const i = await this.inRepo.findOne({ where: { id } })
    if (!i) throw new NotFoundException('Inspection not found')
    return i
  }

  async updateInspection(id: string, data: any): Promise<QaInspection> {
    await this.getInspection(id)
    const updateData = { ...data }
    if (data.responses !== undefined) {
      if (!Array.isArray(data.responses)) {
        throw new BadRequestException('responses must be an array')
      }
      if (data.responses.some((r: any) => !['pass', 'fail', 'na'].includes(r?.result))) {
        throw new BadRequestException('Inspection responses contain an invalid result')
      }
      const passCount = data.responses.filter((r: any) => r.result === 'pass').length
      const failCount = data.responses.filter((r: any) => r.result === 'fail').length
      const naCount = data.responses.filter((r: any) => r.result === 'na').length
      updateData.passCount = passCount
      updateData.failCount = failCount
      updateData.naCount = naCount
      updateData.overallResult = failCount === 0
        ? InspectionStatus.PASSED
        : failCount <= 2
          ? InspectionStatus.CONDITIONAL
          : InspectionStatus.FAILED
    }
    await this.inRepo.update(id, updateData)
    return this.getInspection(id)
  }

  // ── NCRs ────────────────────────────────────────────────
  async createNcr(data: any): Promise<Ncr> {
    if (!data.projectId) throw new BadRequestException('projectId is required')
    if (!data.workItem?.trim()) throw new BadRequestException('workItem is required')
    if (!data.description?.trim()) throw new BadRequestException('description is required')
    // Auto-generate NCR number
    const count = await this.ncrRepo.count({ where: { projectId: data.projectId } })
    const ncrNo = 'NCR-' + String(count + 1).padStart(4, '0')
    const saved = await this.ncrRepo.save(this.ncrRepo.create({ ...data, ncrNo })) as any
    this.events?.emit(OpsEvents.NCR_OPENED, saved)
    return saved
  }

  async listNcrs(p: { projectId?: string; status?: string; severity?: string; limit?: string | number }) {
    const qb = this.ncrRepo.createQueryBuilder('n').orderBy('n.date', 'DESC')
    if (p.projectId) qb.andWhere('n.projectId = :pid', { pid: p.projectId })
    if (p.status)    qb.andWhere('n.status = :s', { s: p.status })
    if (p.severity)  qb.andWhere('n.severity = :sev', { sev: p.severity })
    return qb.take(resolveListLimit(p.limit)).getMany()
  }

  async verifyNcr(id: string, verifiedBy: string): Promise<Ncr> {
    const existing = await this.ncrRepo.findOne({ where: { id } })
    if (!existing) throw new NotFoundException('NCR not found')
    await this.ncrRepo.update(id, { verifiedBy, verifiedAt: new Date(), status: NcrStatus.UNDER_REVIEW })
    return this.ncrRepo.findOne({ where: { id } }) as Promise<Ncr>
  }

  async closeNcr(id: string, data: { correctiveAction: string; closedBy: string }): Promise<Ncr> {
    if (!data.correctiveAction?.trim()) throw new BadRequestException('Corrective action is required')
    const existing = await this.ncrRepo.findOne({ where: { id } })
    if (!existing) throw new NotFoundException('NCR not found')
    if ((existing.severity === NcrSeverity.MAJOR || existing.severity === NcrSeverity.CRITICAL) && !existing.verifiedBy) {
      throw new BadRequestException('Major and critical NCRs must be verified before close')
    }
    if (existing.verifiedBy && existing.verifiedBy === data.closedBy) {
      throw new BadRequestException('The verifier cannot also close this NCR')
    }
    await this.ncrRepo.update(id, {
      ...data,
      status: NcrStatus.CLOSED,
      closedDate: new Date().toISOString().split('T')[0],
    })
    const closed = await this.ncrRepo.findOne({ where: { id } }) as Ncr
    this.events?.emit(OpsEvents.NCR_CLOSED, closed)
    return closed
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

  // ── Cube Testing Laboratory ───────────────────────────────
  async listCubeTests(projectId: string, status?: string) {
    const qb = this.cubeRepo.createQueryBuilder('c')
      .where('c.projectId = :pid', { pid: projectId })
      .orderBy('c.castDate', 'DESC')
      .addOrderBy('c.createdAt', 'DESC')

    if (status && status !== 'all') {
      qb.andWhere('c.overallStatus = :st', { st: status })
    }

    const items = await qb.getMany()
    const today = new Date().toISOString().split('T')[0]

    const pending7d = items.filter(i => i.status7d === 'PENDING' && i.test7dDate && i.test7dDate <= today).length
    const pending28d = items.filter(i => i.status28d === 'PENDING' && i.test28dDate && i.test28dDate <= today).length
    const completedPassed = items.filter(i => i.status28d === 'PASSED').length
    const completedFailed = items.filter(i => i.status28d === 'FAILED').length
    const totalTested28d = completedPassed + completedFailed
    const passRate = totalTested28d > 0 ? ((completedPassed / totalTested28d) * 100).toFixed(1) : '100.0'

    return {
      items,
      stats: {
        totalSets: items.length,
        pending7d,
        pending28d,
        completedPassed,
        completedFailed,
        passRate,
      },
    }
  }

  async createCubeTest(dto: {
    projectId: string
    sampleCode: string
    pourLocation: string
    structureElement?: string
    grade: string
    cementType?: string
    castDate: string
    batchOrMixId?: string
    curingMethod?: string
    curingTempCelsius?: number
    technicianName?: string
    remarks?: string
  }) {
    if (!dto.projectId) throw new BadRequestException('Project ID is required')
    if (!dto.sampleCode) throw new BadRequestException('Sample code is required')
    if (!dto.pourLocation) throw new BadRequestException('Pour location is required')
    if (!dto.grade) throw new BadRequestException('Concrete grade is required')
    if (!dto.castDate) throw new BadRequestException('Cast date is required')

    const config = CONCRETE_GRADE_CONFIGS[dto.grade as ConcreteGrade]
    const fckRequiredMpa = config?.fck ?? 25.0

    const cast = new Date(dto.castDate)
    const d7 = new Date(cast)
    d7.setDate(d7.getDate() + 7)
    const d28 = new Date(cast)
    d28.setDate(d28.getDate() + 28)

    const cube = this.cubeRepo.create({
      projectId: dto.projectId,
      sampleCode: dto.sampleCode,
      pourLocation: dto.pourLocation,
      structureElement: dto.structureElement || 'General RCC',
      grade: dto.grade,
      cementType: dto.cementType || 'OPC_53',
      castDate: dto.castDate,
      test7dDate: d7.toISOString().split('T')[0],
      test28dDate: d28.toISOString().split('T')[0],
      batchOrMixId: dto.batchOrMixId,
      curingMethod: dto.curingMethod || 'Water Curing',
      curingTempCelsius: dto.curingTempCelsius ?? 20.0,
      fckRequiredMpa,
      status7d: 'PENDING',
      status28d: 'PENDING',
      overallStatus: 'CAST',
      technicianName: dto.technicianName,
      remarks: dto.remarks,
    })

    return this.cubeRepo.save(cube)
  }

  async record7DayBreak(id: string, dto: {
    loads7dKn: number[]
    curingTempCelsius?: number
    remarks?: string
  }) {
    const cube = await this.cubeRepo.findOne({ where: { id } })
    if (!cube) throw new NotFoundException('Cube test record not found')

    const loads = (dto.loads7dKn || []).map(Number).filter(l => l > 0)
    if (loads.length === 0) {
      throw new BadRequestException('At least one positive crushing load (kN) must be provided')
    }

    const mpaValues = loads.map(l => (this.concretePredictor?.convertLoadToStrengthMpa(l, 150) ?? +( (l * 1000) / 22500 ).toFixed(2)))
    const avgStrength7dMpa = +(mpaValues.reduce((a, b) => a + b, 0) / mpaValues.length).toFixed(2)

    let predicted28dMpa = avgStrength7dMpa * 1.5 // baseline default
    if (this.concretePredictor) {
      const pred = this.concretePredictor.predict28DayStrength({
        grade: cube.grade as any,
        testAgeDays: 7,
        measuredLoadsKn: loads,
        cementType: cube.cementType as any,
        curingTemperatureCelsius: dto.curingTempCelsius ?? cube.curingTempCelsius,
      })
      predicted28dMpa = pred.predicted28dStrengthMpa ?? pred.assessedStrengthMpa
    }

    let status7d = 'ON_TRACK'
    if (predicted28dMpa < cube.fckRequiredMpa * 0.85) {
      status7d = 'FAILED'
    } else if (predicted28dMpa < cube.fckRequiredMpa) {
      status7d = 'AT_RISK'
    }

    cube.load7d1Kn = loads[0] ?? undefined
    cube.load7d2Kn = loads[1] ?? undefined
    cube.load7d3Kn = loads[2] ?? undefined
    cube.avgStrength7dMpa = avgStrength7dMpa
    cube.predicted28dMpa = predicted28dMpa
    cube.status7d = status7d
    cube.overallStatus = '7D_TESTED'
    if (dto.remarks) cube.remarks = cube.remarks ? `${cube.remarks}\n7D: ${dto.remarks}` : dto.remarks

    return this.cubeRepo.save(cube)
  }

  async record28DayBreak(id: string, dto: {
    loads28dKn: number[]
    remarks?: string
  }) {
    const cube = await this.cubeRepo.findOne({ where: { id } })
    if (!cube) throw new NotFoundException('Cube test record not found')

    const loads = (dto.loads28dKn || []).map(Number).filter(l => l > 0)
    if (loads.length === 0) {
      throw new BadRequestException('At least one positive crushing load (kN) must be provided')
    }

    const mpaValues = loads.map(l => (this.concretePredictor?.convertLoadToStrengthMpa(l, 150) ?? +( (l * 1000) / 22500 ).toFixed(2)))
    const avgStrength28dMpa = +(mpaValues.reduce((a, b) => a + b, 0) / mpaValues.length).toFixed(2)

    const passed = avgStrength28dMpa >= cube.fckRequiredMpa
    const status28d = passed ? 'PASSED' : 'FAILED'
    const overallStatus = passed ? 'COMPLETED_PASSED' : 'COMPLETED_FAILED'

    cube.load28d1Kn = loads[0] ?? undefined
    cube.load28d2Kn = loads[1] ?? undefined
    cube.load28d3Kn = loads[2] ?? undefined
    cube.avgStrength28dMpa = avgStrength28dMpa
    cube.status28d = status28d
    cube.overallStatus = overallStatus
    if (dto.remarks) cube.remarks = cube.remarks ? `${cube.remarks}\n28D: ${dto.remarks}` : dto.remarks

    return this.cubeRepo.save(cube)
  }

  async deleteCubeTest(id: string) {
    const existing = await this.cubeRepo.findOne({ where: { id } })
    if (!existing) throw new NotFoundException('Cube test record not found')
    await this.cubeRepo.delete(id)
    return { ok: true }
  }
}
