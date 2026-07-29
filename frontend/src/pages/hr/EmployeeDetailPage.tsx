import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { hrApi } from '@/api/hr.api'
import { ArrowLeft, PencilSimple, UserCircle, Phone, CurrencyDollar } from '@phosphor-icons/react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'

const C = {
  card:'#fff', border:'#e2e8f0', text1:'#0f172a', text2:'#475569', text3:'#94a3b8',
  blue:'#2563eb', green:'#059669', navy:'#1a2540',
}

const DEPTS     = ['Civil','Electrical','Mechanical','HR','Admin','Liaison / Communications','Security','Labour','Operations','Other'].map(d => ({ value: d, label: d }))
const EMP_TYPES = [{ value:'full_time', label:'Full Time' }, { value:'contract', label:'Contract' }, { value:'daily_wage', label:'Daily Wage' }]
const BANKS     = ['J&K Bank','SBI','HDFC Bank','Punjab National Bank','Axis Bank','Canara Bank','Union Bank','Other'].map(b => ({ value: b, label: b }))

function Row({ label, value }: { label: string; value: any }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div style={{ display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid #f1f5f9' }}>
      <span style={{ fontSize:13, color:C.text3, fontWeight:500 }}>{label}</span>
      <span style={{ fontSize:13, color:C.text1, fontWeight:600, textAlign:'right' as any, maxWidth:'60%' }}>{value}</span>
    </div>
  )
}

export default function EmployeeDetailPage() {
  const { id }  = useParams<{ id: string }>()
  const nav     = useNavigate()
  const qc      = useQueryClient()

  const [showEdit, setShowEdit]         = useState(false)
  const [tab, setTab]                   = useState<'personal'|'bank'|'salary'>('personal')
  const [form, setForm]                 = useState<any>(null)
  const [submitError, setSubmitError]   = useState('')

  const { data: emp, isLoading } = useQuery({
    queryKey: ['employee', id],
    queryFn:  () => hrApi.getEmployee(id!).then(r => r.data),
    enabled:  !!id,
  })

  const updateM = useMutation({
    mutationFn: (d: any) => hrApi.updateEmployee(id!, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employee', id] })
      qc.invalidateQueries({ queryKey: ['employees'] })
      closeEdit()
    },
    onError: (e: any) => setSubmitError(e?.response?.data?.message ?? 'Failed to update employee'),
  })

  function openEdit() {
    if (!emp) return
    setForm({
      empCode:        emp.empCode        ?? '',
      firstName:      emp.firstName      ?? '',
      lastName:       emp.lastName       ?? '',
      designation:    emp.designation    ?? '',
      department:     emp.department     ?? 'Civil',
      phone:          emp.phone          ?? '',
      email:          emp.email          ?? '',
      dateOfJoining:  emp.dateOfJoining?.split('T')[0]  ?? '',
      dateOfBirth:    emp.dateOfBirth?.split('T')[0]    ?? '',
      aadharNo:       emp.aadharNo       ?? '',
      panNo:          emp.panNo          ?? '',
      employmentType: emp.employmentType ?? 'full_time',
      bankAccount:    emp.bankAccount    ?? { bankName:'', accountNo:'', ifsc:'', branch:'' },
      baseSalary:     emp.baseSalary     ?? '',
      hra:            emp.hra            ?? '',
      allowances:     emp.allowances     ?? '',
    })
    setTab('personal')
    setSubmitError('')
    setShowEdit(true)
  }

  function closeEdit() {
    setShowEdit(false)
    setForm(null)
    setSubmitError('')
  }

  const setF    = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))
  const setBank = (k: string, v: any) => setForm((f: any) => ({ ...f, bankAccount: { ...f.bankAccount, [k]: v } }))

  function submitEdit() {
    setSubmitError('')
    updateM.mutate({
      ...form,
      empCode:    form.empCode.trim(),
      baseSalary: form.baseSalary !== '' ? parseFloat(form.baseSalary) : undefined,
      hra:        form.hra        !== '' ? parseFloat(form.hra)        : undefined,
      allowances: form.allowances !== '' ? parseFloat(form.allowances) : undefined,
      bankAccount: form.bankAccount?.accountNo ? form.bankAccount : undefined,
    })
  }

  /* ── Loading ── */
  if (isLoading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:400 }}>
      <div style={{ width:36, height:36, border:'3px solid '+C.blue, borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
    </div>
  )

  /* ── Not found ── */
  if (!emp) return (
    <div style={{ textAlign:'center' as any, padding:80, color:C.text3 }}>Employee not found</div>
  )

  /* ── Derived values — only reached when emp is guaranteed non-null ── */
  const firstName = emp.firstName  ?? ''
  const lastName  = emp.lastName   ?? ''
  const fullName  = (firstName + ' ' + lastName).trim()
  const initials  = ((firstName[0] ?? '') + (lastName[0] ?? '')).toUpperCase() || 'NA'
  const grossCtc  = Number(emp.baseSalary ?? 0) + Number(emp.hra ?? 0) + Number(emp.allowances ?? 0)

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:24 }}>

      {/* Back */}
      <button onClick={() => nav('/hr/employees')}
        style={{ display:'flex', alignItems:'center', gap:8, background:'none', border:'none',
          cursor:'pointer', color:C.text2, fontSize:13, fontWeight:600, width:'fit-content', padding:'6px 0' }}>
        <ArrowLeft size={16} /> Back to Employees
      </button>

      {/* Header card */}
      <div style={{ background:C.navy, borderRadius:16, padding:'28px 32px', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap' as any, gap:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:18 }}>
          <div style={{ width:64, height:64, borderRadius:'50%', background:'rgba(255,255,255,0.15)',
            display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <span style={{ fontSize:24, fontWeight:700, color:'#fff' }}>{initials}</span>
          </div>
          <div>
            <h1 style={{ fontSize:22, fontWeight:800, color:'#fff', margin:'0 0 4px' }}>{fullName || '—'}</h1>
            <p  style={{ fontSize:14, color:'rgba(255,255,255,0.6)', margin:'0 0 4px' }}>{emp.designation ?? '—'}</p>
            <span style={{ fontSize:11, fontWeight:700, fontFamily:'monospace', color:'rgba(255,255,255,0.4)' }}>{emp.empCode ?? '—'}</span>
          </div>
        </div>
        <div style={{ display:'flex', gap:12, alignItems:'center' }}>
          <span style={{ padding:'6px 16px', borderRadius:20,
            background: emp.status==='active' ? 'rgba(5,150,105,0.2)' : 'rgba(220,38,38,0.2)',
            color:      emp.status==='active' ? '#34d399' : '#f87171',
            fontSize:12, fontWeight:700 }}>
            {(emp.status ?? 'active').toUpperCase()}
          </span>
          <button onClick={openEdit}
            style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 18px',
              background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.2)',
              borderRadius:10, color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer' }}>
            <PencilSimple size={14} /> Edit
          </button>
        </div>
      </div>

      {/* Details grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:20 }}>

        {/* Personal Info */}
        <div style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:14, padding:'20px 22px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
            <UserCircle size={16} color={C.blue} weight="bold" />
            <h3 style={{ fontSize:13, fontWeight:700, color:C.text1, margin:0 }}>Personal Info</h3>
          </div>
          <Row label="Department"      value={emp.department} />
          <Row label="Employment Type" value={emp.employmentType?.replace(/_/g,' ').replace(/w/g, (c:string) => c.toUpperCase())} />
          <Row label="Date of Joining" value={emp.dateOfJoining ? new Date(emp.dateOfJoining).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : null} />
          <Row label="Date of Birth"   value={emp.dateOfBirth  ? new Date(emp.dateOfBirth).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})  : null} />
          <Row label="Aadhar No"       value={emp.aadharNo} />
          <Row label="PAN No"          value={emp.panNo} />
        </div>

        {/* Contact */}
        <div style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:14, padding:'20px 22px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
            <Phone size={16} color={C.blue} weight="bold" />
            <h3 style={{ fontSize:13, fontWeight:700, color:C.text1, margin:0 }}>Contact</h3>
          </div>
          <Row label="Phone" value={emp.phone} />
          <Row label="Email" value={emp.email} />
        </div>

        {/* Salary & Bank */}
        <div style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:14, padding:'20px 22px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
            <CurrencyDollar size={16} color={C.blue} weight="bold" />
            <h3 style={{ fontSize:13, fontWeight:700, color:C.text1, margin:0 }}>Salary & Bank</h3>
          </div>
          <Row label="Basic Salary" value={emp.baseSalary  ? '₹' + Number(emp.baseSalary).toLocaleString('en-IN')  : null} />
          <Row label="HRA"          value={emp.hra         ? '₹' + Number(emp.hra).toLocaleString('en-IN')         : null} />
          <Row label="Allowances"   value={emp.allowances  ? '₹' + Number(emp.allowances).toLocaleString('en-IN')  : null} />
          <Row label="Gross CTC"    value={grossCtc > 0    ? '₹' + grossCtc.toLocaleString('en-IN')                 : null} />
          {emp.bankAccount?.bankName && (
            <div style={{ marginTop:12, borderTop:'1px solid #f1f5f9', paddingTop:12 }}>
              <Row label="Bank"       value={emp.bankAccount.bankName} />
              <Row label="Account No" value={emp.bankAccount.accountNo} />
              <Row label="IFSC"       value={emp.bankAccount.ifsc} />
              <Row label="Branch"     value={emp.bankAccount.branch} />
            </div>
          )}
        </div>
      </div>

      {/* ── EDIT MODAL ── */}
      <Modal open={showEdit} onClose={closeEdit} title="Edit Employee" width="min(760px, 92vw)">
        {form && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

            {submitError && (
              <div style={{ padding:'10px 14px', background:'#fef2f2', border:'1.5px solid #fecaca', borderRadius:8, fontSize:13, color:'#b91c1c' }}>
                {submitError}
              </div>
            )}

            {/* Tabs */}
            <div style={{ display:'flex', borderBottom:'1.5px solid '+C.border }}>
              {(['personal','bank','salary'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  style={{ padding:'8px 18px', fontSize:13, fontWeight:600, border:'none',
                    borderBottom: tab===t ? '2px solid '+C.blue : '2px solid transparent',
                    background:'none', cursor:'pointer',
                    color: tab===t ? C.blue : C.text3, marginBottom:-1, textTransform:'capitalize' as any }}>
                  {t === 'personal' ? 'Personal Info' : t === 'bank' ? 'Bank Details' : 'Salary'}
                </button>
              ))}
            </div>

            {/* Personal Tab */}
            {tab === 'personal' && (
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:12 }}>
                  <div>
                    <Input label='Employee Code *' value={form.empCode} onChange={(e:any) => setF('empCode', e.target.value)} placeholder='KIPL-DL-SXR-001' />
                    <p style={{ fontSize:11, color:C.text3, margin:'4px 0 0' }}>Format: KIPL-DL-SXR-001</p>
                  </div>
                  <Select label='Department *' value={form.department} onChange={(e:any) => setF('department', e.target.value)} options={DEPTS} />
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:12 }}>
                  <Input label='First Name *' value={form.firstName} onChange={(e:any) => setF('firstName', e.target.value)} placeholder='Ravi' />
                  <Input label='Last Name'    value={form.lastName}  onChange={(e:any) => setF('lastName',  e.target.value)} placeholder='Kumar' />
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:12 }}>
                  <Input  label='Designation'     value={form.designation}    onChange={(e:any) => setF('designation',    e.target.value)} placeholder='Site Engineer' />
                  <Select label='Employment Type' value={form.employmentType} onChange={(e:any) => setF('employmentType', e.target.value)} options={EMP_TYPES} />
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:12 }}>
                  <Input label='Phone' value={form.phone} onChange={(e:any) => setF('phone', e.target.value)} placeholder='9876543210' />
                  <Input label='Email' type='email' value={form.email} onChange={(e:any) => setF('email', e.target.value)} placeholder='ravi@example.com' />
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:12 }}>
                  <Input label='Date of Joining' type='date' value={form.dateOfJoining} onChange={(e:any) => setF('dateOfJoining', e.target.value)} />
                  <Input label='Date of Birth'   type='date' value={form.dateOfBirth}   onChange={(e:any) => setF('dateOfBirth',   e.target.value)} />
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:12 }}>
                  <Input label='Aadhar No' value={form.aadharNo} onChange={(e:any) => setF('aadharNo', e.target.value)} placeholder='123456789012' />
                  <Input label='PAN No'    value={form.panNo}    onChange={(e:any) => setF('panNo',    e.target.value)} placeholder='ABCDE1234F' />
                </div>
              </div>
            )}

            {/* Bank Tab */}
            {tab === 'bank' && (
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <Select label='Bank Name' value={form.bankAccount.bankName} onChange={(e:any) => setBank('bankName', e.target.value)} options={BANKS} />
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:12 }}>
                  <Input label='Account Number' value={form.bankAccount.accountNo} onChange={(e:any) => setBank('accountNo', e.target.value)} placeholder='12345678901' />
                  <Input label='IFSC Code'       value={form.bankAccount.ifsc}      onChange={(e:any) => setBank('ifsc',      e.target.value)} placeholder='JAKA0TANKEE' />
                </div>
                <Input label='Branch' value={form.bankAccount.branch} onChange={(e:any) => setBank('branch', e.target.value)} placeholder='Srinagar Main' />
              </div>
            )}

            {/* Salary Tab */}
            {tab === 'salary' && (
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:12 }}>
                  <Input label='Basic Salary (₹)' type='number' value={form.baseSalary} onChange={(e:any) => setF('baseSalary', e.target.value)} placeholder='25000' />
                  <Input label='HRA (₹)'           type='number' value={form.hra}        onChange={(e:any) => setF('hra',        e.target.value)} placeholder='5000'  />
                  <Input label='Allowances (₹)'    type='number' value={form.allowances} onChange={(e:any) => setF('allowances', e.target.value)} placeholder='3000'  />
                </div>
                {(form.baseSalary || form.hra || form.allowances) && (
                  <div style={{ background:'#f0f9ff', border:'1.5px solid #bae6fd', borderRadius:10, padding:'12px 16px' }}>
                    <p style={{ fontSize:12, color:'#0369a1', margin:0 }}>
                      Gross CTC: <strong>₹{(Number(form.baseSalary||0)+Number(form.hra||0)+Number(form.allowances||0)).toLocaleString('en-IN')}</strong> / month
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Footer */}
            <div style={{ display:'flex', justifyContent:'flex-end', gap:10, paddingTop:4 }}>
              <Button variant='secondary' onClick={closeEdit}>Cancel</Button>
              <Button variant='primary' loading={updateM.isPending} onClick={submitEdit} disabled={!form.empCode || !form.firstName}>
                Save Changes
              </Button>
            </div>

          </div>
        )}
      </Modal>

    </div>
  )
}
