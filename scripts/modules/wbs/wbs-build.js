// Run from project root: node scripts/modules/wbs/build.js
const fs   = require('fs')
const path = require('path')

const WBS  = path.join('backend', 'src', 'wbs')
const SRC  = path.join('backend', 'src')
const FSRC = path.join('frontend', 'src')

const G = '\x1b[32m', NC = '\x1b[0m'
const ok = s => console.log(G + '  ✓' + NC + ' ' + s)

if (!fs.existsSync(SRC)) { console.error('Run from ~/Desktop/kipl-srinagar'); process.exit(1) }
fs.mkdirSync(WBS, { recursive: true })
fs.mkdirSync(path.join(FSRC, 'pages', 'wbs'), { recursive: true })

console.log('\n\x1b[1mBuilding WBS / Gantt Module\x1b[0m\n')
console.log('  Tender Clause 17 — Time Schedule & Progress\n')

// ── Entity ────────────────────────────────────────────────────
fs.writeFileSync(path.join(WBS, 'wbs-task.entity.ts'), `import { Entity, Column } from 'typeorm'
import { BaseEntity } from '../shared/entities/base.entity'

export enum TaskStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED   = 'completed',
  DELAYED     = 'delayed',
  ON_HOLD     = 'on_hold',
}

export enum TaskLevel { WBS1 = 1, WBS2 = 2, WBS3 = 3 }

@Entity('wbs_tasks')
export class WbsTask extends BaseEntity {
  @Column({ name: 'project_id' }) projectId: string
  @Column({ name: 'wbs_code' }) wbsCode: string
  @Column() title: string
  @Column({ type: 'text', nullable: true }) description: string
  @Column({ default: 1 }) level: number
  @Column({ name: 'parent_id', nullable: true }) parentId: string
  @Column({ name: 'sort_order', default: 0 }) sortOrder: number

  // Schedule
  @Column({ name: 'planned_start', type: 'date' }) plannedStart: string
  @Column({ name: 'planned_end', type: 'date' }) plannedEnd: string
  @Column({ name: 'planned_duration', default: 0 }) plannedDuration: number
  @Column({ name: 'actual_start', type: 'date', nullable: true }) actualStart: string
  @Column({ name: 'actual_end', type: 'date', nullable: true }) actualEnd: string

  // Progress
  @Column({ name: 'progress_pct', type: 'decimal', precision: 5, scale: 1, default: 0 }) progressPct: number
  @Column({ type: 'enum', enum: TaskStatus, default: TaskStatus.NOT_STARTED }) status: TaskStatus

  // Milestones & payment
  @Column({ name: 'is_milestone', default: false }) isMilestone: boolean
  @Column({ name: 'payment_milestone', nullable: true }) paymentMilestone: string
  @Column({ name: 'payment_pct', type: 'decimal', precision: 5, scale: 2, default: 0 }) paymentPct: number

  // Responsibility
  @Column({ nullable: true }) responsible: string
  @Column({ nullable: true }) remarks: string

  // Delay tracking
  @Column({ name: 'delay_days', default: 0 }) delayDays: number
  @Column({ name: 'delay_reason', type: 'text', nullable: true }) delayReason: string
  @Column({ name: 'eot_applied', default: false }) eotApplied: boolean
  @Column({ name: 'eot_days', default: 0 }) eotDays: number
}
`)
ok('wbs-task.entity.ts')

