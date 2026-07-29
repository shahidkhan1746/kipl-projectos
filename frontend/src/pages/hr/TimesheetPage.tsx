import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, CheckCircle, Clock, FileText } from '@phosphor-icons/react'
import { hrApi } from '@/api/hr.api'
import { useAuthStore } from '@/store/auth.store'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'

const CATEGORIES = [
  'Site Supervision','Measurement & Survey','Quality Check / QA',
  'Drawing Review','Material Inspection','Liaison / Government Office',
  'Labour Management','BOQ / Estimation','Meeting / Coordination',
  'Report Preparation','Safety Inspection','Equipment Inspection',
  'Tree Cutting / Site Clearance','Trench Excavation','Pipe Laying',
  'Manhole Construction','STP Work','IPS Work',
  'Testing & Commissioning','Administrative Work','Training','Other',
]

const STATUS_STYLE: Record<string, any> = {
  draft:     { bg:'#f8fafc', color:'#64748b', border:'#e2e8f0' },
  submitted: { bg:'#eff6ff', color:'#1d4ed8', border:'#bfdbfe' },
  approved:  { bg:'#ecfdf5', color:'#047857', border:'#a7f3d0' },
  rejected:  { bg:'#fef2f2', color:'#b91c1c', border:'#fecaca' },
}

const MONTHS = ['January','February','March','April','May','June',
  'July','August','September','October','November','December']

const C = {
  card:'#fff', border:'#e2e8f0', text1:'#0f172a',
  text2:'#475569', text3:'#94a3b8', blue:'#2563eb',
  green:'#059669', amber:'#d97706', red:'#dc2626',
}

