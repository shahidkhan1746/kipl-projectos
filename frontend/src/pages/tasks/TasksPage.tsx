import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Flag, User, Calendar, Warning, CheckCircle, Trash } from '@phosphor-icons/react'
import { tasksApi } from '@/api/tasks.api'
import { useAuthStore } from '@/store/auth.store'
import { hrApi } from '@/api/hr.api'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'

const C = {
  card:'#fff', border:'#e2e8f0', text1:'#0f172a', text2:'#475569', text3:'#94a3b8',
  blue:'#2563eb', green:'#059669', amber:'#d97706', red:'#dc2626', navy:'#1a2540',
}

const COLUMNS = [
  { key:'todo',        label:'To Do',      color:'#64748b', bg:'#f8fafc' },
  { key:'in_progress', label:'In Progress', color:'#2563eb', bg:'#eff6ff' },
  { key:'review',      label:'Review',      color:'#7c3aed', bg:'#f5f3ff' },
  { key:'done',        label:'Done',        color:'#059669', bg:'#ecfdf5' },
  { key:'blocked',     label:'Blocked',     color:'#dc2626', bg:'#fef2f2' },
]

const PRIORITY_STYLE: Record<string, any> = {
  critical: { bg:'#450a0a', color:'#fca5a5', label:'🔴 Critical' },
  high:     { bg:'#fef2f2', color:'#b91c1c', label:'🟠 High'     },
  medium:   { bg:'#fffbeb', color:'#b45309', label:'🟡 Medium'   },
  low:      { bg:'#f0fdf4', color:'#166534', label:'🟢 Low'      },
}

const CATEGORIES = [
  'Liaison / Government','Site Work','QA / Inspection','BOQ / Billing',
  'HR / Admin','Design / Drawing','Meeting / Report','Safety','Other',
]

const BLANK = {
  title:'', description:'', priority:'medium', dueDate:'',
  assignedTo:'', assignedName:'', category:'Site Work',
  wbsCode:'', wbsTitle:'',
}

type View = 'kanban' | 'list'