// ── Seed data — real Dal Lake schedule from tender ────────────
const SEED_TASKS = [
  // Level 1 — Main phases
  { wbsCode:'1',   title:'Survey, Design & Vetting',        level:1, sortOrder:1,  plannedStart:'2025-11-07', plannedEnd:'2025-12-21', plannedDuration:45,  isMilestone:false, paymentPct:5,  paymentMilestone:'Survey & Vetting of Design' },
  { wbsCode:'2',   title:'Sewer Network — Civil Works',      level:1, sortOrder:2,  plannedStart:'2025-12-22', plannedEnd:'2027-02-06', plannedDuration:411, isMilestone:false, paymentPct:55, paymentMilestone:'Pipe Laying & Backfilling' },
  { wbsCode:'3',   title:'IPS Construction — Civil',         level:1, sortOrder:3,  plannedStart:'2025-12-22', plannedEnd:'2027-02-06', plannedDuration:411, isMilestone:false, paymentPct:30, paymentMilestone:'Civil Structure Work' },
  { wbsCode:'4',   title:'STP Construction (30 MLD)',        level:1, sortOrder:4,  plannedStart:'2025-12-22', plannedEnd:'2027-05-06', plannedDuration:500, isMilestone:false, paymentPct:30, paymentMilestone:'Civil Structure Work' },
  { wbsCode:'5',   title:'Rising Mains & Appurtenances',     level:1, sortOrder:5,  plannedStart:'2026-03-01', plannedEnd:'2027-02-06', plannedDuration:342, isMilestone:false, paymentPct:55, paymentMilestone:'Pipe Laying & Backfilling' },
  { wbsCode:'6',   title:'E&M Works — IPS & STP',            level:1, sortOrder:6,  plannedStart:'2026-09-01', plannedEnd:'2027-09-06', plannedDuration:370, isMilestone:false, paymentPct:40, paymentMilestone:'Delivery at Site after TPI' },
  { wbsCode:'7',   title:'Road Reinstatement',               level:1, sortOrder:7,  plannedStart:'2026-06-01', plannedEnd:'2027-11-06', plannedDuration:523, isMilestone:false, paymentPct:20, paymentMilestone:'Permanent Road Reinstatement' },
  { wbsCode:'8',   title:'Testing & Commissioning',          level:1, sortOrder:8,  plannedStart:'2027-09-01', plannedEnd:'2027-11-06', plannedDuration:66,  isMilestone:false, paymentPct:10, paymentMilestone:'Sectional Flow Testing' },
  { wbsCode:'9',   title:'Free Trial Run (6 Months)',        level:1, sortOrder:9,  plannedStart:'2027-11-07', plannedEnd:'2028-05-06', plannedDuration:181, isMilestone:true,  paymentPct:5,  paymentMilestone:'Trial Run Completion' },
  { wbsCode:'10',  title:'O&M Period (5 Years)',             level:1, sortOrder:10, plannedStart:'2028-05-07', plannedEnd:'2033-05-06', plannedDuration:1825,isMilestone:false, paymentPct:5,  paymentMilestone:'O&M Year 1' },

  // Level 2 — Sewer Network breakdown
  { wbsCode:'2.1', title:'200mm dia RCC NP3 Pipes (184,793m)',level:2, sortOrder:11, plannedStart:'2025-12-22', plannedEnd:'2026-12-31', plannedDuration:374, isMilestone:false, parentId:'2', responsible:'Civil Team' },
  { wbsCode:'2.2', title:'300-500mm dia Pipes',              level:2, sortOrder:12, plannedStart:'2026-01-01', plannedEnd:'2027-01-31', plannedDuration:395, isMilestone:false, parentId:'2', responsible:'Civil Team' },
  { wbsCode:'2.3', title:'700-1000mm dia Pipes',             level:2, sortOrder:13, plannedStart:'2026-03-01', plannedEnd:'2027-02-06', plannedDuration:342, isMilestone:false, parentId:'2', responsible:'Civil Team' },
  { wbsCode:'2.4', title:'RCC Manholes (3,728 Nos)',          level:2, sortOrder:14, plannedStart:'2025-12-22', plannedEnd:'2027-02-06', plannedDuration:411, isMilestone:false, parentId:'2', responsible:'Civil Team' },
  { wbsCode:'2.5', title:'Masonry Chambers (15,814 Nos)',     level:2, sortOrder:15, plannedStart:'2026-01-01', plannedEnd:'2027-02-06', plannedDuration:401, isMilestone:false, parentId:'2', responsible:'Civil Team' },

  // Level 2 — IPS breakdown
  { wbsCode:'3.1', title:'IPS-1 at Node 102',                level:2, sortOrder:16, plannedStart:'2025-12-22', plannedEnd:'2026-09-30', plannedDuration:282, isMilestone:false, parentId:'3', responsible:'Civil Team' },
  { wbsCode:'3.2', title:'IPS-3 at Node 1053',               level:2, sortOrder:17, plannedStart:'2026-01-01', plannedEnd:'2026-12-31', plannedDuration:365, isMilestone:false, parentId:'3', responsible:'Civil Team' },
  { wbsCode:'3.3', title:'IPS-5 at Node 1532',               level:2, sortOrder:18, plannedStart:'2026-03-01', plannedEnd:'2027-01-31', plannedDuration:336, isMilestone:false, parentId:'3', responsible:'Civil Team' },
  { wbsCode:'3.4', title:'IPS-9 at Node 4011 (Largest)',      level:2, sortOrder:19, plannedStart:'2026-01-01', plannedEnd:'2027-02-06', plannedDuration:401, isMilestone:false, parentId:'3', responsible:'Civil Team' },
  { wbsCode:'3.5', title:'MPS at Habak',                     level:2, sortOrder:20, plannedStart:'2026-06-01', plannedEnd:'2027-02-06', plannedDuration:250, isMilestone:false, parentId:'3', responsible:'Civil Team' },

  // Key milestones
  { wbsCode:'M1',  title:'MILESTONE: Design Approval from UEED', level:1, sortOrder:21, plannedStart:'2025-12-21', plannedEnd:'2025-12-21', plannedDuration:0, isMilestone:true, paymentMilestone:'Design Approval' },
  { wbsCode:'M2',  title:'MILESTONE: RA-1 Bill Submission',       level:1, sortOrder:22, plannedStart:'2026-04-07', plannedEnd:'2026-04-07', plannedDuration:0, isMilestone:true, paymentMilestone:'RA-1 (5% of net)' },
  { wbsCode:'M3',  title:'MILESTONE: 30% Network Complete',       level:1, sortOrder:23, plannedStart:'2026-09-30', plannedEnd:'2026-09-30', plannedDuration:0, isMilestone:true, paymentMilestone:'Interim Progress' },
  { wbsCode:'M4',  title:'MILESTONE: All IPS Civil Complete',     level:1, sortOrder:24, plannedStart:'2027-02-06', plannedEnd:'2027-02-06', plannedDuration:0, isMilestone:true, paymentMilestone:'Civil Completion' },
  { wbsCode:'M5',  title:'MILESTONE: STP Commissioned',           level:1, sortOrder:25, plannedStart:'2027-09-06', plannedEnd:'2027-09-06', plannedDuration:0, isMilestone:true, paymentMilestone:'STP Testing & Commissioning' },
  { wbsCode:'M6',  title:'MILESTONE: Completion Certificate',     level:1, sortOrder:26, plannedStart:'2027-11-06', plannedEnd:'2027-11-06', plannedDuration:0, isMilestone:true, paymentMilestone:'Completion Certificate by UEED' },
]

