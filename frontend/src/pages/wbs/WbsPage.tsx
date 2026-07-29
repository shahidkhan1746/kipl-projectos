import { useState, lazy, Suspense } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, ChartBar, Flag, Warning, Download, ArrowCounterClockwise, Path, ChartLine, FilePdf } from '@phosphor-icons/react'
import { wbsApi } from '@/api/wbs.api'
import { useAuthStore } from '@/store/auth.store'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'

const C = {
  card:'#fff', border:'#e2e8f0', text1:'#0f172a', text2:'#475569', text3:'#94a3b8',
  blue:'#2563eb', green:'#059669', amber:'#d97706', red:'#dc2626', navy:'#1a2540',
  critical: '#dc2626', criticalBg: '#fef2f2',
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

// Updated project dates: 07-Nov-2025 → 07-May-2028 (30 months)
const PROJECT_START = '2025-11-07'
const PROJECT_END = '2028-05-07'

type Tab = 'gantt' | 'list' | 'milestones' | 'cpm' | 'pert'

const WbsChart = lazy(() => import('./WbsCharts'))
const ChartFallback = () => <div style={{ padding:50, textAlign:'center' }}><Spinner /></div>

function GanttBar({ task, projectStart, totalDays }: { task: any; projectStart: Date; totalDays: number }) {
  const start   = new Date(task.plannedStart)
  const end     = new Date(task.plannedEnd)
  const left    = Math.max(0, (start.getTime() - projectStart.getTime()) / 86400000 / totalDays * 100)
  const width   = Math.max(0.3, (end.getTime() - start.getTime()) / 86400000 / totalDays * 100)
  const isCritical = task.isCritical && !task.isMilestone
  const barColor  = isCritical ? C.critical
    : task.isMilestone ? C.amber
    : task.status === 'completed' ? C.green
    : task.status === 'delayed'   ? C.red
    : task.status === 'in_progress' ? C.blue
    : '#94a3b8'

  if (task.isMilestone) {
    return (
      <div style={{ position:'relative', height:24 }}>
        <div style={{ position:'absolute', left: left + '%', top:'50%', transform:'translate(-50%, -50%) rotate(45deg)', width:14, height:14, background:C.amber, border:'2px solid #92400e', zIndex:2 }} />
      </div>
    )
  }

  return (
    <div style={{ position:'relative', height:24 }}>
      <div style={{ position:'absolute', left:left+'%', width:width+'%', top:4, height:16, background:barColor+'30', borderRadius:4, border: isCritical ? '1.5px solid '+C.critical : '1.5px solid '+barColor+'50' }}>
        <div style={{ width:Number(task.progressPct)+'%', height:'100%', background:barColor, borderRadius:3, opacity:0.85 }} />
      </div>
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
  const [showDownload, setShowDownload] = useState(false)
  const [pdfLoading, setPdfLoading] = useState('')
  const [newForm, setNewForm] = useState({
    wbsCode:'', title:'', level:2, plannedStart:'', plannedEnd:'',
    status:'not_started', progressPct:'0', responsible:'', remarks:'',
    predecessors:'',
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
  const { data: cpmData } = useQuery({
    queryKey: ['wbs-cpm', activeProjectId],
    queryFn:  () => wbsApi.cpm(activeProjectId!).then(r => r.data),
    enabled:  !!activeProjectId && tab === 'cpm',
  })
  const { data: pertData } = useQuery({
    queryKey: ['wbs-pert', activeProjectId],
    queryFn:  () => wbsApi.pert(activeProjectId!).then(r => r.data),
    enabled:  !!activeProjectId && tab === 'pert',
  })

  const seedM = useMutation({
    mutationFn: (force: boolean) => wbsApi.seed(activeProjectId!, force),
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
  const recalcM = useMutation({
    mutationFn: () => wbsApi.recalculate(activeProjectId!),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['wbs'] }); qc.invalidateQueries({ queryKey: ['wbs-cpm'] }); qc.invalidateQueries({ queryKey: ['wbs-pert'] }) },
  })

  async function downloadPdf(type: 'gantt-full' | 'gantt-quart' | 'report') {
    setPdfLoading(type)
    try {
      const fn = type === 'gantt-full' ? wbsApi.ganttFullPdf : type === 'gantt-quart' ? wbsApi.ganttQuartPdf : wbsApi.reportPdf
      const res = await fn(activeProjectId!)
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `DalLake_${type}_${new Date().toISOString().split('T')[0]}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      setShowDownload(false)
    } catch (e) {
      alert('PDF generation failed: ' + (e as any)?.message)
    } finally {
      setPdfLoading('')
    }
  }

  const list       = tasks ?? []
  const milestones = list.filter((t: any) => t.isMilestone)
  const workItems  = list.filter((t: any) => !t.isMilestone)
  const noTasks    = list.length === 0 && !isLoading

  const projectStart = new Date(PROJECT_START)
  const projectEnd   = new Date(PROJECT_END)
  const totalDays    = (projectEnd.getTime() - projectStart.getTime()) / 86400000
  const today        = new Date()
  const todayPct     = Math.min(100, Math.max(0, (today.getTime() - projectStart.getTime()) / 86400000 / totalDays * 100))

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
      predecessors: task.predecessors ?? '',
    })
  }

  return (
    <div className="fade-in" style={{ display:'flex', flexDirection:'column', gap:24 }}>

      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:800, color:C.text1, margin:0, letterSpacing:'-0.02em' }}>WBS & Schedule</h1>
          <p style={{ fontSize:14, color:C.text3, marginTop:4 }}>Clause 17 — CPM · PERT · Milestones · Progress Tracking</p>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          {noTasks && (
            <Button variant="secondary" loading={seedM.isPending} onClick={() => seedM.mutate(false)}>Load Dal Lake Schedule</Button>
          )}
          {!noTasks && (
            <Button variant="secondary" size="md" icon={<ArrowCounterClockwise size={14}/>} loading={recalcM.isPending} onClick={() => recalcM.mutate()}>
              Recalc CPM/PERT
            </Button>
          )}
          {!noTasks && (
            <Button variant="secondary" size="md" icon={<Download size={14}/>} onClick={() => setShowDownload(true)}>
              Download PDF
            </Button>
          )}
          <Button variant="primary" icon={<Plus size={15}/>} onClick={() => setShowNew(true)}>Add Task</Button>
        </div>
      </div>

      {dash && (
        <div style={{ background:C.navy, borderRadius:14, padding:'16px 24px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
            <div>
              <p style={{ fontSize:11, color:'rgba(255,255,255,0.4)', margin:'0 0 4px', textTransform:'uppercase', letterSpacing:'0.08em' }}>Contract Progress — Dal Lake EPC</p>
              <p style={{ fontSize:13, color:'rgba(255,255,255,0.7)', margin:0 }}>Allotment: 07-Nov-2025 → Completion: 07-May-2028 (30 months)</p>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:28, fontWeight:900, color:'#93c5fd' }}>{dash.contractPct}%</div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)' }}>Contract time elapsed</div>
            </div>
          </div>
          <div style={{ height:8, background:'rgba(255,255,255,0.1)', borderRadius:999, overflow:'hidden' }}>
            <div style={{ height:'100%', width:dash.contractPct+'%', background:'linear-gradient(90deg, #3b82f6, #06b6d4)', borderRadius:999 }} />
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:8, fontSize:11, color:'rgba(255,255,255,0.35)' }}>
            <span>07 Nov 2025</span>
            <span style={{ color:'rgba(255,255,255,0.6)', fontWeight:600 }}>{dash.daysRemaining} days remaining</span>
            <span>07 May 2028</span>
          </div>
        </div>
      )}

      {dash && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:14 }}>
          {[
            { label:'Overall Progress',   value: dash.overallProgress+'%',           color: C.blue },
            { label:'Tasks In Progress',  value: dash.inProgress,                    color: C.blue },
            { label:'Completed',          value: dash.completed+'/'+dash.totalTasks, color: C.green },
            { label:'Delayed Tasks',      value: dash.delayed,                       color: dash.delayed > 0 ? C.red : C.green },
            { label:'Critical Tasks',     value: dash.criticalTasks,                 color: C.red },
            { label:'Milestones Hit',     value: dash.milestonesHit+'/'+dash.milestones, color: C.amber },
          ].map(k => (
            <div key={k.label} style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:12, padding:'14px 16px' }}>
              <div style={{ fontSize:9, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:6 }}>{k.label}</div>
              <div style={{ fontSize:18, fontWeight:800, color:k.color }}>{k.value}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display:'flex', borderBottom:'1.5px solid '+C.border }}>
        {([
          ['gantt','Gantt Chart',    <ChartBar size={13}/>],
          ['list','Task List',       null],
          ['milestones','Milestones',<Flag size={13}/>],
          ['cpm','Critical Path',    <Path size={13}/>],
          ['pert','PERT Analysis',   <ChartLine size={13}/>],
        ] as const).map(([t,l,icon]) => (
          <button key={t} onClick={() => setTab(t as Tab)} style={{
            padding:'10px 18px', fontSize:13, fontWeight:600, border:'none', background:'none', cursor:'pointer',
            borderBottom: tab===t ? '2px solid '+C.blue : '2px solid transparent',
            color: tab===t ? C.blue : C.text3, marginBottom:-1,
            display:'flex', alignItems:'center', gap:6,
          }}>{icon}{l}</button>
        ))}
      </div>

      {/* Gantt Tab */}
      {tab === 'gantt' && (
        <div style={{ background:C.card, borderRadius:16, border:'1.5px solid '+C.border, overflow:'hidden' }}>
          {isLoading ? <div style={{ display:'flex', justifyContent:'center', padding:40 }}><Spinner /></div>
          : noTasks ? (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'56px 24px', gap:12 }}>
              <ChartBar size={36} color={C.border} />
              <p style={{ fontSize:14, fontWeight:600, color:C.text3, margin:0 }}>No schedule loaded</p>
              <Button variant="primary" loading={seedM.isPending} onClick={() => seedM.mutate(false)}>Load Dal Lake Schedule</Button>
            </div>
          ) : (
            <div style={{ overflowX:'auto' }}>
              <div style={{ minWidth:900 }}>
                <div style={{ display:'grid', gridTemplateColumns:'280px 1fr', borderBottom:'1.5px solid '+C.border, background:'#f8f9fc' }}>
                  <div style={{ padding:'10px 16px', fontSize:11, fontWeight:700, color:C.text3, textTransform:'uppercase' }}>Task</div>
                  <div style={{ position:'relative', padding:'0 8px' }}>
                    <div style={{ display:'flex', height:36 }}>
                      {months.map((m, i) => (
                        <div key={i} style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:C.text3, borderLeft: i>0?'1px solid #f1f5f9':'none' }}>{m}</div>
                      ))}
                    </div>
                    <div style={{ position:'absolute', top:0, left:'calc(8px + '+todayPct+'%)', width:2, height:'100%', background:C.red, opacity:0.7, zIndex:3 }}>
                      <div style={{ position:'absolute', top:0, left:-14, background:C.red, color:'#fff', fontSize:9, fontWeight:700, padding:'1px 4px', borderRadius:3, whiteSpace:'nowrap' }}>TODAY</div>
                    </div>
                  </div>
                </div>

                {list.map((task: any) => {
                  const isL1 = task.level === 1
                  return (
                    <div key={task.id} style={{ display:'grid', gridTemplateColumns:'280px 1fr', borderBottom:'1px solid #f1f5f9', background: task.isCritical ? C.criticalBg : task.isMilestone?'#fffbeb':isL1?'#f8faff':'#fff', minHeight:36 }}>
                      <div style={{ padding:'6px 8px 6px '+(task.level===2?'28px':task.level===3?'44px':'8px'), display:'flex', alignItems:'center', gap:6, cursor:'pointer' }}
                        onClick={() => openEdit(task)}>
                        {task.isMilestone && <Flag size={12} color={C.amber} weight="fill" />}
                        {task.isCritical && !task.isMilestone && <Path size={12} color={C.critical} weight="fill" />}
                        {task.status === 'delayed' && <Warning size={12} color={C.red} weight="fill" />}
                        <span style={{ fontSize: isL1?13:12, fontWeight: isL1?700:400, color: task.isCritical?C.critical:task.isMilestone?C.amber:task.status==='delayed'?C.red:C.text1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>
                          {task.wbsCode} {task.title}
                        </span>
                        {!task.isMilestone && (
                          <span style={{ fontSize:10, fontWeight:700, color:Number(task.progressPct)===100?C.green:C.blue, flexShrink:0 }}>{task.progressPct}%</span>
                        )}
                      </div>
                      <div style={{ padding:'6px 8px', position:'relative' }}>
                        <GanttBar task={task} projectStart={projectStart} totalDays={totalDays} />
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

      {/* Task List Tab — same as before */}
      {tab === 'list' && (
        <div style={{ background:C.card, borderRadius:16, border:'1.5px solid '+C.border, overflow:'hidden' }}>
          {workItems.length === 0 ? <div style={{ padding:40, textAlign:'center', color:C.text3 }}>No tasks</div> : (
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'#f8f9fc', borderBottom:'1.5px solid '+C.border }}>
                  {['Code','Task','Start','End','Dur','Progress','Status','Delay','Critical','Action'].map(h => (
                    <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:10, fontWeight:700, color:C.text3, textTransform:'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {workItems.map((t: any, i: number) => {
                  const ss = STATUS_COLORS[t.status] ?? STATUS_COLORS.not_started
                  return (
                    <tr key={t.id} style={{ borderBottom: i<workItems.length-1?'1px solid #f1f5f9':'none', background:t.isCritical?C.criticalBg:t.level===2?'#fafafa':'#fff' }}>
                      <td style={{ padding:'11px 14px', fontSize:11, fontWeight:700, color:t.isCritical?C.red:C.blue, fontFamily:'monospace' }}>{t.wbsCode}</td>
                      <td style={{ padding:'11px 14px', maxWidth:220 }}>
                        <p style={{ fontSize:13, fontWeight:t.level===1?700:400, color:t.isCritical?C.red:C.text1, margin:0, paddingLeft:t.level===2?12:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.title}</p>
                      </td>
                      <td style={{ padding:'11px 14px', fontSize:12, color:C.text2 }}>{t.plannedStart}</td>
                      <td style={{ padding:'11px 14px', fontSize:12, color:C.text2 }}>{t.plannedEnd}</td>
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
                        {t.isCritical && <span style={{ fontSize:10, padding:'2px 8px', borderRadius:999, fontWeight:700, background:C.criticalBg, color:C.critical, border:'1.5px solid #fecaca' }}>CRITICAL</span>}
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

      {/* Milestones Tab */}
      {tab === 'milestones' && (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {milestones.map((m: any) => {
            const isPast    = new Date(m.plannedEnd) < new Date()
            const isDone    = m.status === 'completed'
            const isDelayed = isPast && !isDone
            return (
              <div key={m.id} style={{ background:C.card, border:'1.5px solid '+(isDone?'#a7f3d0':isDelayed?'#fecaca':C.border), borderRadius:14, padding:'16px 20px', display:'flex', alignItems:'center', gap:16 }}>
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
                <span style={{ fontSize:11, padding:'4px 12px', borderRadius:999, fontWeight:700, background:isDone?'#ecfdf5':isDelayed?'#fef2f2':'#fffbeb', color:isDone?C.green:isDelayed?C.red:C.amber, border:'1.5px solid '+(isDone?'#a7f3d0':isDelayed?'#fecaca':'#fde68a') }}>
                  {isDone ? 'Achieved' : isDelayed ? 'Overdue' : 'Upcoming'}
                </span>
                <button onClick={() => openEdit(m)} style={{ padding:'6px 12px', fontSize:11, fontWeight:600, color:C.blue, background:'#eff6ff', border:'1.5px solid #bfdbfe', borderRadius:7, cursor:'pointer', flexShrink:0 }}>Update</button>
              </div>
            )
          })}
        </div>
      )}

      {/* CPM Tab */}
      {tab === 'cpm' && cpmData && (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ background:C.criticalBg, border:'1.5px solid #fecaca', borderRadius:12, padding:'14px 18px' }}>
            <h3 style={{ fontSize:14, fontWeight:800, color:C.red, margin:'0 0 4px' }}>Critical Path Method (CPM)</h3>
            <p style={{ fontSize:12, color:'#7f1d1d', margin:0 }}>{cpmData.criticalPath?.length ?? 0} critical tasks identified — any delay extends project completion. ES/EF/LS/LF in days from project start.</p>
          </div>

          {/* Graphical network diagram */}
          <div style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:12, padding:'12px 8px' }}>
            <p style={{ fontSize:12, fontWeight:700, color:C.text2, margin:'4px 0 6px 10px' }}>Activity Network — critical path in red · drag to pan, scroll to zoom</p>
            <Suspense fallback={<ChartFallback />}>
              <WbsChart kind="cpm" tasks={cpmData.allTasks ?? []} />
            </Suspense>
          </div>

          <div style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:12, overflow:'hidden' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:C.navy }}>
                  {['Code','Task','Predecessors','Dur','ES','EF','LS','LF','Float','Critical'].map(h => (
                    <th key={h} style={{ padding:'10px 12px', textAlign:'left', fontSize:10, fontWeight:700, color:'#fff', textTransform:'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(cpmData.allTasks ?? []).map((t: any, i: number) => (
                  <tr key={i} style={{ borderBottom:'1px solid #f1f5f9', background: t.isCritical ? C.criticalBg : '#fff' }}>
                    <td style={{ padding:'10px 12px', fontSize:11, fontWeight:700, color:t.isCritical?C.red:C.blue, fontFamily:'monospace' }}>{t.wbsCode}</td>
                    <td style={{ padding:'10px 12px', fontSize:12, color:t.isCritical?C.red:C.text1, maxWidth:250, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.title}</td>
                    <td style={{ padding:'10px 12px', fontSize:11, color:C.text2, fontFamily:'monospace' }}>{t.predecessors || '—'}</td>
                    <td style={{ padding:'10px 12px', fontSize:11, color:C.text2 }}>{t.duration}d</td>
                    <td style={{ padding:'10px 12px', fontSize:11, color:C.text2 }}>{t.es}</td>
                    <td style={{ padding:'10px 12px', fontSize:11, color:C.text2 }}>{t.ef}</td>
                    <td style={{ padding:'10px 12px', fontSize:11, color:C.text2 }}>{t.ls}</td>
                    <td style={{ padding:'10px 12px', fontSize:11, color:C.text2 }}>{t.lf}</td>
                    <td style={{ padding:'10px 12px', fontSize:11, fontWeight:t.float===0?700:400, color:t.float===0?C.red:C.green }}>{t.float}d</td>
                    <td style={{ padding:'10px 12px' }}>
                      {t.isCritical && <span style={{ fontSize:9, padding:'2px 8px', borderRadius:999, fontWeight:700, background:'#fee2e2', color:C.red }}>CRITICAL</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PERT Tab */}
      {tab === 'pert' && pertData && (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
            <div style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:12, padding:'14px 16px' }}>
              <div style={{ fontSize:9, fontWeight:700, color:C.text3, textTransform:'uppercase', marginBottom:6 }}>Expected Duration (TE)</div>
              <div style={{ fontSize:20, fontWeight:800, color:C.navy }}>{pertData.projectExpectedDuration} days</div>
            </div>
            <div style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:12, padding:'14px 16px' }}>
              <div style={{ fontSize:9, fontWeight:700, color:C.text3, textTransform:'uppercase', marginBottom:6 }}>Std Deviation (σ)</div>
              <div style={{ fontSize:20, fontWeight:800, color:C.amber }}>{pertData.projectStdDeviation} days</div>
            </div>
            <div style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:12, padding:'14px 16px' }}>
              <div style={{ fontSize:9, fontWeight:700, color:C.text3, textTransform:'uppercase', marginBottom:6 }}>68% Confidence</div>
              <div style={{ fontSize:13, fontWeight:700, color:C.green }}>{pertData.probability68.lower}–{pertData.probability68.upper}d</div>
            </div>
            <div style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:12, padding:'14px 16px' }}>
              <div style={{ fontSize:9, fontWeight:700, color:C.text3, textTransform:'uppercase', marginBottom:6 }}>95% Confidence</div>
              <div style={{ fontSize:13, fontWeight:700, color:C.blue }}>{pertData.probability95.lower}–{pertData.probability95.upper}d</div>
            </div>
          </div>

          {/* Graphical probability distribution */}
          <div style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:12, padding:'16px' }}>
            <p style={{ fontSize:13, fontWeight:700, color:C.text1, margin:'0 0 3px' }}>Completion Probability Distribution</p>
            <p style={{ fontSize:11, color:C.text3, margin:'0 0 6px' }}>Green band = 68% confidence · blue band = 95% · dashed line = expected duration (TE)</p>
            <Suspense fallback={<ChartFallback />}>
              <WbsChart kind="pert" mean={pertData.projectExpectedDuration} sigma={pertData.projectStdDeviation} p68={pertData.probability68} p95={pertData.probability95} />
            </Suspense>
          </div>

          <div style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:12, overflow:'hidden' }}>
            <div style={{ background:'#f8f9fc', padding:'10px 16px', borderBottom:'1.5px solid '+C.border }}>
              <p style={{ fontSize:13, fontWeight:700, color:C.text1, margin:0 }}>PERT Three-Point Estimates (Auto-computed)</p>
              <p style={{ fontSize:11, color:C.text3, margin:'4px 0 0' }}>O = M × 0.9 · M = Planned · P = M × 1.3 + delays · TE = (O + 4M + P) / 6</p>
            </div>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:C.navy }}>
                  {['Code','Task','Optimistic','Most Likely','Pessimistic','Expected (TE)','Variance','σ','Critical'].map(h => (
                    <th key={h} style={{ padding:'10px 12px', textAlign:'left', fontSize:10, fontWeight:700, color:'#fff', textTransform:'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(pertData.tasks ?? []).map((t: any, i: number) => (
                  <tr key={i} style={{ borderBottom:'1px solid #f1f5f9', background: t.isCritical ? C.criticalBg : '#fff' }}>
                    <td style={{ padding:'10px 12px', fontSize:11, fontWeight:700, color:t.isCritical?C.red:C.blue, fontFamily:'monospace' }}>{t.wbsCode}</td>
                    <td style={{ padding:'10px 12px', fontSize:12, color:t.isCritical?C.red:C.text1, maxWidth:240, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.title}</td>
                    <td style={{ padding:'10px 12px', fontSize:11, color:C.green }}>{t.optimistic}d</td>
                    <td style={{ padding:'10px 12px', fontSize:11, color:C.blue, fontWeight:700 }}>{t.mostLikely}d</td>
                    <td style={{ padding:'10px 12px', fontSize:11, color:C.red }}>{t.pessimistic}d</td>
                    <td style={{ padding:'10px 12px', fontSize:11, fontWeight:700, color:C.navy }}>{t.expected}d</td>
                    <td style={{ padding:'10px 12px', fontSize:11, color:C.text2 }}>{t.variance}</td>
                    <td style={{ padding:'10px 12px', fontSize:11, color:C.text2 }}>{t.stdDeviation}</td>
                    <td style={{ padding:'10px 12px' }}>
                      {t.isCritical && <span style={{ fontSize:9, padding:'2px 8px', borderRadius:999, fontWeight:700, background:'#fee2e2', color:C.red }}>CRITICAL</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Download PDF Modal */}
      <Modal open={showDownload} onClose={() => setShowDownload(false)} title="Download PDF Reports" width={500}>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {[
            { type:'gantt-full', icon:<ChartBar size={20} color={C.blue}/>, title:'Gantt Chart — Full A3', desc:'Full 30-month timeline on single A3 landscape page' },
            { type:'gantt-quart', icon:<ChartBar size={20} color={C.green}/>, title:'Gantt Chart — Quarterly', desc:'One quarter per A4 page, easier to read in detail' },
            { type:'report', icon:<FilePdf size={20} color={C.amber}/>, title:'Progress Report — Full', desc:'Cover, KPIs, full task list, milestones, delays, CPM analysis' },
          ].map(opt => (
            <button key={opt.type} onClick={() => downloadPdf(opt.type as any)} disabled={!!pdfLoading}
              style={{ padding:'14px 16px', borderRadius:10, border:'1.5px solid '+C.border, background:'#fff', cursor:'pointer', textAlign:'left', display:'flex', alignItems:'center', gap:14 }}>
              {pdfLoading === opt.type ? <Spinner /> : opt.icon}
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:700, color:C.text1 }}>{opt.title}</div>
                <div style={{ fontSize:11, color:C.text3, marginTop:2 }}>{opt.desc}</div>
              </div>
              <Download size={16} color={C.text3} />
            </button>
          ))}
        </div>
      </Modal>

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
              </div>
            )}

            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:5 }}>Status</label>
              <select value={editForm.status} onChange={e => setEditForm((f: any) => ({ ...f, status: e.target.value }))}
                style={{ width:'100%', padding:'10px 13px', background:'#fff', border:'1.5px solid #d1d5db', borderRadius:8, fontSize:13, fontFamily:'inherit', cursor:'pointer' }}>
                {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>

            <Input label="Predecessors (comma-separated WBS codes, e.g. 1,2.1)"
              value={editForm.predecessors}
              onChange={e => setEditForm((f: any) => ({ ...f, predecessors: e.target.value }))}
              placeholder="e.g. 1,2.1,M1" />

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <Input label="Actual Start" type="date" value={editForm.actualStart} onChange={e => setEditForm((f: any) => ({ ...f, actualStart: e.target.value }))} />
              <Input label="Actual End" type="date" value={editForm.actualEnd} onChange={e => setEditForm((f: any) => ({ ...f, actualEnd: e.target.value }))} />
            </div>

            {(editForm.status === 'delayed' || Number(editForm.progressPct) < 100) && new Date(editTask.plannedEnd) < new Date() && (
              <div>
                <label style={{ fontSize:12, fontWeight:600, color:C.red, display:'block', marginBottom:5 }}>Delay Reason</label>
                <textarea value={editForm.delayReason} onChange={e => setEditForm((f: any) => ({ ...f, delayReason: e.target.value }))} rows={2}
                  style={{ width:'100%', padding:'9px 13px', background:'#fff', border:'1.5px solid #fecaca', borderRadius:8, fontSize:13, fontFamily:'inherit', resize:'none' }} />
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* New Task Modal */}
      <Modal open={showNew} onClose={() => setShowNew(false)} title="Add Task" width={500}
        footer={<>
          <Button variant="ghost" onClick={() => setShowNew(false)}>Cancel</Button>
          <Button variant="primary" loading={createM.isPending} onClick={() => createM.mutate()} disabled={!newForm.title||!newForm.plannedStart||!newForm.plannedEnd}>Add</Button>
        </>}>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ display:'grid', gridTemplateColumns:'100px 1fr', gap:12 }}>
            <Input label="WBS Code" value={newForm.wbsCode} onChange={e => setNewForm(f => ({ ...f, wbsCode: e.target.value }))} placeholder="2.6" />
            <Input label="Task Title *" value={newForm.title} onChange={e => setNewForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Input label="Planned Start *" type="date" value={newForm.plannedStart} onChange={e => setNewForm(f => ({ ...f, plannedStart: e.target.value }))} />
            <Input label="Planned End *" type="date" value={newForm.plannedEnd} onChange={e => setNewForm(f => ({ ...f, plannedEnd: e.target.value }))} />
          </div>
          <Input label="Predecessors" value={newForm.predecessors} onChange={e => setNewForm(f => ({ ...f, predecessors: e.target.value }))} placeholder="e.g. 1,2.1" />
          <Input label="Responsible" value={newForm.responsible} onChange={e => setNewForm(f => ({ ...f, responsible: e.target.value }))} />
        </div>
      </Modal>
    </div>
  )
}