export default function TasksPage() {
  const { activeProjectId, user } = useAuthStore()
  const qc = useQueryClient()
  const [view, setView]         = useState<View>('kanban')
  const [searchParams, setSearchParams] = useSearchParams()
  const [highlightTaskId, setHighlightTaskId] = useState<string | null>(null)

  // Deep link: /tasks?taskId=xxx → highlight that task card for 3 seconds
  // Deep link: /tasks?action=new → open new task modal
  useEffect(() => {
    const taskId = searchParams.get('taskId')
    const action = searchParams.get('action')
    if (taskId) {
      setHighlightTaskId(taskId)
      setSearchParams({})
      // Scroll to the highlighted card
      setTimeout(() => {
        const el = document.getElementById('task-card-' + taskId)
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 400)
      // Clear highlight after 3s
      setTimeout(() => setHighlightTaskId(null), 3000)
    }
    if (action === 'new') {
      setShowNew(true)
      setSearchParams({})
    }
  }, [searchParams])
  const [showNew, setShowNew]   = useState(false)
  const [viewTask, setViewTask] = useState<any>(null)
  const [form, setForm]         = useState<any>(BLANK)
  const [comment, setComment]   = useState('')
  const [filterAssignee, setFA] = useState('')
  const [filterPriority, setFP] = useState('')

  const { data: dash } = useQuery({
    queryKey: ['task-dash', activeProjectId],
    queryFn:  () => tasksApi.dashboard(activeProjectId!).then(r => r.data),
    enabled:  !!activeProjectId,
  })

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks', activeProjectId, filterAssignee, filterPriority],
    queryFn:  () => tasksApi.list({ projectId: activeProjectId, assignedTo: filterAssignee||undefined, priority: filterPriority||undefined }).then(r => r.data),
    enabled:  !!activeProjectId,
  })

  const { data: employees } = useQuery({
    queryKey: ['employees', activeProjectId],
    queryFn:  () => hrApi.employees({ projectId: activeProjectId, status:'active' }).then(r => r.data),
    enabled:  !!activeProjectId,
  })

  const createM = useMutation({
    mutationFn: () => tasksApi.create({ ...form, projectId: activeProjectId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); qc.invalidateQueries({ queryKey: ['task-dash'] }); setShowNew(false); setForm(BLANK) },
  })

  const updateM = useMutation({
    mutationFn: ({ id, data }: any) => tasksApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); qc.invalidateQueries({ queryKey: ['task-dash'] }); if (viewTask) { const updated = (tasks??[]).find((t:any)=>t.id===viewTask.id); if(updated) setViewTask({...updated}) } },
  })

  const commentM = useMutation({
    mutationFn: () => tasksApi.comment(viewTask.id, comment),
    onSuccess: (data) => { qc.invalidateQueries({ queryKey: ['tasks'] }); setComment(''); setViewTask(data.data) },
  })

  const deleteM = useMutation({
    mutationFn: (id: string) => tasksApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); qc.invalidateQueries({ queryKey: ['task-dash'] }); setViewTask(null) },
  })

  const setF = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))

  const list = tasks ?? []
  const today = new Date().toISOString().split('T')[0]

  function getColTasks(col: string) {
    return list.filter((t: any) => t.status === col)
  }

  function moveTask(id: string, newStatus: string) {
    updateM.mutate({ id, data: { status: newStatus } })
  }

  const empOptions = [
    { value:'', label:'Unassigned' },
    ...(employees??[]).map((e:any) => ({ value: e.id, label: e.firstName+' '+(e.lastName??'')+' ('+e.empCode+')' }))
  ]

  function selectEmployee(empId: string) {
    const emp = (employees??[]).find((e:any) => e.id === empId)
    setF('assignedTo', empId)
    setF('assignedName', emp ? emp.firstName+' '+(emp.lastName??'') : '')
  }

  return (
    <div className="fade-in" style={{ display:'flex', flexDirection:'column', gap:24 }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:800, color:C.text1, margin:0, letterSpacing:'-0.02em' }}>Task Board</h1>
          <p style={{ fontSize:14, color:C.text3, marginTop:4 }}>Assign tasks to team members · Track progress · Kanban view</p>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <div style={{ display:'flex', background:'#f1f5f9', borderRadius:8, padding:3 }}>
            {(['kanban','list'] as const).map(v => (
              <button key={v} onClick={() => setView(v)} style={{ padding:'6px 14px', borderRadius:6, fontSize:12, fontWeight:600, border:'none', cursor:'pointer', background:view===v?'#fff':'transparent', color:view===v?C.text1:C.text3, boxShadow:view===v?'0 1px 3px rgba(0,0,0,0.1)':'none' }}>
                {v === 'kanban' ? '⬛ Kanban' : '☰ List'}
              </button>
            ))}
          </div>
          <Button variant="primary" size="md" icon={<Plus size={15}/>} onClick={() => setShowNew(true)}>New Task</Button>
        </div>
      </div>

      {/* KPI cards */}
      {dash && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:12 }}>
          {[
            { label:'Total',      value:dash.total,      color:C.text1 },
            { label:'To Do',      value:dash.todo,       color:'#64748b' },
            { label:'In Progress',value:dash.inProgress, color:C.blue   },
            { label:'Done',       value:dash.done,       color:C.green  },
            { label:'Overdue',    value:dash.overdue,    color:dash.overdue>0?C.red:C.green },
            { label:'Critical',   value:dash.critical,   color:dash.critical>0?C.red:C.green },
          ].map(k => (
            <div key={k.label} style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:10, padding:'12px 14px', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize:10, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:5 }}>{k.label}</div>
              <div style={{ fontSize:22, fontWeight:800, color:k.color }}>{k.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div style={{ display:'flex', gap:10, alignItems:'center' }}>
        <select value={filterAssignee} onChange={e => setFA(e.target.value)}
          style={{ padding:'8px 12px', background:C.card, border:'1.5px solid '+C.border, borderRadius:8, fontSize:12, color:C.text1, outline:'none', fontFamily:'inherit', cursor:'pointer' }}>
          <option value="">All Assignees</option>
          {(employees??[]).map((e:any) => (
            <option key={e.id} value={e.id}>{e.firstName} {e.lastName??''}</option>
          ))}
        </select>
        <select value={filterPriority} onChange={e => setFP(e.target.value)}
          style={{ padding:'8px 12px', background:C.card, border:'1.5px solid '+C.border, borderRadius:8, fontSize:12, color:C.text1, outline:'none', fontFamily:'inherit', cursor:'pointer' }}>
          <option value="">All Priorities</option>
          {['critical','high','medium','low'].map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <span style={{ fontSize:12, color:C.text3 }}>{list.length} tasks</span>
      </div>

      {/* Kanban View */}
      {view === 'kanban' && (
        isLoading ? <div style={{ display:'flex', justifyContent:'center', padding:40 }}><Spinner /></div> : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:14, alignItems:'start' }}>
          {COLUMNS.map(col => {
            const colTasks = getColTasks(col.key)
            return (
              <div key={col.key} style={{ borderRadius:14, border:'1.5px solid '+C.border, overflow:'hidden', background:col.bg }}>
                {/* Column header */}
                <div style={{ padding:'12px 14px', borderBottom:'1.5px solid '+C.border, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <div style={{ width:10, height:10, borderRadius:'50%', background:col.color }} />
                    <span style={{ fontSize:12, fontWeight:700, color:col.color }}>{col.label}</span>
                  </div>
                  <span style={{ fontSize:11, fontWeight:700, color:C.text3, background:'#fff', padding:'1px 7px', borderRadius:999, border:'1px solid '+C.border }}>{colTasks.length}</span>
                </div>
                {/* Cards */}
                <div style={{ padding:'10px 10px', display:'flex', flexDirection:'column', gap:8, minHeight:100 }}>
                  {colTasks.map((task: any) => {
                    const ps = PRIORITY_STYLE[task.priority] ?? PRIORITY_STYLE.medium
                    const isOverdue = task.dueDate && task.dueDate < today && task.status !== 'done'
                    return (
                      <div key={task.id} onClick={() => setViewTask(task)}
                        style={{ background:'#fff', borderRadius:10, padding:'12px 12px', border:'1.5px solid '+(isOverdue?C.red:C.border), cursor:'pointer', boxShadow:'0 1px 3px rgba(0,0,0,0.05)', transition:'all 0.1s' }}
                        onMouseEnter={e => { e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)' }}
                        onMouseLeave={e => { e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='0 1px 3px rgba(0,0,0,0.05)' }}>
                        {/* Priority badge */}
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                          <span style={{ fontSize:9, padding:'2px 6px', borderRadius:999, fontWeight:700, background:ps.bg, color:ps.color }}>{ps.label}</span>
                          {isOverdue && <span style={{ fontSize:9, color:C.red, fontWeight:700 }}>OVERDUE</span>}
                        </div>
                        {/* Title */}
                        <p style={{ fontSize:13, fontWeight:600, color:C.text1, margin:'0 0 8px', lineHeight:1.4 }}>{task.title}</p>
                        {/* Category */}
                        {task.category && <p style={{ fontSize:10, color:C.text3, margin:'0 0 8px' }}>{task.category}</p>}
                        {/* Footer */}
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:8 }}>
                          {task.assignedName ? (
                            <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                              <div style={{ width:20, height:20, borderRadius:'50%', background:C.blue+'20', display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:700, color:C.blue }}>
                                {task.assignedName.charAt(0)}
                              </div>
                              <span style={{ fontSize:10, color:C.text3 }}>{task.assignedName.split(' ')[0]}</span>
                            </div>
                          ) : <span style={{ fontSize:10, color:'#cbd5e1' }}>Unassigned</span>}
                          {task.dueDate && (
                            <span style={{ fontSize:10, color:isOverdue?C.red:C.text3, fontWeight:isOverdue?700:400 }}>{task.dueDate}</span>
                          )}
                        </div>
                        {/* Progress bar */}
                        {Number(task.progressPct) > 0 && (
                          <div style={{ marginTop:8, height:3, background:'#f1f5f9', borderRadius:999, overflow:'hidden' }}>
                            <div style={{ height:'100%', width:task.progressPct+'%', background:task.status==='done'?C.green:C.blue, borderRadius:999 }} />
                          </div>
                        )}
                        {/* Quick move buttons */}
                        <div style={{ display:'flex', gap:4, marginTop:8, flexWrap:'wrap' }}>
                          {COLUMNS.filter(c => c.key !== col.key).map(c => (
                            <button key={c.key} onClick={e => { e.stopPropagation(); moveTask(task.id, c.key) }}
                              style={{ fontSize:9, padding:'2px 6px', background:'transparent', border:'1px solid '+C.border, borderRadius:4, cursor:'pointer', color:C.text3 }}>
                              → {c.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                  {/* Add task button per column */}
                  <button onClick={() => { setForm({...BLANK, status: col.key}); setShowNew(true) }}
                    style={{ padding:'8px', background:'transparent', border:'1.5px dashed '+C.border, borderRadius:8, cursor:'pointer', color:C.text3, fontSize:12, display:'flex', alignItems:'center', justifyContent:'center', gap:4 }}>
                    <Plus size={12}/> Add task
                  </button>
                </div>
              </div>
            )
          })}
        </div>
        )
      )}

      {/* List View */}
      {view === 'list' && (
        <div style={{ background:C.card, borderRadius:16, border:'1.5px solid '+C.border, overflow:'hidden', boxShadow:'0 1px 6px rgba(0,0,0,0.05)' }}>
          {isLoading ? <div style={{ display:'flex', justifyContent:'center', padding:40 }}><Spinner /></div>
          : list.length === 0 ? (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'56px 24px', gap:10 }}>
              <p style={{ fontSize:14, fontWeight:600, color:C.text3, margin:0 }}>No tasks yet</p>
              <Button variant="primary" size="sm" icon={<Plus size={13}/>} onClick={() => setShowNew(true)}>Create first task</Button>
            </div>
          ) : (
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'#f8f9fc', borderBottom:'1.5px solid '+C.border }}>
                  {['Task','Category','Assigned To','Priority','Due Date','Progress','Status','Actions'].map(h => (
                    <th key={h} style={{ padding:'10px 16px', textAlign:'left', fontSize:10, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.06em', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {list.map((t: any, i: number) => {
                  const ps = PRIORITY_STYLE[t.priority] ?? PRIORITY_STYLE.medium
                  const isOverdue = t.dueDate && t.dueDate < today && t.status !== 'done'
                  const colStyle = COLUMNS.find(c => c.key === t.status)
                  return (
                    <tr key={t.id} style={{ borderBottom:i<list.length-1?'1px solid #f1f5f9':'none', background:isOverdue?'#fff5f5':'transparent' }}
                      onMouseEnter={e=>(e.currentTarget.style.background=isOverdue?'#fef2f2':'#f8faff')}
                      onMouseLeave={e=>(e.currentTarget.style.background=isOverdue?'#fff5f5':'transparent')}>
                      <td style={{ padding:'12px 16px', maxWidth:250 }}>
                        <p style={{ fontSize:13, fontWeight:600, color:C.text1, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', cursor:'pointer' }} onClick={() => setViewTask(t)}>{t.title}</p>
                        {t.wbsCode && <p style={{ fontSize:10, color:C.text3, margin:'2px 0 0' }}>WBS: {t.wbsCode}</p>}
                      </td>
                      <td style={{ padding:'12px 16px', fontSize:12, color:C.text2 }}>{t.category||'—'}</td>
                      <td style={{ padding:'12px 16px' }}>
                        {t.assignedName ? (
                          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                            <div style={{ width:24, height:24, borderRadius:'50%', background:C.blue+'20', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:C.blue, flexShrink:0 }}>
                              {t.assignedName.charAt(0)}
                            </div>
                            <span style={{ fontSize:12, color:C.text2 }}>{t.assignedName}</span>
                          </div>
                        ) : <span style={{ fontSize:12, color:'#cbd5e1' }}>Unassigned</span>}
                      </td>
                      <td style={{ padding:'12px 16px' }}>
                        <span style={{ fontSize:10, padding:'2px 8px', borderRadius:999, fontWeight:700, background:ps.bg, color:ps.color }}>{ps.label}</span>
                      </td>
                      <td style={{ padding:'12px 16px', fontSize:12, color:isOverdue?C.red:C.text2, fontWeight:isOverdue?700:400, whiteSpace:'nowrap' }}>
                        {t.dueDate||'—'}{isOverdue?' ⚠':''}
                      </td>
                      <td style={{ padding:'12px 16px', minWidth:100 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <div style={{ flex:1, height:5, borderRadius:999, background:'#f1f5f9', overflow:'hidden' }}>
                            <div style={{ height:'100%', width:t.progressPct+'%', background:t.status==='done'?C.green:C.blue, borderRadius:999 }} />
                          </div>
                          <span style={{ fontSize:10, color:C.text3, minWidth:28 }}>{t.progressPct}%</span>
                        </div>
                      </td>
                      <td style={{ padding:'12px 16px' }}>
                        <span style={{ fontSize:10, padding:'2px 8px', borderRadius:999, fontWeight:700, background:colStyle?.bg, color:colStyle?.color, border:'1px solid '+(colStyle?.color+'30') }}>{t.status.replace(/_/g,' ')}</span>
                      </td>
                      <td style={{ padding:'12px 16px' }}>
                        <div style={{ display:'flex', gap:5 }}>
                          <button onClick={() => setViewTask(t)}
                            style={{ padding:'4px 8px', fontSize:10, color:C.blue, background:'#eff6ff', border:'1.5px solid #bfdbfe', borderRadius:5, cursor:'pointer', fontWeight:600 }}>View</button>
                          {t.status !== 'done' && (
                            <button onClick={() => updateM.mutate({ id:t.id, data:{ status:'done' } })}
                              style={{ padding:'4px 8px', fontSize:10, color:'#047857', background:'#ecfdf5', border:'1.5px solid #a7f3d0', borderRadius:5, cursor:'pointer', fontWeight:600 }}>Done</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* New Task Modal */}
      <Modal open={showNew} onClose={() => setShowNew(false)} title="Create Task" width={560}
        footer={<>
          <Button variant="ghost" onClick={() => setShowNew(false)}>Cancel</Button>
          <Button variant="primary" loading={createM.isPending} onClick={() => createM.mutate()} disabled={!form.title}>Create Task</Button>
        </>}>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <Input label="Task Title *" value={form.title} onChange={e => setF('title',e.target.value)} placeholder="Submit RA-1 bill to UEED..." />
          <div>
            <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:5 }}>Description</label>
            <textarea value={form.description} onChange={e => setF('description',e.target.value)} rows={2}
              placeholder="Details about what needs to be done..."
              style={{ width:'100%', padding:'9px 13px', background:'#fff', border:'1.5px solid #d1d5db', borderRadius:8, fontSize:13, color:'#111827', outline:'none', fontFamily:'inherit', resize:'none' }} />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:5 }}>Assign To</label>
              <select value={form.assignedTo} onChange={e => selectEmployee(e.target.value)}
                style={{ width:'100%', padding:'10px 13px', background:'#fff', border:'1.5px solid #d1d5db', borderRadius:8, fontSize:13, color:'#111827', outline:'none', fontFamily:'inherit', cursor:'pointer' }}>
                {empOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:5 }}>Priority</label>
              <select value={form.priority} onChange={e => setF('priority',e.target.value)}
                style={{ width:'100%', padding:'10px 13px', background:'#fff', border:'1.5px solid #d1d5db', borderRadius:8, fontSize:13, color:'#111827', outline:'none', fontFamily:'inherit', cursor:'pointer' }}>
                <option value="low">🟢 Low</option>
                <option value="medium">🟡 Medium</option>
                <option value="high">🟠 High</option>
                <option value="critical">🔴 Critical</option>
              </select>
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Input label="Due Date" type="date" value={form.dueDate} onChange={e => setF('dueDate',e.target.value)} />
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:5 }}>Category</label>
              <select value={form.category} onChange={e => setF('category',e.target.value)}
                style={{ width:'100%', padding:'10px 13px', background:'#fff', border:'1.5px solid #d1d5db', borderRadius:8, fontSize:13, color:'#111827', outline:'none', fontFamily:'inherit', cursor:'pointer' }}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Input label="WBS Code (optional)" value={form.wbsCode} onChange={e => setF('wbsCode',e.target.value)} placeholder="2.1" />
            <Input label="WBS Item" value={form.wbsTitle} onChange={e => setF('wbsTitle',e.target.value)} placeholder="Pipe laying 200mm" />
          </div>
        </div>
      </Modal>

      {/* View / Edit Task Modal */}
      {viewTask && (
        <Modal open={!!viewTask} onClose={() => setViewTask(null)} title={viewTask.title} width={620}
          footer={<>
            <button onClick={() => { if(window.confirm('Delete this task?')) deleteM.mutate(viewTask.id) }}
              style={{ padding:'8px 14px', fontSize:12, color:C.red, background:'#fef2f2', border:'1.5px solid #fecaca', borderRadius:7, cursor:'pointer', fontWeight:600, marginRight:'auto' }}>
              Delete
            </button>
            <Button variant="ghost" onClick={() => setViewTask(null)}>Close</Button>
          </>}>
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {/* Meta */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
              {[
                ['Assigned To', viewTask.assignedName||'Unassigned'],
                ['Priority', PRIORITY_STYLE[viewTask.priority]?.label||viewTask.priority],
                ['Due Date', viewTask.dueDate||'—'],
              ].map(([l,v]) => (
                <div key={l} style={{ padding:'8px 12px', background:'#f8f9fc', borderRadius:8, border:'1px solid '+C.border }}>
                  <p style={{ fontSize:10, fontWeight:700, color:C.text3, textTransform:'uppercase', margin:'0 0 3px' }}>{l}</p>
                  <p style={{ fontSize:13, color:C.text1, margin:0, fontWeight:500 }}>{v}</p>
                </div>
              ))}
            </div>

            {/* Description */}
            {viewTask.description && (
              <div style={{ padding:'10px 14px', background:'#f8f9fc', borderRadius:8, border:'1px solid '+C.border }}>
                <p style={{ fontSize:12, color:C.text2, margin:0, lineHeight:1.6 }}>{viewTask.description}</p>
              </div>
            )}

            {/* Status change */}
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:8 }}>Move to</label>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {COLUMNS.map(col => (
                  <button key={col.key} onClick={() => { updateM.mutate({ id:viewTask.id, data:{ status:col.key } }); setViewTask({...viewTask, status:col.key}) }}
                    style={{ padding:'6px 14px', fontSize:12, fontWeight:600, cursor:'pointer', borderRadius:7, border:'1.5px solid '+(viewTask.status===col.key?col.color:C.border), background:viewTask.status===col.key?col.color:col.bg, color:viewTask.status===col.key?'#fff':col.color }}>
                    {col.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Progress slider */}
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:5 }}>Progress: {viewTask.progressPct}%</label>
              <input type="range" min="0" max="100" step="10" value={viewTask.progressPct}
                onChange={e => { const pct=parseInt(e.target.value); updateM.mutate({ id:viewTask.id, data:{ progressPct:pct } }); setViewTask({...viewTask, progressPct:pct}) }}
                style={{ width:'100%', cursor:'pointer' }} />
            </div>

            {/* Comments */}
            <div>
              <p style={{ fontSize:12, fontWeight:700, color:C.text1, margin:'0 0 8px', textTransform:'uppercase', letterSpacing:'0.06em' }}>Comments ({(viewTask.comments??[]).length})</p>
              {(viewTask.comments??[]).map((c:any, i:number) => (
                <div key={i} style={{ padding:'8px 12px', background:'#f8f9fc', borderRadius:8, marginBottom:6, border:'1px solid '+C.border }}>
                  <p style={{ fontSize:11, fontWeight:700, color:C.blue, margin:'0 0 3px' }}>{c.author} <span style={{ color:C.text3, fontWeight:400 }}>{new Date(c.date).toLocaleDateString('en-IN')}</span></p>
                  <p style={{ fontSize:13, color:C.text1, margin:0 }}>{c.text}</p>
                </div>
              ))}
              <div style={{ display:'flex', gap:8, marginTop:8 }}>
                <input value={comment} onChange={e => setComment(e.target.value)} placeholder="Add a comment..."
                  onKeyDown={e => { if(e.key==='Enter' && comment.trim()) commentM.mutate() }}
                  style={{ flex:1, padding:'8px 12px', border:'1.5px solid '+C.border, borderRadius:8, fontSize:13, outline:'none', fontFamily:'inherit' }} />
                <button onClick={() => commentM.mutate()} disabled={!comment.trim()}
                  style={{ padding:'8px 16px', background:C.blue, color:'#fff', border:'none', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer' }}>
                  Post
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
