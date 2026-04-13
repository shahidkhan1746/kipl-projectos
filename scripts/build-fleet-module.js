const fs   = require('fs')
const path = require('path')

const ROOT = path.join(process.env.HOME || process.env.USERPROFILE, 'Desktop', 'kipl-srinagar')
const BACK = path.join(ROOT, 'backend', 'src')
const FRONT = path.join(ROOT, 'frontend', 'src')

// ─── 1. BACKEND: fleet-log entity ────────────────────────────────────────────
const fleetDir = path.join(BACK, 'fleet')
if (!fs.existsSync(fleetDir)) fs.mkdirSync(fleetDir, { recursive: true })

fs.writeFileSync(path.join(fleetDir, 'fleet-log.entity.ts'), `import { Entity, Column } from 'typeorm'
import { BaseEntity } from '../shared/entities/base.entity'

export type LogType = 'vehicle' | 'plant'

@Entity('fleet_logs')
export class FleetLog extends BaseEntity {
  @Column({ name: 'project_id' }) projectId: string
  @Column({ name: 'log_type' }) logType: LogType
  @Column({ type: 'date' }) date: string

  // ── Vehicle fields ──────────────────────────────────────────────────────────
  @Column({ nullable: true }) vehicle: string          // e.g. "SUV - JK01AB1234"
  @Column({ nullable: true }) driver: string
  @Column({ name: 'meter_start', type: 'decimal', precision: 10, scale: 1, nullable: true }) meterStart: number
  @Column({ name: 'meter_end',   type: 'decimal', precision: 10, scale: 1, nullable: true }) meterEnd: number
  @Column({ name: 'distance_km', type: 'decimal', precision: 10, scale: 1, nullable: true }) distanceKm: number
  @Column({ name: 'passenger_name', nullable: true }) passengerName: string
  @Column({ name: 'passenger_designation', nullable: true }) passengerDesignation: string
  @Column({ nullable: true }) purpose: string          // Official Duty / Inspection / Other
  @Column({ name: 'from_location', nullable: true }) fromLocation: string
  @Column({ name: 'to_location',   nullable: true }) toLocation: string

  // ── Plant/Equipment fields ──────────────────────────────────────────────────
  @Column({ name: 'machine_id',   nullable: true }) machineId: string    // PC210, JCB-01
  @Column({ name: 'machine_type', nullable: true }) machineType: string  // Excavator, Backhoe
  @Column({ nullable: true }) operator: string
  @Column({ name: 'hour_start', type: 'decimal', precision: 10, scale: 1, nullable: true }) hourStart: number
  @Column({ name: 'hour_close', type: 'decimal', precision: 10, scale: 1, nullable: true }) hourClose: number
  @Column({ name: 'hours_worked', type: 'decimal', precision: 10, scale: 1, nullable: true }) hoursWorked: number
  @Column({ name: 'work_zone',    nullable: true }) workZone: string
  @Column({ name: 'work_description', type: 'text', nullable: true }) workDescription: string
  @Column({ name: 'breakdown', default: false }) breakdown: boolean
  @Column({ name: 'breakdown_details', type: 'text', nullable: true }) breakdownDetails: string

  // ── Common fields ───────────────────────────────────────────────────────────
  @Column({ name: 'fuel_litres', type: 'decimal', precision: 10, scale: 1, nullable: true }) fuelLitres: number
  @Column({ name: 'fuel_cost',   type: 'decimal', precision: 10, scale: 2, nullable: true }) fuelCost: number
  @Column({ type: 'text', nullable: true }) remarks: string
  @Column({ name: 'reported_by', nullable: true }) reportedBy: string
  @Column({ name: 'reported_via', default: 'manual' }) reportedVia: string // manual | whatsapp | app
  @Column({ name: 'photo_url',   nullable: true }) photoUrl: string
}
`)
console.log('✅ fleet-log.entity.ts')

// ─── 2. BACKEND: fleet service ────────────────────────────────────────────────
fs.writeFileSync(path.join(fleetDir, 'fleet.service.ts'), `import { Injectable } from '@nestjs/common'
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
`)
console.log('✅ fleet.service.ts')

// ─── 3. BACKEND: fleet controller ────────────────────────────────────────────
fs.writeFileSync(path.join(fleetDir, 'fleet.controller.ts'), `import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common'
import { FleetService } from './fleet.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'

@UseGuards(JwtAuthGuard)
@Controller('api/v1/fleet')
export class FleetController {
  constructor(private svc: FleetService) {}

  @Get('dashboard')
  dashboard(@Query('projectId') projectId: string) {
    return this.svc.dashboard(projectId)
  }

  @Get()
  list(@Query() q: any) { return this.svc.list(q) }

  @Post()
  create(@Body() dto: any) { return this.svc.create(dto) }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: any) { return this.svc.update(id, dto) }

  @Delete(':id')
  delete(@Param('id') id: string) { return this.svc.delete(id) }
}
`)
console.log('✅ fleet.controller.ts')

