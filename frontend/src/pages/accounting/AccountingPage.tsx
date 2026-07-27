import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Users, Receipt, CheckCircle, PencilSimple, Trash } from '@phosphor-icons/react'
import { accountingApi } from '@/api/accounting.api'
import { useAuthStore } from '@/store/auth.store'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'

const C = {
  card:'#fff', border:'#e2e8f0', text1:'#0f172a', text2:'#475569', text3:'#94a3b8',
  blue:'#2563eb', green:'#059669', amber:'#d97706', red:'#dc2626',
}

const EXP_CATS = [
  {value:'material',label:'Material'},{value:'labour',label:'Labour'},
  {value:'equipment_hire',label:'Equipment Hire'},{value:'fuel',label:'Fuel'},
  {value:'transport',label:'Transport'},{value:'site_office',label:'Site Office'},
  {value:'safety',label:'Safety'},{value:'testing',label:'Testing'},
  {value:'subcontract',label:'Subcontract'},{value:'government_fee',label:'Government Fee'},
  {value:'staff_salary',label:'Staff Salary'},{value:'miscellaneous',label:'Miscellaneous'},
]

const VEN_CATS = [
  {value:'material_supplier',label:'Material Supplier'},{value:'subcontractor',label:'Subcontractor'},
  {value:'equipment_hire',label:'Equipment Hire'},{value:'labour_contractor',label:'Labour Contractor'},
  {value:'consultant',label:'Consultant'},{value:'government',label:'Government'},{value:'other',label:'Other'},
]

const PAY_MODES = [
  {value:'rtgs',label:'RTGS'},{value:'neft',label:'NEFT'},
  {value:'cheque',label:'Cheque'},{value:'cash',label:'Cash'},{value:'upi',label:'UPI'},
]

// Nature of the bill/payment (construction context)
const PAY_TYPES = [
  {value:'running_bill',label:'Running Bill'},
  {value:'mobilisation_advance',label:'Mobilisation Advance'},
  {value:'secured_advance',label:'Secured / Material Advance'},
  {value:'final_bill',label:'Final Bill'},
  {value:'retention_release',label:'Retention Release'},
  {value:'security_deposit',label:'Security Deposit'},
  {value:'direct_purchase',label:'Direct Purchase'},
  {value:'other',label:'Other (specify)'},
]
const PAY_TYPE_LABEL: Record<string,string> = Object.fromEntries(PAY_TYPES.map(p => [p.value, p.label]))
const EDIT_ROLES = ['super_admin','project_manager','accounts']

// Money-IN receipt types (client → contractor)
const RECEIPT_TYPES = [
  {value:'ra_bill',label:'RA Bill Payment'},
  {value:'mobilisation_advance',label:'Mobilisation Advance'},
  {value:'secured_advance',label:'Secured Advance'},
  {value:'retention_release',label:'Retention Release'},
  {value:'security_refund',label:'Security Deposit Refund'},
  {value:'other',label:'Other Receipt'},
]
const RECEIPT_TYPE_LABEL: Record<string,string> = Object.fromEntries(RECEIPT_TYPES.map(r => [r.value, r.label]))

const TDS_SECTIONS = [
  {value:'194C',label:'194C - Contractors'},{value:'194I',label:'194I - Rent'},
  {value:'194J',label:'194J - Professional'},{value:'194A',label:'194A - Interest'},{value:'Other',label:'Other'},
]

const SS: Record<string,any> = {
  pending:  {bg:'#fffbeb',color:'#b45309',border:'#fde68a'},
  approved: {bg:'#eff6ff',color:'#1d4ed8',border:'#bfdbfe'},
  paid:     {bg:'#ecfdf5',color:'#047857',border:'#a7f3d0'},
  rejected: {bg:'#fef2f2',color:'#b91c1c',border:'#fecaca'},
}

function fmtL(n: number) {
  if (!n || isNaN(n)) return '₹0.00 L'
  return '\u20B9' + (n / 100000).toFixed(2) + ' L'
}

function fmt(n: number) {
  if (!n || isNaN(n)) return '\u20B90.00'
  return '\u20B9' + Number(n).toLocaleString('en-IN', { minimumFractionDigits:2, maximumFractionDigits:2 })
}

type Tab = 'expenses' | 'vendors' | 'tds' | 'ledger'

const BLANK_EXP = {
  date: new Date().toISOString().split('T')[0],
  description:'', category:'material', vendorId:'',
  paymentType:'running_bill', paymentTypeOther:'',
  billNo:'', grossAmount:'', gstPct:'18', tdsPct:'2',
  tdsSection:'194C', remarks:'',
}

const BLANK_VEN = {
  name:'', category:'subcontractor', gstin:'', pan:'',
  phone:'', email:'', address:'', tdsRate:'2',
  bankAccount:{ accountNo:'', ifsc:'', bankName:'J&K Bank', branch:'' },
}