export default function TimesheetPage() {
  const { activeProjectId, user } = useAuthStore()
  const qc = useQueryClient()
  const now = new Date()
  const [viewMonth, setViewMonth] = useState(now.getMonth())
  const [viewYear]                = useState(now.getFullYear())
  const [selectedDate, setSelectedDate] = useState(now.toISOString().split('T')[0])
  const [showSubmit, setShowSubmit]     = useState(false)
  const [viewTs, setViewTs]             = useState<any>(null)
  const [filterEmp, setFilterEmp]       = useState('')
  const [form, setForm] = useState({
    attendanceStatus: 'present',
    activities: [{ time:'09:00', activity:'', location:'Site', category:'Site Supervision' }] as any[],
    workDoneSummary: '',
    issuesFaced: '',
    nextDayPlan: '',
  })

  const { data: employees } = useQuery({
    queryKey: ['employees', activeProjectId],
    queryFn:  () => hrApi.employees({ projectId: activeProjectId, status: 'active' }).then(r => r.data),
  })

  const { data: timesheets, isLoading } = useQuery({
    queryKey: ['timesheets', viewMonth, viewYear, filterEmp, activeProjectId],
    queryFn:  () => hrApi.timesheets({
      month: viewMonth + 1, year: viewYear,
      projectId: activeProjectId,
      employeeId: filterEmp || undefined,
    }).then(r => r.data),
  })

  const submitM = useMutation({
    mutationFn: () => hrApi.submitTimesheet({
      employeeId: user?.id ?? '',
      date: selectedDate,
      projectId: activeProjectId,
      ...form,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['timesheets'] })
      setShowSubmit(false)
    },
  })

  const approveM = useMutation({
    mutationFn: (id: string) => hrApi.approveTimesheet(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['timesheets'] }),
  })

  function addActivity() {
    setForm(f => ({ ...f, activities: [...f.activities, { time:'', activity:'', location:'Site', category:'Site Supervision' }] }))
  }
  function removeActivity(i: number) {
    setForm(f => ({ ...f, activities: f.activities.filter((_: any, idx: number) => idx !== i) }))
  }
  function setActivity(i: number, key: string, val: string) {
    setForm(f => ({ ...f, activities: f.activities.map((a: any, idx: number) => idx === i ? { ...a, [key]: val } : a) }))
  }

  const empMap: Record<string, any> = {}
  ;(employees ?? []).forEach((e: any) => { empMap[e.id] = e })

  const list       = timesheets ?? []
  const pending    = list.filter((t: any) => t.status === 'submitted').length
  const approved   = list.filter((t: any) => t.status === 'approved').length
  const monthName  = MONTHS[viewMonth]

  return (
    <div className="fade-in" style={{ display:'flex', flexDirection:'column', gap:24 }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:800, color:C.text1, margin:0, letterSpacing:'-0.02em' }}>Daily Timesheets</h1>
          <p style={{ fontSize:14, color:C.text3, marginTop:4 }}>Daily activity logs — what was done, where, and by whom</p>
        </div>
        <Button variant="primary" size="md" icon={<Plus size={15}/>} onClick={() => setShowSubmit(true)}>
          Submit Today's Log
        </Button>
      </div>

      {/* Filters */}
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ display:'flex', gap:3, background:C.card, border:'1.5px solid '+C.border, borderRadius:8, padding:3 }}>
          <button onClick={() => setViewMonth(m => (m - 1 + 12) % 12)}
            style={{ padding:'6px 10px', background:'none', border:'none', cursor:'pointer', color:C.text3, fontSize:14 }}>‹</button>
          <span style={{ padding:'6px 12px', fontSize:13, fontWeight:700, color:C.text1 }}>{monthName} {viewYear}</span>
          <button onClick={() => setViewMonth(m => (m + 1) % 12)}
            style={{ padding:'6px 10px', background:'none', border:'none', cursor:'pointer', color:C.text3, fontSize:14 }}>›</button>
        </div>
        <select value={filterEmp} onChange={e => setFilterEmp(e.target.value)}
          style={{ padding:'8px 14px', background:C.card, border:'1.5px solid '+C.border, borderRadius:8, fontSize:13, color:C.text1, outline:'none', fontFamily:'inherit', cursor:'pointer' }}>
          <option value="">All Employees</option>
          {(employees ?? []).map((e: any) => (
            <option key={e.id} value={e.id}>{e.firstName} {e.lastName ?? ''} ({e.empCode})</option>
          ))}
        </select>
        <div style={{ display:'flex', gap:10, marginLeft:'auto' }}>
          {[
            { label:'Total Logs', value:list.length, color:C.blue },
            { label:'Pending',    value:pending,      color:C.amber },
            { label:'Approved',   value:approved,     color:C.green },
          ].map(s => (
            <div key={s.label} style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:10, padding:'8px 16px', textAlign:'center' }}>
              <div style={{ fontSize:20, fontWeight:800, color:s.color, fontVariantNumeric:'tabular-nums' }}>{s.value}</div>
              <div style={{ fontSize:10, color:C.text3, fontWeight:600, marginTop:2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{ background:C.card, borderRadius:16, border:'1.5px solid '+C.border, overflow:'hidden', boxShadow:'0 1px 6px rgba(0,0,0,0.05)' }}>
        <div style={{ padding:'14px 22px', background:'#f8f9fc', borderBottom:'1.5px solid '+C.border }}>
          <h2 style={{ fontSize:14, fontWeight:700, color:C.text1, margin:0 }}>{monthName} {viewYear} — {list.length} entries</h2>
        </div>
        {isLoading ? (
          <div style={{ display:'flex', justifyContent:'center', padding:40 }}><Spinner /></div>
        ) : list.length === 0 ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'56px 24px', gap:10 }}>
            <FileText size={32} color={C.border} />
            <p style={{ fontSize:14, fontWeight:600, color:C.text3, margin:0 }}>No timesheet entries for {monthName}</p>
            <Button variant="secondary" size="sm" icon={<Plus size={13}/>} onClick={() => setShowSubmit(true)}>Submit first log</Button>
          </div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'#f8f9fc', borderBottom:'1.5px solid '+C.border }}>
                {['Date','Employee','Activities','Summary','Status','Actions'].map(h => (
                  <th key={h} style={{ padding:'10px 18px', textAlign:'left', fontSize:10, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.07em', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.map((ts: any, i: number) => {
                const emp = empMap[ts.employeeId]
                const ss  = STATUS_STYLE[ts.status] ?? STATUS_STYLE.draft
                return (
                  <tr key={ts.id} style={{ borderBottom: i < list.length - 1 ? '1px solid #f1f5f9' : 'none' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f8faff')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ padding:'12px 18px', fontSize:12, fontWeight:700, color:C.text1, whiteSpace:'nowrap' }}>
                      {new Date(ts.date).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
                    </td>
                    <td style={{ padding:'12px 18px' }}>
                      <p style={{ fontSize:13, fontWeight:600, color:C.text1, margin:0 }}>{emp ? `${emp.firstName} ${emp.lastName ?? ''}` : '—'}</p>
                      <p style={{ fontSize:11, color:C.text3, margin:'2px 0 0', fontFamily:'monospace' }}>{emp?.empCode ?? ''}</p>
                    </td>
                    <td style={{ padding:'12px 18px', maxWidth:200 }}>
                      {(ts.activities ?? []).slice(0, 3).map((a: any, ai: number) => (
                        <div key={ai} style={{ fontSize:11, color:C.text2, marginBottom:2, display:'flex', alignItems:'center', gap:6 }}>
                          <span style={{ width:5, height:5, borderRadius:'50%', background:C.blue, flexShrink:0, display:'inline-block' }} />
                          <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.activity}</span>
                        </div>
                      ))}
                      {(ts.activities ?? []).length > 3 && (
                        <span style={{ fontSize:11, color:C.text3 }}>+{(ts.activities ?? []).length - 3} more</span>
                      )}
                    </td>
                    <td style={{ padding:'12px 18px', fontSize:12, color:C.text2, maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {ts.workDoneSummary ?? '—'}
                    </td>
                    <td style={{ padding:'12px 18px' }}>
                      <span style={{ display:'inline-flex', padding:'3px 10px', borderRadius:999, fontSize:11, fontWeight:700, background:ss.bg, color:ss.color, border:'1.5px solid '+ss.border }}>{ts.status}</span>
                    </td>
                    <td style={{ padding:'12px 18px' }}>
                      <div style={{ display:'flex', gap:6 }}>
                        <button onClick={() => setViewTs(ts)}
                          style={{ padding:'5px 10px', background:'none', border:'1.5px solid '+C.border, borderRadius:6, fontSize:11, color:C.text2, cursor:'pointer' }}>View</button>
                        {ts.status === 'submitted' && (
                          <button onClick={() => approveM.mutate(ts.id)}
                            style={{ padding:'5px 10px', background:'#ecfdf5', border:'1.5px solid #a7f3d0', borderRadius:6, fontSize:11, color:'#047857', cursor:'pointer', fontWeight:600 }}>✓ Approve</button>
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

      {/* Submit Modal */}
      <Modal open={showSubmit} onClose={() => setShowSubmit(false)} title="Submit Daily Activity Log" width={720}
        footer={<>
          <Button variant="ghost" onClick={() => setShowSubmit(false)}>Cancel</Button>
          <Button variant="primary" loading={submitM.isPending} onClick={() => submitM.mutate()}
            disabled={form.activities.every((a: any) => !a.activity)}>
            Submit Log
          </Button>
        </>}>
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:5 }}>Date</label>
              <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                style={{ width:'100%', padding:'10px 13px', background:'#fff', border:'1.5px solid #d1d5db', borderRadius:8, fontSize:13, color:'#111827', outline:'none', fontFamily:'inherit' }} />
            </div>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:5 }}>Attendance Status</label>
              <select value={form.attendanceStatus} onChange={e => setForm(f => ({ ...f, attendanceStatus: e.target.value }))}
                style={{ width:'100%', padding:'10px 13px', background:'#fff', border:'1.5px solid #d1d5db', borderRadius:8, fontSize:13, color:'#111827', outline:'none', fontFamily:'inherit', cursor:'pointer' }}>
                <option value="present">✓ Present</option>
                <option value="leave">Leave</option>
                <option value="half_day">½ Half Day</option>
                <option value="holiday">Holiday</option>
              </select>
            </div>
          </div>

          <div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
              <label style={{ fontSize:12, fontWeight:600, color:'#374151' }}>Daily Activities *</label>
              <button onClick={addActivity}
                style={{ fontSize:12, color:C.blue, background:'none', border:'none', cursor:'pointer', fontWeight:600, display:'flex', alignItems:'center', gap:4 }}>
                + Add activity
              </button>
            </div>
            <div style={{ border:'1.5px solid #e2e8f0', borderRadius:10, overflow:'hidden' }}>
              {form.activities.map((a: any, i: number) => (
                <div key={i} style={{ display:'grid', gridTemplateColumns:'70px 1fr 160px 100px 32px', gap:8, padding:'10px 12px', borderBottom: i < form.activities.length - 1 ? '1px solid #f1f5f9' : 'none', alignItems:'center', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <input value={a.time} onChange={e => setActivity(i, 'time', e.target.value)} type="time"
                    style={{ padding:'6px 8px', border:'1px solid #e2e8f0', borderRadius:6, fontSize:12, color:'#0f172a', outline:'none', fontFamily:'inherit', background:'#fff' }} />
                  <input value={a.activity} onChange={e => setActivity(i, 'activity', e.target.value)} placeholder="What did you work on?"
                    style={{ padding:'6px 10px', border:'1px solid #e2e8f0', borderRadius:6, fontSize:12, color:'#0f172a', outline:'none', fontFamily:'inherit', background:'#fff' }} />
                  <select value={a.category} onChange={e => setActivity(i, 'category', e.target.value)}
                    style={{ padding:'6px 8px', border:'1px solid #e2e8f0', borderRadius:6, fontSize:11, color:'#0f172a', outline:'none', fontFamily:'inherit', background:'#fff', cursor:'pointer' }}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input value={a.location} onChange={e => setActivity(i, 'location', e.target.value)} placeholder="Location"
                    style={{ padding:'6px 8px', border:'1px solid #e2e8f0', borderRadius:6, fontSize:12, color:'#0f172a', outline:'none', fontFamily:'inherit', background:'#fff' }} />
                  {form.activities.length > 1 && (
                    <button onClick={() => removeActivity(i)}
                      style={{ background:'none', border:'none', cursor:'pointer', color:'#94a3b8', fontSize:16, lineHeight:1 }}>✕</button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:5 }}>Work Done Summary</label>
              <textarea value={form.workDoneSummary} onChange={e => setForm(f => ({ ...f, workDoneSummary: e.target.value }))} rows={3}
                placeholder="Brief summary of work completed today..."
                style={{ width:'100%', padding:'9px 13px', background:'#fff', border:'1.5px solid #d1d5db', borderRadius:8, fontSize:13, color:'#111827', outline:'none', fontFamily:'inherit', resize:'none' }} />
            </div>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:5 }}>Issues Faced</label>
              <textarea value={form.issuesFaced} onChange={e => setForm(f => ({ ...f, issuesFaced: e.target.value }))} rows={3}
                placeholder="Any problems, delays, or blockers..."
                style={{ width:'100%', padding:'9px 13px', background:'#fff', border:'1.5px solid #d1d5db', borderRadius:8, fontSize:13, color:'#111827', outline:'none', fontFamily:'inherit', resize:'none' }} />
            </div>
          </div>
          <div>
            <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:5 }}>Plan for Next Day</label>
            <textarea value={form.nextDayPlan} onChange={e => setForm(f => ({ ...f, nextDayPlan: e.target.value }))} rows={2}
              placeholder="What is planned for tomorrow..."
              style={{ width:'100%', padding:'9px 13px', background:'#fff', border:'1.5px solid #d1d5db', borderRadius:8, fontSize:13, color:'#111827', outline:'none', fontFamily:'inherit', resize:'none' }} />
          </div>
        </div>
      </Modal>

      {/* View Modal */}
      {viewTs && (
        <Modal open={!!viewTs} onClose={() => setViewTs(null)}
          title={`Daily Log — ${new Date(viewTs.date).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })}`}
          width={640}
          footer={<>
            {viewTs.status === 'submitted' && (
              <Button variant="success" size="sm" icon={<CheckCircle size={13}/>} loading={approveM.isPending}
                onClick={() => { approveM.mutate(viewTs.id); setViewTs(null) }}>
                Approve
              </Button>
            )}
            <Button variant="ghost" onClick={() => setViewTs(null)}>Close</Button>
          </>}>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', background:'#f8f9fc', borderRadius:10, border:'1.5px solid #e2e8f0' }}>
              <div>
                <p style={{ fontSize:14, fontWeight:700, color:'#0f172a', margin:0 }}>
                  {empMap[viewTs.employeeId] ? `${empMap[viewTs.employeeId].firstName} ${empMap[viewTs.employeeId].lastName ?? ''}` : 'Employee'}
                </p>
                <p style={{ fontSize:11, color:'#94a3b8', margin:'2px 0 0', fontFamily:'monospace' }}>{empMap[viewTs.employeeId]?.empCode ?? ''}</p>
              </div>
              <span style={{ display:'inline-flex', padding:'3px 12px', borderRadius:999, fontSize:11, fontWeight:700, background:STATUS_STYLE[viewTs.status]?.bg, color:STATUS_STYLE[viewTs.status]?.color, border:'1.5px solid '+(STATUS_STYLE[viewTs.status]?.border) }}>{viewTs.status}</span>
            </div>
            <table style={{ width:'100%', borderCollapse:'collapse', border:'1.5px solid #e2e8f0', borderRadius:8, overflow:'hidden' }}>
              <thead>
                <tr style={{ background:'#f8f9fc', borderBottom:'1.5px solid #e2e8f0' }}>
                  {['Time','Activity','Category','Location'].map(h => (
                    <th key={h} style={{ padding:'8px 12px', textAlign:'left', fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(viewTs.activities ?? []).map((a: any, i: number) => (
                  <tr key={i} style={{ borderBottom:'1px solid #f1f5f9' }}>
                    <td style={{ padding:'9px 12px', fontSize:12, color:'#475569' }}>{a.time || '—'}</td>
                    <td style={{ padding:'9px 12px', fontSize:13, color:'#0f172a', fontWeight:500 }}>{a.activity}</td>
                    <td style={{ padding:'9px 12px' }}>
                      <span style={{ fontSize:10, padding:'2px 8px', borderRadius:999, background:'#eff6ff', color:'#2563eb', border:'1px solid #bfdbfe', fontWeight:600 }}>{a.category || '—'}</span>
                    </td>
                    <td style={{ padding:'9px 12px', fontSize:12, color:'#475569' }}>{a.location || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {[['Work Done Summary', viewTs.workDoneSummary], ['Issues Faced', viewTs.issuesFaced], ['Next Day Plan', viewTs.nextDayPlan]].filter(([, v]) => v).map(([l, v]) => (
              <div key={l as string} style={{ padding:'12px 14px', background:'#f8f9fc', borderRadius:8, border:'1px solid #e2e8f0' }}>
                <p style={{ fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.07em', margin:'0 0 6px' }}>{l}</p>
                <p style={{ fontSize:13, color:'#0f172a', margin:0, lineHeight:1.6 }}>{v}</p>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  )
}