// ─── 4. BACKEND: fleet module ─────────────────────────────────────────────────
fs.writeFileSync(path.join(fleetDir, 'fleet.module.ts'), `import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { FleetLog } from './fleet-log.entity'
import { FleetService } from './fleet.service'
import { FleetController } from './fleet.controller'

@Module({
  imports: [TypeOrmModule.forFeature([FleetLog])],
  providers: [FleetService],
  controllers: [FleetController],
})
export class FleetModule {}
`)
console.log('✅ fleet.module.ts')

// ─── 5. BACKEND: register in app.module.ts ───────────────────────────────────
const appModulePath = path.join(BACK, 'app.module.ts')
let appModule = fs.readFileSync(appModulePath, 'utf8')
if (!appModule.includes('FleetModule')) {
  appModule = `import { FleetModule } from './fleet/fleet.module'\n` + appModule
  appModule = appModule.replace(
    /imports:\s*\[/,
    `imports: [\n    FleetModule,`
  )
  fs.writeFileSync(appModulePath, appModule)
  console.log('✅ app.module.ts — FleetModule registered')
} else {
  console.log('⏭  app.module.ts — already has FleetModule')
}

// ─── 6. FRONTEND: fleet.api.ts ───────────────────────────────────────────────
fs.writeFileSync(path.join(FRONT, 'api', 'fleet.api.ts'), `import api from './client'
export const fleetApi = {
  dashboard: (projectId: string) =>
    api.get('/api/v1/fleet/dashboard', { params: { projectId } }),
  list: (params: any) =>
    api.get('/api/v1/fleet', { params }),
  create: (dto: any) =>
    api.post('/api/v1/fleet', dto),
  update: (id: string, dto: any) =>
    api.patch('/api/v1/fleet/' + id, dto),
  delete: (id: string) =>
    api.delete('/api/v1/fleet/' + id),
}
`)
console.log('✅ fleet.api.ts')

// ─── 7. FRONTEND: FleetPage.tsx ──────────────────────────────────────────────
const fleetPageDir = path.join(FRONT, 'pages', 'fleet')
if (!fs.existsSync(fleetPageDir)) fs.mkdirSync(fleetPageDir, { recursive: true })

fs.writeFileSync(path.join(fleetPageDir, 'FleetPage.tsx'), `import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fleetApi } from '@/api/fleet.api'
import { useAuthStore } from '@/store/auth.store'
import { Plus, Car, Wrench, Gauge, GasPump, Clock,
  Warning, CheckCircle, Trash, PencilSimple, X } from '@phosphor-icons/react'

const C = {
  navy:'#1a2540', blue:'#2563eb', green:'#059669', amber:'#d97706',
  red:'#dc2626', border:'#e2e8f0', text1:'#0f172a', text2:'#475569', text3:'#94a3b8',
  bg:'#f8fafc',
}

const BLANK_VEHICLE = {
  logType:'vehicle', date:new Date().toISOString().split('T')[0],
  vehicle:'SUV - UEED Supervision', driver:'', meterStart:'', meterEnd:'',
  passengerName:'', passengerDesignation:'', purpose:'Official Duty',
  fromLocation:'', toLocation:'', fuelLitres:'', fuelCost:'', remarks:'',
  reportedVia:'manual',
}
const BLANK_PLANT = {
  logType:'plant', date:new Date().toISOString().split('T')[0],
  machineId:'', machineType:'Excavator', operator:'',
  hourStart:'', hourClose:'', workZone:'', workDescription:'',
  breakdown:false, breakdownDetails:'', fuelLitres:'', remarks:'',
  reportedVia:'manual',
}

const MACHINE_TYPES = ['Excavator','Backhoe Loader','Dump Truck','Compactor','Crane','Concrete Mixer','Dewatering Pump','Surveying Instrument','Other']
const PURPOSES = ['Official Duty','Site Inspection','Material Procurement','Government Office','Hospital/Emergency','Other']

function StatCard({ icon, label, value, sub, color }: any) {
  return (
    <div style={{ background:C.bg, border:\`1.5px solid \${C.border}\`, borderRadius:12, padding:'14px 16px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
        <div style={{ width:32, height:32, borderRadius:8, background:color+'18',
          display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          {icon}
        </div>
        <p style={{ fontSize:11, color:C.text3, margin:0, fontWeight:600 }}>{label}</p>
      </div>
      <p style={{ fontSize:22, fontWeight:800, color, margin:'0 0 2px', lineHeight:1 }}>{value}</p>
      <p style={{ fontSize:11, color:C.text3, margin:0 }}>{sub}</p>
    </div>
  )
}

export default function FleetPage() {
  const { activeProjectId } = useAuthStore()
  const qc = useQueryClient()
  const [tab, setTab] = useState<'vehicle'|'plant'>('vehicle')
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)
  const [form, setForm] = useState<any>(BLANK_VEHICLE)

  const { data: dash } = useQuery({
    queryKey: ['fleet-dash', activeProjectId],
    queryFn: () => fleetApi.dashboard(activeProjectId!).then(r => r.data),
    enabled: !!activeProjectId,
  })
  const { data: logs = [] } = useQuery({
    queryKey: ['fleet-logs', activeProjectId, tab],
    queryFn: () => fleetApi.list({ projectId: activeProjectId, logType: tab }).then(r => r.data),
    enabled: !!activeProjectId,
  })

  const saveMut = useMutation({
    mutationFn: (d: any) => editItem
      ? fleetApi.update(editItem.id, d)
      : fleetApi.create({ ...d, projectId: activeProjectId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fleet-logs'] })
      qc.invalidateQueries({ queryKey: ['fleet-dash'] })
      setShowForm(false); setEditItem(null)
      setForm(tab === 'vehicle' ? BLANK_VEHICLE : BLANK_PLANT)
    },
  })
  const delMut = useMutation({
    mutationFn: (id: string) => fleetApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fleet-logs'] })
      qc.invalidateQueries({ queryKey: ['fleet-dash'] })
    },
  })

  function openNew() {
    setEditItem(null)
    setForm(tab === 'vehicle' ? BLANK_VEHICLE : BLANK_PLANT)
    setShowForm(true)
  }
  function openEdit(item: any) {
    setEditItem(item); setForm(item); setShowForm(true)
  }
  function inp(field: string, value: any) {
    setForm((p: any) => ({ ...p, [field]: value }))
  }
  function submit() {
    const d = { ...form }
    if (d.meterStart && d.meterEnd) d.distanceKm = +d.meterEnd - +d.meterStart
    if (d.hourStart  && d.hourClose) d.hoursWorked = +d.hourClose - +d.hourStart
    saveMut.mutate(d)
  }

  const ms  = dash?.monthStats
  const fleet = dash?.fleet ?? []
  const todayV = dash?.today?.vehicle ?? []
  const todayP = dash?.today?.plant ?? []

  return (
    <div className='fade-in' style={{ display:'flex', flexDirection:'column', gap:20 }}>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:800, color:C.text1, margin:'0 0 4px', letterSpacing:'-0.02em' }}>
            Fleet & Plant Log
          </h1>
          <p style={{ fontSize:13, color:C.text3, margin:0 }}>
            Vehicle logbook + Equipment hour meter tracker · Daily operator reports
          </p>
        </div>
        <button onClick={openNew}
          style={{ padding:'10px 20px', background:C.blue, color:'#fff',
            border:'none', borderRadius:10, fontSize:13, fontWeight:700,
            cursor:'pointer', display:'flex', alignItems:'center', gap:8 }}>
          <Plus size={15}/> New Entry
        </button>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
        <StatCard icon={<Car size={16} color={C.blue}/>} label='This Month — KM Driven'
          value={ms?.vehicle?.km?.toFixed(0) ?? 0} sub={'KM · SUV to UEED'} color={C.blue} />
        <StatCard icon={<GasPump size={16} color={C.amber}/>} label='Vehicle Fuel — This Month'
          value={ms?.vehicle?.fuel?.toFixed(0) ?? 0} sub='Litres consumed' color={C.amber} />
        <StatCard icon={<Clock size={16} color={C.green}/>} label='Plant Hours — This Month'
          value={ms?.plant?.hours?.toFixed(1) ?? 0} sub='Hours across all machines' color={C.green} />
        <StatCard icon={<GasPump size={16} color='#7c3aed'/>} label='Plant Fuel — This Month'
          value={ms?.plant?.fuel?.toFixed(0) ?? 0} sub='Litres consumed' color='#7c3aed' />
      </div>

      {/* Today's entries summary */}
      {(todayV.length > 0 || todayP.length > 0) && (
        <div style={{ background:'#f0fdf4', border:'1.5px solid #bbf7d0', borderRadius:12, padding:'12px 16px' }}>
          <p style={{ fontSize:12, fontWeight:700, color:C.green, margin:'0 0 6px' }}>
            ✓ Today's Entries — {new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'short' })}
          </p>
          <div style={{ display:'flex', gap:16, flexWrap:'wrap' as any }}>
            {todayV.map((v: any) => (
              <span key={v.id} style={{ fontSize:11, color:'#166534' }}>
                🚗 {v.vehicle} · {v.driver} · {v.distanceKm} km → {v.passengerName}
              </span>
            ))}
            {todayP.map((p: any) => (
              <span key={p.id} style={{ fontSize:11, color:'#166534' }}>
                🚜 {p.machineId} · {p.operator} · {p.hoursWorked}h worked
                {p.breakdown ? ' ⚠ BREAKDOWN' : ''}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Fleet status — machines */}
      {fleet.length > 0 && (
        <div style={{ background:'#fff', border:\`1.5px solid \${C.border}\`, borderRadius:14, padding:'16px 20px' }}>
          <p style={{ fontSize:12, fontWeight:700, color:C.text2, margin:'0 0 12px' }}>
            Equipment Hour Meter Status
          </p>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px,1fr))', gap:10 }}>
            {fleet.map((m: any) => (
              <div key={m.machineId} style={{ background:C.bg, borderRadius:10,
                padding:'10px 12px', border:\`1px solid \${C.border}\` }}>
                <p style={{ fontSize:12, fontWeight:800, color:C.text1, margin:'0 0 4px' }}>
                  {m.machineId}
                </p>
                <p style={{ fontSize:11, color:C.text3, margin:'0 0 6px' }}>{m.machineType}</p>
                <p style={{ fontSize:18, fontWeight:800, color:C.blue, margin:'0 0 2px', lineHeight:1 }}>
                  {parseFloat(m.lastReading).toLocaleString('en-IN', { minimumFractionDigits:1 })}h
                </p>
                <p style={{ fontSize:10, color:C.text3, margin:0 }}>
                  Total: {parseFloat(m.totalHours).toFixed(1)}h · Last: {m.lastDate}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs + log table */}
      <div style={{ background:'#fff', border:\`1.5px solid \${C.border}\`, borderRadius:14, overflow:'hidden' }}>

        {/* Tab bar */}
        <div style={{ display:'flex', borderBottom:\`1.5px solid \${C.border}\`, padding:'0 20px' }}>
          {([['vehicle','🚗  Vehicle Log (SUV)'],['plant','🚜  Plant Log (Equipment)']] as const).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)}
              style={{ padding:'12px 20px', fontSize:13, fontWeight: tab===t ? 700 : 400,
                color: tab===t ? C.blue : C.text3,
                background:'none', border:'none', cursor:'pointer',
                borderBottom: tab===t ? \`2.5px solid \${C.blue}\` : '2.5px solid transparent',
                marginBottom:'-1.5px' }}>
              {label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div style={{ overflowX:'auto' as any }}>
          {logs.length === 0 ? (
            <div style={{ padding:'40px 20px', textAlign:'center' as any }}>
              <p style={{ fontSize:32, margin:'0 0 8px' }}>{tab==='vehicle' ? '🚗' : '🚜'}</p>
              <p style={{ fontSize:14, color:C.text3, margin:0 }}>
                No {tab} logs yet. Click "New Entry" to add the first one.
              </p>
            </div>
          ) : (
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead>
                <tr style={{ background:C.bg }}>
                  {tab === 'vehicle' ? (
                    <>
                      <th style={TH}>Date</th>
                      <th style={TH}>Vehicle</th>
                      <th style={TH}>Driver</th>
                      <th style={TH}>Meter Start</th>
                      <th style={TH}>Meter End</th>
                      <th style={TH}>Distance</th>
                      <th style={TH}>Passenger</th>
                      <th style={TH}>Purpose</th>
                      <th style={TH}>Route</th>
                      <th style={TH}>Fuel (L)</th>
                      <th style={TH}>Actions</th>
                    </>
                  ) : (
                    <>
                      <th style={TH}>Date</th>
                      <th style={TH}>Machine</th>
                      <th style={TH}>Type</th>
                      <th style={TH}>Operator</th>
                      <th style={TH}>Start Hr</th>
                      <th style={TH}>Close Hr</th>
                      <th style={TH}>Hours Worked</th>
                      <th style={TH}>Zone</th>
                      <th style={TH}>Fuel (L)</th>
                      <th style={TH}>Status</th>
                      <th style={TH}>Actions</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {logs.map((log: any, i: number) => (
                  <tr key={log.id} style={{ borderBottom:\`1px solid \${C.border}\`,
                    background: log.breakdown ? '#fff5f5' : i%2===0 ? '#fff' : '#fafafa' }}>
                    {tab === 'vehicle' ? (
                      <>
                        <td style={TD}>{log.date}</td>
                        <td style={TD}><span style={{ fontWeight:600 }}>{log.vehicle}</span></td>
                        <td style={TD}>{log.driver}</td>
                        <td style={TD}>{log.meterStart}</td>
                        <td style={TD}>{log.meterEnd}</td>
                        <td style={{ ...TD, fontWeight:700, color:C.blue }}>
                          {log.distanceKm} km
                        </td>
                        <td style={TD}>{log.passengerName}<br/><span style={{ color:C.text3, fontSize:10 }}>{log.passengerDesignation}</span></td>
                        <td style={TD}>{log.purpose}</td>
                        <td style={{ ...TD, fontSize:11 }}>{log.fromLocation} → {log.toLocation}</td>
                        <td style={TD}>{log.fuelLitres || '—'}</td>
                        <td style={TD}>
                          <div style={{ display:'flex', gap:4 }}>
                            <button onClick={() => openEdit(log)}
                              style={{ padding:'3px 8px', fontSize:10, border:\`1px solid \${C.border}\`,
                                borderRadius:6, cursor:'pointer', background:'none' }}>
                              <PencilSimple size={11}/>
                            </button>
                            <button onClick={() => { if(confirm('Delete?')) delMut.mutate(log.id) }}
                              style={{ padding:'3px 8px', fontSize:10, border:'1px solid #fca5a5',
                                borderRadius:6, cursor:'pointer', background:'none', color:C.red }}>
                              <Trash size={11}/>
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td style={TD}>{log.date}</td>
                        <td style={{ ...TD, fontWeight:800, color:C.navy }}>{log.machineId}</td>
                        <td style={TD}>{log.machineType}</td>
                        <td style={TD}>{log.operator}</td>
                        <td style={{ ...TD, fontFamily:'monospace', fontSize:13 }}>{log.hourStart?.toFixed?.(1) ?? log.hourStart}</td>
                        <td style={{ ...TD, fontFamily:'monospace', fontSize:13 }}>{log.hourClose?.toFixed?.(1) ?? log.hourClose}</td>
                        <td style={{ ...TD, fontWeight:700, color:C.green }}>
                          {log.hoursWorked?.toFixed?.(1) ?? log.hoursWorked}h
                        </td>
                        <td style={TD}>{log.workZone}</td>
                        <td style={TD}>{log.fuelLitres || '—'}</td>
                        <td style={TD}>
                          {log.breakdown
                            ? <span style={{ fontSize:10, fontWeight:700, color:C.red,
                                background:'#fef2f2', padding:'2px 6px', borderRadius:99 }}>
                                ⚠ Breakdown
                              </span>
                            : <span style={{ fontSize:10, fontWeight:700, color:C.green,
                                background:'#f0fdf4', padding:'2px 6px', borderRadius:99 }}>
                                ✓ Working
                              </span>}
                        </td>
                        <td style={TD}>
                          <div style={{ display:'flex', gap:4 }}>
                            <button onClick={() => openEdit(log)}
                              style={{ padding:'3px 8px', fontSize:10, border:\`1px solid \${C.border}\`,
                                borderRadius:6, cursor:'pointer', background:'none' }}>
                              <PencilSimple size={11}/>
                            </button>
                            <button onClick={() => { if(confirm('Delete?')) delMut.mutate(log.id) }}
                              style={{ padding:'3px 8px', fontSize:10, border:'1px solid #fca5a5',
                                borderRadius:6, cursor:'pointer', background:'none', color:C.red }}>
                              <Trash size={11}/>
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Entry Form Modal ── */}
      {showForm && (
        <div style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(15,23,42,0.6)',
          backdropFilter:'blur(4px)', display:'flex', alignItems:'center',
          justifyContent:'center', padding:20 }}>
          <div style={{ background:'#fff', borderRadius:20, width:'100%', maxWidth:600,
            maxHeight:'90vh', overflowY:'auto', boxShadow:'0 24px 80px rgba(0,0,0,0.2)' }}>

            {/* Modal header */}
            <div style={{ background:C.navy, padding:'18px 24px',
              display:'flex', alignItems:'center', justifyContent:'space-between',
              position:'sticky' as any, top:0, zIndex:1 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ fontSize:20 }}>{tab==='vehicle' ? '🚗' : '🚜'}</span>
                <div>
                  <p style={{ fontSize:14, fontWeight:800, color:'#fff', margin:0 }}>
                    {editItem ? 'Edit' : 'New'} {tab === 'vehicle' ? 'Vehicle' : 'Plant'} Log Entry
                  </p>
                  <p style={{ fontSize:11, color:'rgba(255,255,255,0.4)', margin:0 }}>
                    {tab === 'vehicle' ? 'SUV logbook entry' : 'Equipment hour meter reading'}
                  </p>
                </div>
              </div>
              <button onClick={() => { setShowForm(false); setEditItem(null) }}
                style={{ background:'none', border:'none', cursor:'pointer',
                  color:'rgba(255,255,255,0.5)', display:'flex', alignItems:'center' }}>
                <X size={18}/>
              </button>
            </div>

            <div style={{ padding:'20px 24px', display:'flex', flexDirection:'column', gap:14 }}>

              {/* Common: date */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div>
                  <label style={LBL}>Date *</label>
                  <input type='date' value={form.date} onChange={e => inp('date', e.target.value)} style={INP}/>
                </div>
                <div>
                  <label style={LBL}>Reported Via</label>
                  <select value={form.reportedVia} onChange={e => inp('reportedVia', e.target.value)} style={INP}>
                    <option value='manual'>Manual Entry</option>
                    <option value='whatsapp'>WhatsApp</option>
                    <option value='app'>Mobile App</option>
                  </select>
                </div>
              </div>

              {tab === 'vehicle' ? (
                <>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                    <div>
                      <label style={LBL}>Vehicle *</label>
                      <input value={form.vehicle} onChange={e => inp('vehicle', e.target.value)} style={INP}
                        placeholder='e.g. SUV - JK01AB1234'/>
                    </div>
                    <div>
                      <label style={LBL}>Driver Name *</label>
                      <input value={form.driver} onChange={e => inp('driver', e.target.value)} style={INP}
                        placeholder='Driver name'/>
                    </div>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
                    <div>
                      <label style={LBL}>Meter Start (km) *</label>
                      <input type='number' value={form.meterStart} onChange={e => inp('meterStart', e.target.value)} style={INP}
                        placeholder='e.g. 4125'/>
                    </div>
                    <div>
                      <label style={LBL}>Meter End (km) *</label>
                      <input type='number' value={form.meterEnd} onChange={e => inp('meterEnd', e.target.value)} style={INP}
                        placeholder='e.g. 4189'/>
                    </div>
                    <div>
                      <label style={LBL}>Distance (auto)</label>
                      <input readOnly value={form.meterStart && form.meterEnd
                        ? (+(form.meterEnd) - +(form.meterStart)) + ' km' : ''} style={{ ...INP, background:'#f8fafc', color:C.blue, fontWeight:700 }}/>
                    </div>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                    <div>
                      <label style={LBL}>Passenger / User Name</label>
                      <input value={form.passengerName} onChange={e => inp('passengerName', e.target.value)} style={INP}
                        placeholder='e.g. Er. Aaliya Nazir'/>
                    </div>
                    <div>
                      <label style={LBL}>Designation</label>
                      <input value={form.passengerDesignation} onChange={e => inp('passengerDesignation', e.target.value)} style={INP}
                        placeholder='e.g. Executive Engineer'/>
                    </div>
                  </div>
                  <div>
                    <label style={LBL}>Purpose</label>
                    <select value={form.purpose} onChange={e => inp('purpose', e.target.value)} style={INP}>
                      {PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                    <div>
                      <label style={LBL}>From</label>
                      <input value={form.fromLocation} onChange={e => inp('fromLocation', e.target.value)} style={INP}
                        placeholder='e.g. Srinagar Office'/>
                    </div>
                    <div>
                      <label style={LBL}>To</label>
                      <input value={form.toLocation} onChange={e => inp('toLocation', e.target.value)} style={INP}
                        placeholder='e.g. UEED Office'/>
                    </div>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                    <div>
                      <label style={LBL}>Fuel Added (Litres)</label>
                      <input type='number' step='0.1' value={form.fuelLitres} onChange={e => inp('fuelLitres', e.target.value)} style={INP}/>
                    </div>
                    <div>
                      <label style={LBL}>Fuel Cost (₹)</label>
                      <input type='number' value={form.fuelCost} onChange={e => inp('fuelCost', e.target.value)} style={INP}/>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                    <div>
                      <label style={LBL}>Machine ID *</label>
                      <input value={form.machineId} onChange={e => inp('machineId', e.target.value)} style={INP}
                        placeholder='e.g. PC210, JCB-01'/>
                    </div>
                    <div>
                      <label style={LBL}>Machine Type</label>
                      <select value={form.machineType} onChange={e => inp('machineType', e.target.value)} style={INP}>
                        {MACHINE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label style={LBL}>Operator Name *</label>
                    <input value={form.operator} onChange={e => inp('operator', e.target.value)} style={INP}
                      placeholder='e.g. Rinku'/>
                  </div>
                  {/* Hour meter — prominent like the WhatsApp photo */}
                  <div style={{ background:'#1a2540', borderRadius:12, padding:'16px' }}>
                    <p style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.5)',
                      textTransform:'uppercase', letterSpacing:'0.08em', margin:'0 0 12px' }}>
                      Hour Meter Reading
                    </p>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
                      <div>
                        <label style={{ ...LBL, color:'rgba(255,255,255,0.6)' }}>Start (h)</label>
                        <input type='number' step='0.1' value={form.hourStart}
                          onChange={e => inp('hourStart', e.target.value)}
                          placeholder='e.g. 6935.2'
                          style={{ ...INP, background:'rgba(255,255,255,0.1)', color:'#fff',
                            border:'1px solid rgba(255,255,255,0.2)', fontFamily:'monospace', fontSize:16, fontWeight:700 }}/>
                      </div>
                      <div>
                        <label style={{ ...LBL, color:'rgba(255,255,255,0.6)' }}>Close (h)</label>
                        <input type='number' step='0.1' value={form.hourClose}
                          onChange={e => inp('hourClose', e.target.value)}
                          placeholder='e.g. 6937.0'
                          style={{ ...INP, background:'rgba(255,255,255,0.1)', color:'#fff',
                            border:'1px solid rgba(255,255,255,0.2)', fontFamily:'monospace', fontSize:16, fontWeight:700 }}/>
                      </div>
                      <div>
                        <label style={{ ...LBL, color:'rgba(255,255,255,0.6)' }}>Hours Worked</label>
                        <div style={{ ...INP, background:'rgba(255,255,255,0.05)', color:'#34d399',
                          fontFamily:'monospace', fontSize:20, fontWeight:800, display:'flex', alignItems:'center' }}>
                          {form.hourStart && form.hourClose
                            ? (+(form.hourClose) - +(form.hourStart)).toFixed(1) + 'h'
                            : '—'}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                    <div>
                      <label style={LBL}>Work Zone / Location</label>
                      <input value={form.workZone} onChange={e => inp('workZone', e.target.value)} style={INP}
                        placeholder='e.g. Zone A - Nishat'/>
                    </div>
                    <div>
                      <label style={LBL}>Fuel Added (Litres)</label>
                      <input type='number' step='0.1' value={form.fuelLitres}
                        onChange={e => inp('fuelLitres', e.target.value)} style={INP}/>
                    </div>
                  </div>
                  <div>
                    <label style={LBL}>Work Description</label>
                    <textarea value={form.workDescription} onChange={e => inp('workDescription', e.target.value)}
                      style={{ ...INP, height:60, resize:'none' as any }}
                      placeholder='What work was done today...'/>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <input type='checkbox' id='breakdown' checked={form.breakdown}
                      onChange={e => inp('breakdown', e.target.checked)}/>
                    <label htmlFor='breakdown' style={{ fontSize:13, color:C.red, fontWeight:600, cursor:'pointer' }}>
                      ⚠ Breakdown reported today
                    </label>
                  </div>
                  {form.breakdown && (
                    <div>
                      <label style={LBL}>Breakdown Details</label>
                      <textarea value={form.breakdownDetails} onChange={e => inp('breakdownDetails', e.target.value)}
                        style={{ ...INP, height:60, resize:'none' as any, border:'1px solid #fca5a5' }}
                        placeholder='Describe the breakdown...'/>
                    </div>
                  )}
                </>
              )}

              <div>
                <label style={LBL}>Remarks</label>
                <textarea value={form.remarks} onChange={e => inp('remarks', e.target.value)}
                  style={{ ...INP, height:50, resize:'none' as any }}
                  placeholder='Any additional notes...'/>
              </div>

              {/* Actions */}
              <div style={{ display:'flex', justifyContent:'flex-end', gap:10, paddingTop:4 }}>
                <button onClick={() => { setShowForm(false); setEditItem(null) }}
                  style={{ padding:'10px 20px', fontSize:13, color:C.text2,
                    background:'none', border:\`1.5px solid \${C.border}\`, borderRadius:8, cursor:'pointer' }}>
                  Cancel
                </button>
                <button onClick={submit} disabled={saveMut.isPending}
                  style={{ padding:'10px 24px', fontSize:13, fontWeight:700, color:'#fff',
                    background:C.blue, border:'none', borderRadius:8, cursor:'pointer' }}>
                  {saveMut.isPending ? 'Saving...' : editItem ? 'Update Entry' : 'Save Entry'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const TH: React.CSSProperties = {
  padding:'10px 12px', textAlign:'left', fontSize:11, fontWeight:700,
  color:'#475569', borderBottom:'1.5px solid #e2e8f0', whiteSpace:'nowrap',
}
const TD: React.CSSProperties = {
  padding:'10px 12px', fontSize:12, color:'#0f172a',
  borderBottom:'1px solid #f1f5f9', verticalAlign:'middle',
}
const LBL: React.CSSProperties = {
  display:'block', fontSize:11, fontWeight:700, color:'#475569', marginBottom:4,
}
const INP: React.CSSProperties = {
  width:'100%', padding:'8px 10px', border:'1.5px solid #e2e8f0',
  borderRadius:8, fontSize:13, outline:'none', fontFamily:'inherit',
  boxSizing:'border-box', background:'#fff', color:'#0f172a',
}
`)
console.log('✅ FleetPage.tsx')

// ─── 8. Add to Sidebar ────────────────────────────────────────────────────────
const sidebarPath = path.join(FRONT, 'components', 'layout', 'Sidebar.tsx')
let sidebar = fs.readFileSync(sidebarPath, 'utf8')
if (!sidebar.includes('/fleet')) {
  // Add Truck icon if not present
  if (!sidebar.includes('Truck,')) {
    sidebar = sidebar.replace(
      `  SquaresFour, FileText, Envelope, Users, MapPin,`,
      `  SquaresFour, FileText, Envelope, Users, MapPin, Truck,`
    )
  }
  sidebar = sidebar.replace(
    `  { section:'SITE',      label:'Contract Compliance'`,
    `  { section:'SITE',      label:'Fleet & Plant Log', path:'/fleet', icon:Truck, roles:['super_admin','project_manager','engineer','supervisor'] },
  { section:'SITE',      label:'Contract Compliance'`
  )
  fs.writeFileSync(sidebarPath, sidebar)
  console.log('✅ Sidebar.tsx — Fleet & Plant Log added')
}

// ─── 9. Add route to App.tsx ──────────────────────────────────────────────────
const appPath = path.join(FRONT, 'App.tsx')
let app = fs.readFileSync(appPath, 'utf8')
if (!app.includes('FleetPage')) {
  app = `import FleetPage from '@/pages/fleet/FleetPage'\n` + app
  app = app.replace(
    `          <Route path='compliance'`,
    `          <Route path='fleet'                element={<FleetPage />} />\n          <Route path='compliance'`
  )
  fs.writeFileSync(appPath, app)
  console.log('✅ App.tsx — /fleet route added')
}

// ─── 10. Add page title to AppHeader ─────────────────────────────────────────
const headerPath = path.join(FRONT, 'components', 'layout', 'AppHeader.tsx')
let header = fs.readFileSync(headerPath, 'utf8')
if (!header.includes('/fleet')) {
  header = header.replace(
    `  '/compliance':         { title:'Contract Compliance',`,
    `  '/fleet':              { title:'Fleet & Plant Log',    sub:'Vehicle logbook · Equipment hour meter tracker' },
  '/compliance':         { title:'Contract Compliance',`
  )
  fs.writeFileSync(headerPath, header)
  console.log('✅ AppHeader.tsx — /fleet page title added')
}

console.log(`
✅ Fleet & Plant Log module complete!

Backend (restart needed):
  backend/src/fleet/fleet-log.entity.ts   — DB table with vehicle + plant fields
  backend/src/fleet/fleet.service.ts      — CRUD + dashboard aggregates
  backend/src/fleet/fleet.controller.ts   — REST endpoints
  backend/src/fleet/fleet.module.ts       — NestJS module
  app.module.ts                           — FleetModule registered

Frontend:
  frontend/src/api/fleet.api.ts           — API client
  frontend/src/pages/fleet/FleetPage.tsx  — Full page with tabs + form
  Sidebar: Fleet & Plant Log (Truck icon) under SITE
  Route: /fleet
  AppHeader: page title set

After running restart the backend:
  cd backend && npm run start:dev

Features:
  🚗 Vehicle Tab — Date, Meter Start/End, Distance (auto), 
     Passenger + Designation, Purpose, Route, Fuel
  🚜 Plant Tab  — Machine ID (PC210 etc), Type, Operator,
     Hour Start/Close (like Rinku WhatsApp), Hours Worked (auto),
     Zone, Work description, Breakdown flag
  📊 Dashboard  — Monthly KM, monthly plant hours, per-machine totals
  ✓ Today summary shown at top
  ✓ Edit / delete entries
  ✓ Reported Via: Manual / WhatsApp / Mobile App (future)
`)