// ── Service ───────────────────────────────────────────────────
fs.writeFileSync(path.join(WBS, 'wbs.service.ts'), `import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { WbsTask, TaskStatus } from './wbs-task.entity'

const SEED_TASKS = ${JSON.stringify(SEED_TASKS, null, 2)}

@Injectable()
export class WbsService {
  constructor(@InjectRepository(WbsTask) private repo: Repository<WbsTask>) {}

  async seed(projectId: string): Promise<{ seeded: number }> {
    const existing = await this.repo.count({ where: { projectId } })
    if (existing > 0) return { seeded: 0 }
    const tasks = SEED_TASKS.map(t => this.repo.create({ ...t, projectId, status: TaskStatus.NOT_STARTED, progressPct: 0 }))
    await this.repo.save(tasks)
    return { seeded: tasks.length }
  }

  async list(projectId: string) {
    return this.repo.find({ where: { projectId }, order: { sortOrder: 'ASC' } })
  }

  async update(id: string, data: any): Promise<WbsTask> {
    // Auto-calculate delay days
    if (data.plannedEnd && data.actualEnd) {
      const planned = new Date(data.plannedEnd)
      const actual  = new Date(data.actualEnd)
      data.delayDays = Math.max(0, Math.round((actual.getTime() - planned.getTime()) / 86400000))
    } else if (data.plannedEnd && data.progressPct < 100) {
      const today   = new Date()
      const planned = new Date(data.plannedEnd)
      if (today > planned) {
        data.delayDays = Math.round((today.getTime() - planned.getTime()) / 86400000)
        if (!data.status) data.status = TaskStatus.DELAYED
      }
    }
    await this.repo.update(id, data)
    return this.repo.findOne({ where: { id } }) as Promise<WbsTask>
  }

  async create(data: any): Promise<WbsTask> {
    const count = await this.repo.count({ where: { projectId: data.projectId } })
    return this.repo.save(this.repo.create({ ...data, sortOrder: count + 1 })) as any
  }

  async dashboard(projectId: string) {
    const tasks = await this.list(projectId)
    const nonMilestones = tasks.filter(t => !t.isMilestone)
    const total     = nonMilestones.length
    const completed = nonMilestones.filter(t => t.status === TaskStatus.COMPLETED).length
    const delayed   = nonMilestones.filter(t => t.status === TaskStatus.DELAYED || t.delayDays > 0).length
    const inProg    = nonMilestones.filter(t => t.status === TaskStatus.IN_PROGRESS).length
    const avgProg   = total > 0 ? nonMilestones.reduce((s, t) => s + Number(t.progressPct), 0) / total : 0
    const milestones = tasks.filter(t => t.isMilestone)
    const passedMs   = milestones.filter(t => {
      return t.status === TaskStatus.COMPLETED || new Date(t.plannedEnd) < new Date()
    })
    const contractEnd = new Date('2027-11-06')
    const today       = new Date()
    const daysRemaining = Math.round((contractEnd.getTime() - today.getTime()) / 86400000)
    const contractPct   = Math.min(100, Math.max(0,
      (today.getTime() - new Date('2025-11-07').getTime()) /
      (contractEnd.getTime() - new Date('2025-11-07').getTime()) * 100
    )).toFixed(1)
    return {
      totalTasks: total, completed, delayed, inProgress: inProg,
      overallProgress: avgProg.toFixed(1),
      milestones: milestones.length, milestonesHit: passedMs.length,
      daysRemaining, contractPct,
      contractEnd: '2027-11-06',
    }
  }
}
`)
ok('wbs.service.ts — seeded with real Dal Lake schedule')

// ── Controller ────────────────────────────────────────────────
fs.writeFileSync(path.join(WBS, 'wbs.controller.ts'), `import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common'
import { WbsService } from './wbs.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'

@Controller('wbs') @UseGuards(JwtAuthGuard)
export class WbsController {
  constructor(private readonly svc: WbsService) {}

  @Get('dashboard')
  dashboard(@Query('projectId') pid: string) { return this.svc.dashboard(pid) }

  @Get()
  list(@Query('projectId') pid: string) { return this.svc.list(pid) }

  @Post('seed') @HttpCode(HttpStatus.CREATED)
  seed(@Body('projectId') pid: string) { return this.svc.seed(pid) }

  @Post() @HttpCode(HttpStatus.CREATED)
  create(@Body() body: any) { return this.svc.create(body) }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) { return this.svc.update(id, body) }
}
`)
ok('wbs.controller.ts')

// ── Module ────────────────────────────────────────────────────
fs.writeFileSync(path.join(WBS, 'wbs.module.ts'), `import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { WbsTask } from './wbs-task.entity'
import { WbsService } from './wbs.service'
import { WbsController } from './wbs.controller'

@Module({
  imports: [TypeOrmModule.forFeature([WbsTask])],
  providers: [WbsService],
  controllers: [WbsController],
  exports: [WbsService],
})
export class WbsModule {}
`)
ok('wbs.module.ts')

// Register in app.module.ts
const appPath = path.join(SRC, 'app.module.ts')
let app = fs.readFileSync(appPath, 'utf8')
if (!app.includes("from './wbs/wbs.module'")) {
  app = app.replace("import { MeetingModule }", "import { WbsModule } from './wbs/wbs.module'\nimport { MeetingModule }")
  app = app.replace('MeetingModule,', 'MeetingModule,\n    WbsModule,')
  fs.writeFileSync(appPath, app)
  ok('WbsModule registered in app.module.ts')
} else { ok('Already registered') }

