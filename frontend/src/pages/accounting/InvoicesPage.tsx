import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth.store'
import { accountingApi } from '@/api/accounting.api'
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
    queryFn: () => accountingApi.invoices({ projectId: activeProjectId }).then(r => r.data),
    enabled: !!activeProjectId,
  })

  const saveMut = useMutation({
    mutationFn: (body: any) => editId
      ? accountingApi.updateInvoice(editId, body).then(r => r.data)
      : accountingApi.createInvoice({ ...body, projectId: activeProjectId }).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey:['invoices'] }); closeModal() },
  })

  const deleteMut = useMutation({
    mutationFn: (id:string) => accountingApi.deleteInvoice(id),
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
                  <p style={{ fontSize:12, fontWeight:600, color:C.green, margin:'0 0 8px' }}>Net Payable Preview</p>
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
