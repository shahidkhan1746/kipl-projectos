import { toast } from '@/lib/notify'
import { formatDate } from '@/lib/date'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fleetApi } from '@/api/fleet.api'
import { useAuthStore } from '@/store/auth.store'
import { Plus, Car, Wrench, Gauge, GasPump, Clock,
  Warning, CheckCircle, Trash, PencilSimple, X } from '@phosphor-icons/react'
import { DatePicker } from '@/components/ui/DatePicker'

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
// Dropdown suggestions (datalist) — user can still type a custom value
const DESIGNATIONS = ['Executive Engineer','Assistant Executive Engineer','Assistant Engineer','Junior Engineer','Project Manager','Site Engineer','Supervisor','Surveyor','Consultant','Contractor Representative']
const LOCATIONS = ['Srinagar Office','UEED Office','Nishat STP Site','Habak Pumping Station','Foreshore Road','Dal Gate','Nigeen','Brari Nambal','Material Yard']

function StatCard({ icon, label, value, sub, color }: any) {
  return (
    <div style={{ background:C.bg, border:`1.5px solid ${C.border}`, borderRadius:12, padding:'14px 16px' }}>
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
    queryFn: () => fleetApi.dashboard(activeProjectId || undefined).then(r => r.data),
  })
  const { data: logs = [] } = useQuery({
    queryKey: ['fleet-logs', activeProjectId],
    queryFn: () => fleetApi.list({ projectId: activeProjectId || undefined }).then(r => r.data),
  })

  const saveMut = useMutation({
    mutationFn: (d: any) => editItem
      ? fleetApi.update(editItem.id, d)
      : fleetApi.create({ ...d, projectId: activeProjectId || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fleet-logs'] })
      qc.invalidateQueries({ queryKey: ['fleet-dash'] })
      toast.success(editItem ? 'Log entry updated!' : 'Log entry saved successfully!')
      setShowForm(false); setEditItem(null)
      setForm(tab === 'vehicle' ? BLANK_VEHICLE : BLANK_PLANT)
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? err?.message ?? 'Failed to save log entry. Please check the fields.')
    },
  })
  const delMut = useMutation({
    mutationFn: (id: string) => fleetApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fleet-logs'] })
      qc.invalidateQueries({ queryKey: ['fleet-dash'] })
      toast.success('Log entry deleted.')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? err?.message ?? 'Failed to delete log entry.')
    },
  })

  function getLatestMachineLog(mId?: any) {
    if (!mId || typeof mId !== 'string') return null
    const norm = mId.trim().toLowerCase().replace(/[\s-_]/g, '')
    const matched = pLogs.find((l: any) => l.machineId && typeof l.machineId === 'string' && l.machineId.trim().toLowerCase().replace(/[\s-_]/g, '') === norm)
    if (matched) return matched
    const fromFleet = fleet.find((f: any) => f.machineId && typeof f.machineId === 'string' && f.machineId.trim().toLowerCase().replace(/[\s-_]/g, '') === norm)
    if (fromFleet) {
      return {
        machineId: fromFleet.machineId,
        machineType: fromFleet.machineType,
        hourClose: fromFleet.lastReading || fromFleet.lastClosingHour,
      }
    }
    return null
  }

  function getLatestVehicleLog(vName?: any) {
    if (!vName || typeof vName !== 'string') return null
    const norm = vName.trim().toLowerCase().replace(/[\s-_]/g, '')
    return vLogs.find((l: any) => l.vehicle && typeof l.vehicle === 'string' && l.vehicle.trim().toLowerCase().replace(/[\s-_]/g, '') === norm)
  }

  function openNew(prefillMachineId?: any, prefillVehicle?: any) {
    setEditItem(null)
    const today = new Date().toISOString().split('T')[0]
    const explicitMachine = typeof prefillMachineId === 'string' ? prefillMachineId : undefined
    const explicitVehicle = typeof prefillVehicle === 'string' ? prefillVehicle : undefined

    if (tab === 'plant' || explicitMachine) {
      const initialMachine = explicitMachine || (pLogs[0]?.machineId ?? fleet[0]?.machineId ?? '')
      const prev = getLatestMachineLog(initialMachine)
      setForm({
        ...BLANK_PLANT,
        date: today,
        machineId: initialMachine,
        machineType: prev?.machineType || (initialMachine ? 'Excavator' : BLANK_PLANT.machineType),
        operator: prev?.operator || '',
        hourStart: prev?.hourClose != null ? String(prev.hourClose) : '',
        workZone: prev?.workZone || '',
      })
      if (explicitMachine) setTab('plant')
    } else {
      const initialVehicle = explicitVehicle || vLogs[0]?.vehicle || BLANK_VEHICLE.vehicle
      const prev = getLatestVehicleLog(initialVehicle)
      setForm({
        ...BLANK_VEHICLE,
        date: today,
        vehicle: initialVehicle,
        driver: prev?.driver || '',
        meterStart: prev?.meterEnd != null ? String(prev.meterEnd) : '',
      })
      if (explicitVehicle) setTab('vehicle')
    }
    setShowForm(true)
  }
  function openEdit(item: any) {
    setEditItem(item); setForm(item); setShowForm(true)
  }
  function inp(field: string, value: any) {
    setForm((p: any) => ({ ...p, [field]: value }))
  }

  function onMachineIdChange(val: string) {
    const prev = getLatestMachineLog(val)
    setForm((p: any) => ({
      ...p,
      machineId: val,
      ...(prev?.hourClose != null ? { hourStart: String(prev.hourClose) } : {}),
      ...(prev?.machineType ? { machineType: prev.machineType } : {}),
      ...(prev?.operator && !p.operator ? { operator: prev.operator } : {}),
      ...(prev?.workZone && !p.workZone ? { workZone: prev.workZone } : {}),
    }))
  }

  function onVehicleChange(val: string) {
    const prev = getLatestVehicleLog(val)
    setForm((p: any) => ({
      ...p,
      vehicle: val,
      ...(prev?.meterEnd != null ? { meterStart: String(prev.meterEnd) } : {}),
      ...(prev?.driver && !p.driver ? { driver: prev.driver } : {}),
    }))
  }
  function submit() {
    if (!form.date) {
      toast.error('Please select a date.')
      return
    }
    if (tab === 'plant') {
      if (!form.machineId?.trim()) {
        toast.error('Please enter Machine ID (e.g. PC 210, JCB-01).')
        return
      }
      if (!form.operator?.trim()) {
        toast.error('Please enter Operator Name.')
        return
      }
    } else {
      if (!form.vehicle?.trim()) {
        toast.error('Please enter Vehicle.')
        return
      }
      if (!form.driver?.trim()) {
        toast.error('Please enter Driver Name.')
        return
      }
    }

    const d: any = { ...form }

    // Clean numeric properties: convert empty strings to null or numbers
    const numFields = ['meterStart', 'meterEnd', 'distanceKm', 'hourStart', 'hourClose', 'hoursWorked', 'fuelLitres', 'fuelCost']
    for (const f of numFields) {
      if (d[f] === '' || d[f] === undefined || d[f] === null) {
        d[f] = null
      } else {
        const n = Number(d[f])
        d[f] = Number.isNaN(n) ? null : n
      }
    }

    if (d.logType === 'vehicle' && d.meterStart != null && d.meterEnd != null) {
      d.distanceKm = Number((d.meterEnd - d.meterStart).toFixed(1))
    }
    if (d.logType === 'plant' && d.hourStart != null && d.hourClose != null) {
      d.hoursWorked = Number((d.hourClose - d.hourStart).toFixed(1))
    }

    saveMut.mutate(d)
  }

  const ms = dash?.monthStats
  const totals = dash?.totals
  const fleet = dash?.fleet ?? []
  const vLogs = (logs || []).filter((l: any) => l.logType === 'vehicle')
  const pLogs = (logs || []).filter((l: any) => l.logType === 'plant')
  const currentLogs = tab === 'vehicle' ? vLogs : pLogs

  const totalPlantHours = totals?.plantHours != null
    ? Number(totals.plantHours).toFixed(1)
    : pLogs.reduce((s: number, l: any) => s + (Number(l.hoursWorked) || 0), 0).toFixed(1)

  const totalVehicleKm = totals?.vehicleKm != null
    ? Number(totals.vehicleKm).toFixed(0)
    : vLogs.reduce((s: number, l: any) => s + (Number(l.distanceKm) || 0), 0).toFixed(0)

  const totalFuelConsumed = totals?.totalFuel != null
    ? Number(totals.totalFuel).toFixed(0)
    : (logs || []).reduce((s: number, l: any) => s + (Number(l.fuelLitres) || 0), 0).toFixed(0)

  return (
    <div className='fade-in' style={{ display:'flex', flexDirection:'column', gap:20 }}>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:800, color:C.text1, margin:'0 0 4px', letterSpacing:'-0.02em' }}>
            Fleet & Plant Log
          </h1>
          <p style={{ fontSize:13, color:C.text3, margin:0 }}>
            Vehicle logbook + Equipment hour meter tracker · Daily operator reports
          </p>
        </div>
        <button onClick={() => openNew()}
          style={{ padding:'10px 20px', background:C.blue, color:'#fff',
            border:'none', borderRadius:10, fontSize:13, fontWeight:700,
            cursor:'pointer', display:'flex', alignItems:'center', gap:8 }}>
          <Plus size={15}/> New Entry
        </button>
      </div>

      {/* Stats KPI Cards */}
      <div className="grid-responsive-4">
        <StatCard
          icon={<Clock size={16} color={C.green}/>}
          label="Total Plant Hours Logged"
          value={`${totalPlantHours}h`}
          sub={`This Month: ${Number(ms?.plant?.hours || 0).toFixed(1)}h · Across all equipment`}
          color={C.green}
        />
        <StatCard
          icon={<Wrench size={16} color={C.navy}/>}
          label="Equipment Deployed"
          value={`${fleet.length || pLogs.length} Active Unit${(fleet.length || pLogs.length) === 1 ? '' : 's'}`}
          sub={fleet.map((m: any) => m.machineId).filter(Boolean).join(', ') || (pLogs[0]?.machineId ?? 'No machinery logged')}
          color={C.navy}
        />
        <StatCard
          icon={<Car size={16} color={C.blue}/>}
          label="Total Vehicle Distance"
          value={`${totalVehicleKm} KM`}
          sub={`This Month: ${Number(ms?.vehicle?.km || 0).toFixed(0)} KM · Supervision SUV`}
          color={C.blue}
        />
        <StatCard
          icon={<GasPump size={16} color={C.amber}/>}
          label="Total Fuel Consumed"
          value={`${totalFuelConsumed} L`}
          sub={`${totals?.plantFuel ?? 0} L Plant · ${totals?.vehicleFuel ?? 0} L Vehicles`}
          color={C.amber}
        />
      </div>

      {/* Fleet status — machines */}
      {fleet.length > 0 && (
        <div style={{ background:'#fff', border:`1.5px solid ${C.border}`, borderRadius:14, padding:'16px 20px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <p style={{ fontSize:12, fontWeight:700, color:C.text2, margin:0 }}>
              Equipment Hour Meter Status
            </p>
            <span style={{ fontSize:11, color:C.text3 }}>
              Next log starts automatically from previous day's closing hour
            </span>
          </div>
          <div className="grid-responsive-fill">
            {fleet.map((m: any) => (
              <div key={m.machineId} style={{ background:C.bg, borderRadius:10,
                padding:'12px 14px', border:`1px solid ${C.border}`, display:'flex', flexDirection:'column', justifyContent:'space-between' }}>
                <div>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:2 }}>
                    <p style={{ fontSize:13, fontWeight:800, color:C.text1, margin:0 }}>
                      {m.machineId}
                    </p>
                    <span style={{ fontSize:10, fontWeight:700, color:C.blue, background:'#eff6ff', padding:'1px 6px', borderRadius:10 }}>
                      {m.machineType?.replace(/_/g,' ')}
                    </span>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginTop:8 }}>
                    <span style={{ fontSize:11, color:C.text2 }}>Last meter reading:</span>
                    <span style={{ fontSize:15, fontWeight:800, color:C.text1, fontFamily:'monospace' }}>
                      {Number(m.lastReading || m.lastClosingHour || 0).toFixed(1)} hrs
                    </span>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginTop:4 }}>
                    <span style={{ fontSize:10, color:C.text3 }}>Total logged: {Number(m.totalHours || 0).toFixed(1)}h</span>
                    {m.lastDate && <span style={{ fontSize:10, color:C.text3 }}>Active: {formatDate(m.lastDate)}</span>}
                  </div>
                </div>
                <button
                  onClick={() => openNew(m.machineId)}
                  style={{
                    marginTop:10, padding:'6px 10px', fontSize:11, fontWeight:700,
                    background:'#eff6ff', color:C.blue, border:'1px solid #bfdbfe', borderRadius:8,
                    cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:4,
                  }}>
                  <Plus size={12}/> + Log Today (Starts @ {Number(m.lastReading || m.lastClosingHour || 0).toFixed(1)}h)
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Log tables */}
      <div style={{ background:'#fff', border:`1.5px solid ${C.border}`, borderRadius:16, overflow:'hidden' }}>
        {/* Tabs */}
        <div style={{ display:'flex', borderBottom:`1.5px solid ${C.border}`, background:C.bg, overflowX:'auto', WebkitOverflowScrolling:'touch' }}>
          {[
            { t:'vehicle', label:`🚗 Vehicles (${vLogs.length})` },
            { t:'plant',   label:`🏗 Equipment & Machinery (${pLogs.length})` },
          ].map(({ t, label }) => (
            <button key={t} onClick={() => setTab(t as any)}
              style={{ padding:'12px 20px', fontSize:13, fontWeight: tab===t ? 700 : 400,
                color: tab===t ? C.blue : C.text3,
                background:'none', border:'none', cursor:'pointer',
                borderBottom: tab===t ? `2.5px solid ${C.blue}` : '2.5px solid transparent',
                marginBottom:'-1.5px', whiteSpace:'nowrap' }}>
              {label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="table-responsive">
          {currentLogs.length === 0 ? (
            <div style={{ padding:'40px 20px', textAlign:'center' as any }}>
              <div style={{ margin:'0 0 8px' }}>{tab==='vehicle' ? <Car size={34} color={C.text3}/> : <Wrench size={34} color={C.text3}/>}</div>
              <p style={{ fontSize:14, color:C.text3, margin:0 }}>
                No {tab} logs yet. Click "New Entry" to add the first one.
              </p>
            </div>
          ) : (
            <table style={{ width:'100%', minWidth:980, borderCollapse:'collapse', fontSize:12 }}>
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
                {currentLogs.map((log: any, i: number) => (
                  <tr key={log.id} style={{ borderBottom:`1px solid ${C.border}`,
                    background: log.breakdown ? '#fff5f5' : i%2===0 ? '#fff' : '#fafafa' }}>
                    {tab === 'vehicle' ? (
                      <>
                        <td style={TD}>{formatDate(log.date)}</td>
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
                              style={{ padding:'3px 8px', fontSize:10, border:`1px solid ${C.border}`,
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
                        <td style={TD}>{formatDate(log.date)}</td>
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
                                Breakdown
                              </span>
                            : <span style={{ fontSize:10, fontWeight:700, color:C.green,
                                background:'#f0fdf4', padding:'2px 6px', borderRadius:99 }}>
                                ✓ Working
                              </span>}
                        </td>
                        <td style={TD}>
                          <div style={{ display:'flex', gap:4 }}>
                            <button onClick={() => openEdit(log)}
                              style={{ padding:'3px 8px', fontSize:10, border:`1px solid ${C.border}`,
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

      {/* ── Entry Form Modal (portalled to body so it isn't trapped by the
             .fade-in transform, which would clip a fixed overlay) ── */}
      {showForm && createPortal((
        <div className="modal-overlay" style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(15,23,42,0.6)',
          WebkitBackdropFilter:'blur(4px)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center',
          justifyContent:'center', padding:20 }}>
          <div className="modal-panel" role="dialog" aria-modal="true" aria-label="Fleet log entry" style={{ background:'#fff', borderRadius:20, width:'100%', maxWidth:600,
            maxHeight:'90vh', overflowY:'auto', boxShadow:'0 24px 80px rgba(0,0,0,0.2)' }}>

            {/* Modal header */}
            <div style={{ background:C.navy, padding:'18px 24px',
              display:'flex', alignItems:'center', justifyContent:'space-between',
              position:'sticky' as any, top:0, zIndex:1 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                {tab==='vehicle' ? <Car size={20} color='#fff'/> : <Wrench size={20} color='#fff'/>}
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
                  <DatePicker label="Date" required value={form.date} onChange={e => inp('date', e.target.value)} />
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
                      <input list='fleet-vehicles' value={form.vehicle} onChange={e => onVehicleChange(e.target.value)} style={INP}
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
                      {getLatestVehicleLog(form.vehicle)?.meterEnd != null && (
                        <span style={{ fontSize:10, color:C.blue, marginTop:3, display:'block' }}>
                          ⚡ From previous close: {getLatestVehicleLog(form.vehicle)?.meterEnd} km
                        </span>
                      )}
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
                      <input list='fleet-designations' value={form.passengerDesignation} onChange={e => inp('passengerDesignation', e.target.value)} style={INP}
                        placeholder='Select or type…'/>
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
                      <input list='fleet-locations' value={form.fromLocation} onChange={e => inp('fromLocation', e.target.value)} style={INP}
                        placeholder='Select or type…'/>
                    </div>
                    <div>
                      <label style={LBL}>To</label>
                      <input list='fleet-locations' value={form.toLocation} onChange={e => inp('toLocation', e.target.value)} style={INP}
                        placeholder='Select or type…'/>
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
                      <input list='fleet-machines' value={form.machineId} onChange={e => onMachineIdChange(e.target.value)} style={INP}
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
                        {getLatestMachineLog(form.machineId)?.hourClose != null && (
                          <span style={{ fontSize:10, color:'#34d399', marginTop:4, display:'block' }}>
                            ⚡ Previous closing: {getLatestMachineLog(form.machineId)?.hourClose}h
                          </span>
                        )}
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
                      Breakdown reported today
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

              {/* Dropdown suggestion sources */}
              <datalist id='fleet-machines'>
                {Array.from(new Set(pLogs.map((l: any) => l.machineId).concat(fleet.map((m: any) => m.machineId)).filter(Boolean))).map((m: any) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
              <datalist id='fleet-vehicles'>
                {Array.from(new Set(vLogs.map((l: any) => l.vehicle).filter(Boolean))).map((v: any) => (
                  <option key={v} value={v} />
                ))}
              </datalist>
              <datalist id='fleet-designations'>{DESIGNATIONS.map(d => <option key={d} value={d} />)}</datalist>
              <datalist id='fleet-locations'>{LOCATIONS.map(l => <option key={l} value={l} />)}</datalist>

              {/* Actions */}
              <div style={{ display:'flex', justifyContent:'flex-end', gap:10, paddingTop:4 }}>
                <button onClick={() => { setShowForm(false); setEditItem(null) }}
                  style={{ padding:'10px 20px', fontSize:13, color:C.text2,
                    background:'none', border:`1.5px solid ${C.border}`, borderRadius:8, cursor:'pointer' }}>
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
      ), document.body)}
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