// ── Frontend API ──────────────────────────────────────────────
fs.writeFileSync(path.join(FSRC, 'api', 'wbs.api.ts'), `import api from './client'
export const wbsApi = {
  dashboard: (projectId: string) => api.get('/api/v1/wbs/dashboard', { params: { projectId } }),
  list:      (projectId: string) => api.get('/api/v1/wbs', { params: { projectId } }),
  seed:      (projectId: string) => api.post('/api/v1/wbs/seed', { projectId }),
  create:    (d: any) => api.post('/api/v1/wbs', d),
  update:    (id: string, d: any) => api.patch('/api/v1/wbs/' + id, d),
}
`)
ok('wbs.api.ts')

// ── Frontend Page ─────────────────────────────────────────────
fs.writeFileSync(path.join(FSRC, 'pages', 'wbs', 'WbsPage.tsx'), `import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, ChartBar, Flag, Warning } from '@phosphor-icons/react'
import { wbsApi } from '@/api/wbs.api'
import { useAuthStore } from '@/store/auth.store'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'

const C = {
  card:'#fff', border:'#e2e8f0', text1:'#0f172a', text2:'#475569', text3:'#94a3b8',
  blue:'#2563eb', green:'#059669', amber:'#d97706', red:'#dc2626', navy:'#1a2540',
}

const STATUS_COLORS: Record<string, { bg:string; color:string; border:string }> = {
  not_started: { bg:'#f8fafc', color:'#64748b', border:'#e2e8f0' },
  in_progress: { bg:'#eff6ff', color:'#1d4ed8', border:'#bfdbfe' },
  completed:   { bg:'#ecfdf5', color:'#047857', border:'#a7f3d0' },
  delayed:     { bg:'#fef2f2', color:'#b91c1c', border:'#fecaca' },
  on_hold:     { bg:'#fffbeb', color:'#b45309', border:'#fde68a' },
}

const STATUS_OPTIONS = [
  { value:'not_started', label:'Not Started' },
  { value:'in_progress', label:'In Progress' },
  { value:'completed',   label:'Completed'   },
  { value:'delayed',     label:'Delayed'     },
  { value:'on_hold',     label:'On Hold'     },
]

type Tab = 'gantt' | 'list' | 'milestones'

// Gantt bar renderer
function GanttBar({ task, projectStart, totalDays }: { task: any; projectStart: Date; totalDays: number }) {
  const start   = new Date(task.plannedStart)
  const end     = new Date(task.plannedEnd)
  const left    = Math.max(0, (start.getTime() - projectStart.getTime()) / 86400000 / totalDays * 100)
  const width   = Math.max(0.3, (end.getTime() - start.getTime()) / 86400000 / totalDays * 100)
  const today   = new Date()
  const todayPct = (today.getTime() - projectStart.getTime()) / 86400000 / totalDays * 100

  const isDelayed = task.status === 'delayed' || (task.delayDays > 0)
  const barColor  = task.isMilestone ? C.amber
    : task.status === 'completed' ? C.green
    : task.status === 'delayed'   ? C.red
    : task.status === 'in_progress' ? C.blue
    : '#94a3b8'

  if (task.isMilestone) {
    return (
      <div style={{ position:'relative', height:24 }}>
        <div style={{ position:'absolute', left: left + '%', top:'50%', transform:'translate(-50%, -50%)', width:14, height:14, background:C.amber, transform:'rotate(45deg)', border:'2px solid #92400e', zIndex:2 }} />
      </div>
    )
  }

  return (
    <div style={{ position:'relative', height:24 }}>
      {/* Bar background */}
      <div style={{ position:'absolute', left:left+'%', width:width+'%', top:4, height:16, background:barColor+'30', borderRadius:4, border:'1.5px solid '+barColor+'50' }}>
        {/* Progress fill */}
        <div style={{ width:Number(task.progressPct)+'%', height:'100%', background:barColor, borderRadius:3, opacity:0.85 }} />
      </div>
      {/* Delay indicator */}
      {isDelayed && task.delayDays > 0 && (
        <div style={{ position:'absolute', left:(left+width)+'%', top:4, height:16, width: Math.min(task.delayDays/totalDays*100, 5)+'%', background:C.red+'50', borderRadius:'0 4px 4px 0' }} />
      )}
    </div>
  )
}

export default function WbsPage() {
  const { activeProjectId } = useAuthStore()
  const qc = useQueryClient()
  const [tab, setTab]         = useState<Tab>('gantt')
  const [editTask, setEdit]   = useState<any>(null)
  const [editForm, setEditForm] = useState<any>({})
  const [showNew, setShowNew] = useState(false)
  const [newForm, setNewForm] = useState({
    wbsCode:'', title:'', level:2, plannedStart:'', plannedEnd:'',
    status:'not_started', progressPct:'0', responsible:'', remarks:'',
  })

  const { data: dash } = useQuery({
    queryKey: ['wbs-dash', activeProjectId],
    queryFn:  () => wbsApi.dashboard(activeProjectId!).then(r => r.data),
    enabled:  !!activeProjectId,
  })

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['wbs', activeProjectId],
    queryFn:  () => wbsApi.list(activeProjectId!).then(r => r.data),
    enabled:  !!activeProjectId,
  })

  const seedM = useMutation({
    mutationFn: () => wbsApi.seed(activeProjectId!),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['wbs'] }); qc.invalidateQueries({ queryKey: ['wbs-dash'] }) },
  })

  const updateM = useMutation({
    mutationFn: () => wbsApi.update(editTask.id, editForm),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['wbs'] }); qc.invalidateQueries({ queryKey: ['wbs-dash'] }); setEdit(null) },
  })

  const createM = useMutation({
    mutationFn: () => wbsApi.create({ ...newForm, projectId: activeProjectId, progressPct: parseFloat(newForm.progressPct)||0 }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['wbs'] }); setShowNew(false) },
  })

  const list       = tasks ?? []
  const milestones = list.filter((t: any) => t.isMilestone)
  const workItems  = list.filter((t: any) => !t.isMilestone)
  const noTasks    = list.length === 0 && !isLoading

  // Gantt setup
  const projectStart = new Date('2025-11-07')
  const projectEnd   = new Date('2027-11-06')
  const totalDays    = (projectEnd.getTime() - projectStart.getTime()) / 86400000
  const today        = new Date()
  const todayPct     = Math.min(100, Math.max(0, (today.getTime() - projectStart.getTime()) / 86400000 / totalDays * 100))

  // Month labels for Gantt header
  const months: string[] = []
  const d = new Date(projectStart)
  while (d <= projectEnd) {
    months.push(d.toLocaleDateString('en-IN', { month:'short', year:'2-digit' }))
    d.setMonth(d.getMonth() + 3)
  }

  function openEdit(task: any) {
    setEdit(task)
    setEditForm({
      progressPct: task.progressPct,
      status: task.status,
      actualStart: task.actualStart ?? '',
      actualEnd: task.actualEnd ?? '',
      remarks: task.remarks ?? '',
      delayReason: task.delayReason ?? '',
      eotApplied: task.eotApplied ?? false,
      eotDays: task.eotDays ?? 0,
    })
  }

  return (
    <div className="fade-in" style={{ display:'flex', flexDirection:'column', gap:24 }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:800, color:C.text1, margin:0, letterSpacing:'-0.02em' }}>WBS & Schedule</h1>
          <p style={{ fontSize:14, color:C.text3, marginTop:4 }}>Clause 17 — Time Schedule · Milestones · Progress Tracking</p>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          {noTasks && (
            <Button variant="secondary" loading={seedM.isPending} onClick={() => seedM.mutate()}>Load Dal Lake Schedule</Button>
          )}
          <Button variant="primary" icon={<Plus size={15}/>} onClick={() => setShowNew(true)}>Add Task</Button>
        </div>
      </div>

      {/* Contract progress banner */}
      {dash && (
        <div style={{ background:C.navy, borderRadius:14, padding:'16px 24px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
            <div>
              <p style={{ fontSize:11, color:'rgba(255,255,255,0.4)', margin:'0 0 4px', textTransform:'uppercase', letterSpacing:'0.08em' }}>Contract Progress — Dal Lake EPC</p>
              <p style={{ fontSize:13, color:'rgba(255,255,255,0.7)', margin:0 }}>Allotment: 07-Nov-2025 → Completion: 06-Nov-2027 (30 months)</p>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:28, fontWeight:900, color:'#93c5fd' }}>{dash.contractPct}%</div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)' }}>Contract time elapsed</div>
            </div>
          </div>
          <div style={{ height:8, background:'rgba(255,255,255,0.1)', borderRadius:999, overflow:'hidden' }}>
            <div style={{ height:'100%', width:dash.contractPct+'%', background:'linear-gradient(90deg, #3b82f6, #06b6d4)', borderRadius:999, transition:'width 1s' }} />
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:8, fontSize:11, color:'rgba(255,255,255,0.35)' }}>
            <span>07 Nov 2025</span>
            <span style={{ color:'rgba(255,255,255,0.6)', fontWeight:600 }}>{dash.daysRemaining} days remaining</span>
            <span>06 Nov 2027</span>
          </div>
        </div>
      )}

      {/* KPI cards */}
      {dash && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:14 }}>
          {[
            { label:'Overall Progress',   value: dash.overallProgress+'%',           color: C.blue },
            { label:'Tasks In Progress',  value: dash.inProgress,                    color: C.blue },
            { label:'Completed',          value: dash.completed+'/'+dash.totalTasks, color: C.green },
            { label:'Delayed Tasks',      value: dash.delayed,                       color: dash.delayed > 0 ? C.red : C.green },
            { label:'Milestones Hit',     value: dash.milestonesHit+'/'+dash.milestones, color: C.amber },
          ].map(k => (
            <div key={k.label} style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:12, padding:'14px 16px', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize:10, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:6 }}>{k.label}</div>
              <div style={{ fontSize:20, fontWeight:800, color:k.color }}>{k.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display:'flex', borderBottom:'1.5px solid '+C.border }}>
        {([['gantt','Gantt Chart'],['list','Task List'],['milestones','Milestones']] as const).map(([t,l]) => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding:'10px 20px', fontSize:13, fontWeight:600, border:'none', background:'none', cursor:'pointer',
            borderBottom: tab===t ? '2px solid '+C.blue : '2px solid transparent',
            color: tab===t ? C.blue : C.text3, marginBottom:-1,
          }}>{l}</button>
        ))}
      </div>

      {/* Gantt Chart */}
      {tab === 'gantt' && (
        <div style={{ background:C.card, borderRadius:16, border:'1.5px solid '+C.border, overflow:'hidden', boxShadow:'0 1px 6px rgba(0,0,0,0.05)' }}>
          {isLoading ? <div style={{ display:'flex', justifyContent:'center', padding:40 }}><Spinner /></div>
          : noTasks ? (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'56px 24px', gap:12 }}>
              <ChartBar size={36} color={C.border} />
              <p style={{ fontSize:14, fontWeight:600, color:C.text3, margin:0 }}>No schedule loaded</p>
              <Button variant="primary" loading={seedM.isPending} onClick={() => seedM.mutate()}>Load Dal Lake Schedule</Button>
            </div>
          ) : (
            <div style={{ overflowX:'auto' }}>
              <div style={{ minWidth:900 }}>
                {/* Header */}
                <div style={{ display:'grid', gridTemplateColumns:'280px 1fr', borderBottom:'1.5px solid '+C.border, background:'#f8f9fc' }}>
                  <div style={{ padding:'10px 16px', fontSize:11, fontWeight:700, color:C.text3, textTransform:'uppercase' }}>Task</div>
                  <div style={{ position:'relative', padding:'0 8px' }}>
                    <div style={{ display:'flex', height:36 }}>
                      {months.map((m, i) => (
                        <div key={i} style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:C.text3, borderLeft: i>0?'1px solid #f1f5f9':'none' }}>{m}</div>
                      ))}
                    </div>
                    {/* Today line */}
                    <div style={{ position:'absolute', top:0, left:'calc(8px + '+todayPct+'%)', width:2, height:'100%', background:C.red, opacity:0.7, zIndex:3 }}>
                      <div style={{ position:'absolute', top:0, left:-14, background:C.red, color:'#fff', fontSize:9, fontWeight:700, padding:'1px 4px', borderRadius:3, whiteSpace:'nowrap' }}>TODAY</div>
                    </div>
                  </div>
                </div>

                {/* Rows */}
                {list.map((task: any) => {
                  const ss = STATUS_COLORS[task.status] ?? STATUS_COLORS.not_started
                  const isL1 = task.level === 1
                  const isL2 = task.level === 2
                  return (
                    <div key={task.id} style={{ display:'grid', gridTemplateColumns:'280px 1fr', borderBottom:'1px solid #f1f5f9', background: task.isMilestone?'#fffbeb':isL1?'#f8faff':'#fff', minHeight:36 }}
                      onMouseEnter={e => (e.currentTarget.style.background = task.isMilestone?'#fef9c3':isL1?'#eff6ff':'#f8faff')}
                      onMouseLeave={e => (e.currentTarget.style.background = task.isMilestone?'#fffbeb':isL1?'#f8faff':'#fff')}>
                      {/* Left: Task info */}
                      <div style={{ padding:'6px 8px 6px '+(task.level===2?'28px':task.level===3?'44px':'8px'), display:'flex', alignItems:'center', gap:6, cursor:'pointer' }}
                        onClick={() => openEdit(task)}>
                        {task.isMilestone && <Flag size={12} color={C.amber} weight="fill" />}
                        {task.status === 'delayed' && <Warning size={12} color={C.red} weight="fill" />}
                        <span style={{ fontSize: isL1?13:12, fontWeight: isL1?700:400, color: task.isMilestone?C.amber:task.status==='delayed'?C.red:C.text1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>
                          {task.wbsCode} {task.title}
                        </span>
                        {!task.isMilestone && (
                          <span style={{ fontSize:10, fontWeight:700, color:Number(task.progressPct)===100?C.green:C.blue, flexShrink:0 }}>{task.progressPct}%</span>
                        )}
                      </div>
                      {/* Right: Gantt bar */}
                      <div style={{ padding:'6px 8px', position:'relative' }}>
                        <GanttBar task={task} projectStart={projectStart} totalDays={totalDays} />
                        {/* Today line */}
                        <div style={{ position:'absolute', top:0, left:'calc(8px + '+todayPct+'%)', width:1.5, height:'100%', background:C.red, opacity:0.5, zIndex:3 }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Task List */}
      {tab === 'list' && (
        <div style={{ background:C.card, borderRadius:16, border:'1.5px solid '+C.border, overflow:'hidden', boxShadow:'0 1px 6px rgba(0,0,0,0.05)' }}>
          {isLoading ? <div style={{ display:'flex', justifyContent:'center', padding:40 }}><Spinner /></div>
          : noTasks ? (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'56px 24px', gap:10 }}>
              <p style={{ fontSize:14, color:C.text3, margin:0 }}>No tasks — load the schedule first</p>
            </div>
          ) : (
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'#f8f9fc', borderBottom:'1.5px solid '+C.border }}>
                  {['Code','Task','Planned Start','Planned End','Duration','Progress','Status','Delay','Action'].map(h => (
                    <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:10, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.06em', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {workItems.map((t: any, i: number) => {
                  const ss = STATUS_COLORS[t.status] ?? STATUS_COLORS.not_started
                  return (
                    <tr key={t.id} style={{ borderBottom: i<workItems.length-1?'1px solid #f1f5f9':'none', background:t.level===2?'#fafafa':'#fff' }}>
                      <td style={{ padding:'11px 14px', fontSize:11, fontWeight:700, color:C.blue, fontFamily:'monospace' }}>{t.wbsCode}</td>
                      <td style={{ padding:'11px 14px', maxWidth:220 }}>
                        <p style={{ fontSize:13, fontWeight:t.level===1?700:400, color:C.text1, margin:0, paddingLeft:t.level===2?12:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.title}</p>
                        {t.responsible && <p style={{ fontSize:10, color:C.text3, margin:'2px 0 0', paddingLeft:t.level===2?12:0 }}>{t.responsible}</p>}
                      </td>
                      <td style={{ padding:'11px 14px', fontSize:12, color:C.text2, whiteSpace:'nowrap' }}>{t.plannedStart}</td>
                      <td style={{ padding:'11px 14px', fontSize:12, color:C.text2, whiteSpace:'nowrap' }}>{t.plannedEnd}</td>
                      <td style={{ padding:'11px 14px', fontSize:12, color:C.text2 }}>{t.plannedDuration}d</td>
                      <td style={{ padding:'11px 14px', minWidth:100 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <div style={{ flex:1, height:6, borderRadius:999, background:'#f1f5f9', overflow:'hidden' }}>
                            <div style={{ height:'100%', width:Number(t.progressPct)+'%', background:Number(t.progressPct)===100?C.green:C.blue, borderRadius:999 }} />
                          </div>
                          <span style={{ fontSize:10, fontWeight:700, color:C.text3, minWidth:28 }}>{t.progressPct}%</span>
                        </div>
                      </td>
                      <td style={{ padding:'11px 14px' }}>
                        <span style={{ fontSize:10, padding:'2px 8px', borderRadius:999, fontWeight:700, background:ss.bg, color:ss.color, border:'1.5px solid '+ss.border }}>{t.status.replace(/_/g,' ')}</span>
                      </td>
                      <td style={{ padding:'11px 14px', fontSize:12, color:Number(t.delayDays)>0?C.red:C.text3, fontWeight:Number(t.delayDays)>0?700:400 }}>
                        {Number(t.delayDays) > 0 ? '+'+t.delayDays+'d' : '—'}
                      </td>
                      <td style={{ padding:'11px 14px' }}>
                        <button onClick={() => openEdit(t)}
                          style={{ padding:'4px 8px', fontSize:10, fontWeight:600, color:C.blue, background:'#eff6ff', border:'1.5px solid #bfdbfe', borderRadius:5, cursor:'pointer' }}>Update</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Milestones */}
      {tab === 'milestones' && (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {milestones.length === 0 ? (
            <div style={{ background:C.card, borderRadius:16, border:'1.5px solid '+C.border, padding:'48px 24px', textAlign:'center' }}>
              <p style={{ fontSize:14, color:C.text3 }}>No milestones — load the schedule first</p>
            </div>
          ) : milestones.map((m: any) => {
            const isPast    = new Date(m.plannedEnd) < new Date()
            const isDone    = m.status === 'completed'
            const isDelayed = isPast && !isDone
            return (
              <div key={m.id} style={{ background:C.card, border:'1.5px solid '+(isDone?'#a7f3d0':isDelayed?'#fecaca':C.border), borderRadius:14, padding:'16px 20px', boxShadow:'0 1px 4px rgba(0,0,0,0.05)', display:'flex', alignItems:'center', gap:16 }}>
                <div style={{ width:40, height:40, borderRadius:'50%', background:isDone?C.green:isDelayed?C.red:C.amber, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Flag size={18} color="#fff" weight="fill" />
                </div>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:14, fontWeight:700, color:C.text1, margin:'0 0 4px' }}>{m.title}</p>
                  <p style={{ fontSize:12, color:C.text3, margin:0 }}>
                    Planned: <strong>{m.plannedEnd}</strong>
                    {m.paymentMilestone && <span style={{ marginLeft:12, color:C.blue }}>Payment: {m.paymentMilestone} ({m.paymentPct}%)</span>}
                  </p>
                </div>
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <span style={{ fontSize:11, padding:'4px 12px', borderRadius:999, fontWeight:700, background:isDone?'#ecfdf5':isDelayed?'#fef2f2':'#fffbeb', color:isDone?C.green:isDelayed?C.red:C.amber, border:'1.5px solid '+(isDone?'#a7f3d0':isDelayed?'#fecaca':'#fde68a') }}>
                    {isDone ? '✓ Achieved' : isDelayed ? '⚠ Overdue' : 'Upcoming'}
                  </span>
                </div>
                <button onClick={() => openEdit(m)}
                  style={{ padding:'6px 12px', fontSize:11, fontWeight:600, color:C.blue, background:'#eff6ff', border:'1.5px solid #bfdbfe', borderRadius:7, cursor:'pointer', flexShrink:0 }}>
                  Update
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Update Task Modal */}
      <Modal open={!!editTask} onClose={() => setEdit(null)} title={'Update: ' + (editTask?.title ?? '')} width={520}
        footer={<>
          <Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button>
          <Button variant="primary" loading={updateM.isPending} onClick={() => updateM.mutate()}>Save Update</Button>
        </>}>
        {editTask && (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ padding:'10px 14px', background:'#f8f9fc', border:'1.5px solid '+C.border, borderRadius:8, fontSize:12 }}>
              <p style={{ fontWeight:600, color:C.text1, margin:'0 0 3px' }}>{editTask.wbsCode} — {editTask.title}</p>
              <p style={{ color:C.text3, margin:0 }}>Planned: {editTask.plannedStart} → {editTask.plannedEnd} ({editTask.plannedDuration}d)</p>
            </div>

            {!editTask.isMilestone && (
              <div>
                <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:5 }}>Progress: {editForm.progressPct}%</label>
                <input type="range" min="0" max="100" step="5" value={editForm.progressPct}
                  onChange={e => setEditForm((f: any) => ({ ...f, progressPct: parseInt(e.target.value), status: parseInt(e.target.value)===100?'completed':parseInt(e.target.value)>0?'in_progress':f.status }))}
                  style={{ width:'100%', cursor:'pointer' }} />
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:C.text3, marginTop:2 }}>
                  <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
                </div>
              </div>
            )}

            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:5 }}>Status</label>
              <select value={editForm.status} onChange={e => setEditForm((f: any) => ({ ...f, status: e.target.value }))}
                style={{ width:'100%', padding:'10px 13px', background:'#fff', border:'1.5px solid #d1d5db', borderRadius:8, fontSize:13, outline:'none', fontFamily:'inherit', cursor:'pointer' }}>
                {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <Input label="Actual Start" type="date" value={editForm.actualStart} onChange={e => setEditForm((f: any) => ({ ...f, actualStart: e.target.value }))} />
              <Input label="Actual End (if complete)" type="date" value={editForm.actualEnd} onChange={e => setEditForm((f: any) => ({ ...f, actualEnd: e.target.value }))} />
            </div>

            {(editForm.status === 'delayed' || Number(editForm.progressPct) < 100) && new Date(editTask.plannedEnd) < new Date() && (
              <div>
                <label style={{ fontSize:12, fontWeight:600, color:C.red, display:'block', marginBottom:5 }}>Delay Reason</label>
                <textarea value={editForm.delayReason} onChange={e => setEditForm((f: any) => ({ ...f, delayReason: e.target.value }))} rows={2}
                  placeholder="Reason for delay..."
                  style={{ width:'100%', padding:'9px 13px', background:'#fff', border:'1.5px solid #fecaca', borderRadius:8, fontSize:13, outline:'none', fontFamily:'inherit', resize:'none' }} />
                <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:8 }}>
                  <input type="checkbox" id="eot" checked={editForm.eotApplied} onChange={e => setEditForm((f: any) => ({ ...f, eotApplied: e.target.checked }))} />
                  <label htmlFor="eot" style={{ fontSize:12, color:C.red, fontWeight:600, cursor:'pointer' }}>EOT applied to UEED</label>
                  {editForm.eotApplied && (
                    <Input label="" value={editForm.eotDays} onChange={e => setEditForm((f: any) => ({ ...f, eotDays: e.target.value }))} placeholder="Days" />
                  )}
                </div>
              </div>
            )}

            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:5 }}>Remarks</label>
              <textarea value={editForm.remarks} onChange={e => setEditForm((f: any) => ({ ...f, remarks: e.target.value }))} rows={2}
                placeholder="Any notes..."
                style={{ width:'100%', padding:'9px 13px', background:'#fff', border:'1.5px solid #d1d5db', borderRadius:8, fontSize:13, outline:'none', fontFamily:'inherit', resize:'none' }} />
            </div>
          </div>
        )}
      </Modal>

      {/* New Task Modal */}
      <Modal open={showNew} onClose={() => setShowNew(false)} title="Add Task to Schedule" width={500}
        footer={<>
          <Button variant="ghost" onClick={() => setShowNew(false)}>Cancel</Button>
          <Button variant="primary" loading={createM.isPending} onClick={() => createM.mutate()} disabled={!newForm.title||!newForm.plannedStart||!newForm.plannedEnd}>Add Task</Button>
        </>}>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ display:'grid', gridTemplateColumns:'100px 1fr', gap:12 }}>
            <Input label="WBS Code" value={newForm.wbsCode} onChange={e => setNewForm(f => ({ ...f, wbsCode: e.target.value }))} placeholder="2.6" />
            <Input label="Task Title *" value={newForm.title} onChange={e => setNewForm(f => ({ ...f, title: e.target.value }))} placeholder="Task description" />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Input label="Planned Start *" type="date" value={newForm.plannedStart} onChange={e => setNewForm(f => ({ ...f, plannedStart: e.target.value }))} />
            <Input label="Planned End *" type="date" value={newForm.plannedEnd} onChange={e => setNewForm(f => ({ ...f, plannedEnd: e.target.value }))} />
          </div>
          <Input label="Responsible" value={newForm.responsible} onChange={e => setNewForm(f => ({ ...f, responsible: e.target.value }))} placeholder="Team / Person" />
        </div>
      </Modal>
    </div>
  )
}
`)
ok('WbsPage.tsx — Gantt chart, task list, milestones')

