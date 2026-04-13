#!/usr/bin/env node
/**
 * KIPL ProjectOS — Polish Pass 2b
 * Writes:
 *   1. frontend/src/pages/accounting/InvoicesPage.tsx     — full RA Bills tracker
 *   2. frontend/src/pages/public/PublicProjectPage.tsx    — public project status portal
 *   3. frontend/src/pages/staff/dashboards/*Dashboard.tsx — enriched with recent-activity feeds
 */

const fs   = require('fs')
const path = require('path')

const ROOT     = path.resolve(__dirname, '..')
const FRONTEND = path.join(ROOT, 'frontend', 'src')
const PAGES    = path.join(FRONTEND, 'pages')

let written = 0
function write(relPath, content) {
  const full = path.join(FRONTEND, relPath)
  fs.mkdirSync(path.dirname(full), { recursive: true })
  fs.writeFileSync(full, content.trimStart(), 'utf8')
  console.log(`  ✅  Written: frontend/src/${relPath}  (${content.trim().split('\n').length} lines)`)
  written++
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. InvoicesPage — full RA Bills tracker
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n📌  1/7 — InvoicesPage.tsx (RA Bills Tracker)\n')
write('pages/accounting/InvoicesPage.tsx', `
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth.store'
import api from '@/api/client'
import {
  Receipt, Plus, X, CheckCircle, Clock, WarningCircle,
  CurrencyInr, FileText, ArrowCounterClockwise,
} from '@phosphor-icons/react'

const C = {
  card:'#fff', border:'#e2e8f0', text1:'#0f172a', text2:'#475569', text3:'#94a3b8',
  blue:'#2563eb', green:'#059669', amber:'#d97706', red:'#dc2626', navy:'#1a2540',
  blueBg:'#eff6ff', greenBg:'#f0fdf4', amberBg:'#fffbeb', redBg:'#fef2f2',
}

const STATUS_META: Record<string, { label:string; color:string; bg:string; icon:any }> = {
  draft:     { label:'Draft',    color:'#64748b', bg:'#f1f5f9', icon:FileText    },
  submitted: { label:'Submitted',color:C.amber,   bg:C.amberBg, icon:Clock       },
  approved:  { label:'Approved', color:C.green,   bg:C.greenBg, icon:CheckCircle },
  paid:      { label:'Paid',     color:C.blue,    bg:C.blueBg,  icon:CheckCircle },
  rejected:  { label:'Rejected', color:C.red,     bg:C.redBg,   icon:WarningCircle },
}

const fmtL  = (n:number) => '₹'+(n/100000).toFixed(2)+' L'
const fmtD  = (s:string) => s ? new Date(s).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—'

function StatusBadge({ status }: { status:string }) {
  const m = STATUS_META[status] ?? STATUS_META.draft
  const Icon = m.icon
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'3px 10px',
      borderRadius:20, fontSize:11, fontWeight:700, color:m.color, background:m.bg }}>
      <Icon size={11} weight="fill" /> {m.label}
    </span>
  )
}

const EMPTY_FORM = {
  raNumber:'', billDate:'', periodFrom:'', periodTo:'',
  grossAmount:'', tdsPercent:'2', retentionPercent:'5',
  status:'draft', remarks:'',
}

export default function InvoicesPage() {
  const { activeProjectId } = useAuthStore()
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [filterStatus, setFilterStatus] = useState('all')
  const [editId, setEditId] = useState<string|null>(null)

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices', activeProjectId],
    queryFn: () => api.get('/accounting/invoices', { params:{ projectId: activeProjectId } }).then(r => r.data),
    enabled: !!activeProjectId,
  })

  const saveMut = useMutation({
    mutationFn: (body: any) => editId
      ? api.patch(\`/accounting/invoices/\${editId}\`, body).then(r => r.data)
      : api.post('/accounting/invoices', { ...body, projectId: activeProjectId }).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey:['invoices'] }); closeModal() },
  })

  const deleteMut = useMutation({
    mutationFn: (id:string) => api.delete(\`/accounting/invoices/\${id}\`),
    onSuccess: () => qc.invalidateQueries({ queryKey:['invoices'] }),
  })

  function openNew() { setForm({ ...EMPTY_FORM }); setEditId(null); setShowModal(true) }
  function openEdit(inv: any) {
    setForm({
      raNumber: inv.raNumber??'', billDate: inv.billDate?.split('T')[0]??'',
      periodFrom: inv.periodFrom?.split('T')[0]??'', periodTo: inv.periodTo?.split('T')[0]??'',
      grossAmount: String(inv.grossAmount??''), tdsPercent: String(inv.tdsPercent??2),
      retentionPercent: String(inv.retentionPercent??5),
      status: inv.status??'draft', remarks: inv.remarks??'',
    })
    setEditId(inv.id); setShowModal(true)
  }
  function closeModal() { setShowModal(false); setEditId(null); setForm({ ...EMPTY_FORM }) }

  function handleSave() {
    const gross = parseFloat(form.grossAmount) || 0
    const tds   = gross * (parseFloat(form.tdsPercent)/100)
    const ret   = gross * (parseFloat(form.retentionPercent)/100)
    saveMut.mutate({ ...form, grossAmount:gross, tdsAmount:tds, retentionAmount:ret, netPayable:gross-tds-ret })
  }

  const filtered = filterStatus === 'all' ? invoices : invoices.filter((i:any) => i.status === filterStatus)

  // Summary stats
  const totalBilled  = invoices.reduce((s:number,i:any) => s+(i.grossAmount??0), 0)
  const totalPaid    = invoices.filter((i:any) => i.status==='paid').reduce((s:number,i:any) => s+(i.netPayable??0), 0)
  const totalPending = invoices.filter((i:any) => ['submitted','approved'].includes(i.status)).reduce((s:number,i:any) => s+(i.netPayable??0), 0)
  const totalDraft   = invoices.filter((i:any) => i.status==='draft').length

  const inp = (field: string, label: string, type='text', extra:any={}) => (
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      <label style={{ fontSize:12, fontWeight:600, color:C.text2 }}>{label}</label>
      <input type={type} value={(form as any)[field]}
        onChange={e => setForm(f => ({ ...f, [field]:e.target.value }))}
        style={{ padding:'9px 12px', border:'1.5px solid '+C.border, borderRadius:8,
          fontSize:13, color:C.text1, outline:'none', ...extra }}
        onFocus={e => (e.target.style.borderColor=C.blue)}
        onBlur={e  => (e.target.style.borderColor=C.border)} />
    </div>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:24 }}>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:800, color:C.text1, margin:'0 0 5px', letterSpacing:'-0.02em' }}>
            RA Bills / Invoices
          </h1>
          <p style={{ fontSize:14, color:C.text3, margin:0 }}>Running Account Bills for Dal Lake Sewerage Scheme</p>
        </div>
        <button onClick={openNew}
          style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 18px',
            background:C.blue, color:'#fff', border:'none', borderRadius:10,
            fontSize:13, fontWeight:700, cursor:'pointer' }}>
          <Plus size={16} weight="bold" /> New RA Bill
        </button>
      </div>

      {/* Summary cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
        {[
          { label:'Total Billed',   value:fmtL(totalBilled),  color:C.text1,  sub:'Gross amount' },
          { label:'Paid Out',       value:fmtL(totalPaid),    color:C.green,  sub:'Net received' },
          { label:'Pending',        value:fmtL(totalPending), color:C.amber,  sub:'Awaiting payment' },
          { label:'Draft Bills',    value:totalDraft,          color:C.text3,  sub:'Not submitted yet' },
        ].map(s => (
          <div key={s.label} style={{ background:C.card, border:'1.5px solid '+C.border,
            borderRadius:14, padding:'18px 20px', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
            <p style={{ fontSize:11, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.06em', margin:'0 0 8px' }}>{s.label}</p>
            <p style={{ fontSize:26, fontWeight:800, color:s.color, margin:'0 0 4px' }}>{s.value}</p>
            <p style={{ fontSize:11, color:C.text3, margin:0 }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display:'flex', gap:8 }}>
        {['all','draft','submitted','approved','paid','rejected'].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            style={{ padding:'6px 14px', borderRadius:20, fontSize:12, fontWeight:600, cursor:'pointer',
              border:'1.5px solid '+(filterStatus===s ? C.blue : C.border),
              background: filterStatus===s ? C.blueBg : C.card,
              color: filterStatus===s ? C.blue : C.text2 }}>
            {s === 'all' ? 'All Bills' : STATUS_META[s]?.label ?? s}
            {s !== 'all' && (
              <span style={{ marginLeft:6, background: filterStatus===s?C.blue:C.border,
                color: filterStatus===s?'#fff':C.text3, borderRadius:10, padding:'1px 6px', fontSize:10 }}>
                {invoices.filter((i:any) => i.status===s).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:16, overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
        {isLoading ? (
          <div style={{ padding:60, textAlign:'center', color:C.text3, fontSize:14 }}>Loading bills…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding:60, textAlign:'center' }}>
            <Receipt size={36} color={C.text3} style={{ marginBottom:12 }} />
            <p style={{ fontSize:14, fontWeight:600, color:C.text2, margin:'0 0 4px' }}>No bills found</p>
            <p style={{ fontSize:12, color:C.text3, margin:0 }}>
              {filterStatus !== 'all' ? 'Try a different filter' : 'Click "New RA Bill" to create your first invoice'}
            </p>
          </div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'#f8fafc' }}>
                {['RA #','Bill Date','Period','Gross Amount','TDS','Retention','Net Payable','Status',''].map(h => (
                  <th key={h} style={{ padding:'12px 16px', textAlign:'left', fontSize:11, fontWeight:700,
                    color:C.text3, textTransform:'uppercase', letterSpacing:'0.05em',
                    borderBottom:'1.5px solid '+C.border }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv: any, idx: number) => (
                <tr key={inv.id}
                  style={{ background: idx%2===0 ? C.card : '#fafafa', cursor:'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.background='#f0f7ff')}
                  onMouseLeave={e => (e.currentTarget.style.background = idx%2===0 ? C.card : '#fafafa')}
                  onClick={() => openEdit(inv)}>
                  <td style={{ padding:'13px 16px', fontSize:13, fontWeight:700, color:C.blue, borderBottom:'1px solid #f1f5f9' }}>
                    RA-{inv.raNumber ?? String(idx+1).padStart(3,'0')}
                  </td>
                  <td style={{ padding:'13px 16px', fontSize:13, color:C.text2, borderBottom:'1px solid #f1f5f9' }}>{fmtD(inv.billDate)}</td>
                  <td style={{ padding:'13px 16px', fontSize:12, color:C.text3, borderBottom:'1px solid #f1f5f9' }}>
                    {fmtD(inv.periodFrom)} – {fmtD(inv.periodTo)}
                  </td>
                  <td style={{ padding:'13px 16px', fontSize:13, fontWeight:600, color:C.text1, borderBottom:'1px solid #f1f5f9' }}>
                    {fmtL(inv.grossAmount??0)}
                  </td>
                  <td style={{ padding:'13px 16px', fontSize:13, color:C.red, borderBottom:'1px solid #f1f5f9' }}>
                    -{fmtL(inv.tdsAmount??0)}
                  </td>
                  <td style={{ padding:'13px 16px', fontSize:13, color:C.amber, borderBottom:'1px solid #f1f5f9' }}>
                    -{fmtL(inv.retentionAmount??0)}
                  </td>
                  <td style={{ padding:'13px 16px', fontSize:14, fontWeight:800, color:C.green, borderBottom:'1px solid #f1f5f9' }}>
                    {fmtL(inv.netPayable??0)}
                  </td>
                  <td style={{ padding:'13px 16px', borderBottom:'1px solid #f1f5f9' }}>
                    <StatusBadge status={inv.status} />
                  </td>
                  <td style={{ padding:'13px 16px', borderBottom:'1px solid #f1f5f9' }}>
                    <button onClick={e => { e.stopPropagation(); if(confirm('Delete this RA Bill?')) deleteMut.mutate(inv.id) }}
                      style={{ background:'none', border:'none', cursor:'pointer', color:C.text3, padding:'4px 8px', borderRadius:6 }}
                      onMouseEnter={e => (e.currentTarget.style.color=C.red)}
                      onMouseLeave={e => (e.currentTarget.style.color=C.text3)}>
                      <X size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:1000,
          display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
          <div style={{ background:C.card, borderRadius:20, width:'100%', maxWidth:620,
            maxHeight:'90vh', overflowY:'auto', boxShadow:'0 24px 60px rgba(0,0,0,0.25)' }}>

            {/* Modal header */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
              padding:'20px 24px', borderBottom:'1.5px solid '+C.border }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:36, height:36, borderRadius:10, background:C.blueBg,
                  display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Receipt size={18} color={C.blue} weight="bold" />
                </div>
                <div>
                  <h2 style={{ fontSize:16, fontWeight:800, color:C.text1, margin:0 }}>
                    {editId ? 'Edit RA Bill' : 'New RA Bill'}
                  </h2>
                  <p style={{ fontSize:12, color:C.text3, margin:0 }}>Running Account Bill</p>
                </div>
              </div>
              <button onClick={closeModal}
                style={{ background:'none', border:'none', cursor:'pointer', color:C.text3,
                  width:32, height:32, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center' }}
                onMouseEnter={e => (e.currentTarget.style.background='#f1f5f9')}
                onMouseLeave={e => (e.currentTarget.style.background='none')}>
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <div style={{ padding:24, display:'flex', flexDirection:'column', gap:16 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                {inp('raNumber', 'RA Bill Number', 'text')}
                {inp('billDate', 'Bill Date', 'date')}
                {inp('periodFrom', 'Period From', 'date')}
                {inp('periodTo', 'Period To', 'date')}
                {inp('grossAmount', 'Gross Amount (₹)', 'number')}
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  <label style={{ fontSize:12, fontWeight:600, color:C.text2 }}>Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status:e.target.value }))}
                    style={{ padding:'9px 12px', border:'1.5px solid '+C.border, borderRadius:8,
                      fontSize:13, color:C.text1, outline:'none', background:C.card }}>
                    {Object.entries(STATUS_META).map(([k,v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
                {inp('tdsPercent', 'TDS %', 'number')}
                {inp('retentionPercent', 'Retention %', 'number')}
              </div>

              {/* Net payable preview */}
              {form.grossAmount && (
                <div style={{ background:'#f0fdf4', border:'1.5px solid #bbf7d0', borderRadius:12, padding:'14px 18px' }}>
                  <p style={{ fontSize:12, fontWeight:600, color:C.green, margin:'0 0 8px' }}>💡 Net Payable Preview</p>
                  <div style={{ display:'flex', gap:24 }}>
                    {[
                      ['Gross', '₹'+(parseFloat(form.grossAmount)||0).toLocaleString('en-IN')],
                      ['TDS ('+ form.tdsPercent+'%)', '- ₹'+((parseFloat(form.grossAmount)||0)*(parseFloat(form.tdsPercent)/100)).toLocaleString('en-IN')],
                      ['Retention ('+form.retentionPercent+'%)', '- ₹'+((parseFloat(form.grossAmount)||0)*(parseFloat(form.retentionPercent)/100)).toLocaleString('en-IN')],
                      ['Net', '₹'+((parseFloat(form.grossAmount)||0) - (parseFloat(form.grossAmount)||0)*(parseFloat(form.tdsPercent)/100) - (parseFloat(form.grossAmount)||0)*(parseFloat(form.retentionPercent)/100)).toLocaleString('en-IN')],
                    ].map(([l,v]) => (
                      <div key={l}>
                        <p style={{ fontSize:10, color:'#16a34a', margin:'0 0 2px', fontWeight:600 }}>{l}</p>
                        <p style={{ fontSize:13, fontWeight:700, color:'#15803d', margin:0 }}>{v}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                <label style={{ fontSize:12, fontWeight:600, color:C.text2 }}>Remarks</label>
                <textarea value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks:e.target.value }))}
                  rows={3} placeholder="Any notes, deductions, or conditions…"
                  style={{ padding:'9px 12px', border:'1.5px solid '+C.border, borderRadius:8,
                    fontSize:13, color:C.text1, outline:'none', resize:'vertical', fontFamily:'inherit' }}
                  onFocus={e => (e.target.style.borderColor=C.blue)}
                  onBlur={e  => (e.target.style.borderColor=C.border)} />
              </div>
            </div>

            {/* Modal footer */}
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end',
              padding:'16px 24px', borderTop:'1.5px solid '+C.border }}>
              <button onClick={closeModal}
                style={{ padding:'9px 20px', border:'1.5px solid '+C.border, borderRadius:8,
                  background:C.card, fontSize:13, fontWeight:600, color:C.text2, cursor:'pointer' }}>
                Cancel
              </button>
              <button onClick={handleSave} disabled={saveMut.isPending}
                style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 20px',
                  background: saveMut.isPending ? '#93c5fd' : C.blue,
                  color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer' }}>
                {saveMut.isPending ? <><ArrowCounterClockwise size={14} /> Saving…</> : <><CheckCircle size={14} weight="fill" /> Save Bill</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
`)

// ─────────────────────────────────────────────────────────────────────────────
// 2. PublicProjectPage — project status portal (no auth)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n📌  2/7 — PublicProjectPage.tsx (Public Project Portal)\n')
write('pages/public/PublicProjectPage.tsx', `
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'
import {
  Buildings, MapPin, Calendar, CurrencyInr, CheckCircle,
  Clock, WarningCircle, FileText, Gauge, Envelope,
} from '@phosphor-icons/react'

const BASE = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3000'

const C = {
  navy:'#1a2540', blue:'#2563eb', green:'#059669', amber:'#d97706', red:'#dc2626',
  text1:'#0f172a', text2:'#475569', text3:'#94a3b8',
  border:'#e2e8f0', card:'#fff', bg:'#f0f2f5',
  blueBg:'#eff6ff', greenBg:'#f0fdf4',
}

function ProgressBar({ value, color='#2563eb' }: { value:number; color?:string }) {
  return (
    <div style={{ width:'100%', height:10, borderRadius:99, background:'#e2e8f0', overflow:'hidden' }}>
      <div style={{ width:\`\${Math.min(100,Math.max(0,value))}%\`, height:'100%',
        borderRadius:99, background:color, transition:'width 0.6s ease' }} />
    </div>
  )
}

function StatBox({ label, value, sub, color='#0f172a' }: any) {
  return (
    <div style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:14,
      padding:'20px 22px', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
      <p style={{ fontSize:11, fontWeight:700, color:C.text3, textTransform:'uppercase',
        letterSpacing:'0.07em', margin:'0 0 8px' }}>{label}</p>
      <p style={{ fontSize:26, fontWeight:800, color, margin:'0 0 4px' }}>{value}</p>
      {sub && <p style={{ fontSize:12, color:C.text3, margin:0 }}>{sub}</p>}
    </div>
  )
}

function MilestoneRow({ label, date, done }: { label:string; date:string; done:boolean }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 0',
      borderBottom:'1px solid #f1f5f9' }}>
      <div style={{ width:28, height:28, borderRadius:'50%', flexShrink:0,
        background: done ? C.greenBg : '#f1f5f9',
        border: '2px solid '+(done ? C.green : C.border),
        display:'flex', alignItems:'center', justifyContent:'center' }}>
        {done
          ? <CheckCircle size={14} color={C.green} weight="fill" />
          : <Clock size={14} color={C.text3} />}
      </div>
      <div style={{ flex:1 }}>
        <p style={{ fontSize:13, fontWeight:600, color: done ? C.text2 : C.text1, margin:'0 0 2px',
          textDecoration: done ? 'none' : 'none' }}>{label}</p>
        {date && <p style={{ fontSize:11, color:C.text3, margin:0 }}>{date}</p>}
      </div>
      <span style={{ fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20,
        color: done ? C.green : C.amber,
        background: done ? C.greenBg : '#fffbeb' }}>
        {done ? 'Completed' : 'Pending'}
      </span>
    </div>
  )
}

export default function PublicProjectPage() {
  const { code } = useParams<{ code:string }>()
  const [data, setData]       = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string|null>(null)

  useEffect(() => {
    if (!code) { setError('Invalid project link'); setLoading(false); return }
    axios.get(\`\${BASE}/api/v1/public/project/\${code}\`)
      .then(r => { setData(r.data); setLoading(false) })
      .catch(e => {
        setError(e.response?.status === 404 ? 'Project not found or link has expired.' : 'Unable to load project data.')
        setLoading(false)
      })
  }, [code])

  if (loading) return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex', alignItems:'center',
      justifyContent:'center', flexDirection:'column', gap:16 }}>
      <div style={{ width:44, height:44, border:'3px solid '+C.blue, borderTopColor:'transparent',
        borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      <p style={{ fontSize:14, color:C.text3 }}>Loading project status…</p>
      <style>{'@keyframes spin { to { transform:rotate(360deg) } }'}</style>
    </div>
  )

  if (error) return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex', alignItems:'center',
      justifyContent:'center' }}>
      <div style={{ background:C.card, borderRadius:20, padding:'48px 40px', textAlign:'center',
        maxWidth:420, boxShadow:'0 4px 24px rgba(0,0,0,0.08)' }}>
        <WarningCircle size={48} color={C.amber} style={{ marginBottom:16 }} />
        <h2 style={{ fontSize:20, fontWeight:800, color:C.text1, margin:'0 0 8px' }}>Project Not Found</h2>
        <p style={{ fontSize:14, color:C.text3, margin:0 }}>{error}</p>
      </div>
    </div>
  )

  const p        = data?.project ?? {}
  const progress = data?.progress ?? {}
  const letters  = data?.recentLetters ?? []
  const milestones = data?.milestones ?? []
  const finance  = data?.finance ?? {}

  const fmtCr = (n:number) => n ? '₹'+(n/10000000).toFixed(2)+' Cr' : '—'
  const fmtD  = (s:string) => s ? new Date(s).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—'

  return (
    <div style={{ minHeight:'100vh', background:C.bg }}>

      {/* Top banner */}
      <div style={{ background:C.navy, padding:'0' }}>
        <div style={{ maxWidth:1100, margin:'0 auto', padding:'24px 32px',
          display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ width:44, height:44, borderRadius:12, background:'#2563eb',
              display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Buildings size={22} color="#fff" weight="bold" />
            </div>
            <div>
              <p style={{ fontSize:11, color:'rgba(255,255,255,0.4)', margin:0,
                textTransform:'uppercase', letterSpacing:'0.1em' }}>Khilari Infrastructure Pvt Ltd</p>
              <p style={{ fontSize:18, fontWeight:800, color:'#fff', margin:0 }}>ProjectOS — Public Status</p>
            </div>
          </div>
          <div style={{ textAlign:'right' }}>
            <p style={{ fontSize:11, color:'rgba(255,255,255,0.35)', margin:'0 0 2px' }}>Last updated</p>
            <p style={{ fontSize:13, fontWeight:600, color:'rgba(255,255,255,0.7)', margin:0 }}>
              {new Date().toLocaleDateString('en-IN',{ day:'2-digit', month:'long', year:'numeric' })}
            </p>
          </div>
        </div>
      </div>

      <div style={{ maxWidth:1100, margin:'0 auto', padding:'32px 32px 64px' }}>

        {/* Project Info Card */}
        <div style={{ background:C.card, borderRadius:20, padding:'28px 32px',
          border:'1.5px solid '+C.border, marginBottom:24, boxShadow:'0 1px 6px rgba(0,0,0,0.05)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:16 }}>
            <div>
              <div style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'4px 12px',
                background:C.blueBg, borderRadius:20, marginBottom:12 }}>
                <div style={{ width:6, height:6, borderRadius:'50%', background:C.blue }} />
                <span style={{ fontSize:11, fontWeight:700, color:C.blue }}>ACTIVE PROJECT</span>
              </div>
              <h1 style={{ fontSize:22, fontWeight:800, color:C.text1, margin:'0 0 8px', letterSpacing:'-0.02em' }}>
                {p.name ?? 'Dal Lake Sewerage Scheme'}
              </h1>
              <div style={{ display:'flex', flexWrap:'wrap', gap:16 }}>
                {[
                  { icon:MapPin, text: p.location ?? 'Nishat, Srinagar, J&K' },
                  { icon:FileText, text: p.allotmentNo ?? 'CE/UEED/PS/01 OF 2025-26' },
                  { icon:Calendar, text: 'Start: '+fmtD(p.startDate) },
                  { icon:Calendar, text: 'Target: '+fmtD(p.endDate) },
                ].map(({ icon:Icon, text }) => (
                  <div key={text} style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <Icon size={13} color={C.text3} />
                    <span style={{ fontSize:13, color:C.text2 }}>{text}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display:'flex', gap:12 }}>
              {[
                { label:'Executing Agency', value: p.executingAgency ?? 'UEED' },
                { label:'Authority', value: p.authority ?? 'LCMA' },
              ].map(b => (
                <div key={b.label} style={{ background:'#f8fafc', borderRadius:12, padding:'12px 18px',
                  border:'1.5px solid '+C.border, textAlign:'center' }}>
                  <p style={{ fontSize:10, fontWeight:700, color:C.text3, textTransform:'uppercase', margin:'0 0 4px' }}>{b.label}</p>
                  <p style={{ fontSize:15, fontWeight:800, color:C.text1, margin:0 }}>{b.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Progress + Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', gap:16, marginBottom:24 }}>
          {/* Progress card */}
          <div style={{ background:C.card, borderRadius:16, padding:'24px 26px',
            border:'1.5px solid '+C.border, boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
              <Gauge size={18} color={C.blue} weight="bold" />
              <span style={{ fontSize:13, fontWeight:700, color:C.text1 }}>Overall Progress</span>
            </div>
            <div style={{ display:'flex', alignItems:'flex-end', gap:8, marginBottom:10 }}>
              <span style={{ fontSize:44, fontWeight:900, color:C.blue, lineHeight:1 }}>
                {Math.round(progress.overall ?? 0)}
              </span>
              <span style={{ fontSize:20, fontWeight:700, color:C.text3, marginBottom:4 }}>%</span>
            </div>
            <ProgressBar value={progress.overall ?? 0} color={C.blue} />
            <div style={{ display:'flex', justifyContent:'space-between', marginTop:16, gap:10 }}>
              {[
                { label:'Civil Work', value:progress.civil??0, color:C.blue },
                { label:'Mech/Elec', value:progress.mechanical??0, color:C.green },
                { label:'Testing', value:progress.testing??0, color:C.amber },
              ].map(b => (
                <div key={b.label} style={{ flex:1 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                    <span style={{ fontSize:10, color:C.text3, fontWeight:600 }}>{b.label}</span>
                    <span style={{ fontSize:10, fontWeight:700, color:b.color }}>{b.value}%</span>
                  </div>
                  <ProgressBar value={b.value} color={b.color} />
                </div>
              ))}
            </div>
          </div>

          <StatBox label="Contract Value"   value={fmtCr(finance.contractValue??0)}  sub="Total awarded"        color={C.text1} />
          <StatBox label="Expenditure"      value={fmtCr(finance.expenditure??0)}    sub="Amount utilized"      color={C.blue}  />
          <StatBox label="Bills Submitted"  value={data?.billsSubmitted??0}          sub="RA bills raised"      color={C.green} />
        </div>

        {/* Milestones + Letters */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>

          {/* Milestones */}
          <div style={{ background:C.card, borderRadius:16, border:'1.5px solid '+C.border,
            overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ padding:'18px 22px', borderBottom:'1.5px solid '+C.border,
              display:'flex', alignItems:'center', gap:8 }}>
              <CheckCircle size={16} color={C.green} weight="bold" />
              <h2 style={{ fontSize:14, fontWeight:700, color:C.text1, margin:0 }}>Milestones</h2>
            </div>
            <div style={{ padding:'4px 22px' }}>
              {milestones.length === 0 ? (
                <p style={{ color:C.text3, fontSize:13, padding:'20px 0' }}>No milestones recorded yet.</p>
              ) : milestones.map((m:any, i:number) => (
                <MilestoneRow key={i} label={m.label} date={fmtD(m.date)} done={m.done} />
              ))}
            </div>
          </div>

          {/* Recent correspondence */}
          <div style={{ background:C.card, borderRadius:16, border:'1.5px solid '+C.border,
            overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ padding:'18px 22px', borderBottom:'1.5px solid '+C.border,
              display:'flex', alignItems:'center', gap:8 }}>
              <Envelope size={16} color={C.blue} weight="bold" />
              <h2 style={{ fontSize:14, fontWeight:700, color:C.text1, margin:0 }}>Recent Correspondence</h2>
            </div>
            <div style={{ padding:'8px 0' }}>
              {letters.length === 0 ? (
                <p style={{ color:C.text3, fontSize:13, padding:'20px 22px' }}>No letters on record.</p>
              ) : letters.slice(0, 6).map((l:any, i:number) => (
                <div key={i} style={{ display:'flex', gap:12, padding:'11px 22px',
                  borderBottom: i < letters.length-1 ? '1px solid #f1f5f9' : 'none' }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:C.blue,
                    marginTop:5, flexShrink:0 }} />
                  <div style={{ flex:1 }}>
                    <p style={{ fontSize:13, fontWeight:600, color:C.text1, margin:'0 0 2px' }}>{l.subject}</p>
                    <p style={{ fontSize:11, color:C.text3, margin:0 }}>
                      {l.refNo ? l.refNo+' · ' : ''}{fmtD(l.date)}
                    </p>
                  </div>
                  <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:10,
                    color:l.direction==='incoming'?C.green:C.blue,
                    background:l.direction==='incoming'?C.greenBg:C.blueBg, flexShrink:0, alignSelf:'flex-start' }}>
                    {l.direction==='incoming'?'↓ IN':'↑ OUT'}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div style={{ textAlign:'center', marginTop:40, padding:'20px 0',
          borderTop:'1.5px solid '+C.border }}>
          <p style={{ fontSize:12, color:C.text3, margin:'0 0 4px' }}>
            This is an official project status page maintained by Khilari Infrastructure Pvt Ltd
          </p>
          <p style={{ fontSize:11, color:'#cbd5e1', margin:0 }}>
            Allotment No: CE/UEED/PS/01 OF 2025-26 · Project Authority: LCMA · Executing Agency: UEED
          </p>
        </div>
      </div>
    </div>
  )
}
`)

// ─────────────────────────────────────────────────────────────────────────────
// 3–7. Enrich staff dashboards with a Recent Activity feed section
// ─────────────────────────────────────────────────────────────────────────────

// AccountsDashboard — add recent transactions feed
console.log('\n📌  3/7 — AccountsDashboard.tsx (add recent transactions)\n')
write('pages/staff/dashboards/AccountsDashboard.tsx', `
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import { accountingApi } from '@/api/accounting.api'
import { tasksApi } from '@/api/tasks.api'
import api from '@/api/client'

const C = {"card":"#fff","border":"#e2e8f0","text1":"#0f172a","text2":"#475569","text3":"#94a3b8","blue":"#2563eb","green":"#059669","amber":"#d97706","red":"#dc2626","navy":"#1a2540","blueBg":"#eff6ff"}
const fmtL = (n:number) => n ? '₹'+(n/100000).toFixed(2)+' L' : '₹0.00 L'
const fmtD = (s:string) => s ? new Date(s).toLocaleDateString('en-IN',{day:'2-digit',month:'short'}) : ''

export default function AccountsDashboard() {
  const { user, activeProjectId } = useAuthStore()
  const nav = useNavigate()
  const { data: dash } = useQuery({
    queryKey: ['acc-dash', activeProjectId],
    queryFn: () => accountingApi.dashboard(activeProjectId!).then(r => r.data),
    enabled: !!activeProjectId,
  })
  const { data: myTasks } = useQuery({
    queryKey: ['my-tasks', user?.id],
    queryFn: () => tasksApi.list({ projectId: activeProjectId, assignedTo: user?.id }).then(r => r.data),
    enabled: !!user?.id,
  })
  const { data: recentTx } = useQuery({
    queryKey: ['recent-tx', activeProjectId],
    queryFn: () => api.get('/accounting/transactions', { params:{ projectId:activeProjectId, limit:5 } }).then(r => r.data),
    enabled: !!activeProjectId,
  })
  const { data: invoices } = useQuery({
    queryKey: ['invoices', activeProjectId],
    queryFn: () => api.get('/accounting/invoices', { params:{ projectId:activeProjectId } }).then(r => r.data),
    enabled: !!activeProjectId,
  })

  const openTasks = (myTasks??[]).filter((t:any) => t.status !== 'done')
  const pendingInvoices = (invoices??[]).filter((i:any) => i.status === 'submitted')

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      {/* Header */}
      <div style={{ background:C.navy, borderRadius:16, padding:'24px 28px' }}>
        <p style={{ fontSize:11, color:'rgba(255,255,255,0.4)', margin:'0 0 4px', textTransform:'uppercase', letterSpacing:'0.1em' }}>Accounts Dashboard</p>
        <h1 style={{ fontSize:22, fontWeight:800, color:'#fff', margin:'0 0 4px' }}>{user?.name}</h1>
        <p style={{ fontSize:13, color:'rgba(255,255,255,0.45)', margin:0 }}>Accounts & Finance · {new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</p>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
        {[
          { label:'Total Expenses',    value:fmtL(dash?.totalExpenses??0),  color:C.text1, path:'/accounting' },
          { label:'Pending Payment',   value:fmtL(dash?.totalPending??0),   color:C.amber, path:'/accounting/invoices' },
          { label:'Pending RA Bills',  value:pendingInvoices.length,         color:pendingInvoices.length>0?C.amber:C.green, path:'/accounting/invoices' },
          { label:'My Open Tasks',     value:openTasks.length,               color:C.blue,  path:'/tasks' },
        ].map(k => (
          <div key={k.label} onClick={() => nav(k.path)}
            style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:12, padding:'16px 18px', cursor:'pointer', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor=C.blue)}
            onMouseLeave={e => (e.currentTarget.style.borderColor=C.border)}>
            <div style={{ fontSize:10, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>{k.label}</div>
            <div style={{ fontSize:26, fontWeight:800, color:k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }}>
        {[
          { label:'Record Expense',  desc:'Log site expenses and bills',       path:'/accounting',         emoji:'💳' },
          { label:'RA Bills',        desc:'Manage running account bills',       path:'/accounting/invoices', emoji:'📄' },
          { label:'My Timesheet',    desc:'Submit daily activity log',          path:'/hr/timesheets',       emoji:'📋' },
        ].map(a => (
          <div key={a.label} onClick={() => nav(a.path)}
            style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:14, padding:'18px 20px', cursor:'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor=C.blue; e.currentTarget.style.background=C.blueBg }}
            onMouseLeave={e => { e.currentTarget.style.borderColor=C.border; e.currentTarget.style.background=C.card }}>
            <div style={{ fontSize:28, marginBottom:10 }}>{a.emoji}</div>
            <p style={{ fontSize:14, fontWeight:700, color:C.text1, margin:'0 0 4px' }}>{a.label}</p>
            <p style={{ fontSize:12, color:C.text3, margin:0 }}>{a.desc}</p>
          </div>
        ))}
      </div>

      {/* Recent transactions + pending invoices */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        {/* Recent transactions */}
        <div style={{ background:C.card, borderRadius:14, border:'1.5px solid '+C.border, overflow:'hidden' }}>
          <div style={{ padding:'14px 18px', borderBottom:'1.5px solid '+C.border, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <h2 style={{ fontSize:13, fontWeight:700, color:C.text1, margin:0 }}>Recent Transactions</h2>
            <button onClick={() => nav('/accounting')}
              style={{ fontSize:11, fontWeight:600, color:C.blue, background:'none', border:'none', cursor:'pointer' }}>View all →</button>
          </div>
          {(recentTx??[]).length === 0 ? (
            <p style={{ padding:'20px 18px', fontSize:13, color:C.text3, margin:0 }}>No transactions yet.</p>
          ) : (recentTx??[]).map((tx:any, i:number) => (
            <div key={tx.id??i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
              padding:'11px 18px', borderBottom:'1px solid #f1f5f9' }}
              onMouseEnter={e=>(e.currentTarget.style.background='#f8faff')}
              onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
              <div>
                <p style={{ fontSize:13, fontWeight:600, color:C.text1, margin:'0 0 2px' }}>{tx.description??'Transaction'}</p>
                <p style={{ fontSize:11, color:C.text3, margin:0 }}>{tx.category??''} · {fmtD(tx.date??tx.createdAt)}</p>
              </div>
              <p style={{ fontSize:13, fontWeight:700, color:tx.type==='credit'?C.green:C.red, margin:0 }}>
                {tx.type==='credit'?'+':'-'}₹{(tx.amount??0).toLocaleString('en-IN')}
              </p>
            </div>
          ))}
        </div>

        {/* Pending RA Bills */}
        <div style={{ background:C.card, borderRadius:14, border:'1.5px solid '+C.border, overflow:'hidden' }}>
          <div style={{ padding:'14px 18px', borderBottom:'1.5px solid '+C.border, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <h2 style={{ fontSize:13, fontWeight:700, color:C.text1, margin:0 }}>Pending RA Bills</h2>
            <button onClick={() => nav('/accounting/invoices')}
              style={{ fontSize:11, fontWeight:600, color:C.blue, background:'none', border:'none', cursor:'pointer' }}>View all →</button>
          </div>
          {pendingInvoices.length === 0 ? (
            <p style={{ padding:'20px 18px', fontSize:13, color:C.green, margin:0, fontWeight:600 }}>✅ No pending bills</p>
          ) : pendingInvoices.slice(0,4).map((inv:any, i:number) => (
            <div key={inv.id??i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
              padding:'11px 18px', borderBottom:'1px solid #f1f5f9' }}
              onMouseEnter={e=>(e.currentTarget.style.background='#f8faff')}
              onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
              <div>
                <p style={{ fontSize:13, fontWeight:600, color:C.text1, margin:'0 0 2px' }}>RA-{inv.raNumber}</p>
                <p style={{ fontSize:11, color:C.text3, margin:0 }}>{fmtD(inv.billDate)}</p>
              </div>
              <div style={{ textAlign:'right' }}>
                <p style={{ fontSize:13, fontWeight:700, color:C.amber, margin:'0 0 2px' }}>₹{((inv.netPayable??0)/100000).toFixed(2)} L</p>
                <span style={{ fontSize:10, fontWeight:700, color:C.amber, background:'#fffbeb', padding:'2px 8px', borderRadius:10 }}>Submitted</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
`)

// QaDashboard — add recent inspections feed
console.log('\n📌  4/7 — QaDashboard.tsx (add recent inspections feed)\n')
write('pages/staff/dashboards/QaDashboard.tsx', `
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import { qaApi } from '@/api/qa.api'
import { tasksApi } from '@/api/tasks.api'

const C = {"card":"#fff","border":"#e2e8f0","text1":"#0f172a","text2":"#475569","text3":"#94a3b8","blue":"#2563eb","green":"#059669","amber":"#d97706","red":"#dc2626","navy":"#1a2540","blueBg":"#eff6ff","greenBg":"#f0fdf4","redBg":"#fef2f2"}
const fmtD = (s:string) => s ? new Date(s).toLocaleDateString('en-IN',{day:'2-digit',month:'short'}) : ''

export default function QaDashboard() {
  const { user, activeProjectId } = useAuthStore()
  const nav = useNavigate()
  const { data: dash } = useQuery({
    queryKey: ['qa-dash', activeProjectId],
    queryFn: () => qaApi.dashboard(activeProjectId!).then(r => r.data),
    enabled: !!activeProjectId,
  })
  const { data: recentInspections } = useQuery({
    queryKey: ['qa-inspections', activeProjectId],
    queryFn: () => qaApi.list({ projectId: activeProjectId!, limit: 5 }).then(r => r.data),
    enabled: !!activeProjectId,
  })
  const { data: myTasks } = useQuery({
    queryKey: ['my-tasks', user?.id],
    queryFn: () => tasksApi.list({ projectId: activeProjectId, assignedTo: user?.id }).then(r => r.data),
    enabled: !!user?.id,
  })
  const openTasks = (myTasks??[]).filter((t:any) => t.status !== 'done')

  const RESULT_STYLE: Record<string,{color:string;bg:string;label:string}> = {
    pass:    { color:C.green, bg:C.greenBg, label:'PASS' },
    fail:    { color:C.red,   bg:C.redBg,   label:'FAIL' },
    pending: { color:C.amber, bg:'#fffbeb',  label:'PENDING' },
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      {/* Header */}
      <div style={{ background:C.navy, borderRadius:16, padding:'24px 28px' }}>
        <p style={{ fontSize:11, color:'rgba(255,255,255,0.4)', margin:'0 0 4px', textTransform:'uppercase', letterSpacing:'0.1em' }}>QA Engineer Dashboard</p>
        <h1 style={{ fontSize:22, fontWeight:800, color:'#fff', margin:'0 0 4px' }}>{user?.name}</h1>
        <p style={{ fontSize:13, color:'rgba(255,255,255,0.45)', margin:0 }}>Quality Assurance · {new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</p>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
        {[
          { label:'Total Inspections', value:dash?.totalInspections??0,  color:C.blue,  path:'/qa' },
          { label:'Pass Rate',         value:(dash?.passRate??'0')+'%',  color:C.green, path:'/qa' },
          { label:'Failed',            value:dash?.failed??0,            color:(dash?.failed??0)>0?C.red:C.green, path:'/qa' },
          { label:'Open NCRs',         value:dash?.openNcrs??0,          color:(dash?.openNcrs??0)>0?C.red:C.green, path:'/qa' },
        ].map(k => (
          <div key={k.label} onClick={() => nav(k.path)}
            style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:12, padding:'16px 18px', cursor:'pointer', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor=C.blue)}
            onMouseLeave={e => (e.currentTarget.style.borderColor=C.border)}>
            <div style={{ fontSize:10, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>{k.label}</div>
            <div style={{ fontSize:26, fontWeight:800, color:k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }}>
        {[
          { label:'New Inspection', desc:'Record a QA inspection result', path:'/qa',           emoji:'✅' },
          { label:'Raise NCR',      desc:'Log non-conformance report',     path:'/qa',           emoji:'⚠️' },
          { label:'My Timesheet',   desc:'Submit daily activity log',      path:'/hr/timesheets', emoji:'📋' },
        ].map(a => (
          <div key={a.label} onClick={() => nav(a.path)}
            style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:14, padding:'18px 20px', cursor:'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor=C.blue; e.currentTarget.style.background=C.blueBg }}
            onMouseLeave={e => { e.currentTarget.style.borderColor=C.border; e.currentTarget.style.background=C.card }}>
            <div style={{ fontSize:28, marginBottom:10 }}>{a.emoji}</div>
            <p style={{ fontSize:14, fontWeight:700, color:C.text1, margin:'0 0 4px' }}>{a.label}</p>
            <p style={{ fontSize:12, color:C.text3, margin:0 }}>{a.desc}</p>
          </div>
        ))}
      </div>

      {/* Recent inspections + open tasks */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        <div style={{ background:C.card, borderRadius:14, border:'1.5px solid '+C.border, overflow:'hidden' }}>
          <div style={{ padding:'14px 18px', borderBottom:'1.5px solid '+C.border, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <h2 style={{ fontSize:13, fontWeight:700, color:C.text1, margin:0 }}>Recent Inspections</h2>
            <button onClick={() => nav('/qa')} style={{ fontSize:11, fontWeight:600, color:C.blue, background:'none', border:'none', cursor:'pointer' }}>View all →</button>
          </div>
          {(recentInspections??[]).length === 0 ? (
            <p style={{ padding:'20px 18px', fontSize:13, color:C.text3, margin:0 }}>No inspections recorded yet.</p>
          ) : (recentInspections??[]).slice(0,5).map((ins:any, i:number) => {
            const rs = RESULT_STYLE[ins.result??'pending'] ?? RESULT_STYLE.pending
            return (
              <div key={ins.id??i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                padding:'11px 18px', borderBottom:'1px solid #f1f5f9' }}
                onMouseEnter={e=>(e.currentTarget.style.background='#f8faff')}
                onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                <div>
                  <p style={{ fontSize:13, fontWeight:600, color:C.text1, margin:'0 0 2px' }}>{ins.checkItem??ins.description??'Inspection'}</p>
                  <p style={{ fontSize:11, color:C.text3, margin:0 }}>{ins.location??''} · {fmtD(ins.date??ins.createdAt)}</p>
                </div>
                <span style={{ fontSize:10, fontWeight:800, padding:'3px 10px', borderRadius:20, color:rs.color, background:rs.bg }}>{rs.label}</span>
              </div>
            )
          })}
        </div>

        <div style={{ background:C.card, borderRadius:14, border:'1.5px solid '+C.border, overflow:'hidden' }}>
          <div style={{ padding:'14px 18px', borderBottom:'1.5px solid '+C.border, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <h2 style={{ fontSize:13, fontWeight:700, color:C.text1, margin:0 }}>My Open Tasks ({openTasks.length})</h2>
            <button onClick={() => nav('/tasks')} style={{ fontSize:11, fontWeight:600, color:C.blue, background:'none', border:'none', cursor:'pointer' }}>View all →</button>
          </div>
          {openTasks.length === 0 ? (
            <p style={{ padding:'20px 18px', fontSize:13, color:C.green, fontWeight:600, margin:0 }}>✅ All tasks complete</p>
          ) : openTasks.slice(0,5).map((t:any, i:number) => (
            <div key={t.id??i} onClick={() => nav('/tasks')}
              style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                padding:'11px 18px', borderBottom:'1px solid #f1f5f9', cursor:'pointer' }}
              onMouseEnter={e=>(e.currentTarget.style.background='#f8faff')}
              onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
              <p style={{ fontSize:13, fontWeight:500, color:C.text1, margin:0 }}>{t.title}</p>
              <span style={{ fontSize:10, color:C.text3, flexShrink:0 }}>{fmtD(t.dueDate)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
`)

// LiaisonDashboard — add recent letters feed
console.log('\n📌  5/7 — LiaisonDashboard.tsx (add recent letters feed)\n')
write('pages/staff/dashboards/LiaisonDashboard.tsx', `
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import { tasksApi } from '@/api/tasks.api'
import { meetingsApi } from '@/api/meetings.api'
import { liaisonApi } from '@/api/liaison.api'

const C = {"card":"#fff","border":"#e2e8f0","text1":"#0f172a","text2":"#475569","text3":"#94a3b8","blue":"#2563eb","green":"#059669","amber":"#d97706","red":"#dc2626","navy":"#1a2540","blueBg":"#eff6ff","greenBg":"#f0fdf4"}
const fmtD = (s:string) => s ? new Date(s).toLocaleDateString('en-IN',{day:'2-digit',month:'short'}) : ''

export default function LiaisonDashboard() {
  const { user, activeProjectId } = useAuthStore()
  const nav = useNavigate()
  const today = new Date().toISOString().split('T')[0]

  const { data: meetings } = useQuery({
    queryKey: ['meetings', activeProjectId],
    queryFn: () => meetingsApi.list({ projectId: activeProjectId }).then(r => r.data),
    enabled: !!activeProjectId,
  })
  const { data: myTasks } = useQuery({
    queryKey: ['my-tasks', user?.id],
    queryFn: () => tasksApi.list({ projectId: activeProjectId, assignedTo: user?.id }).then(r => r.data),
    enabled: !!user?.id,
  })
  const { data: recentLetters } = useQuery({
    queryKey: ['letters', activeProjectId],
    queryFn: () => liaisonApi.listLetters({ projectId: activeProjectId!, limit:5 }).then(r => r.data),
    enabled: !!activeProjectId,
  })
  const { data: files } = useQuery({
    queryKey: ['liaison-files', activeProjectId],
    queryFn: () => liaisonApi.list({ projectId: activeProjectId! }).then(r => r.data),
    enabled: !!activeProjectId,
  })

  const allActions      = (meetings??[]).flatMap((m:any) => (m.actionItems??[]).map((a:any)=>({...a,meetingId:m.id})))
  const openActions     = allActions.filter((a:any) => a.status !== 'closed')
  const overdueActions  = openActions.filter((a:any) => a.dueDate && a.dueDate < today)
  const pendingTasks    = (myTasks??[]).filter((t:any) => t.status !== 'done')
  const pendingFiles    = (files??[]).filter((f:any) => f.status === 'pending')

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      {/* Header */}
      <div style={{ background:C.navy, borderRadius:16, padding:'24px 28px' }}>
        <p style={{ fontSize:11, color:'rgba(255,255,255,0.4)', margin:'0 0 4px', textTransform:'uppercase', letterSpacing:'0.1em' }}>Liaison Officer Dashboard</p>
        <h1 style={{ fontSize:22, fontWeight:800, color:'#fff', margin:'0 0 4px' }}>{user?.name}</h1>
        <p style={{ fontSize:13, color:'rgba(255,255,255,0.45)', margin:0 }}>Government Liaison · {fmtD(today)}</p>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
        {[
          { label:'Pending Files',     value:pendingFiles.length,    color:pendingFiles.length>0?C.amber:C.green, path:'/liaison' },
          { label:'Open Actions',      value:openActions.length,     color:openActions.length>0?C.amber:C.green,  path:'/meetings' },
          { label:'Overdue Actions',   value:overdueActions.length,  color:overdueActions.length>0?C.red:C.green, path:'/meetings' },
          { label:'My Open Tasks',     value:pendingTasks.length,    color:C.blue, path:'/tasks' },
        ].map(k => (
          <div key={k.label} onClick={() => nav(k.path)}
            style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:12, padding:'16px 18px', cursor:'pointer', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor=C.blue)}
            onMouseLeave={e => (e.currentTarget.style.borderColor=C.border)}>
            <div style={{ fontSize:10, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>{k.label}</div>
            <div style={{ fontSize:26, fontWeight:800, color:k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }}>
        {[
          { label:'Liaison Files',    desc:'Track government files & approvals', path:'/liaison',         emoji:'📁' },
          { label:'Draft Letter',     desc:'Create official correspondence',     path:'/liaison/letters', emoji:'✉️' },
          { label:'Meeting Minutes',  desc:'Record coordination meetings',       path:'/meetings',        emoji:'📝' },
        ].map(a => (
          <div key={a.label} onClick={() => nav(a.path)}
            style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:14, padding:'18px 20px', cursor:'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor=C.blue; e.currentTarget.style.background=C.blueBg }}
            onMouseLeave={e => { e.currentTarget.style.borderColor=C.border; e.currentTarget.style.background=C.card }}>
            <div style={{ fontSize:28, marginBottom:10 }}>{a.emoji}</div>
            <p style={{ fontSize:14, fontWeight:700, color:C.text1, margin:'0 0 4px' }}>{a.label}</p>
            <p style={{ fontSize:12, color:C.text3, margin:0 }}>{a.desc}</p>
          </div>
        ))}
      </div>

      {/* Recent letters + overdue actions */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        <div style={{ background:C.card, borderRadius:14, border:'1.5px solid '+C.border, overflow:'hidden' }}>
          <div style={{ padding:'14px 18px', borderBottom:'1.5px solid '+C.border, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <h2 style={{ fontSize:13, fontWeight:700, color:C.text1, margin:0 }}>Recent Letters</h2>
            <button onClick={() => nav('/liaison/letters')} style={{ fontSize:11, fontWeight:600, color:C.blue, background:'none', border:'none', cursor:'pointer' }}>View all →</button>
          </div>
          {(recentLetters??[]).length === 0 ? (
            <p style={{ padding:'20px 18px', fontSize:13, color:C.text3, margin:0 }}>No letters yet.</p>
          ) : (recentLetters??[]).slice(0,5).map((l:any, i:number) => (
            <div key={l.id??i} style={{ display:'flex', gap:10, padding:'11px 18px', borderBottom:'1px solid #f1f5f9', alignItems:'flex-start' }}
              onMouseEnter={e=>(e.currentTarget.style.background='#f8faff')}
              onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
              <span style={{ fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:10, flexShrink:0, marginTop:1,
                color:l.direction==='incoming'?C.green:C.blue,
                background:l.direction==='incoming'?C.greenBg:C.blueBg }}>
                {l.direction==='incoming'?'↓ IN':'↑ OUT'}
              </span>
              <div style={{ flex:1 }}>
                <p style={{ fontSize:13, fontWeight:600, color:C.text1, margin:'0 0 2px' }}>{l.subject}</p>
                <p style={{ fontSize:11, color:C.text3, margin:0 }}>{l.refNo??''} · {fmtD(l.date??l.createdAt)}</p>
              </div>
            </div>
          ))}
        </div>

        <div style={{ background:C.card, borderRadius:14, border:'1.5px solid '+C.border, overflow:'hidden' }}>
          <div style={{ padding:'14px 18px', borderBottom:'1.5px solid '+C.border, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <h2 style={{ fontSize:13, fontWeight:700, color:C.text1, margin:0 }}>
              Overdue Actions {overdueActions.length > 0 && <span style={{ color:C.red }}>({overdueActions.length})</span>}
            </h2>
            <button onClick={() => nav('/meetings')} style={{ fontSize:11, fontWeight:600, color:C.blue, background:'none', border:'none', cursor:'pointer' }}>Meetings →</button>
          </div>
          {overdueActions.length === 0 ? (
            <p style={{ padding:'20px 18px', fontSize:13, color:C.green, fontWeight:600, margin:0 }}>✅ No overdue actions</p>
          ) : overdueActions.slice(0,5).map((a:any, i:number) => (
            <div key={i} onClick={() => nav('/meetings')}
              style={{ display:'flex', justifyContent:'space-between', padding:'11px 18px', borderBottom:'1px solid #f1f5f9', cursor:'pointer', alignItems:'flex-start' }}
              onMouseEnter={e=>(e.currentTarget.style.background='#fff5f5')}
              onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
              <p style={{ fontSize:13, fontWeight:600, color:C.red, margin:0, flex:1 }}>{a.action??a.description}</p>
              <span style={{ fontSize:10, color:C.red, flexShrink:0, marginLeft:8, fontWeight:700 }}>Due {fmtD(a.dueDate)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
`)

// SupervisorDashboard — add today's attendance + diary feed
console.log('\n📌  6/7 — SupervisorDashboard.tsx (add attendance + diary feed)\n')
write('pages/staff/dashboards/SupervisorDashboard.tsx', `
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import { hrApi } from '@/api/hr.api'
import { diaryApi } from '@/api/diary.api'
import { tasksApi } from '@/api/tasks.api'

const C = {"card":"#fff","border":"#e2e8f0","text1":"#0f172a","text2":"#475569","text3":"#94a3b8","blue":"#2563eb","green":"#059669","amber":"#d97706","red":"#dc2626","navy":"#1a2540","blueBg":"#eff6ff","greenBg":"#f0fdf4"}
const fmtD = (s:string) => s ? new Date(s).toLocaleDateString('en-IN',{day:'2-digit',month:'short'}) : ''

export default function SupervisorDashboard() {
  const { user, activeProjectId } = useAuthStore()
  const nav = useNavigate()
  const today = new Date().toISOString().split('T')[0]

  const { data: hrDash } = useQuery({
    queryKey: ['hr-dash', activeProjectId],
    queryFn: () => hrApi.dashboard(activeProjectId??undefined).then(r => r.data),
  })
  const { data: diaryDash } = useQuery({
    queryKey: ['diary-dash', activeProjectId],
    queryFn: () => diaryApi.dashboard(activeProjectId!).then(r => r.data),
    enabled: !!activeProjectId,
  })
  const { data: recentDiary } = useQuery({
    queryKey: ['diary-recent', activeProjectId],
    queryFn: () => diaryApi.list({ projectId:activeProjectId!, limit:4 }).then(r => r.data),
    enabled: !!activeProjectId,
  })
  const { data: myTasks } = useQuery({
    queryKey: ['my-tasks', user?.id],
    queryFn: () => tasksApi.list({ projectId: activeProjectId, assignedTo: user?.id }).then(r => r.data),
    enabled: !!user?.id,
  })

  const openTasks       = (myTasks??[]).filter((t:any) => t.status !== 'done')
  const attendanceRate  = hrDash?.totalEmployees > 0
    ? Math.round(((hrDash?.presentToday??0) / hrDash.totalEmployees) * 100) : 0

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      {/* Header */}
      <div style={{ background:C.navy, borderRadius:16, padding:'24px 28px' }}>
        <p style={{ fontSize:11, color:'rgba(255,255,255,0.4)', margin:'0 0 4px', textTransform:'uppercase', letterSpacing:'0.1em' }}>Site Supervisor Dashboard</p>
        <h1 style={{ fontSize:22, fontWeight:800, color:'#fff', margin:'0 0 4px' }}>{user?.name}</h1>
        <p style={{ fontSize:13, color:'rgba(255,255,255,0.45)', margin:0 }}>Site Supervision · {fmtD(today)}</p>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
        {[
          { label:'Workers on Site',  value:hrDash?.totalEmployees??0, color:C.blue, path:'/hr/attendance' },
          { label:'Present Today',    value:hrDash?.presentToday??0,   color:C.green, path:'/hr/attendance' },
          { label:'Attendance Rate',  value:attendanceRate+'%',        color:attendanceRate>=80?C.green:C.red, path:'/hr/attendance' },
          { label:'Diary Entries',    value:diaryDash?.thisMonthEntries??0, color:C.navy, path:'/diary' },
        ].map(k => (
          <div key={k.label} onClick={() => nav(k.path)}
            style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:12, padding:'16px 18px', cursor:'pointer', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor=C.blue)}
            onMouseLeave={e => (e.currentTarget.style.borderColor=C.border)}>
            <div style={{ fontSize:10, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>{k.label}</div>
            <div style={{ fontSize:26, fontWeight:800, color:k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Attendance visual */}
      <div style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:14, padding:'18px 22px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
          <h2 style={{ fontSize:13, fontWeight:700, color:C.text1, margin:0 }}>Today's Attendance</h2>
          <span style={{ fontSize:13, fontWeight:800, color:attendanceRate>=80?C.green:C.red }}>{attendanceRate}%</span>
        </div>
        <div style={{ width:'100%', height:10, borderRadius:99, background:'#e2e8f0', overflow:'hidden', marginBottom:12 }}>
          <div style={{ width:attendanceRate+'%', height:'100%', borderRadius:99,
            background:attendanceRate>=80?C.green:C.amber, transition:'width 0.5s ease' }} />
        </div>
        <div style={{ display:'flex', gap:24 }}>
          {[
            { label:'Present', value:hrDash?.presentToday??0, color:C.green },
            { label:'Absent',  value:(hrDash?.totalEmployees??0)-(hrDash?.presentToday??0), color:C.red },
            { label:'Total',   value:hrDash?.totalEmployees??0, color:C.text2 },
          ].map(s => (
            <div key={s.label}>
              <p style={{ fontSize:10, fontWeight:700, color:C.text3, textTransform:'uppercase', margin:'0 0 2px' }}>{s.label}</p>
              <p style={{ fontSize:18, fontWeight:800, color:s.color, margin:0 }}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }}>
        {[
          { label:'Mark Attendance', desc:"Record today's labour count", path:'/hr/attendance', emoji:'📍' },
          { label:'Site Diary',      desc:'Log daily site activities',    path:'/diary',         emoji:'📓' },
          { label:'My Timesheet',    desc:'Submit your activity log',     path:'/hr/timesheets', emoji:'📋' },
        ].map(a => (
          <div key={a.label} onClick={() => nav(a.path)}
            style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:14, padding:'18px 20px', cursor:'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor=C.blue; e.currentTarget.style.background=C.blueBg }}
            onMouseLeave={e => { e.currentTarget.style.borderColor=C.border; e.currentTarget.style.background=C.card }}>
            <div style={{ fontSize:28, marginBottom:10 }}>{a.emoji}</div>
            <p style={{ fontSize:14, fontWeight:700, color:C.text1, margin:'0 0 4px' }}>{a.label}</p>
            <p style={{ fontSize:12, color:C.text3, margin:0 }}>{a.desc}</p>
          </div>
        ))}
      </div>

      {/* Recent diary entries + open tasks */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        <div style={{ background:C.card, borderRadius:14, border:'1.5px solid '+C.border, overflow:'hidden' }}>
          <div style={{ padding:'14px 18px', borderBottom:'1.5px solid '+C.border, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <h2 style={{ fontSize:13, fontWeight:700, color:C.text1, margin:0 }}>Recent Diary Entries</h2>
            <button onClick={() => nav('/diary')} style={{ fontSize:11, fontWeight:600, color:C.blue, background:'none', border:'none', cursor:'pointer' }}>View all →</button>
          </div>
          {(recentDiary??[]).length === 0 ? (
            <p style={{ padding:'20px 18px', fontSize:13, color:C.text3, margin:0 }}>No diary entries yet.</p>
          ) : (recentDiary??[]).slice(0,4).map((d:any, i:number) => (
            <div key={d.id??i} onClick={() => nav('/diary')}
              style={{ display:'flex', justifyContent:'space-between', padding:'11px 18px', borderBottom:'1px solid #f1f5f9', cursor:'pointer', alignItems:'flex-start' }}
              onMouseEnter={e=>(e.currentTarget.style.background='#f8faff')}
              onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
              <div>
                <p style={{ fontSize:13, fontWeight:600, color:C.text1, margin:'0 0 2px' }}>{d.workDone ?? d.title ?? 'Site diary entry'}</p>
                <p style={{ fontSize:11, color:C.text3, margin:0 }}>
                  {d.weather ? d.weather+' · ' : ''}{d.manpower ? d.manpower+' workers · ' : ''}{fmtD(d.date??d.createdAt)}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div style={{ background:C.card, borderRadius:14, border:'1.5px solid '+C.border, overflow:'hidden' }}>
          <div style={{ padding:'14px 18px', borderBottom:'1.5px solid '+C.border, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <h2 style={{ fontSize:13, fontWeight:700, color:C.text1, margin:0 }}>My Tasks ({openTasks.length} open)</h2>
            <button onClick={() => nav('/tasks')} style={{ fontSize:11, fontWeight:600, color:C.blue, background:'none', border:'none', cursor:'pointer' }}>View all →</button>
          </div>
          {openTasks.length === 0 ? (
            <p style={{ padding:'20px 18px', fontSize:13, color:C.green, fontWeight:600, margin:0 }}>✅ All tasks complete</p>
          ) : openTasks.slice(0,4).map((t:any, i:number) => (
            <div key={t.id??i} onClick={() => nav('/tasks')}
              style={{ display:'flex', justifyContent:'space-between', padding:'11px 18px', borderBottom:'1px solid #f1f5f9', cursor:'pointer' }}
              onMouseEnter={e=>(e.currentTarget.style.background='#f8faff')}
              onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
              <p style={{ fontSize:13, fontWeight:500, color:C.text1, margin:0 }}>{t.title}</p>
              <span style={{ fontSize:10, color:C.text3, flexShrink:0 }}>{fmtD(t.dueDate)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
`)

// HrDashboard — add pending timesheets + salary summary
console.log('\n📌  7/7 — HrDashboard.tsx (add pending timesheets + salary summary)\n')
write('pages/staff/dashboards/HrDashboard.tsx', `
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import { hrApi } from '@/api/hr.api'
import { tasksApi } from '@/api/tasks.api'
import api from '@/api/client'

const C = {"card":"#fff","border":"#e2e8f0","text1":"#0f172a","text2":"#475569","text3":"#94a3b8","blue":"#2563eb","green":"#059669","amber":"#d97706","red":"#dc2626","navy":"#1a2540","blueBg":"#eff6ff","greenBg":"#f0fdf4"}
const fmtD = (s:string) => s ? new Date(s).toLocaleDateString('en-IN',{day:'2-digit',month:'short'}) : ''
const fmtL = (n:number) => '₹'+(n/100000).toFixed(2)+' L'

export default function HrDashboard() {
  const { user, activeProjectId } = useAuthStore()
  const nav = useNavigate()
  const today = new Date().toISOString().split('T')[0]

  const { data: hrDash } = useQuery({
    queryKey: ['hr-dash', activeProjectId],
    queryFn: () => hrApi.dashboard(activeProjectId??undefined).then(r => r.data),
  })
  const { data: myTasks } = useQuery({
    queryKey: ['my-tasks', user?.id],
    queryFn: () => tasksApi.list({ projectId: activeProjectId, assignedTo: user?.id }).then(r => r.data),
    enabled: !!user?.id,
  })
  const { data: timesheets } = useQuery({
    queryKey: ['timesheets-pending', activeProjectId],
    queryFn: () => api.get('/hr/timesheets', { params:{ projectId:activeProjectId, status:'submitted', limit:5 } }).then(r => r.data),
    enabled: !!activeProjectId,
  })
  const { data: salaryData } = useQuery({
    queryKey: ['salary-summary', activeProjectId],
    queryFn: () => api.get('/hr/salary/summary', { params:{ projectId:activeProjectId } }).then(r => r.data),
    enabled: !!activeProjectId,
  })

  const pendingTasks = (myTasks??[]).filter((t:any) => t.status !== 'done')
  const attendanceRate = hrDash?.totalEmployees > 0
    ? Math.round(((hrDash?.presentToday??0) / hrDash.totalEmployees) * 100) : 0

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      {/* Header */}
      <div style={{ background:C.navy, borderRadius:16, padding:'24px 28px' }}>
        <p style={{ fontSize:11, color:'rgba(255,255,255,0.4)', margin:'0 0 4px', textTransform:'uppercase', letterSpacing:'0.1em' }}>HR Officer Dashboard</p>
        <h1 style={{ fontSize:22, fontWeight:800, color:'#fff', margin:'0 0 4px' }}>{user?.name}</h1>
        <p style={{ fontSize:13, color:'rgba(255,255,255,0.45)', margin:0 }}>Human Resources · {fmtD(today)}</p>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
        {[
          { label:'Total Employees',  value:hrDash?.totalEmployees??0, color:C.blue,  path:'/hr/employees' },
          { label:'Present Today',    value:hrDash?.presentToday??0,   color:C.green, path:'/hr/attendance' },
          { label:'Absent Today',     value:hrDash?.absentToday??0,    color:(hrDash?.absentToday??0)>0?C.red:C.green, path:'/hr/attendance' },
          { label:'Pending Timesheets', value:(timesheets??[]).length, color:(timesheets??[]).length>0?C.amber:C.green, path:'/hr/timesheets' },
        ].map(k => (
          <div key={k.label} onClick={() => nav(k.path)}
            style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:12, padding:'16px 18px', cursor:'pointer', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor=C.blue)}
            onMouseLeave={e => (e.currentTarget.style.borderColor=C.border)}>
            <div style={{ fontSize:10, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>{k.label}</div>
            <div style={{ fontSize:26, fontWeight:800, color:k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }}>
        {[
          { label:'Mark Attendance',   desc:"Record today's site attendance", path:'/hr/attendance', emoji:'📍' },
          { label:'Generate Salary',   desc:'Process monthly salary',          path:'/hr/salary',     emoji:'💰' },
          { label:'My Timesheet',      desc:'Submit daily activity log',       path:'/hr/timesheets', emoji:'📋' },
        ].map(a => (
          <div key={a.label} onClick={() => nav(a.path)}
            style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:14, padding:'18px 20px', cursor:'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor=C.blue; e.currentTarget.style.background=C.blueBg }}
            onMouseLeave={e => { e.currentTarget.style.borderColor=C.border; e.currentTarget.style.background=C.card }}>
            <div style={{ fontSize:28, marginBottom:10 }}>{a.emoji}</div>
            <p style={{ fontSize:14, fontWeight:700, color:C.text1, margin:'0 0 4px' }}>{a.label}</p>
            <p style={{ fontSize:12, color:C.text3, margin:0 }}>{a.desc}</p>
          </div>
        ))}
      </div>

      {/* Salary summary card */}
      {salaryData && (
        <div style={{ background:'linear-gradient(135deg,#1a2540 0%,#2563eb 100%)', borderRadius:14, padding:'20px 24px' }}>
          <p style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'0.08em', margin:'0 0 12px' }}>
            Current Month Salary Summary
          </p>
          <div style={{ display:'flex', gap:32 }}>
            {[
              { label:'Total Payroll',  value:fmtL(salaryData.totalPayroll??0),  color:'#fff' },
              { label:'TDS Deducted',   value:fmtL(salaryData.totalTds??0),      color:'#fca5a5' },
              { label:'Net Disbursed',  value:fmtL(salaryData.totalNet??0),      color:'#86efac' },
              { label:'Processed',      value:(salaryData.processed??0)+' of '+(salaryData.total??0), color:'#93c5fd' },
            ].map(s => (
              <div key={s.label}>
                <p style={{ fontSize:10, fontWeight:600, color:'rgba(255,255,255,0.4)', margin:'0 0 4px', textTransform:'uppercase' }}>{s.label}</p>
                <p style={{ fontSize:18, fontWeight:800, color:s.color, margin:0 }}>{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending timesheets + open tasks */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        <div style={{ background:C.card, borderRadius:14, border:'1.5px solid '+C.border, overflow:'hidden' }}>
          <div style={{ padding:'14px 18px', borderBottom:'1.5px solid '+C.border, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <h2 style={{ fontSize:13, fontWeight:700, color:C.text1, margin:0 }}>Pending Timesheets</h2>
            <button onClick={() => nav('/hr/timesheets')} style={{ fontSize:11, fontWeight:600, color:C.blue, background:'none', border:'none', cursor:'pointer' }}>Review →</button>
          </div>
          {(timesheets??[]).length === 0 ? (
            <p style={{ padding:'20px 18px', fontSize:13, color:C.green, fontWeight:600, margin:0 }}>✅ All timesheets reviewed</p>
          ) : (timesheets??[]).slice(0,4).map((ts:any, i:number) => (
            <div key={ts.id??i} onClick={() => nav('/hr/timesheets')}
              style={{ display:'flex', justifyContent:'space-between', padding:'11px 18px', borderBottom:'1px solid #f1f5f9', cursor:'pointer', alignItems:'center' }}
              onMouseEnter={e=>(e.currentTarget.style.background='#f8faff')}
              onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
              <div>
                <p style={{ fontSize:13, fontWeight:600, color:C.text1, margin:'0 0 2px' }}>{ts.employee?.name ?? ts.userName ?? 'Employee'}</p>
                <p style={{ fontSize:11, color:C.text3, margin:0 }}>{fmtD(ts.date??ts.weekStart)} · {ts.totalHours ?? '—'}h</p>
              </div>
              <span style={{ fontSize:10, fontWeight:700, color:C.amber, background:'#fffbeb', padding:'3px 10px', borderRadius:20 }}>Pending</span>
            </div>
          ))}
        </div>

        <div style={{ background:C.card, borderRadius:14, border:'1.5px solid '+C.border, overflow:'hidden' }}>
          <div style={{ padding:'14px 18px', borderBottom:'1.5px solid '+C.border, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <h2 style={{ fontSize:13, fontWeight:700, color:C.text1, margin:0 }}>My Tasks ({pendingTasks.length} open)</h2>
            <button onClick={() => nav('/tasks')} style={{ fontSize:11, fontWeight:600, color:C.blue, background:'none', border:'none', cursor:'pointer' }}>View all →</button>
          </div>
          {pendingTasks.length === 0 ? (
            <p style={{ padding:'20px 18px', fontSize:13, color:C.green, fontWeight:600, margin:0 }}>✅ All tasks complete</p>
          ) : pendingTasks.slice(0,4).map((t:any, i:number) => (
            <div key={t.id??i} onClick={() => nav('/tasks')}
              style={{ display:'flex', justifyContent:'space-between', padding:'11px 18px', borderBottom:'1px solid #f1f5f9', cursor:'pointer' }}
              onMouseEnter={e=>(e.currentTarget.style.background='#f8faff')}
              onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
              <p style={{ fontSize:13, fontWeight:500, color:C.text1, margin:0 }}>{t.title}</p>
              <span style={{ fontSize:10, color:C.text3, flexShrink:0 }}>{fmtD(t.dueDate)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
`)

// ─────────────────────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n' + '─'.repeat(60))
console.log(`\n🏁 Polish Pass 2b Complete — ${written} files written\n`)
console.log('Next steps:')
console.log('  1. Restart frontend dev server (Vite hot-reloads should catch most changes)')
console.log('  2. Backend needs GET /api/v1/public/project/:code endpoint for PublicProjectPage')
console.log('  3. Run: node scripts/polish-pass-2a.js  — to confirm line counts improved')
console.log('  4. Paste any TypeScript errors and I\'ll fix them\n')