const BLANK_PAY = {
  paidAmount:'', paymentDate: new Date().toISOString().split('T')[0],
  paymentMode:'rtgs', paymentRef:'',
}

export default function AccountingPage() {
  const { activeProjectId, user } = useAuthStore()
  const canEdit = EDIT_ROLES.includes(user?.role ?? '')
  const qc = useQueryClient()
  const [tab, setTab]           = useState<Tab>('expenses')
  const [showExp, setShowExp]   = useState(false)
  const [editId, setEditId]     = useState<string | null>(null)
  const [showVen, setShowVen]   = useState(false)
  const [payItem, setPayItem]   = useState<any>(null)
  const [depItem, setDepItem]   = useState<any>(null)
  const [expForm, setExpForm]   = useState<any>(BLANK_EXP)
  const [venForm, setVenForm]   = useState<any>(BLANK_VEN)
  const [payForm, setPayForm]   = useState<any>(BLANK_PAY)
  const [depForm, setDepForm]   = useState({ depositDate: new Date().toISOString().split('T')[0], challanNo:'' })
  const [showRec, setShowRec]   = useState(false)
  const [recForm, setRecForm]   = useState({ date: new Date().toISOString().split('T')[0], description:'', receiptType:'ra_bill', amount:'', paymentMode:'rtgs', paymentRef:'' })
  const [catFilter, setCat]     = useState('')
  const [statusFilter, setStat] = useState('')

  const { data: dash } = useQuery({
    queryKey: ['acc-dash', activeProjectId],
    queryFn:  () => accountingApi.dashboard(activeProjectId!).then(r => r.data),
    enabled:  !!activeProjectId,
  })

  const { data: expenses, isLoading: expLoading } = useQuery({
    queryKey: ['expenses', activeProjectId, catFilter, statusFilter],
    queryFn:  () => accountingApi.expenses({ projectId: activeProjectId, category: catFilter||undefined, status: statusFilter||undefined }).then(r => r.data),
    enabled:  !!activeProjectId,
  })

  const { data: vendors } = useQuery({
    queryKey: ['vendors', activeProjectId],
    queryFn:  () => accountingApi.vendors({ projectId: activeProjectId }).then(r => r.data),
    enabled:  !!activeProjectId,
  })

  const { data: tdsEntries, isLoading: tdsLoading } = useQuery({
    queryKey: ['tds', activeProjectId],
    queryFn:  () => accountingApi.tds({ projectId: activeProjectId }).then(r => r.data),
    enabled:  !!activeProjectId && tab === 'tds',
  })

  const { data: txns, isLoading: txnLoading } = useQuery({
    queryKey: ['txns', activeProjectId],
    queryFn:  () => accountingApi.transactions({ projectId: activeProjectId }).then(r => r.data),
    enabled:  !!activeProjectId && tab === 'ledger',
  })

  const invalidateExp = () => {
    qc.invalidateQueries({ queryKey: ['expenses'] })
    qc.invalidateQueries({ queryKey: ['acc-dash'] })
    qc.invalidateQueries({ queryKey: ['tds'] })
    qc.invalidateQueries({ queryKey: ['txns'] })
  }

  const saveExpM = useMutation({
    mutationFn: () => {
      const payload: any = {
        ...expForm, projectId: activeProjectId,
        paymentType: expForm.paymentType === 'other' ? (expForm.paymentTypeOther || 'Other') : expForm.paymentType,
        grossAmount: parseFloat(expForm.grossAmount),
        gstPct: parseFloat(expForm.gstPct)||0,
        tdsPct: parseFloat(expForm.tdsPct)||0,
      }
      delete payload.paymentTypeOther
      return editId ? accountingApi.updateExpense(editId, payload) : accountingApi.createExpense(payload)
    },
    onSuccess: () => { invalidateExp(); setShowExp(false); setExpForm(BLANK_EXP); setEditId(null) },
  })

  const deleteExpM = useMutation({
    mutationFn: (id: string) => accountingApi.deleteExpense(id),
    onSuccess: () => invalidateExp(),
  })

  function openCreate() { setEditId(null); setExpForm(BLANK_EXP); setShowExp(true) }
  function openEdit(e: any) {
    const preset = PAY_TYPES.some(p => p.value === e.paymentType)
    setEditId(e.id)
    setExpForm({
      date: e.date, description: e.description, category: e.category, vendorId: e.vendorId || '',
      paymentType: preset ? e.paymentType : 'other',
      paymentTypeOther: preset ? '' : (e.paymentType || ''),
      billNo: e.billNo || '', grossAmount: String(e.grossAmount), gstPct: String(e.gstPct),
      tdsPct: String(e.tdsPct), tdsSection: e.tdsSection || '194C', remarks: e.remarks || '',
    })
    setShowExp(true)
  }

  const createVenM = useMutation({
    mutationFn: () => accountingApi.createVendor({ ...venForm, projectId: activeProjectId, tdsRate: parseFloat(venForm.tdsRate)||2 }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vendors'] }); setShowVen(false); setVenForm(BLANK_VEN) },
  })

  const approveM = useMutation({
    mutationFn: (id: string) => accountingApi.approveExpense(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  })

  const payM = useMutation({
    mutationFn: () => accountingApi.payExpense(payItem.id, { ...payForm, paidAmount: parseFloat(payForm.paidAmount) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] })
      qc.invalidateQueries({ queryKey: ['txns'] })
      qc.invalidateQueries({ queryKey: ['acc-dash'] })
      setPayItem(null); setPayForm(BLANK_PAY)
    },
  })

  const depositM = useMutation({
    mutationFn: () => accountingApi.depositTds(depItem.id, depForm),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tds'] }); setDepItem(null) },
  })

  // Money-IN: record a client receipt (RA-bill payment, mobilisation advance, etc.)
  const receiptM = useMutation({
    mutationFn: () => accountingApi.addTransaction({
      projectId: activeProjectId, date: recForm.date, type: 'receipt',
      description: (RECEIPT_TYPE_LABEL[recForm.receiptType] ?? 'Receipt') + (recForm.description ? ' — ' + recForm.description : ''),
      credit: parseFloat(recForm.amount) || 0, paymentMode: recForm.paymentMode, bankRef: recForm.paymentRef,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['txns'] }); qc.invalidateQueries({ queryKey: ['acc-dash'] })
      setShowRec(false)
      setRecForm({ date: new Date().toISOString().split('T')[0], description:'', receiptType:'ra_bill', amount:'', paymentMode:'rtgs', paymentRef:'' })
    },
  })

  const venMap: Record<string,any> = {}
  ;(vendors ?? []).forEach((v: any) => { venMap[v.id] = v })
  const venOptions = [
    { value:'', label:'No vendor / Direct' },
    ...(vendors ?? []).map((v: any) => ({ value: v.id, label: v.name }))
  ]

  const gross  = parseFloat(expForm.grossAmount)||0
  const gstAmt = gross * (parseFloat(expForm.gstPct)||0) / 100
  const tdsAmt = (gross + gstAmt) * (parseFloat(expForm.tdsPct)||0) / 100
  const netPay = gross + gstAmt - tdsAmt

  const exps  = expenses ?? []
  const vends = vendors  ?? []
  const tdsList = tdsEntries ?? []
  const txnList = txns ?? []

  const kpis = [
    { label:'Total Expenses',  value: fmtL(dash?.totalExpenses ?? 0),   color: C.text1 },
    { label:'Total Paid',      value: fmtL(dash?.totalPaid ?? 0),       color: C.green },
    { label:'Pending Payment', value: fmtL(dash?.totalPending ?? 0),    color: C.amber },
    { label:'TDS Deducted',    value: fmtL(dash?.totalTdsDeducted ?? 0),color: C.blue  },
    { label:'TDS Liability',   value: fmtL(dash?.tdsLiability ?? 0),    color: (dash?.tdsLiability ?? 0) > 0 ? C.red : C.green },
  ]

  return (
    <div className="fade-in" style={{ display:'flex', flexDirection:'column', gap:24 }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:800, color:C.text1, margin:0, letterSpacing:'-0.02em' }}>Accounting</h1>
          <p style={{ fontSize:14, color:C.text3, marginTop:4 }}>Expenses · Vendors · TDS Ledger · Transactions</p>
        </div>
        {canEdit && (
          <div style={{ display:'flex', gap:10 }}>
            <Button variant="secondary" size="md" icon={<Users size={15}/>} onClick={() => setShowVen(true)}>Add Vendor</Button>
            <Button variant="primary"   size="md" icon={<Plus size={15}/>}  onClick={openCreate}>Record Expense</Button>
          </div>
        )}
      </div>

      {/* KPI cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:14 }}>
        {kpis.map(k => (
          <div key={k.label} style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:12, padding:'16px 18px', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize:10, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>{k.label}</div>
            <div style={{ fontSize:20, fontWeight:800, color:k.color, fontVariantNumeric:'tabular-nums' }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', borderBottom:'1.5px solid '+C.border }}>
        {([
          ['expenses', 'Expenses ('+exps.length+')'],
          ['vendors',  'Vendors ('+vends.length+')'],
          ['tds',      'TDS Ledger'],
          ['ledger',   'Transactions'],
        ] as const).map(([t, l]) => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding:'10px 20px', fontSize:13, fontWeight:600, border:'none', background:'none', cursor:'pointer',
            borderBottom: tab===t ? '2px solid '+C.blue : '2px solid transparent',
            color: tab===t ? C.blue : C.text3, marginBottom:-1,
          }}>{l}</button>
        ))}
      </div>

      {/* Expenses */}
      {tab === 'expenses' && (
        <div style={{ background:C.card, borderRadius:16, border:'1.5px solid '+C.border, overflow:'hidden', boxShadow:'0 1px 6px rgba(0,0,0,0.05)' }}>
          <div style={{ padding:'12px 20px', background:'#f8f9fc', borderBottom:'1.5px solid '+C.border, display:'flex', gap:10 }}>
            <select value={catFilter} onChange={e => setCat(e.target.value)}
              style={{ padding:'7px 12px', background:'#fff', border:'1.5px solid '+C.border, borderRadius:8, fontSize:12, color:C.text1, outline:'none', fontFamily:'inherit', cursor:'pointer' }}>
              <option value="">All Categories</option>
              {EXP_CATS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <select value={statusFilter} onChange={e => setStat(e.target.value)}
              style={{ padding:'7px 12px', background:'#fff', border:'1.5px solid '+C.border, borderRadius:8, fontSize:12, color:C.text1, outline:'none', fontFamily:'inherit', cursor:'pointer' }}>
              <option value="">All Status</option>
              {['pending','approved','paid','rejected'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {expLoading ? <div style={{ display:'flex', justifyContent:'center', padding:40 }}><Spinner /></div>
          : exps.length === 0 ? (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'56px 24px', gap:10 }}>
              <Receipt size={32} color={C.border} />
              <p style={{ fontSize:14, fontWeight:600, color:C.text3, margin:0 }}>No expenses yet</p>
              <Button variant="primary" size="sm" icon={<Plus size={13}/>} onClick={openCreate}>Record first expense</Button>
            </div>
          ) : (
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', minWidth:900 }}>
                <thead>
                  <tr style={{ background:'#f8f9fc', borderBottom:'1.5px solid '+C.border }}>
                    {['Date','Description','Category','Vendor','Gross','GST','TDS','Net Payable','Status','Actions'].map(h => (
                      <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:10, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.06em', whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {exps.map((e: any, i: number) => {
                    const s = SS[e.status] ?? SS.pending
                    return (
                      <tr key={e.id} style={{ borderBottom: i < exps.length-1 ? '1px solid #f1f5f9' : 'none' }}
                        onMouseEnter={ev => (ev.currentTarget.style.background = '#f8faff')}
                        onMouseLeave={ev => (ev.currentTarget.style.background = 'transparent')}>
                        <td style={{ padding:'11px 14px', fontSize:12, color:C.text2, whiteSpace:'nowrap' }}>{e.date}</td>
                        <td style={{ padding:'11px 14px', fontSize:13, color:C.text1, maxWidth:220 }}>
                          <span style={{ display:'block', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{e.description}</span>
                          {e.paymentType && e.paymentType!=='running_bill' && (
                            <span style={{ display:'inline-block', marginTop:3, fontSize:9.5, fontWeight:700, color:C.blue, background:'#eff6ff', padding:'1px 6px', borderRadius:20, textTransform:'uppercase', letterSpacing:'0.04em' }}>{PAY_TYPE_LABEL[e.paymentType] ?? e.paymentType}</span>
                          )}
                        </td>
                        <td style={{ padding:'11px 14px', fontSize:11, color:C.text2, textTransform:'capitalize' }}>{e.category?.replace(/_/g,' ')}</td>
                        <td style={{ padding:'11px 14px', fontSize:12, color:C.text2 }}>{venMap[e.vendorId]?.name ?? '—'}</td>
                        <td style={{ padding:'11px 14px', fontSize:12, fontWeight:600, color:C.text1, whiteSpace:'nowrap' }}>{fmt(Number(e.grossAmount))}</td>
                        <td style={{ padding:'11px 14px', fontSize:12, color:C.amber, whiteSpace:'nowrap' }}>{Number(e.gstAmount)>0 ? fmt(Number(e.gstAmount)) : '—'}</td>
                        <td style={{ padding:'11px 14px', fontSize:12, color:C.red, whiteSpace:'nowrap' }}>{Number(e.tdsAmount)>0 ? '-'+fmt(Number(e.tdsAmount)) : '—'}</td>
                        <td style={{ padding:'11px 14px', fontSize:13, fontWeight:700, color:C.green, whiteSpace:'nowrap' }}>{fmt(Number(e.netPayable))}</td>
                        <td style={{ padding:'11px 14px' }}>
                          <span style={{ display:'inline-flex', padding:'2px 8px', borderRadius:999, fontSize:10, fontWeight:700, background:s.bg, color:s.color, border:'1.5px solid '+s.border }}>{e.status}</span>
                        </td>
                        <td style={{ padding:'11px 14px' }}>
                          <div style={{ display:'flex', gap:5, alignItems:'center' }}>
                            {e.status==='pending' && canEdit && (
                              <button onClick={() => approveM.mutate(e.id)}
                                style={{ padding:'4px 8px', fontSize:10, fontWeight:600, color:C.blue, background:'#eff6ff', border:'1.5px solid #bfdbfe', borderRadius:5, cursor:'pointer' }}>
                                Approve
                              </button>
                            )}
                            {e.status==='approved' && canEdit && (
                              <button onClick={() => { setPayItem(e); setPayForm({ ...BLANK_PAY, paidAmount: String(e.netPayable) }) }}
                                style={{ padding:'4px 8px', fontSize:10, fontWeight:600, color:'#047857', background:'#ecfdf5', border:'1.5px solid #a7f3d0', borderRadius:5, cursor:'pointer' }}>
                                Pay
                              </button>
                            )}
                            {e.status==='paid' && <span style={{ display:'inline-flex', alignItems:'center', gap:3, fontSize:10, color:C.green, fontWeight:600 }}><CheckCircle size={12} weight="fill"/>Paid</span>}
                            {canEdit && (
                              <>
                                <button title="Edit" onClick={() => openEdit(e)}
                                  style={{ padding:'4px 6px', display:'inline-flex', color:C.text2, background:'#f1f5f9', border:'1.5px solid '+C.border, borderRadius:5, cursor:'pointer' }}><PencilSimple size={13}/></button>
                                <button title="Delete" onClick={() => { if (confirm('Delete this expense? Linked TDS and payment entries will also be removed.')) deleteExpM.mutate(e.id) }}
                                  style={{ padding:'4px 6px', display:'inline-flex', color:C.red, background:'#fef2f2', border:'1.5px solid #fecaca', borderRadius:5, cursor:'pointer' }}><Trash size={13}/></button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Vendors */}
      {tab === 'vendors' && (
        <div style={{ background:C.card, borderRadius:16, border:'1.5px solid '+C.border, overflow:'hidden', boxShadow:'0 1px 6px rgba(0,0,0,0.05)' }}>
          {vends.length === 0 ? (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'56px 24px', gap:10 }}>
              <Users size={32} color={C.border} />
              <p style={{ fontSize:14, fontWeight:600, color:C.text3, margin:0 }}>No vendors yet</p>
              <Button variant="primary" size="sm" icon={<Plus size={13}/>} onClick={() => setShowVen(true)}>Add first vendor</Button>
            </div>
          ) : (
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'#f8f9fc', borderBottom:'1.5px solid '+C.border }}>
                  {['Name','Category','GSTIN','PAN','Phone','TDS Rate'].map(h => (
                    <th key={h} style={{ padding:'10px 16px', textAlign:'left', fontSize:10, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.06em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vends.map((v: any, i: number) => (
                  <tr key={v.id} style={{ borderBottom: i < vends.length-1 ? '1px solid #f1f5f9' : 'none' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f8faff')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ padding:'12px 16px' }}>
                      <p style={{ fontSize:13, fontWeight:600, color:C.text1, margin:0 }}>{v.name}</p>
                      {v.email && <p style={{ fontSize:11, color:C.text3, margin:'2px 0 0' }}>{v.email}</p>}
                    </td>
                    <td style={{ padding:'12px 16px', fontSize:12, color:C.text2, textTransform:'capitalize' }}>{v.category?.replace(/_/g,' ')}</td>
                    <td style={{ padding:'12px 16px', fontSize:11, color:C.text2, fontFamily:'monospace' }}>{v.gstin ?? '—'}</td>
                    <td style={{ padding:'12px 16px', fontSize:11, color:C.text2, fontFamily:'monospace' }}>{v.pan ?? '—'}</td>
                    <td style={{ padding:'12px 16px', fontSize:12, color:C.text2 }}>{v.phone ?? '—'}</td>
                    <td style={{ padding:'12px 16px', fontSize:12, color:C.red, fontWeight:v.tdsApplicable?700:400 }}>{v.tdsApplicable ? v.tdsRate+'%' : 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* TDS */}
      {tab === 'tds' && (
        <div style={{ background:C.card, borderRadius:16, border:'1.5px solid '+C.border, overflow:'hidden', boxShadow:'0 1px 6px rgba(0,0,0,0.05)' }}>
          {tdsLoading ? <div style={{ display:'flex', justifyContent:'center', padding:40 }}><Spinner /></div>
          : tdsList.length === 0 ? (
            <div style={{ padding:'48px 24px', textAlign:'center' }}>
              <p style={{ fontSize:14, color:C.text3 }}>No TDS entries — auto-created when expenses with TDS are recorded</p>
            </div>
          ) : (
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'#f8f9fc', borderBottom:'1.5px solid '+C.border }}>
                  {['Date','Payee','PAN','Section','Gross','Rate','TDS Amt','Quarter','FY','Status','Action'].map(h => (
                    <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:10, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.06em', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tdsList.map((t: any, i: number) => (
                  <tr key={t.id} style={{ borderBottom: i < tdsList.length-1 ? '1px solid #f1f5f9' : 'none' }}>
                    <td style={{ padding:'11px 14px', fontSize:12, color:C.text2 }}>{t.date}</td>
                    <td style={{ padding:'11px 14px', fontSize:13, color:C.text1, fontWeight:500 }}>{t.payeeName}</td>
                    <td style={{ padding:'11px 14px', fontSize:11, fontFamily:'monospace', color:C.text2 }}>{t.payeePan ?? '—'}</td>
                    <td style={{ padding:'11px 14px', fontSize:11, fontWeight:700, color:C.blue }}>{t.section}</td>
                    <td style={{ padding:'11px 14px', fontSize:12, color:C.text1, whiteSpace:'nowrap' }}>{fmt(Number(t.grossAmount))}</td>
                    <td style={{ padding:'11px 14px', fontSize:12, color:C.text2 }}>{t.tdsRate}%</td>
                    <td style={{ padding:'11px 14px', fontSize:13, fontWeight:700, color:C.red, whiteSpace:'nowrap' }}>{fmt(Number(t.tdsAmount))}</td>
                    <td style={{ padding:'11px 14px', fontSize:12, color:C.text2 }}>{t.quarter}</td>
                    <td style={{ padding:'11px 14px', fontSize:12, color:C.text2 }}>{t.financialYear}</td>
                    <td style={{ padding:'11px 14px' }}>
                      <span style={{ fontSize:10, padding:'2px 8px', borderRadius:999, fontWeight:700, background:t.status==='deposited'?'#ecfdf5':'#fffbeb', color:t.status==='deposited'?'#047857':'#b45309', border:'1.5px solid '+(t.status==='deposited'?'#a7f3d0':'#fde68a') }}>{t.status}</span>
                    </td>
                    <td style={{ padding:'11px 14px' }}>
                      {t.status === 'deducted' && (
                        <button onClick={() => setDepItem(t)}
                          style={{ padding:'4px 8px', fontSize:10, fontWeight:600, color:'#047857', background:'#ecfdf5', border:'1.5px solid #a7f3d0', borderRadius:5, cursor:'pointer' }}>
                          Deposit
                        </button>
                      )}
                      {t.status === 'deposited' && <span style={{ fontSize:11, color:C.text3 }}>{t.challanNo}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Ledger */}
      {tab === 'ledger' && (
        <div style={{ background:C.card, borderRadius:16, border:'1.5px solid '+C.border, overflow:'hidden', boxShadow:'0 1px 6px rgba(0,0,0,0.05)' }}>
          {canEdit && (
            <div style={{ padding:'12px 20px', borderBottom:'1.5px solid '+C.border, background:'#f8f9fc', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:12, color:C.text3 }}>Payments are auto-logged; use this to record money received.</span>
              <Button variant="success" size="sm" icon={<Plus size={13}/>} onClick={() => setShowRec(true)}>Record Receipt</Button>
            </div>
          )}
          {txnLoading ? <div style={{ display:'flex', justifyContent:'center', padding:40 }}><Spinner /></div>
          : txnList.length === 0 ? (
            <div style={{ padding:'48px 24px', textAlign:'center' }}>
              <p style={{ fontSize:14, color:C.text3 }}>No transactions — auto-created when expenses are paid</p>
            </div>
          ) : (
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'#f8f9fc', borderBottom:'1.5px solid '+C.border }}>
                  {['Date','Type','Description','Vendor','Debit','Credit','Balance','Mode'].map(h => (
                    <th key={h} style={{ padding:'10px 16px', textAlign:'left', fontSize:10, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.06em', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {txnList.map((t: any, i: number) => (
                  <tr key={t.id} style={{ borderBottom: i < txnList.length-1 ? '1px solid #f1f5f9' : 'none' }}>
                    <td style={{ padding:'11px 16px', fontSize:12, color:C.text2, whiteSpace:'nowrap' }}>{t.date}</td>
                    <td style={{ padding:'11px 16px' }}>
                      <span style={{ fontSize:10, padding:'2px 8px', borderRadius:999, fontWeight:700, background:t.type==='receipt'?'#ecfdf5':t.type==='payment'?'#fef2f2':'#f0f9ff', color:t.type==='receipt'?'#047857':t.type==='payment'?'#b91c1c':'#0284c7' }}>{t.type}</span>
                    </td>
                    <td style={{ padding:'11px 16px', fontSize:13, color:C.text1, maxWidth:220, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.description}</td>
                    <td style={{ padding:'11px 16px', fontSize:12, color:C.text2 }}>{venMap[t.vendorId]?.name ?? '—'}</td>
                    <td style={{ padding:'11px 16px', fontSize:13, fontWeight:700, color:C.red, whiteSpace:'nowrap' }}>{Number(t.debit)>0 ? fmt(Number(t.debit)) : '—'}</td>
                    <td style={{ padding:'11px 16px', fontSize:13, fontWeight:700, color:C.green, whiteSpace:'nowrap' }}>{Number(t.credit)>0 ? fmt(Number(t.credit)) : '—'}</td>
                    <td style={{ padding:'11px 16px', fontSize:13, fontWeight:700, color:Number(t.balance)>=0?C.text1:C.red, whiteSpace:'nowrap' }}>{fmt(Number(t.balance))}</td>
                    <td style={{ padding:'11px 16px', fontSize:11, color:C.text3, textTransform:'uppercase' }}>{t.paymentMode ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Record Expense Modal */}
      <Modal open={showExp} onClose={() => { setShowExp(false); setEditId(null) }} title={editId ? 'Edit Expense' : 'Record Expense'} width={600}
        footer={<>
          <Button variant="ghost" onClick={() => { setShowExp(false); setEditId(null) }}>Cancel</Button>
          <Button variant="primary" loading={saveExpM.isPending} onClick={() => saveExpM.mutate()} disabled={!expForm.description || !expForm.grossAmount}>{editId ? 'Update Expense' : 'Save Expense'}</Button>
        </>}>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Input label="Date" type="date" value={expForm.date} onChange={e => setExpForm((f: any) => ({ ...f, date: e.target.value }))} />
            <Select label="Category" value={expForm.category} onChange={e => setExpForm((f: any) => ({ ...f, category: e.target.value }))} options={EXP_CATS} />
          </div>
          <Input label="Description *" value={expForm.description} onChange={e => setExpForm((f: any) => ({ ...f, description: e.target.value }))} placeholder="Cement supply for IPS-3..." />
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Select label="Vendor" value={expForm.vendorId} onChange={e => setExpForm((f: any) => ({ ...f, vendorId: e.target.value }))} options={venOptions} />
            <Input label="Bill No." value={expForm.billNo} onChange={e => setExpForm((f: any) => ({ ...f, billNo: e.target.value }))} placeholder="INV/2025-26/001" />
          </div>
          <div style={{ display:'grid', gridTemplateColumns: expForm.paymentType==='other' ? '1fr 1fr' : '1fr', gap:12 }}>
            <Select label="Payment / Bill Type" value={expForm.paymentType} onChange={e => setExpForm((f: any) => ({ ...f, paymentType: e.target.value }))} options={PAY_TYPES} />
            {expForm.paymentType==='other' && (
              <Input label="Specify type" value={expForm.paymentTypeOther} onChange={e => setExpForm((f: any) => ({ ...f, paymentTypeOther: e.target.value }))} placeholder="e.g. Interim advance" />
            )}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
            <Input label="Gross Amount (₹) *" type="number" value={expForm.grossAmount} onChange={e => setExpForm((f: any) => ({ ...f, grossAmount: e.target.value }))} placeholder="500000" />
            <Input label="GST %" type="number" value={expForm.gstPct} onChange={e => setExpForm((f: any) => ({ ...f, gstPct: e.target.value }))} />
            <Input label="TDS %" type="number" value={expForm.tdsPct} onChange={e => setExpForm((f: any) => ({ ...f, tdsPct: e.target.value }))} />
          </div>
          {gross > 0 && (
            <div style={{ padding:'12px 16px', background:'#f8f9fc', border:'1.5px solid '+C.border, borderRadius:8 }}>
              {[['Gross', fmt(gross), C.text1], ['GST ('+expForm.gstPct+'%)', '+'+fmt(gstAmt), C.amber], ['TDS ('+expForm.tdsPct+'%)', '-'+fmt(tdsAmt), C.red], ['Net Payable', fmt(netPay), C.green]].map(([l, v, c]: any) => (
                <div key={l} style={{ display:'flex', justifyContent:'space-between', marginBottom:5, fontSize:12 }}>
                  <span style={{ color:C.text3 }}>{l}</span>
                  <span style={{ color:c, fontWeight: l === 'Net Payable' ? 700 : 400 }}>{v}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* Add Vendor Modal */}
      <Modal open={showVen} onClose={() => setShowVen(false)} title="Add Vendor / Contractor" width={560}
        footer={<>
          <Button variant="ghost" onClick={() => setShowVen(false)}>Cancel</Button>
          <Button variant="primary" loading={createVenM.isPending} onClick={() => createVenM.mutate()} disabled={!venForm.name}>Save Vendor</Button>
        </>}>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Input label="Vendor Name *" value={venForm.name} onChange={e => setVenForm((f: any) => ({ ...f, name: e.target.value }))} placeholder="M/S Sharma Traders" />
            <Select label="Category" value={venForm.category} onChange={e => setVenForm((f: any) => ({ ...f, category: e.target.value }))} options={VEN_CATS} />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Input label="GSTIN" value={venForm.gstin} onChange={e => setVenForm((f: any) => ({ ...f, gstin: e.target.value }))} placeholder="01AAAAA0000A1Z5" />
            <Input label="PAN" value={venForm.pan} onChange={e => setVenForm((f: any) => ({ ...f, pan: e.target.value }))} placeholder="ABCDE1234F" />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Input label="Phone" value={venForm.phone} onChange={e => setVenForm((f: any) => ({ ...f, phone: e.target.value }))} />
            <Input label="TDS Rate %" type="number" value={venForm.tdsRate} onChange={e => setVenForm((f: any) => ({ ...f, tdsRate: e.target.value }))} />
          </div>
          <Input label="Address" value={venForm.address} onChange={e => setVenForm((f: any) => ({ ...f, address: e.target.value }))} placeholder="Srinagar, J&K" />
        </div>
      </Modal>

      {/* Pay Expense Modal */}
      <Modal open={!!payItem} onClose={() => setPayItem(null)} title="Record Payment" width={440}
        footer={<>
          <Button variant="ghost" onClick={() => setPayItem(null)}>Cancel</Button>
          <Button variant="success" loading={payM.isPending} onClick={() => payM.mutate()} disabled={!payForm.paidAmount} icon={<CheckCircle size={14}/>}>Confirm Payment</Button>
        </>}>
        {payItem && (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ padding:'10px 14px', background:'#f8f9fc', border:'1.5px solid '+C.border, borderRadius:8, fontSize:12 }}>
              <p style={{ fontWeight:600, color:C.text1, margin:'0 0 4px' }}>{payItem.description}</p>
              <p style={{ color:C.text3, margin:0 }}>Net Payable: <strong style={{ color:C.green }}>{fmt(Number(payItem.netPayable))}</strong></p>
            </div>
            <Input label="Amount Paid (₹)" type="number" value={payForm.paidAmount} onChange={e => setPayForm((f: any) => ({ ...f, paidAmount: e.target.value }))} />
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <Input label="Payment Date" type="date" value={payForm.paymentDate} onChange={e => setPayForm((f: any) => ({ ...f, paymentDate: e.target.value }))} />
              <Select label="Payment Mode" value={payForm.paymentMode} onChange={e => setPayForm((f: any) => ({ ...f, paymentMode: e.target.value }))} options={PAY_MODES} />
            </div>
            <Input label="UTR / Cheque No." value={payForm.paymentRef} onChange={e => setPayForm((f: any) => ({ ...f, paymentRef: e.target.value }))} placeholder="RTGS reference number" />
          </div>
        )}
      </Modal>

      {/* Deposit TDS Modal */}
      <Modal open={!!depItem} onClose={() => setDepItem(null)} title="Record TDS Deposit" width={400}
        footer={<>
          <Button variant="ghost" onClick={() => setDepItem(null)}>Cancel</Button>
          <Button variant="primary" loading={depositM.isPending} onClick={() => depositM.mutate()} disabled={!depForm.challanNo}>Confirm Deposit</Button>
        </>}>
        {depItem && (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ padding:'10px 14px', background:'#fef2f2', border:'1.5px solid #fecaca', borderRadius:8, fontSize:12 }}>
              <p style={{ color:C.text2, margin:'0 0 3px' }}>TDS Amount: <strong style={{ color:C.red }}>{fmt(Number(depItem.tdsAmount))}</strong></p>
              <p style={{ color:C.text3, margin:0 }}>Section {depItem.section} · {depItem.quarter} {depItem.financialYear}</p>
            </div>
            <Input label="Deposit Date" type="date" value={depForm.depositDate} onChange={e => setDepForm(f => ({ ...f, depositDate: e.target.value }))} />
            <Input label="Challan No." value={depForm.challanNo} onChange={e => setDepForm(f => ({ ...f, challanNo: e.target.value }))} placeholder="Challan serial number" />
          </div>
        )}
      </Modal>

      {/* Record Receipt Modal (money in) */}
      <Modal open={showRec} onClose={() => setShowRec(false)} title="Record Receipt — Money In" width={460}
        footer={<>
          <Button variant="ghost" onClick={() => setShowRec(false)}>Cancel</Button>
          <Button variant="success" loading={receiptM.isPending} onClick={() => receiptM.mutate()} disabled={!recForm.amount} icon={<CheckCircle size={14}/>}>Record Receipt</Button>
        </>}>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Input label="Date" type="date" value={recForm.date} onChange={e => setRecForm(f => ({ ...f, date: e.target.value }))} />
            <Select label="Receipt Type" value={recForm.receiptType} onChange={e => setRecForm(f => ({ ...f, receiptType: e.target.value }))} options={RECEIPT_TYPES} />
          </div>
          <Input label="Amount Received (₹)" type="number" value={recForm.amount} onChange={e => setRecForm(f => ({ ...f, amount: e.target.value }))} placeholder="e.g. 5000000" />
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Select label="Mode" value={recForm.paymentMode} onChange={e => setRecForm(f => ({ ...f, paymentMode: e.target.value }))} options={PAY_MODES} />
            <Input label="UTR / Reference" value={recForm.paymentRef} onChange={e => setRecForm(f => ({ ...f, paymentRef: e.target.value }))} />
          </div>
          <Input label="Note (optional)" value={recForm.description} onChange={e => setRecForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. against RA-03" />
        </div>
      </Modal>

    </div>
  )
}
