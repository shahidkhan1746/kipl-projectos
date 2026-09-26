import { toast } from '@/lib/notify'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Users, Receipt, CheckCircle, PencilSimple, Trash, Paperclip, Wallet } from '@phosphor-icons/react'
import { accountingApi } from '@/api/accounting.api'
import { projectsApi } from '@/api/projects.api'
import { useAuthStore } from '@/store/auth.store'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import { formatDate } from '@/lib/date'

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

// Turnkey STP & Sewer Network WBS Cost Codes
const STP_WBS_CODES = [
  { value: '', label: 'General / Unallocated' },
  { value: 'A1-RCC-NP3', label: 'Part A1: Sewer Pipe Laying (RCC NP3 200–1000mm)' },
  { value: 'A2-MANHOLES', label: 'Part A2: RCC / Brick Manholes & Inspection Chambers' },
  { value: 'A3-HOUSE-CONN', label: 'Part A3: House Property Sewer Connections' },
  { value: 'A4-ROAD-REINSTATE', label: 'Part A4: Road Cutting & Surface Reinstatement' },
  { value: 'B1-SBR-CIVIL', label: 'Part B1: SBR Civil Basins & Intermediate Pumping Stations' },
  { value: 'B2-EM-DECANTERS', label: 'Part B2: SBR Electro-Mechanical Decanters & Diffusers' },
  { value: 'B2-EM-PUMPS', label: 'Part B2: Raw Sewage Submersible Pumps & Centrifuges' },
  { value: 'B2-EM-SCADA', label: 'Part B2: SCADA, PLC Instrumentation & Automation' },
  { value: 'PM-DEWATERING', label: 'Site P&M: High Water-Table Trench Dewatering' },
  { value: 'PM-SHORING', label: 'Site P&M: Deep Trench Sheet Piling & Shoring' },
  { value: 'SITE-LIAISON-OPS', label: 'Site Operations: Municipal/Traffic NOC & Liaison' },
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
  {value:'imprest_settlement',label:'Site Imprest Settlement'},
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

const GST_TYPES = [
  {value:'intra',label:'Intra-state (CGST + SGST)'},
  {value:'inter',label:'Inter-state (IGST)'},
]

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

type Tab = 'expenses' | 'vendors' | 'tds' | 'ledger' | 'imprest'

const BLANK_EXP = {
  date: new Date().toISOString().split('T')[0],
  documentDate: new Date().toISOString().split('T')[0],
  receivedDate: new Date().toISOString().split('T')[0],
  postingDate: new Date().toISOString().split('T')[0],
  dueDate: '',
  description:'', category:'material', vendorId:'',
  paymentType:'running_bill', paymentTypeOther:'',
  wbsCode:'', boqItemId:'', contraDeduction:'', contraRemarks:'',
  billNo:'', grossAmount:'', gstPct:'18', gstType:'intra', tdsPct:'2',
  tdsSection:'194C', remarks:'', attachmentUrl:'', attachmentName:'',
}

const BLANK_VEN = {
  name:'', category:'subcontractor', gstin:'', pan:'',
  phone:'', email:'', address:'', tdsRate:'2', creditDays:'30',
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
  const [editVenId, setEditVenId] = useState<string | null>(null)
  const [selectedVendorForLedger, setSelectedVendorForLedger] = useState<any>(null)
  const [showImprestDisburse, setShowImprestDisburse] = useState(false)
  const [imprestForm, setImprestForm] = useState({ custodianName:'', amount:'', date: new Date().toISOString().split('T')[0], paymentMode:'rtgs', bankRef:'', remarks:'' })
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

  const { data: projectList = [] } = useQuery({
    queryKey: ['accounting-projects'],
    queryFn: () => projectsApi.list().then(r => Array.isArray(r.data) ? r.data : (r.data?.data ?? [])),
  })
  const currentProject = (projectList as any[]).find((p: any) => p.id === activeProjectId)

  const { data: dash } = useQuery({
    queryKey: ['acc-dash', activeProjectId],
    queryFn:  () => accountingApi.dashboard(activeProjectId!).then(r => r.data),
    enabled:  !!activeProjectId,
  })

  const { data: expenses, isLoading: expLoading, isError: expError, refetch: refetchExp } = useQuery({
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

  const { data: vLedger, isLoading: vLedgerLoading } = useQuery({
    queryKey: ['vendor-ledger', selectedVendorForLedger?.id, activeProjectId],
    queryFn:  () => accountingApi.vendorLedger(selectedVendorForLedger.id, activeProjectId || undefined).then(r => r.data),
    enabled:  !!selectedVendorForLedger?.id,
  })

  const { data: imprestData, isLoading: imprestLoading } = useQuery({
    queryKey: ['imprest-summary', activeProjectId],
    queryFn:  () => accountingApi.imprestSummary(activeProjectId!).then(r => r.data),
    enabled:  !!activeProjectId && tab === 'imprest',
  })

  const invalidateExp = () => {
    qc.invalidateQueries({ queryKey: ['expenses'] })
    qc.invalidateQueries({ queryKey: ['acc-dash'] })
    qc.invalidateQueries({ queryKey: ['tds'] })
    qc.invalidateQueries({ queryKey: ['txns'] })
    qc.invalidateQueries({ queryKey: ['imprest-summary'] })
  }

  const saveExpM = useMutation({
    mutationFn: () => {
      const payload: any = {
        ...expForm, projectId: activeProjectId,
        paymentType: expForm.paymentType === 'other' ? (expForm.paymentTypeOther || 'Other') : expForm.paymentType,
        grossAmount: parseFloat(expForm.grossAmount),
        gstPct: parseFloat(expForm.gstPct)||0,
        tdsPct: parseFloat(expForm.tdsPct)||0,
        contraDeduction: parseFloat(expForm.contraDeduction)||0,
        contraRemarks: expForm.contraRemarks,
        wbsCode: expForm.wbsCode,
        boqItemId: expForm.boqItemId,
        documentDate: expForm.documentDate,
        receivedDate: expForm.receivedDate,
        postingDate: expForm.postingDate,
        dueDate: expForm.dueDate,
      }
      delete payload.paymentTypeOther
      return editId ? accountingApi.updateExpense(editId, payload) : accountingApi.createExpense(payload)
    },
    onSuccess: () => { invalidateExp(); setShowExp(false); setExpForm(BLANK_EXP); setEditId(null) },
  })

  const disburseImprestM = useMutation({
    mutationFn: () => accountingApi.disburseImprest({ ...imprestForm, projectId: activeProjectId }),
    onSuccess: () => {
      invalidateExp()
      setShowImprestDisburse(false)
      setImprestForm({ custodianName:'', amount:'', date: new Date().toISOString().split('T')[0], paymentMode:'rtgs', bankRef:'', remarks:'' })
      toast.success('Site imprest float disbursed successfully')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to disburse imprest float')
    }
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
      date: e.date,
      documentDate: e.documentDate || e.billDate || e.date,
      receivedDate: e.receivedDate || e.date,
      postingDate: e.postingDate || e.date,
      dueDate: e.dueDate || '',
      description: e.description, category: e.category, vendorId: e.vendorId || '',
      paymentType: preset ? e.paymentType : 'other',
      paymentTypeOther: preset ? '' : (e.paymentType || ''),
      wbsCode: e.wbsCode || '', boqItemId: e.boqItemId || '',
      contraDeduction: e.contraDeduction ? String(e.contraDeduction) : '',
      contraRemarks: e.contraRemarks || '',
      billNo: e.billNo || '', grossAmount: String(e.grossAmount), gstPct: String(e.gstPct),
      gstType: e.gstType || 'intra', tdsPct: String(e.tdsPct), tdsSection: e.tdsSection || '194C',
      remarks: e.remarks || '', attachmentUrl: e.attachmentUrl || '', attachmentName: e.attachmentName || '',
    })
    setShowExp(true)
  }

  const saveVenM = useMutation({
    mutationFn: () => {
      const payload = {
        ...venForm,
        projectId: activeProjectId,
        tdsRate: parseFloat(venForm.tdsRate)||2,
        creditDays: parseInt(venForm.creditDays)||30
      }
      return editVenId ? accountingApi.updateVendor(editVenId, payload) : accountingApi.createVendor(payload)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vendors'] }); setShowVen(false); setVenForm(BLANK_VEN); setEditVenId(null) },
  })
  const deleteVenM = useMutation({
    mutationFn: (id: string) => accountingApi.deleteVendor(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vendors'] }),
  })
  function openVendorCreate() { setEditVenId(null); setVenForm(BLANK_VEN); setShowVen(true) }
  function openVendorEdit(v: any) {
    setEditVenId(v.id)
    setVenForm({
      name: v.name||'', category: v.category||'subcontractor', gstin: v.gstin||'', pan: v.pan||'',
      phone: v.phone||'', email: v.email||'', address: v.address||'', tdsRate: String(v.tdsRate??2),
      creditDays: String(v.creditDays??30),
      bankAccount: v.bankAccount || { accountNo:'', ifsc:'', bankName:'J&K Bank', branch:'' }
    })
    setShowVen(true)
  }
  const itcM = useMutation({
    mutationFn: ({ id, claimed }: { id: string; claimed: boolean }) => accountingApi.setItc(id, claimed),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses'] }); qc.invalidateQueries({ queryKey: ['acc-dash'] }) },
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
  const contra = parseFloat(expForm.contraDeduction)||0
  const gstAmt = gross * (parseFloat(expForm.gstPct)||0) / 100
  // Statutory CBDT Circular 23/2017: TDS is calculated on basic taxable amount excluding GST
  const tdsAmt = gross * (parseFloat(expForm.tdsPct)||0) / 100
  const netPay = Math.max(0, gross + gstAmt - tdsAmt - contra)
  const isInter = expForm.gstType === 'inter'
  const halfGst = (parseFloat(expForm.gstPct)||0) / 2
  const gstRows: any[] = isInter
    ? [['IGST ('+expForm.gstPct+'%)', '+'+fmt(gstAmt), C.amber]]
    : [['CGST ('+halfGst+'%)', '+'+fmt(gstAmt/2), C.amber], ['SGST ('+halfGst+'%)', '+'+fmt(gstAmt/2), C.amber]]

  async function uploadExpenseFile(file: File) {
    try { const r = await accountingApi.uploadFile(file); setExpForm((f: any) => ({ ...f, attachmentUrl: r.data.url, attachmentName: file.name })) }
    catch (err: any) { toast.error(err?.response?.data?.message ?? 'Upload failed — configure Storage (Cloudinary) first.') }
  }

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
    { label:'Input Tax Credit',value: fmtL(dash?.itcUnclaimed ?? 0),    color: C.blue, sub:'unclaimed' },
  ]

  return (
    <div className="fade-in" style={{ display:'flex', flexDirection:'column', gap:24 }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4, flexWrap:'wrap' }}>
            <h1 style={{ fontSize:24, fontWeight:800, color:C.text1, margin:0, letterSpacing:'-0.02em' }}>Accounting</h1>
            {currentProject ? (
              <span style={{ fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20, background:'#eff6ff', color:C.blue, border:'1.5px solid #bfdbfe', letterSpacing:'0.02em' }}>
                📁 {currentProject.name} {currentProject.code ? `(${currentProject.code})` : ''}
              </span>
            ) : (
              <span style={{ fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20, background:'#fffbeb', color:C.amber, border:'1.5px solid #fde68a' }}>
                ⚠️ No Active Project Selected
              </span>
            )}
            <span style={{ fontSize:10.5, fontWeight:600, padding:'2px 8px', borderRadius:999, background:'#ecfdf5', color:'#047857', border:'1px solid #a7f3d0' }}>
              ✓ Isolated Project Ledger
            </span>
          </div>
          <p style={{ fontSize:13, color:C.text3, margin:0 }}>
            Expenses · Vendors · TDS (CBDT 23/2017) · Transactions · Site Imprest · <span style={{ color:C.text2 }}>All figures scoped strictly to this project</span>
          </p>
        </div>
        {canEdit && activeProjectId && (
          <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
            <Button variant="secondary" size="md" icon={<Users size={15}/>} onClick={openVendorCreate}>Add Vendor</Button>
            <Button variant="primary"   size="md" icon={<Plus size={15}/>}  onClick={openCreate}>Record Expense</Button>
          </div>
        )}
      </div>

      {!activeProjectId && (
        <div style={{ padding:'20px 24px', background:'#fffbeb', border:'1.5px solid #fde68a', borderRadius:12 }}>
          <p style={{ fontSize:14, fontWeight:700, color:C.amber, margin:'0 0 4px' }}>Please select an active project</p>
          <p style={{ fontSize:13, color:C.text2, margin:0 }}>Each project in ProjectOS maintains completely separate accounting, vendor balances, TDS ledgers, and site cash floats. Switch or select a project in the top navigation bar to load its isolated accounts.</p>
        </div>
      )}

      {/* KPI cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(155px,1fr))', gap:14 }}>
        {kpis.map(k => (
          <div key={k.label} style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:12, padding:'16px 18px', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize:10, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>{k.label}</div>
            <div style={{ fontSize:20, fontWeight:800, color:k.color, fontVariantNumeric:'tabular-nums' }}>{k.value}</div>
            {(k as any).sub && <div style={{ fontSize:10, color:C.text3, marginTop:3 }}>{(k as any).sub}</div>}
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', borderBottom:'1.5px solid '+C.border, overflowX:'auto', WebkitOverflowScrolling:'touch' }}>
        {([
          ['expenses', 'Expenses ('+exps.length+')'],
          ['vendors',  'Vendors ('+vends.length+')'],
          ['tds',      'TDS Ledger'],
          ['ledger',   'Transactions'],
          ['imprest',  'Site Imprest ('+fmt(imprestData?.floatInHand ?? 0)+')'],
        ] as const).map(([t, l]) => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding:'10px 20px', fontSize:13, fontWeight:600, border:'none', background:'none', cursor:'pointer',
            borderBottom: tab===t ? '2px solid '+C.blue : '2px solid transparent',
            color: tab===t ? C.blue : C.text3, marginBottom:-1, whiteSpace:'nowrap',
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
          {expError ? <div style={{ padding:16, color:'#dc2626', fontSize:13 }}>Could not load expenses. <button onClick={() => refetchExp()} style={{ color:'#2563eb', background:'none', border:'none', cursor:'pointer', fontWeight:600 }}>Retry</button></div>
          : expLoading ? <div style={{ display:'flex', justifyContent:'center', padding:40 }}><Spinner /></div>
          : exps.length === 0 ? (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'56px 24px', gap:10 }}>
              <Receipt size={32} color={C.border} />
              <p style={{ fontSize:14, fontWeight:600, color:C.text3, margin:0 }}>No expenses yet</p>
              <Button variant="primary" size="sm" icon={<Plus size={13}/>} onClick={openCreate}>Record first expense</Button>
            </div>
          ) : (
            <div className="table-responsive">
              <table style={{ width:'100%', borderCollapse:'collapse', minWidth:950 }}>
                <thead>
                  <tr style={{ background:'#f8f9fc', borderBottom:'1.5px solid '+C.border }}>
                    {['Date & Due','Description & WBS','Category','Vendor','Gross','GST','TDS','Contra','Net Payable','Status','Actions'].map(h => (
                      <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:10, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.06em', whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {exps.map((e: any, i: number) => {
                    const s = SS[e.status] ?? SS.pending
                    const isOverdue = e.dueDate && new Date(e.dueDate) < new Date() && e.status !== 'paid'
                    return (
                      <tr key={e.id} style={{ borderBottom: i < exps.length-1 ? '1px solid #f1f5f9' : 'none' }}
                        onMouseEnter={ev => (ev.currentTarget.style.background = '#f8faff')}
                        onMouseLeave={ev => (ev.currentTarget.style.background = 'transparent')}>
                        <td style={{ padding:'11px 14px', fontSize:12, color:C.text2, whiteSpace:'nowrap' }}>
                          <div style={{ fontWeight:500 }}>{formatDate(e.documentDate || e.date)}</div>
                          {e.dueDate && (
                            <div style={{ fontSize:9.5, marginTop:2, color: isOverdue ? C.red : C.text3, fontWeight: isOverdue ? 700 : 400 }}>
                              Due: {formatDate(e.dueDate)} {isOverdue && '⚠️ Overdue'}
                            </div>
                          )}
                        </td>
                        <td style={{ padding:'11px 14px', fontSize:13, color:C.text1, maxWidth:220 }}>
                          <span style={{ display:'block', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{e.description}</span>
                          <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginTop:3 }}>
                            {e.wbsCode && (
                              <span style={{ fontSize:9, fontWeight:700, color:'#047857', background:'#ecfdf5', padding:'1px 5px', borderRadius:4, border:'1px solid #a7f3d0' }}>
                                {e.wbsCode}
                              </span>
                            )}
                            {e.paymentType && e.paymentType!=='running_bill' && (
                              <span style={{ fontSize:9, fontWeight:700, color:C.blue, background:'#eff6ff', padding:'1px 5px', borderRadius:20, textTransform:'uppercase', letterSpacing:'0.04em' }}>
                                {PAY_TYPE_LABEL[e.paymentType] ?? e.paymentType}
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding:'11px 14px', fontSize:11, color:C.text2, textTransform:'capitalize' }}>{e.category?.replace(/_/g,' ')}</td>
                        <td style={{ padding:'11px 14px', fontSize:12, color:C.text2 }}>{venMap[e.vendorId]?.name ?? '—'}</td>
                        <td style={{ padding:'11px 14px', fontSize:12, fontWeight:600, color:C.text1, whiteSpace:'nowrap' }}>{fmt(Number(e.grossAmount))}</td>
                        <td style={{ padding:'11px 14px', fontSize:12, color:C.amber, whiteSpace:'nowrap' }}>
                          {Number(e.gstAmount)>0 ? (
                            <>
                              {fmt(Number(e.gstAmount))}
                              <span style={{ display:'block', fontSize:9, color:C.text3 }}>{e.gstType==='inter'?'IGST':'CGST+SGST'}</span>
                              {canEdit && (
                                <button title="Input tax credit" onClick={() => itcM.mutate({ id:e.id, claimed:!e.itcClaimed })}
                                   style={{ marginTop:3, fontSize:9, fontWeight:700, padding:'1px 6px', borderRadius:10, cursor:'pointer',
                                    border:'1px solid '+(e.itcClaimed?'#a7f3d0':C.border), background:e.itcClaimed?'#ecfdf5':'#fff', color:e.itcClaimed?'#047857':C.text3 }}>
                                  ITC {e.itcClaimed?'✓':'○'}
                                </button>
                              )}
                            </>
                          ) : '—'}
                        </td>
                        <td style={{ padding:'11px 14px', fontSize:12, color:C.red, whiteSpace:'nowrap' }}>{Number(e.tdsAmount)>0 ? '-'+fmt(Number(e.tdsAmount)) : '—'}</td>
                        <td style={{ padding:'11px 14px', fontSize:12, color:C.amber, whiteSpace:'nowrap' }}>
                          {Number(e.contraDeduction)>0 ? (
                            <>
                              <span style={{ fontWeight:600 }}>-{fmt(Number(e.contraDeduction))}</span>
                              {e.contraRemarks && <span style={{ display:'block', fontSize:9, color:C.text3, maxWidth:110, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={e.contraRemarks}>{e.contraRemarks}</span>}
                            </>
                          ) : '—'}
                        </td>
                        <td style={{ padding:'11px 14px', fontSize:13, fontWeight:700, color:C.green, whiteSpace:'nowrap' }}>{fmt(Number(e.netPayable))}</td>
                        <td style={{ padding:'11px 14px' }}>
                          <span style={{ display:'inline-flex', padding:'2px 8px', borderRadius:999, fontSize:10, fontWeight:700, background:s.bg, color:s.color, border:'1.5px solid '+s.border }}>{e.status}</span>
                        </td>
                        <td style={{ padding:'11px 14px' }}>
                          <div style={{ display:'flex', gap:5, alignItems:'center' }}>
                            {e.attachmentUrl && <a href={e.attachmentUrl} target="_blank" rel="noreferrer" title="Bill copy" style={{ display:'inline-flex', color:C.text3, padding:'4px 5px' }}><Paperclip size={13}/></a>}
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
              <Button variant="primary" size="sm" icon={<Plus size={13}/>} onClick={openVendorCreate}>Add first vendor</Button>
            </div>
          ) : (
            <div className="table-responsive">
              <table style={{ width:'100%', borderCollapse:'collapse', minWidth:750 }}>
                <thead>
                  <tr style={{ background:'#f8f9fc', borderBottom:'1.5px solid '+C.border }}>
                    {['Name','Category','Credit Terms','GSTIN','PAN','Phone','TDS Rate', ...(canEdit?['Actions']:[])].map(h => (
                      <th key={h} style={{ padding:'10px 16px', textAlign:'left', fontSize:10, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.06em', whiteSpace:'nowrap' }}>{h}</th>
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
                      <td style={{ padding:'12px 16px', fontSize:12, color:C.blue, fontWeight:600 }}>{v.creditDays ? v.creditDays + ' days' : '30 days'}</td>
                      <td style={{ padding:'12px 16px', fontSize:11, color:C.text2, fontFamily:'monospace' }}>{v.gstin ?? '—'}</td>
                      <td style={{ padding:'12px 16px', fontSize:11, color:C.text2, fontFamily:'monospace' }}>{v.pan ?? '—'}</td>
                      <td style={{ padding:'12px 16px', fontSize:12, color:C.text2 }}>{v.phone ?? '—'}</td>
                      <td style={{ padding:'12px 16px', fontSize:12, color:C.red, fontWeight:v.tdsApplicable?700:400 }}>{v.tdsApplicable ? v.tdsRate+'%' : 'N/A'}</td>
                      {canEdit && (
                        <td style={{ padding:'12px 16px' }}>
                          <div style={{ display:'flex', gap:5, alignItems:'center' }}>
                            <button title="View Statement" onClick={() => setSelectedVendorForLedger(v)}
                              style={{ padding:'4px 8px', fontSize:11, fontWeight:600, color:C.blue, background:'#eff6ff', border:'1.5px solid #bfdbfe', borderRadius:5, cursor:'pointer' }}>
                              Statement
                            </button>
                            <button title="Edit" onClick={() => openVendorEdit(v)}
                              style={{ padding:'4px 6px', display:'inline-flex', color:C.text2, background:'#f1f5f9', border:'1.5px solid '+C.border, borderRadius:5, cursor:'pointer' }}><PencilSimple size={13}/></button>
                            <button title="Deactivate" onClick={() => { if (confirm('Remove '+v.name+'? Past records keep the name; the vendor is hidden from new entries.')) deleteVenM.mutate(v.id) }}
                              style={{ padding:'4px 6px', display:'inline-flex', color:C.red, background:'#fef2f2', border:'1.5px solid #fecaca', borderRadius:5, cursor:'pointer' }}><Trash size={13}/></button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
            <div className="table-responsive">
              <table style={{ width:'100%', borderCollapse:'collapse', minWidth:800 }}>
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
                      <td style={{ padding:'11px 14px', fontSize:12, color:C.text2, whiteSpace:'nowrap' }}>{formatDate(t.date)}</td>
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
            </div>
          )}
        </div>
      )}

      {/* Ledger */}
      {tab === 'ledger' && (
        <div style={{ background:C.card, borderRadius:16, border:'1.5px solid '+C.border, overflow:'hidden', boxShadow:'0 1px 6px rgba(0,0,0,0.05)' }}>
          {canEdit && (
            <div style={{ padding:'12px 20px', borderBottom:'1.5px solid '+C.border, background:'#f8f9fc', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8 }}>
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
            <div className="table-responsive">
              <table style={{ width:'100%', borderCollapse:'collapse', minWidth:800 }}>
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
                      <td style={{ padding:'11px 16px', fontSize:12, color:C.text2, whiteSpace:'nowrap' }}>{formatDate(t.date)}</td>
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
            </div>
          )}
        </div>
      )}

      {/* Site Imprest (Cash Float) Tab */}
      {tab === 'imprest' && (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {/* Top Imprest KPI cards */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:14 }}>
            <div style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:12, padding:'16px 18px', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize:10, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:6 }}>Site Cash Float in Hand</div>
              <div style={{ fontSize:22, fontWeight:800, color: (imprestData?.floatInHand ?? 0) >= 0 ? C.green : C.red }}>
                {fmt(imprestData?.floatInHand ?? 0)}
              </div>
              <div style={{ fontSize:11, color:C.text3, marginTop:3 }}>Revolving operational cash held at site office</div>
            </div>
            <div style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:12, padding:'16px 18px', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize:10, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:6 }}>Total Imprest Drawn from Bank</div>
              <div style={{ fontSize:22, fontWeight:800, color:C.text1 }}>
                {fmt(imprestData?.totalDrawn ?? 0)}
              </div>
              <div style={{ fontSize:11, color:C.text3, marginTop:3 }}>Disbursed by HO Accounts to Site Custodians</div>
            </div>
            <div style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:12, padding:'16px 18px', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize:10, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:6 }}>Total Vouchers Settled</div>
              <div style={{ fontSize:22, fontWeight:800, color:C.blue }}>
                {fmt(imprestData?.totalSettled ?? 0)}
              </div>
              <div style={{ fontSize:11, color:C.text3, marginTop:3 }}>Approved operational vouchers (Site Office, Fuel, Cartage)</div>
            </div>
          </div>

          <div style={{ background:C.card, borderRadius:16, border:'1.5px solid '+C.border, overflow:'hidden', boxShadow:'0 1px 6px rgba(0,0,0,0.05)' }}>
            <div style={{ padding:'14px 20px', borderBottom:'1.5px solid '+C.border, background:'#f8f9fc', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10 }}>
              <div>
                <h3 style={{ fontSize:14, fontWeight:700, color:C.text1, margin:0 }}>Site Imprest & Petty Cash Ledger · {currentProject?.name || 'Active Project'}</h3>
                <p style={{ fontSize:12, color:C.text3, margin:'2px 0 0' }}>Legitimate revolving operational cash for site inspections, emergency supplies, and local cartage without date friction.</p>
              </div>
              {canEdit && (
                <Button variant="primary" size="sm" icon={<Wallet size={14}/>} onClick={() => setShowImprestDisburse(true)}>
                  Disburse Imprest Float
                </Button>
              )}
            </div>

            <div style={{ padding:20 }}>
              <h4 style={{ fontSize:12, fontWeight:700, color:C.text2, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:10 }}>Recent Imprest Float Disbursements (Cash-Out from Bank)</h4>
              {imprestLoading ? (
                <div style={{ display:'flex', justifyContent:'center', padding:20 }}><Spinner /></div>
              ) : (imprestData?.recentDisbursements?.length ?? 0) === 0 ? (
                <p style={{ fontSize:13, color:C.text3, marginBottom:20 }}>No imprest float disbursements yet for this project.</p>
              ) : (
                <table style={{ width:'100%', borderCollapse:'collapse', marginBottom:24 }}>
                  <thead>
                    <tr style={{ background:'#f8f9fc', borderBottom:'1.5px solid '+C.border }}>
                      {['Date', 'Description / Custodian', 'Mode', 'Bank Ref', 'Amount'].map(h => (
                        <th key={h} style={{ padding:'8px 12px', textAlign:'left', fontSize:10, fontWeight:700, color:C.text3, textTransform:'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {imprestData?.recentDisbursements?.map((d: any) => (
                      <tr key={d.id} style={{ borderBottom:'1px solid #f1f5f9' }}>
                        <td style={{ padding:'9px 12px', fontSize:12, color:C.text2 }}>{formatDate(d.date)}</td>
                        <td style={{ padding:'9px 12px', fontSize:12, color:C.text1, fontWeight:500 }}>{d.description}</td>
                        <td style={{ padding:'9px 12px', fontSize:11, color:C.text3, textTransform:'uppercase' }}>{d.paymentMode}</td>
                        <td style={{ padding:'9px 12px', fontSize:11, color:C.text2 }}>{d.bankRef || '—'}</td>
                        <td style={{ padding:'9px 12px', fontSize:12, color:C.red, fontWeight:700 }}>{fmt(Number(d.debit))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <h4 style={{ fontSize:12, fontWeight:700, color:C.text2, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:10 }}>Recent Imprest Settled Expenses</h4>
              {(imprestData?.recentSettlements?.length ?? 0) === 0 ? (
                <p style={{ fontSize:13, color:C.text3 }}>No vouchers settled under imprest yet. When recording site expenses, select Payment Type: "Site Imprest Settlement".</p>
              ) : (
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead>
                    <tr style={{ background:'#f8f9fc', borderBottom:'1.5px solid '+C.border }}>
                      {['Date', 'Description', 'Category', 'WBS Code', 'Amount'].map(h => (
                        <th key={h} style={{ padding:'8px 12px', textAlign:'left', fontSize:10, fontWeight:700, color:C.text3, textTransform:'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {imprestData?.recentSettlements?.map((s: any) => (
                      <tr key={s.id} style={{ borderBottom:'1px solid #f1f5f9' }}>
                        <td style={{ padding:'9px 12px', fontSize:12, color:C.text2 }}>{formatDate(s.date)}</td>
                        <td style={{ padding:'9px 12px', fontSize:12, color:C.text1, fontWeight:500 }}>{s.description}</td>
                        <td style={{ padding:'9px 12px', fontSize:11, color:C.text2, textTransform:'capitalize' }}>{s.category?.replace(/_/g, ' ')}</td>
                        <td style={{ padding:'9px 12px', fontSize:11, color:'#047857', fontWeight:600 }}>{s.wbsCode || '—'}</td>
                        <td style={{ padding:'9px 12px', fontSize:12, color:C.green, fontWeight:700 }}>{fmt(Number(s.netPayable))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Record Expense Modal */}
      <Modal open={showExp} onClose={() => { setShowExp(false); setEditId(null) }} title={editId ? 'Edit Expense' : 'Record Expense'} width={620}
        footer={<>
          <Button variant="ghost" onClick={() => { setShowExp(false); setEditId(null) }}>Cancel</Button>
          <Button variant="primary" loading={saveExpM.isPending} onClick={() => saveExpM.mutate()} disabled={!expForm.description || !expForm.grossAmount}>{editId ? 'Update Expense' : 'Save Expense'}</Button>
        </>}>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {/* 4-Date Engine */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Input label="Bill / Document Date *" type="date" value={expForm.documentDate || expForm.date} onChange={e => setExpForm((f: any) => ({ ...f, documentDate: e.target.value, date: e.target.value }))} />
            <Input label="Payment Due Date" type="date" value={expForm.dueDate} onChange={e => setExpForm((f: any) => ({ ...f, dueDate: e.target.value }))} />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Input label="Office Received Date" type="date" value={expForm.receivedDate || expForm.date} onChange={e => setExpForm((f: any) => ({ ...f, receivedDate: e.target.value }))} />
            <Input label="Posting / Books Date" type="date" value={expForm.postingDate || expForm.date} onChange={e => setExpForm((f: any) => ({ ...f, postingDate: e.target.value }))} />
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Select label="Category" value={expForm.category} onChange={e => setExpForm((f: any) => ({ ...f, category: e.target.value }))} options={EXP_CATS} />
            <Select label="STP Cost Code / WBS" value={expForm.wbsCode} onChange={e => setExpForm((f: any) => ({ ...f, wbsCode: e.target.value }))} options={STP_WBS_CODES} />
          </div>

          <Input label="Description *" value={expForm.description} onChange={e => setExpForm((f: any) => ({ ...f, description: e.target.value }))} placeholder="Cement supply for IPS-3 or Nishat dewatering diesel..." />

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Select label="Vendor / Subcontractor" value={expForm.vendorId} onChange={e => setExpForm((f: any) => ({ ...f, vendorId: e.target.value }))} options={venOptions} />
            <Input label="Bill / Challan No." value={expForm.billNo} onChange={e => setExpForm((f: any) => ({ ...f, billNo: e.target.value }))} placeholder="INV/2025-26/001" />
          </div>

          <div style={{ display:'grid', gridTemplateColumns: expForm.paymentType==='other' ? '1fr 1fr' : '1fr', gap:12 }}>
            <Select label="Payment / Bill Type" value={expForm.paymentType} onChange={e => setExpForm((f: any) => ({ ...f, paymentType: e.target.value }))} options={PAY_TYPES} />
            {expForm.paymentType==='other' && (
              <Input label="Specify type" value={expForm.paymentTypeOther} onChange={e => setExpForm((f: any) => ({ ...f, paymentTypeOther: e.target.value }))} placeholder="e.g. Interim advance" />
            )}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
            <Input label="Gross Basic Amount (₹) *" type="number" value={expForm.grossAmount} onChange={e => setExpForm((f: any) => ({ ...f, grossAmount: e.target.value }))} placeholder="500000" />
            <Input label="GST %" type="number" value={expForm.gstPct} onChange={e => setExpForm((f: any) => ({ ...f, gstPct: e.target.value }))} />
            <Input label="TDS % (Sec 194C/I/J)" type="number" value={expForm.tdsPct} onChange={e => setExpForm((f: any) => ({ ...f, tdsPct: e.target.value }))} />
          </div>

          {/* Subcontractor Free-Issue & Contra-Charges */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:12 }}>
            <Input label="Contra Deduction (₹)" type="number" value={expForm.contraDeduction} onChange={e => setExpForm((f: any) => ({ ...f, contraDeduction: e.target.value }))} placeholder="0" />
            <Input label="Contra Remarks" value={expForm.contraRemarks} onChange={e => setExpForm((f: any) => ({ ...f, contraRemarks: e.target.value }))} placeholder="e.g. Free-issue cement: 100 bags @ ₹380 / diesel 200L" />
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Select label="GST Type" value={expForm.gstType} onChange={e => setExpForm((f: any) => ({ ...f, gstType: e.target.value }))} options={GST_TYPES} />
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:5 }}>Bill / Challan copy</label>
              {expForm.attachmentUrl ? (
                <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, paddingTop:6 }}>
                  <a href={expForm.attachmentUrl} target="_blank" rel="noreferrer" style={{ color:C.blue, fontWeight:600 }}>{expForm.attachmentName || 'View file'}</a>
                  <button type="button" onClick={() => setExpForm((f: any) => ({ ...f, attachmentUrl:'', attachmentName:'' }))} style={{ border:'none', background:'none', color:C.red, cursor:'pointer', fontSize:11 }}>remove</button>
                </div>
              ) : (
                <input type="file" onChange={e => { const file = e.target.files?.[0]; if (file) uploadExpenseFile(file) }} style={{ fontSize:12, paddingTop:6 }} />
              )}
            </div>
          </div>

          {gross > 0 && (
            <div style={{ padding:'12px 16px', background:'#f8f9fc', border:'1.5px solid '+C.border, borderRadius:8 }}>
              {[['Gross Basic', fmt(gross), C.text1], ...gstRows, ['TDS ('+expForm.tdsPct+'% on basic)', '-'+fmt(tdsAmt), C.red], ...(contra > 0 ? [['Contra Deduction', '-'+fmt(contra), C.amber]] : []), ['Net Payable', fmt(netPay), C.green]].map(([l, v, c]: any) => (
                <div key={l} style={{ display:'flex', justifyContent:'space-between', marginBottom:5, fontSize:12 }}>
                  <span style={{ color:C.text3 }}>{l}</span>
                  <span style={{ color:c, fontWeight: l === 'Net Payable' ? 700 : 400 }}>{v}</span>
                </div>
              ))}
              <div style={{ fontSize:10.5, color:C.text3, marginTop:8, borderTop:'1px dashed '+C.border, paddingTop:6 }}>
                ✓ Statutory Compliance: TDS deducted on basic amount (excl. GST) per CBDT Circular No. 23/2017.
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Add Vendor Modal */}
      <Modal open={showVen} onClose={() => { setShowVen(false); setEditVenId(null) }} title={editVenId ? 'Edit Vendor / Contractor' : 'Add Vendor / Contractor'} width={560}
        footer={<>
          <Button variant="ghost" onClick={() => { setShowVen(false); setEditVenId(null) }}>Cancel</Button>
          <Button variant="primary" loading={saveVenM.isPending} onClick={() => saveVenM.mutate()} disabled={!venForm.name}>{editVenId ? 'Update Vendor' : 'Save Vendor'}</Button>
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
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
            <Input label="Phone" value={venForm.phone} onChange={e => setVenForm((f: any) => ({ ...f, phone: e.target.value }))} />
            <Input label="TDS Rate %" type="number" value={venForm.tdsRate} onChange={e => setVenForm((f: any) => ({ ...f, tdsRate: e.target.value }))} />
            <Input label="Credit Terms (Days)" type="number" value={venForm.creditDays} onChange={e => setVenForm((f: any) => ({ ...f, creditDays: e.target.value }))} placeholder="30" />
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

      {/* Disburse Imprest Float Modal */}
      <Modal open={showImprestDisburse} onClose={() => setShowImprestDisburse(false)} title="Disburse Site Imprest Float" width={520}
        footer={<>
          <Button variant="ghost" onClick={() => setShowImprestDisburse(false)}>Cancel</Button>
          <Button variant="primary" loading={disburseImprestM.isPending} onClick={() => disburseImprestM.mutate()} disabled={!imprestForm.custodianName || !imprestForm.amount} icon={<Wallet size={14}/>}>
            Confirm Disbursement
          </Button>
        </>}>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ padding:'10px 14px', background:'#f8f9fc', border:'1.5px solid '+C.border, borderRadius:8, fontSize:12 }}>
            <p style={{ fontWeight:600, color:C.text1, margin:'0 0 3px' }}>Revolving Site Cash Float · {currentProject?.name || 'Active Project'}</p>
            <p style={{ color:C.text3, margin:0 }}>Bank funds drawn as operational cash float for site emergencies, liaisons, cartage, and photostats. Vouchers are settled without date skew.</p>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Input label="Custodian / Site Engineer *" value={imprestForm.custodianName} onChange={e => setImprestForm((f: any) => ({ ...f, custodianName: e.target.value }))} placeholder="e.g. Er. Zubair / Site Incharge" />
            <Input label="Float Amount (₹) *" type="number" value={imprestForm.amount} onChange={e => setImprestForm((f: any) => ({ ...f, amount: e.target.value }))} placeholder="50000" />
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Input label="Disbursement Date" type="date" value={imprestForm.date} onChange={e => setImprestForm((f: any) => ({ ...f, date: e.target.value }))} />
            <Select label="Mode of Transfer / Cash" value={imprestForm.paymentMode} onChange={e => setImprestForm((f: any) => ({ ...f, paymentMode: e.target.value }))} options={PAY_MODES} />
          </div>

          <Input label="Bank UTR / Cheque Ref" value={imprestForm.bankRef} onChange={e => setImprestForm((f: any) => ({ ...f, bankRef: e.target.value }))} placeholder="e.g. UTR / Self-Cheque #049281" />
          <Input label="Purpose / Remarks" value={imprestForm.remarks} onChange={e => setImprestForm((f: any) => ({ ...f, remarks: e.target.value }))} placeholder="e.g. Revolving cash float for site operations and local cartage" />
        </div>
      </Modal>

      {/* Vendor Statement Modal */}
      <Modal open={!!selectedVendorForLedger} onClose={() => setSelectedVendorForLedger(null)} title={selectedVendorForLedger ? `Vendor Statement · ${selectedVendorForLedger.name}` : 'Vendor Statement'} width={800}
        footer={<>
          <Button variant="ghost" onClick={() => setSelectedVendorForLedger(null)}>Close</Button>
        </>}>
        {selectedVendorForLedger && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {/* Vendor Header Meta */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(130px, 1fr))', gap:10, padding:'12px 16px', background:'#f8f9fc', border:'1.5px solid '+C.border, borderRadius:8, fontSize:12 }}>
              <div><span style={{ color:C.text3, display:'block', fontSize:10, textTransform:'uppercase' }}>Category</span><strong>{selectedVendorForLedger.category?.replace(/_/g,' ')}</strong></div>
              <div><span style={{ color:C.text3, display:'block', fontSize:10, textTransform:'uppercase' }}>Credit Terms</span><strong style={{ color:C.blue }}>{selectedVendorForLedger.creditDays ? `${selectedVendorForLedger.creditDays} Days` : '30 Days'}</strong></div>
              <div><span style={{ color:C.text3, display:'block', fontSize:10, textTransform:'uppercase' }}>GSTIN</span><span style={{ fontFamily:'monospace' }}>{selectedVendorForLedger.gstin || '—'}</span></div>
              <div><span style={{ color:C.text3, display:'block', fontSize:10, textTransform:'uppercase' }}>PAN</span><span style={{ fontFamily:'monospace' }}>{selectedVendorForLedger.pan || '—'}</span></div>
              <div><span style={{ color:C.text3, display:'block', fontSize:10, textTransform:'uppercase' }}>Phone</span><span>{selectedVendorForLedger.phone || '—'}</span></div>
            </div>

            {/* Financial Summary KPIs */}
            {vLedgerLoading ? (
              <div style={{ display:'flex', justifyContent:'center', padding:20 }}><Spinner /></div>
            ) : (
              <>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:10 }}>
                  <div style={{ padding:'10px 14px', background:'#f8fafc', border:'1px solid '+C.border, borderRadius:8 }}>
                    <div style={{ fontSize:10.5, color:C.text3, textTransform:'uppercase', fontWeight:700 }}>Total Invoiced</div>
                    <div style={{ fontSize:15, fontWeight:700, color:C.text1, marginTop:2 }}>{fmt(vLedger?.totalBilled || 0)}</div>
                  </div>
                  <div style={{ padding:'10px 14px', background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:8 }}>
                    <div style={{ fontSize:10.5, color:'#166534', textTransform:'uppercase', fontWeight:700 }}>Total Paid / Adv</div>
                    <div style={{ fontSize:15, fontWeight:700, color:C.green, marginTop:2 }}>{fmt(vLedger?.totalPaid || 0)}</div>
                  </div>
                  <div style={{ padding:'10px 14px', background:'#fef2f2', border:'1px solid #fecaca', borderRadius:8 }}>
                    <div style={{ fontSize:10.5, color:'#991b1b', textTransform:'uppercase', fontWeight:700 }}>TDS Deducted</div>
                    <div style={{ fontSize:15, fontWeight:700, color:C.red, marginTop:2 }}>{fmt(vLedger?.totalTds || 0)}</div>
                  </div>
                  <div style={{ padding:'10px 14px', background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:8 }}>
                    <div style={{ fontSize:10.5, color:'#1e40af', textTransform:'uppercase', fontWeight:700 }}>Net Balance</div>
                    <div style={{ fontSize:15, fontWeight:700, color:(vLedger?.balance ?? 0) > 0 ? C.amber : C.green, marginTop:2 }}>{fmt(vLedger?.balance || 0)}</div>
                  </div>
                </div>

                {/* Bills & Invoices Table */}
                <div>
                  <h4 style={{ fontSize:12, fontWeight:700, color:C.text2, textTransform:'uppercase', letterSpacing:'0.05em', margin:'8px 0' }}>Billed Expenses & RA Invoices</h4>
                  {(!vLedger?.expenses || vLedger.expenses.length === 0) ? (
                    <p style={{ fontSize:12, color:C.text3, margin:0 }}>No bills or expenses recorded under this project.</p>
                  ) : (
                    <div style={{ maxHeight:200, overflowY:'auto', border:'1px solid '+C.border, borderRadius:6 }}>
                      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11.5 }}>
                        <thead style={{ background:'#f8f9fc', position:'sticky', top:0, zIndex:1 }}>
                          <tr style={{ borderBottom:'1px solid '+C.border }}>
                            {['Bill Date', 'Bill No', 'Description', 'Due Date', 'Net Payable', 'Paid', 'Status'].map(h => (
                              <th key={h} style={{ padding:'6px 10px', textAlign:'left', fontSize:10, fontWeight:700, color:C.text3, textTransform:'uppercase' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {vLedger.expenses.map((e: any) => (
                            <tr key={e.id} style={{ borderBottom:'1px solid #f1f5f9' }}>
                              <td style={{ padding:'7px 10px', color:C.text2 }}>{formatDate(e.documentDate || e.date)}</td>
                              <td style={{ padding:'7px 10px', fontFamily:'monospace', fontWeight:600 }}>{e.billNo || '—'}</td>
                              <td style={{ padding:'7px 10px', color:C.text1, maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{e.description}</td>
                              <td style={{ padding:'7px 10px', color:e.dueDate && new Date(e.dueDate) < new Date() && e.status !== 'paid' ? C.red : C.text2 }}>{e.dueDate ? formatDate(e.dueDate) : '—'}</td>
                              <td style={{ padding:'7px 10px', fontWeight:600, color:C.text1 }}>{fmt(Number(e.netPayable))}</td>
                              <td style={{ padding:'7px 10px', color:C.green }}>{fmt(Number(e.paidAmount))}</td>
                              <td style={{ padding:'7px 10px' }}>
                                <span style={{ fontSize:9.5, padding:'2px 6px', borderRadius:999, fontWeight:700, textTransform:'uppercase', background:SS[e.status]?.bg, color:SS[e.status]?.color, border:'1px solid '+SS[e.status]?.border }}>
                                  {e.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Direct Payments / Advances Table */}
                <div>
                  <h4 style={{ fontSize:12, fontWeight:700, color:C.text2, textTransform:'uppercase', letterSpacing:'0.05em', margin:'8px 0' }}>Payments & Advances Transacted</h4>
                  {(!vLedger?.transactions || vLedger.transactions.length === 0) ? (
                    <p style={{ fontSize:12, color:C.text3, margin:0 }}>No payment transactions recorded for this vendor under this project.</p>
                  ) : (
                    <div style={{ maxHeight:180, overflowY:'auto', border:'1px solid '+C.border, borderRadius:6 }}>
                      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11.5 }}>
                        <thead style={{ background:'#f8f9fc', position:'sticky', top:0, zIndex:1 }}>
                          <tr style={{ borderBottom:'1px solid '+C.border }}>
                            {['Txn Date', 'Description / Mode', 'Bank Ref', 'Debit Paid'].map(h => (
                              <th key={h} style={{ padding:'6px 10px', textAlign:'left', fontSize:10, fontWeight:700, color:C.text3, textTransform:'uppercase' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {vLedger.transactions.map((t: any) => (
                            <tr key={t.id} style={{ borderBottom:'1px solid #f1f5f9' }}>
                              <td style={{ padding:'7px 10px', color:C.text2 }}>{formatDate(t.date)}</td>
                              <td style={{ padding:'7px 10px', color:C.text1 }}>
                                {t.description} <span style={{ fontSize:10, color:C.text3, textTransform:'uppercase' }}>({t.paymentMode || 'RTGS'})</span>
                              </td>
                              <td style={{ padding:'7px 10px', fontFamily:'monospace', color:C.text2 }}>{t.bankRef || '—'}</td>
                              <td style={{ padding:'7px 10px', fontWeight:700, color:C.green }}>{fmt(Number(t.debit))}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

    </div>
  )
}