// Add route to App.tsx
const appTsxPath = path.join(FSRC, 'App.tsx')
let appTsx = fs.readFileSync(appTsxPath, 'utf8')
if (!appTsx.includes('WbsPage')) {
  appTsx = appTsx.replace(
    "import MeetingsPage",
    "import WbsPage from '@/pages/wbs/WbsPage'\nimport MeetingsPage"
  )
  appTsx = appTsx.replace(
    'path="meetings"',
    'path="wbs" element={<WbsPage />} />\n          <Route path="meetings"'
  )
  fs.writeFileSync(appTsxPath, appTsx)
  ok('App.tsx — /wbs route added')
}

// Add to Sidebar
const sidebarPath = path.join(FSRC, 'components', 'layout', 'Sidebar.tsx')
let sidebar = fs.readFileSync(sidebarPath, 'utf8')
if (!sidebar.includes("path:'/wbs'")) {
  sidebar = sidebar.replace(
    "{ label:'Meetings'",
    "{ label:'WBS & Gantt', path:'/wbs', icon:ChartBar, end:true },\n    { label:'Meetings'"
  )
  sidebar = sidebar.replace('Buildings, SignOut, CheckSquare, BookOpen,', 'Buildings, SignOut, CheckSquare, BookOpen, ChartBar,')
  fs.writeFileSync(sidebarPath, sidebar)
  ok('Sidebar — WBS & Gantt link added')
}

console.log('\n\x1b[32m\x1b[1m  WBS / Gantt complete!\x1b[0m' + NC)
console.log('\n  URL: /wbs')
console.log('\n  Features:')
console.log('  - 26 pre-loaded tasks from Dal Lake tender schedule')
console.log('  - Contract start: 07-Nov-2025 | Completion: 06-Nov-2027 (30 months)')
console.log('  - Visual Gantt chart with today-line in red')
console.log('  - Contract time elapsed progress bar')
console.log('  - Progress slider per task (auto-sets status)')
console.log('  - Delay tracking with EOT flag')
console.log('  - 6 key milestones with payment linkage')
console.log('  - Milestone tab: Achieved / Overdue / Upcoming')
console.log('  - Task list with progress bars\n')
