import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, DotsThreeVertical, PencilSimple, Trash, UserCircleMinus, UserCircleCheck, Users, IdentificationCard } from '@phosphor-icons/react'
import { hrApi } from '@/api/hr.api'
import { useAuthStore } from '@/store/auth.store'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'

const C = {
  card:'#fff', border:'#e2e8f0', text1:'#0f172a', text2:'#475569', text3:'#94a3b8',
  blue:'#2563eb', green:'#059669', amber:'#d97706', red:'#dc2626', navy:'#1a2540',
}

const DEPTS = ['Civil','Electrical','Mechanical','HR','Admin','Liaison / Communications','Security','Labour','Operations','Other'].map(d=>({value:d,label:d}))
const EMP_TYPES = [{value:'full_time',label:'Full Time'},{value:'contract',label:'Contract'},{value:'daily_wage',label:'Daily Wage'}]
const BANKS = ['J&K Bank','SBI','HDFC Bank','Punjab National Bank','Axis Bank','Canara Bank','Union Bank','Other'].map(b=>({value:b,label:b}))

// Site-labour bucket used to reconcile timesheets with the Site Diary headcount
const LABOUR_CATS = [
  { value:'', label:'— Office / not site labour —' },
  { value:'skilled', label:'Skilled' },
  { value:'unskilled', label:'Unskilled' },
  { value:'supervisory', label:'Supervisory' },
]

const BLANK: any = {
  empCode:'', firstName:'', lastName:'', designation:'', labourCategory:'', department:'Civil',
  phone:'', email:'', dateOfJoining: new Date().toISOString().split('T')[0],
  dateOfBirth:'', aadharNo:'', panNo:'', employmentType:'full_time',
  bankAccount:{ bankName:'', accountNo:'', ifsc:'', branch:'' },
  baseSalary:'', hra:'', allowances:'',
  createLogin: false, loginEmail:'', loginRole:'engineer', loginPassword:'',
}

