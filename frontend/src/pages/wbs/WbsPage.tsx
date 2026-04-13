import { useState } from 'react'
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
  const projectStart = new Date('2025-09-27')
  const projectEnd   = new Date('2028-03-27')
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
              <p style={{ fontSize:13, color:'rgba(255,255,255,0.7)', margin:0 }}>Allotment: 27-Sep-2025 → Completion: 27-Mar-2028 (30 months)</p>
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
            <span>27 Sep 2025</span>
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