export default function EmployeesPage() {
  const nav = useNavigate()
  const { activeProjectId } = useAuthStore()
  const qc = useQueryClient()

  const [showNew, setShowNew]   = useState(false)
  const [tab, setTab]           = useState<'personal'|'bank'|'salary'>('personal')
  const [form, setForm]         = useState<any>({...BLANK})
  const [editId, setEditId]     = useState<string|null>(null)
  const [menuOpen, setMenuOpen] = useState<string|null>(null)
  const [submitError, setSubmitError] = useState('')
  const [dept, setDept]         = useState('')
  const [search, setSearch]     = useState('')

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees', activeProjectId, dept],
    queryFn:  () => hrApi.employees({ projectId: activeProjectId, department: dept||undefined }).then(r => r.data),
    enabled:  !!activeProjectId,
  })

  const { data: hrDash } = useQuery({
    queryKey: ['hr-dash', activeProjectId],
    queryFn:  () => hrApi.dashboard(activeProjectId!).then(r => r.data),
    enabled:  !!activeProjectId,
  })

  const createM = useMutation({
    mutationFn: (d: any) => hrApi.createEmployee(d),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['employees'] }); closeModal() },
    onError:    (e: any) => setSubmitError(e?.response?.data?.message ?? 'Failed to create employee'),
  })

  const updateM = useMutation({
    mutationFn: (d: any) => hrApi.updateEmployee(editId!, d),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['employees'] }); closeModal() },
    onError:    (e: any) => setSubmitError(e?.response?.data?.message ?? 'Failed to update employee'),
  })

  const deleteM = useMutation({
    mutationFn: (id: string) => hrApi.deleteEmployee(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['employees'] }),
  })

  function closeModal() {
    setShowNew(false); setEditId(null); setForm({...BLANK})
    setTab('personal'); setSubmitError('')
  }

  function openEdit(emp: any) {
    setForm({
      empCode: emp.empCode ?? '', firstName: emp.firstName ?? '', lastName: emp.lastName ?? '',
      designation: emp.designation ?? '', labourCategory: emp.labourCategory ?? '', department: emp.department ?? 'Civil',
      phone: emp.phone ?? '', email: emp.email ?? '',
      dateOfJoining: emp.dateOfJoining?.split('T')[0] ?? '',
      dateOfBirth: emp.dateOfBirth?.split('T')[0] ?? '',
      aadharNo: emp.aadharNo ?? '', panNo: emp.panNo ?? '',
      employmentType: emp.employmentType ?? 'full_time',
      bankAccount: emp.bankAccount ?? { bankName:'', accountNo:'', ifsc:'', branch:'' },
      baseSalary: emp.baseSalary ?? '', hra: emp.hra ?? '', allowances: emp.allowances ?? '',
      createLogin: false, loginEmail:'', loginRole:'engineer', loginPassword:'',
    })
    setEditId(emp.id); setShowNew(true); setMenuOpen(null)
  }

  function handleDelete(emp: any) {
    if (window.confirm('Delete ' + emp.firstName + ' ' + (emp.lastName ?? '') + '?\n\nThis cannot be undone.')) {
      deleteM.mutate(emp.id); setMenuOpen(null)
    }
  }

  function getNextCode() {
    const codes = (employees as any[])
      .map((e: any) => e.empCode ?? '')
      .filter((c: string) => c.startsWith('KIPL-DL-SXR-'))
      .map((c: string) => parseInt(c.replace('KIPL-DL-SXR-', '')) || 0)
    const next = codes.length > 0 ? Math.max(...codes) + 1 : 1
    return 'KIPL-DL-SXR-' + String(next).padStart(3, '0')
  }

  const setF    = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))
  const setBank = (k: string, v: any) => setForm((f: any) => ({ ...f, bankAccount: { ...f.bankAccount, [k]: v } }))

  function submitForm() {
    setSubmitError('')
    const payload = {
      ...form,
      empCode:    form.empCode.trim(),
      projectId:  activeProjectId,
      // Blank date fields must be null, not "" (Postgres rejects "" for a date)
      dateOfJoining: form.dateOfJoining || null,
      dateOfBirth:   form.dateOfBirth || null,
      baseSalary: form.baseSalary ? parseFloat(form.baseSalary) : undefined,
      hra:        form.hra ? parseFloat(form.hra) : undefined,
      allowances: form.allowances ? parseFloat(form.allowances) : undefined,
      bankAccount: form.bankAccount?.accountNo ? form.bankAccount : undefined,
    }
    editId ? updateM.mutate(payload) : createM.mutate(payload)
  }

  const list = (employees as any[]).filter(e =>
    !search || [e.firstName, e.lastName, e.empCode, e.designation].join(' ').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className='fade-in' style={{ display:'flex', flexDirection:'column', gap:24 }} onClick={() => setMenuOpen(null)}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:800, color:C.text1, margin:'0 0 4px', letterSpacing:'-0.02em' }}>Employees</h1>
          <p style={{ fontSize:14, color:C.text3, margin:0 }}>Manage team members and their records</p>
        </div>
        <button onClick={() => { setForm({...BLANK, empCode: getNextCode()}); setShowNew(true) }}
          style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 20px', background:C.blue, color:'#fff', border:'none', borderRadius:10, fontSize:13, fontWeight:700, cursor:'pointer' }}>
          <Plus size={16} weight="bold" /> Add Employee
        </button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
        {[
          { label:'Total Employees', value: employees.length,         color:C.blue  },
          { label:'Present Today',   value: hrDash?.presentToday ?? 0, color:C.green },
          { label:'Absent Today',    value: hrDash?.absentToday ?? 0,  color:C.red   },
          { label:'Pending Leaves',  value: hrDash?.pendingLeaves ?? 0,color:C.amber },
        ].map(s => (
          <div key={s.label} style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:12, padding:'16px 18px' }}>
            <p style={{ fontSize:10, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.06em', margin:'0 0 8px' }}>{s.label}</p>
            <p style={{ fontSize:28, fontWeight:800, color:s.color, margin:0 }}>{s.value}</p>
          </div>
        ))}
      </div>

      <div style={{ display:'flex', gap:12, alignItems:'center' }}>
        <div style={{ flex:1, position:'relative' }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder='Search name, code, designation...'
            style={{ width:'100%', padding:'10px 14px 10px 38px', border:'1.5px solid '+C.border, borderRadius:10, fontSize:13, outline:'none', boxSizing:'border-box' as any }} />
          <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:C.text3 }}></span>
        </div>
        <select value={dept} onChange={e=>setDept(e.target.value)}
          style={{ padding:'10px 14px', border:'1.5px solid '+C.border, borderRadius:10, fontSize:13, background:C.card, outline:'none', minWidth:180 }}>
          <option value=''>All Departments</option>
          {DEPTS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
        </select>
        <span style={{ fontSize:13, color:C.text3, whiteSpace:'nowrap' as any }}>{list.length} employees</span>
      </div>

      <div style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:16, overflow:'visible' }}>
        {isLoading ? (
          <div style={{ display:'flex', justifyContent:'center', padding:60 }}><Spinner /></div>
        ) : list.length === 0 ? (
          <div style={{ textAlign:'center' as any, padding:'60px 20px' }}>
            <Users size={34} color={C.text3} style={{ margin:'0 auto 12px', display:'block' }} />
            <p style={{ fontSize:15, fontWeight:600, color:C.text2, margin:'0 0 16px' }}>No employees yet</p>
            <button onClick={() => setShowNew(true)}
              style={{ padding:'10px 20px', background:'none', border:'1.5px solid '+C.border, borderRadius:8, fontSize:13, cursor:'pointer', color:C.text2 }}>
              + Add first employee
            </button>
          </div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse' as any }}>
            <thead>
              <tr style={{ background:'#f8fafc' }}>
                {['Code','Name & Role','Department','Type','Status',''].map(h => (
                  <th key={h} style={{ padding:'11px 18px', textAlign:'left' as any, fontSize:11, fontWeight:700, color:C.text3, textTransform:'uppercase' as any, letterSpacing:'0.05em', borderBottom:'1.5px solid '+C.border }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.map((emp: any) => (
                <tr key={emp.id} style={{ cursor:'pointer' }}
                  onClick={() => nav('/hr/employees/' + emp.id)}
                  onMouseEnter={e => (e.currentTarget.style.background='#f8faff')}
                  onMouseLeave={e => (e.currentTarget.style.background='transparent')}>
                  <td style={{ padding:'13px 18px', borderBottom:'1px solid #f1f5f9' }}>
                    <span style={{ fontSize:12, fontWeight:700, color:C.blue, fontFamily:'monospace' }}>{emp.empCode}</span>
                  </td>
                  <td style={{ padding:'13px 18px', borderBottom:'1px solid #f1f5f9' }}>
                    <p style={{ fontSize:13, fontWeight:600, color:C.text1, margin:'0 0 2px' }}>{emp.firstName} {emp.lastName??''}</p>
                    <p style={{ fontSize:12, color:C.text3, margin:0 }}>{emp.designation??'—'}</p>
                  </td>
                  <td style={{ padding:'13px 18px', fontSize:13, color:C.text2, borderBottom:'1px solid #f1f5f9' }}>{emp.department??'—'}</td>
                  <td style={{ padding:'13px 18px', fontSize:13, color:C.text2, borderBottom:'1px solid #f1f5f9' }}>
                    {emp.employmentType?.replace(/_/g,' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) ?? '—'}
                  </td>
                  <td style={{ padding:'13px 18px', borderBottom:'1px solid #f1f5f9' }}>
                    <span style={{ fontSize:11, fontWeight:700, padding:'4px 12px', borderRadius:20,
                      background: emp.status==='active'?'#dcfce7':'#fee2e2',
                      color: emp.status==='active'?'#166534':'#991b1b' }}>
                      {emp.status ?? 'active'}
                    </span>
                  </td>
                  <td style={{ padding:'13px 12px', borderBottom:'1px solid #f1f5f9' }} onClick={e => e.stopPropagation()}>
                    <div style={{ position:'relative' }}>
                      <button onClick={() => setMenuOpen(menuOpen === emp.id ? null : emp.id)}
                        style={{ background:'none', border:'none', cursor:'pointer', padding:'4px 8px', borderRadius:6, color:C.text3 }}
                        onMouseEnter={e => (e.currentTarget.style.background='#f1f5f9')}
                        onMouseLeave={e => (e.currentTarget.style.background='none')}>
                        <DotsThreeVertical size={18} weight="bold" />
                      </button>
                      {menuOpen === emp.id && (
                        <div style={{ position:'absolute', right:0, top:'100%', zIndex:100, background:'#fff',
                          border:'1.5px solid '+C.border, borderRadius:10, boxShadow:'0 8px 24px rgba(0,0,0,0.12)',
                          minWidth:170, overflow:'hidden', marginTop:4 }}>
                          {[
                            { icon:<PencilSimple size={14}/>, label:'Edit', color:C.text1, onClick:()=>openEdit(emp) },
                            { icon:<IdentificationCard size={14}/>, label:'ID Card (PDF)', color:C.blue, onClick: async () => { setMenuOpen(null); const { generateIdCard } = await import('./idCardPdf'); generateIdCard(emp) } },
                            { icon: emp.status==='active' ? <UserCircleMinus size={14}/> : <UserCircleCheck size={14}/>,
                              label: emp.status==='active' ? 'Deactivate' : 'Activate',
                              color: emp.status==='active' ? C.amber : C.green,
                              onClick: () => hrApi.updateEmployee(emp.id, { status: emp.status==='active'?'inactive':'active' })
                                .then(() => { qc.invalidateQueries({queryKey:['employees']}); setMenuOpen(null) })
                            },
                            { icon:<Trash size={14}/>, label:'Delete', color:C.red, onClick:()=>handleDelete(emp) },
                          ].map(item => (
                            <button key={item.label} onClick={item.onClick}
                              style={{ width:'100%', padding:'10px 14px', background:'none', border:'none', cursor:'pointer',
                                display:'flex', alignItems:'center', gap:10, fontSize:13, color:item.color, textAlign:'left' as any }}
                              onMouseEnter={e=>(e.currentTarget.style.background='#f8faff')}
                              onMouseLeave={e=>(e.currentTarget.style.background='none')}>
                              {item.icon}{item.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={showNew} onClose={closeModal} title={editId ? 'Edit Employee' : 'Add New Employee'} width="min(760px, 92vw)">
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {submitError && (
              <div style={{ padding:'10px 14px', background:'#fef2f2', border:'1.5px solid #fecaca', borderRadius:8, fontSize:13, color:'#b91c1c' }}>
                {submitError}
              </div>
            )}
            <div style={{ display:'flex', gap:0, borderBottom:'1.5px solid '+C.border }}>
              {([['personal','Personal Info'],['bank','Bank Details'],['salary','Salary']] as const).map(([t,l])=>(
                <button key={t} onClick={()=>setTab(t)}
                  style={{ padding:'8px 18px', fontSize:13, fontWeight:600, border:'none',
                    borderBottom:tab===t?'2px solid '+C.blue:'2px solid transparent',
                    background:'none', cursor:'pointer', color:tab===t?C.blue:C.text3, marginBottom:-1 }}>
                  {l}
                </button>
              ))}
            </div>

            {tab === 'personal' && (
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <div>
                    <Input label='Employee Code *' value={form.empCode} onChange={e=>setF('empCode',e.target.value)} placeholder='KIPL-DL-SXR-001' />
                    <p style={{ fontSize:11, color:C.text3, margin:'4px 0 0' }}>Format: KIPL-DL-SXR-001 · auto-suggested</p>
                  </div>
                  <Select label='Department *' value={form.department} onChange={e=>setF('department',e.target.value)} options={DEPTS} />
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <Input label='First Name *' value={form.firstName} onChange={e=>setF('firstName',e.target.value)} placeholder='Ravi' />
                  <Input label='Last Name' value={form.lastName} onChange={e=>setF('lastName',e.target.value)} placeholder='Kumar' />
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <Input label='Designation' value={form.designation} onChange={e=>setF('designation',e.target.value)} placeholder='Site Engineer' />
                  <Select label='Employment Type' value={form.employmentType} onChange={e=>setF('employmentType',e.target.value)} options={EMP_TYPES} />
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <Select label='Labour Category (for site-diary headcount)' value={form.labourCategory} onChange={e=>setF('labourCategory',e.target.value)} options={LABOUR_CATS} />
                  <div />
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <Input label='Phone' value={form.phone} onChange={e=>setF('phone',e.target.value)} placeholder='9876543210' />
                  <Input label='Email' type='email' value={form.email} onChange={e=>setF('email',e.target.value)} placeholder='ravi@example.com' />
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <Input label='Date of Joining' type='date' value={form.dateOfJoining} onChange={e=>setF('dateOfJoining',e.target.value)} />
                  <Input label='Date of Birth' type='date' value={form.dateOfBirth} onChange={e=>setF('dateOfBirth',e.target.value)} />
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <Input label='Aadhar No' value={form.aadharNo} onChange={e=>setF('aadharNo',e.target.value)} placeholder='123456789012' />
                  <Input label='PAN No' value={form.panNo} onChange={e=>setF('panNo',e.target.value)} placeholder='ABCDE1234F' />
                </div>
                <div style={{ background:'#f8fafc', border:'1.5px solid #e2e8f0', borderRadius:12, padding:'16px 18px', marginTop:4 }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: form.createLogin ? 16 : 0 }}>
                    <div>
                      <p style={{ fontSize:13, fontWeight:700, color:'#0f172a', margin:0 }}>Create System Login</p>
                      <p style={{ fontSize:11, color:'#94a3b8', margin:'2px 0 0' }}>Give this employee access to ProjectOS</p>
                    </div>
                    <div onClick={() => setF('createLogin', !form.createLogin)}
                      style={{ width:44, height:24, borderRadius:99, background: form.createLogin ? C.blue : '#e2e8f0',
                        position:'relative', transition:'background 0.2s', cursor:'pointer', flexShrink:0 }}>
                      <div style={{ width:20, height:20, borderRadius:'50%', background:'#fff', position:'absolute',
                        top:2, left: form.createLogin ? 22 : 2, transition:'left 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.2)' }} />
                    </div>
                  </div>
                  {form.createLogin && (
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                        <label style={{ fontSize:12, fontWeight:600, color:'#475569' }}>Login Email *</label>
                        <input value={form.loginEmail} onChange={e => setF('loginEmail', e.target.value)}
                          placeholder={form.firstName ? (form.firstName.toLowerCase() + '@kipl.in') : 'user@kipl.in'}
                          style={{ padding:'9px 12px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:13, outline:'none', fontFamily:'inherit' }} />
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                        <label style={{ fontSize:12, fontWeight:600, color:'#475569' }}>Role *</label>
                        <select value={form.loginRole} onChange={e => setF('loginRole', e.target.value)}
                          style={{ padding:'9px 12px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:13, outline:'none', background:'#fff', fontFamily:'inherit' }}>
                          <option value="project_manager">Project Manager</option>
                          <option value="liaison_officer">Liaison Officer</option>
                          <option value="engineer">Site Engineer</option>
                          <option value="hr_officer">HR Officer</option>
                          <option value="accounts">Accounts</option>
                          <option value="qa_engineer">QA Engineer</option>
                          <option value="supervisor">Site Supervisor</option>
                        </select>
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                        <label style={{ fontSize:12, fontWeight:600, color:'#475569' }}>Password *</label>
                        <input type="password" value={form.loginPassword} onChange={e => setF('loginPassword', e.target.value)}
                          placeholder="Min 8 characters"
                          style={{ padding:'9px 12px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:13, outline:'none', fontFamily:'inherit' }} />
                      </div>
                      <div style={{ display:'flex', alignItems:'flex-end', paddingBottom:2 }}>
                        <p style={{ fontSize:11, color:'#94a3b8', margin:0 }}>
                          Suggested: <strong style={{ color:C.blue }}>{form.firstName?.toLowerCase() || 'name'}@kipl.in</strong>
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {tab === 'bank' && (
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <Select label='Bank Name' value={form.bankAccount.bankName} onChange={e=>setBank('bankName',e.target.value)} options={BANKS} />
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <Input label='Account Number' value={form.bankAccount.accountNo} onChange={e=>setBank('accountNo',e.target.value)} placeholder='12345678901' />
                  <Input label='IFSC Code' value={form.bankAccount.ifsc} onChange={e=>setBank('ifsc',e.target.value)} placeholder='JAKA0TANKEE' />
                </div>
                <Input label='Branch' value={form.bankAccount.branch} onChange={e=>setBank('branch',e.target.value)} placeholder='Srinagar Main' />
              </div>
            )}

            {tab === 'salary' && (
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
                  <Input label='Basic Salary (₹)' type='number' value={form.baseSalary} onChange={e=>setF('baseSalary',e.target.value)} placeholder='25000' />
                  <Input label='HRA (₹)' type='number' value={form.hra} onChange={e=>setF('hra',e.target.value)} placeholder='5000' />
                  <Input label='Allowances (₹)' type='number' value={form.allowances} onChange={e=>setF('allowances',e.target.value)} placeholder='3000' />
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

            <div style={{ display:'flex', justifyContent:'flex-end', gap:10, paddingTop:4 }}>
              <Button variant='secondary' onClick={closeModal}>Cancel</Button>
              <Button variant='primary' loading={createM.isPending||updateM.isPending}
                onClick={submitForm} disabled={!form.empCode||!form.firstName}>
                {editId ? 'Save Changes' : 'Add Employee'}
              </Button>
            </div>
          </div>
        </Modal>
    </div>
  )
}