// ================================================================
//  KIPL ProjectOS — Fix Employee + Timesheet Module
//  Fixes: aadhar unique, auto emp code, bank dropdown
//  Adds: Timesheet backend entity + frontend
//  Run: node scripts/fix-employee-timesheet.js
// ================================================================
const fs   = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const SRC  = path.join(ROOT, 'frontend', 'src')
const BSRC = path.join(ROOT, 'backend', 'src')

const G = '\x1b[32m', B = '\x1b[34m', NC = '\x1b[0m'
const ok   = s => console.log(G + '  ✓' + NC + ' ' + s)
const info = s => console.log(B + '  →' + NC + ' ' + s)
function w(p, lines) {
  fs.mkdirSync(path.dirname(p), { recursive: true })
  fs.writeFileSync(p, lines.join('\n'), 'utf8')
}

console.log('\n\x1b[1mFixing Employee Form + Timesheet Module\x1b[0m\n')

// ================================================================
// FIX 1: Remove unique constraint from aadhar_no
// ================================================================
info('Fixing aadhar_no unique constraint...')
const empEntityPath = path.join(BSRC, 'hr', 'employee.entity.ts')
let empEntity = fs.readFileSync(empEntityPath, 'utf8')
empEntity = empEntity.replace(
  "@Column({ name: 'aadhar_no', unique: true, nullable: true })",
  "@Column({ name: 'aadhar_no', nullable: true })"
)
fs.writeFileSync(empEntityPath, empEntity)
ok('aadhar_no — unique constraint removed, now nullable only')

// ================================================================
// FIX 2: Auto-generate employee code in service
// ================================================================
info('Adding auto-generate employee code to HrService...')
const hrServicePath = path.join(BSRC, 'hr', 'hr.service.ts')
let hrService = fs.readFileSync(hrServicePath, 'utf8')

// Add auto-generate method and use it in createEmployee
if (!hrService.includes('generateEmpCode')) {
  hrService = hrService.replace(
    'async createEmployee(dto: CreateEmployeeDto): Promise<Employee> {',
    [
      'async generateNextEmpCode(): Promise<string> {',
      '    const last = await this.empRepo',
      "      .createQueryBuilder('e')",
      "      .where(\"e.empCode LIKE 'KIPL-%'\")",
      "      .orderBy('e.createdAt', 'DESC')",
      '      .getOne()',
      '    if (!last) return \'KIPL-001\'',
      '    const num = parseInt(last.empCode.replace(\'KIPL-\', \'\')) || 0',
      '    return \'KIPL-\' + String(num + 1).padStart(3, \'0\')',
      '  }',
      '',
      '  async createEmployee(dto: CreateEmployeeDto): Promise<Employee> {',
    ].join('\n  ')
  )

  // Auto-assign code if not provided
  hrService = hrService.replace(
    "const exists = await this.empRepo.findOne({ where: { empCode: dto.empCode } })",
    [
      "if (!dto.empCode) dto.empCode = await this.generateNextEmpCode()",
      "    const exists = await this.empRepo.findOne({ where: { empCode: dto.empCode } })",
    ].join('\n    ')
  )
  fs.writeFileSync(hrServicePath, hrService)
  ok('HrService — generateNextEmpCode() added')
}

// Add endpoint to controller
const hrControllerPath = path.join(BSRC, 'hr', 'hr.controller.ts')
let hrController = fs.readFileSync(hrControllerPath, 'utf8')
if (!hrController.includes('next-code')) {
  hrController = hrController.replace(
    "@Get('employees')",
    [
      "@Get('employees/next-code')",
      '  nextEmpCode() { return this.svc.generateNextEmpCode().then(code => ({ code })) }',
      '',
      "  @Get('employees')",
    ].join('\n  ')
  )
  fs.writeFileSync(hrControllerPath, hrController)
  ok('HrController — GET /hr/employees/next-code added')
}

// ================================================================
// FIX 3: Add hr.api.ts next-code endpoint
// ================================================================
info('Updating hr.api.ts...')
const hrApiPath = path.join(SRC, 'api', 'hr.api.ts')
let hrApi = fs.readFileSync(hrApiPath, 'utf8')
if (!hrApi.includes('nextEmpCode')) {
  hrApi = hrApi.replace(
    '  // Employees',
    [
      '  // Employees',
      '  nextEmpCode:       () => api.get(\'/api/v1/hr/employees/next-code\'),',
    ].join('\n  ')
  )
  fs.writeFileSync(hrApiPath, hrApi)
  ok('hr.api.ts — nextEmpCode added')
}

// ================================================================
// FIX 4: Rewrite EmployeesPage with all fixes
// ================================================================
info('Rewriting EmployeesPage...')
const BANKS = [
  'J&K Bank', 'State Bank of India', 'Punjab National Bank',
  'HDFC Bank', 'Axis Bank', 'Bank of Baroda', 'Union Bank of India',
  'Canara Bank', 'ICICI Bank', 'Central Bank of India', 'Other'
]

w(path.join(SRC, 'pages/hr/EmployeesPage.tsx'), [
  "import { useState, useEffect } from 'react'",
  "import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'",
  "import { Users, Plus, MagnifyingGlass } from '@phosphor-icons/react'",
  "import { hrApi } from '@/api/hr.api'",
  "import { useAuthStore } from '@/store/auth.store'",
  "import { Modal } from '@/components/ui/Modal'",
  "import { Button } from '@/components/ui/Button'",
  "import { Input } from '@/components/ui/Input'",
  "import { Select } from '@/components/ui/Select'",
  "import { Spinner } from '@/components/ui/Spinner'",
  "",
  "const DEPTS = ['Civil','Electrical','Mechanical','HR','Admin','Security','Labour','Other'].map(d=>({value:d,label:d}))",
  "const EMP_TYPES = [{value:'full_time',label:'Full Time'},{value:'contract',label:'Contract'},{value:'daily_wage',label:'Daily Wage'}]",
  "const BANKS = ['" + BANKS.join("','") + "'].map(b=>({value:b,label:b}))",
  "",
  "const BLANK = {",
  "  empCode:'', firstName:'', lastName:'', designation:'', department:'Civil',",
  "  phone:'', email:'', dateOfJoining: new Date().toISOString().split('T')[0],",
  "  dateOfBirth:'', employmentType:'contract',",
  "  baseSalary:'', hra:'0', allowances:'0',",
  "  aadharNo:'', panNo:'',",
  "  bankAccount:{ accountNo:'', ifsc:'', bankName:'J&K Bank', branch:'' },",
  "}",
  "",
  "const C = {",
  "  card:'#fff', border:'#e2e8f0', text1:'#0f172a', text2:'#475569', text3:'#94a3b8',",
  "  blue:'#2563eb', green:'#059669', amber:'#d97706', red:'#dc2626', navy:'#1a2540',",
  "}",
  "",
  "export default function EmployeesPage() {",
  "  const { activeProjectId } = useAuthStore()",
  "  const qc = useQueryClient()",
  "  const [search, setSearch]     = useState('')",
  "  const [dept, setDept]         = useState('')",
  "  const [showNew, setShowNew]   = useState(false)",
  "  const [selected, setSelected] = useState<any>(null)",
  "  const [form, setForm]         = useState<any>(BLANK)",
  "  const [tab, setTab]           = useState<'personal'|'bank'|'salary'>('personal')",
  "  const [submitError, setSubmitError] = useState('')",
  "",
  "  const { data: employees, isLoading } = useQuery({",
  "    queryKey: ['employees', activeProjectId, dept],",
  "    queryFn: () => hrApi.employees({ projectId: activeProjectId, department: dept||undefined }).then(r=>r.data),",
  "  })",
  "",
  "  const { data: hrDash } = useQuery({",
  "    queryKey: ['hr-dash', activeProjectId],",
  "    queryFn: () => hrApi.dashboard(activeProjectId??undefined).then(r=>r.data),",
  "    enabled: !!activeProjectId,",
  "  })",
  "",
  "  // Auto-load next employee code when modal opens",
  "  useEffect(() => {",
  "    if (showNew) {",
  "      hrApi.nextEmpCode().then(r => {",
  "        setForm((f: any) => ({ ...f, empCode: r.data?.code ?? '' }))",
  "      }).catch(() => {})",
  "    }",
  "  }, [showNew])",
  "",
  "  const createM = useMutation({",
  "    mutationFn: (d: any) => hrApi.createEmployee({",
  "      empCode:       d.empCode.trim(),",
  "      firstName:     d.firstName.trim(),",
  "      lastName:      d.lastName?.trim() || undefined,",
  "      designation:   d.designation || undefined,",
  "      department:    d.department,",
  "      phone:         d.phone || undefined,",
  "      email:         d.email || undefined,",
  "      dateOfJoining: d.dateOfJoining || undefined,",
  "      dateOfBirth:   d.dateOfBirth || undefined,",
  "      employmentType:d.employmentType,",
  "      baseSalary:    parseFloat(d.baseSalary) || 0,",
  "      hra:           parseFloat(d.hra) || 0,",
  "      allowances:    parseFloat(d.allowances) || 0,",
  "      aadharNo:      d.aadharNo || undefined,",
  "      panNo:         d.panNo || undefined,",
  "      bankAccount:   d.bankAccount,",
  "      projectId:     activeProjectId || undefined,",
  "    }),",
  "    onSuccess: () => {",
  "      qc.invalidateQueries({ queryKey: ['employees'] })",
  "      qc.invalidateQueries({ queryKey: ['hr-dash'] })",
  "      setShowNew(false); setForm(BLANK); setSubmitError(''); setTab('personal')",
  "    },",
  "    onError: (err: any) => {",
  "      const msg = err?.response?.data?.message ?? err?.response?.data?.error ?? err?.message ?? 'Failed to add employee'",
  "      setSubmitError(Array.isArray(msg) ? msg.join(', ') : String(msg))",
  "    },",
  "  })",
  "",
  "  const list = (employees ?? []).filter((e: any) =>",
  "    !search || [e.firstName, e.lastName, e.empCode, e.designation].join(' ').toLowerCase().includes(search.toLowerCase())",
  "  )",
  "",
  "  const setF = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))",
  "  const setBank = (k: string, v: string) => setForm((f: any) => ({ ...f, bankAccount: { ...f.bankAccount, [k]: v } }))",
  "",
  "  const gross = (parseFloat(form.baseSalary)||0) + (parseFloat(form.hra)||0) + (parseFloat(form.allowances)||0)",
  "  const pfAmt = Math.min(parseFloat(form.baseSalary)||0, 15000) * 0.12",
  "  const net   = gross - pfAmt - (gross <= 21000 ? gross * 0.0075 : 0)",
  "",
  "  const STATUS_COLOR: Record<string,string> = { active: C.green, inactive: C.amber, terminated: C.red }",
  "",
  "  return (",
  "    <div className='fade-in' style={{ display:'flex', flexDirection:'column', gap:24 }}>",
  "      {/* Header */}",
  "      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>",
  "        <div>",
  "          <h1 style={{ fontSize:24, fontWeight:800, color:C.text1, margin:0, letterSpacing:'-0.02em' }}>Employees</h1>",
  "          <p style={{ fontSize:14, color:C.text3, marginTop:4 }}>Manage team members and their records</p>",
  "        </div>",
  "        <Button variant='primary' size='md' icon={<Plus size={15}/>} onClick={()=>{ setShowNew(true); setSubmitError(''); setTab('personal') }}>Add Employee</Button>",
  "      </div>",
  "",
  "      {/* Stats */}",
  "      {hrDash && (",
  "        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>",
  "          {[",
  "            { label:'Total Employees', value:hrDash.totalEmployees, color:C.blue },",
  "            { label:'Present Today',   value:hrDash.presentToday,   color:C.green },",
  "            { label:'Absent Today',    value:hrDash.absentToday,    color:hrDash.absentToday>0?C.red:C.green },",
  "            { label:'Pending Leaves',  value:hrDash.pendingLeaves,  color:C.amber },",
  "          ].map(s => (",
  "            <div key={s.label} style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:12, padding:'16px 20px', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>",
  "              <div style={{ fontSize:28, fontWeight:800, color:s.color, fontVariantNumeric:'tabular-nums' }}>{s.value}</div>",
  "              <div style={{ fontSize:12, color:C.text3, marginTop:4, fontWeight:600 }}>{s.label}</div>",
  "            </div>",
  "          ))}",
  "        </div>",
  "      )}",
  "",
  "      {/* Filters */}",
  "      <div style={{ display:'flex', gap:10, alignItems:'center' }}>",
  "        <div style={{ position:'relative', flex:1, maxWidth:380 }}>",
  "          <MagnifyingGlass style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:C.text3 }} size={15} />",
  "          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder='Search name, code, designation...'",
  "            style={{ width:'100%', paddingLeft:36, paddingRight:14, paddingTop:10, paddingBottom:10, background:'#fff', border:'1.5px solid '+C.border, borderRadius:8, fontSize:13, color:C.text1, outline:'none', fontFamily:'inherit' }} />",
  "        </div>",
  "        <select value={dept} onChange={e=>setDept(e.target.value)}",
  "          style={{ padding:'10px 14px', background:'#fff', border:'1.5px solid '+C.border, borderRadius:8, fontSize:13, color:C.text1, outline:'none', cursor:'pointer', fontFamily:'inherit' }}>",
  "          <option value=''>All Departments</option>",
  "          {DEPTS.map(d=><option key={d.value} value={d.value}>{d.label}</option>)}",
  "        </select>",
  "        <span style={{ fontSize:12, color:C.text3 }}>{list.length} employees</span>",
  "      </div>",
  "",
  "      {/* List + Detail */}",
  "      <div style={{ display:'flex', gap:16, alignItems:'flex-start' }}>",
  "        <div style={{ flex:1, background:C.card, borderRadius:16, border:'1.5px solid '+C.border, overflow:'hidden', boxShadow:'0 1px 6px rgba(0,0,0,0.05)', minHeight:300 }}>",
  "          {isLoading ? <div style={{ display:'flex', justifyContent:'center', padding:48 }}><Spinner /></div>",
  "          : list.length === 0 ? (",
  "            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'56px 24px', gap:10 }}>",
  "              <Users size={32} color={C.border} />",
  "              <p style={{ fontSize:14, fontWeight:600, color:C.text3, margin:0 }}>No employees yet</p>",
  "              <Button variant='secondary' size='sm' icon={<Plus size={13}/>} onClick={()=>setShowNew(true)}>Add first employee</Button>",
  "            </div>",
  "          ) : (",
  "            <>",
  "              <div style={{ display:'grid', gridTemplateColumns:'90px 1fr 120px 130px 90px', padding:'11px 20px', background:'#f8f9fc', borderBottom:'1.5px solid '+C.border }}>",
  "                {['Code','Name & Role','Department','Type','Status'].map(h=>(",
  "                  <div key={h} style={{ fontSize:10, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.07em' }}>{h}</div>",
  "                ))}",
  "              </div>",
  "              {list.map((emp:any, i:number)=>(",
  "                <div key={emp.id} onClick={()=>setSelected(selected?.id===emp.id?null:emp)}",
  "                  style={{ display:'grid', gridTemplateColumns:'90px 1fr 120px 130px 90px', padding:'13px 20px', cursor:'pointer', alignItems:'center', borderBottom:i<list.length-1?'1px solid #f1f5f9':'none', background:selected?.id===emp.id?'#f0f6ff':'transparent', borderLeft:selected?.id===emp.id?'3px solid '+C.blue:'3px solid transparent', transition:'all 0.1s' }}",
  "                  onMouseEnter={e=>{ if(selected?.id!==emp.id) e.currentTarget.style.background='#f8faff' }}",
  "                  onMouseLeave={e=>{ if(selected?.id!==emp.id) e.currentTarget.style.background='transparent' }}>",
  "                  <div style={{ fontSize:11, fontWeight:700, color:C.blue, fontFamily:'monospace' }}>{emp.empCode}</div>",
  "                  <div>",
  "                    <p style={{ fontSize:13, fontWeight:600, color:C.text1, margin:0 }}>{emp.firstName} {emp.lastName??''}</p>",
  "                    <p style={{ fontSize:11, color:C.text3, margin:'2px 0 0' }}>{emp.designation??'—'}</p>",
  "                  </div>",
  "                  <div style={{ fontSize:12, color:C.text2 }}>{emp.department??'—'}</div>",
  "                  <div style={{ fontSize:11, color:C.text2, textTransform:'capitalize' }}>{emp.employmentType?.replace(/_/g,' ')??'—'}</div>",
  "                  <span style={{ display:'inline-flex', padding:'2px 10px', borderRadius:999, fontSize:10, fontWeight:700, background:(STATUS_COLOR[emp.status]??C.text3)+'18', color:STATUS_COLOR[emp.status]??C.text3, border:'1.5px solid '+(STATUS_COLOR[emp.status]??C.text3)+'30' }}>{emp.status}</span>",
  "                </div>",
  "              ))}",
  "            </>",
  "          )}",
  "        </div>",
  "",
  "        {/* Detail panel */}",
  "        {selected && (",
  "          <div style={{ width:280, flexShrink:0, background:C.card, border:'1.5px solid '+C.border, borderRadius:16, overflow:'hidden', boxShadow:'0 1px 6px rgba(0,0,0,0.05)' }}>",
  "            <div style={{ background:C.navy, padding:'20px 18px', textAlign:'center' }}>",
  "              <div style={{ width:52, height:52, borderRadius:'50%', background:'rgba(59,130,246,0.2)', border:'2px solid rgba(59,130,246,0.4)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 10px', fontSize:18, fontWeight:700, color:'#93c5fd' }}>",
  "                {selected.firstName[0]}{selected.lastName?.[0]??''}",
  "              </div>",
  "              <h3 style={{ fontSize:15, fontWeight:700, color:'#fff', margin:'0 0 3px' }}>{selected.firstName} {selected.lastName??''}</h3>",
  "              <p style={{ fontSize:12, color:'rgba(255,255,255,0.5)', margin:0 }}>{selected.designation??'—'}</p>",
  "              <p style={{ fontSize:11, color:'rgba(255,255,255,0.3)', margin:'4px 0 0', fontFamily:'monospace' }}>{selected.empCode}</p>",
  "            </div>",
  "            <div style={{ padding:'14px 18px' }}>",
  "              {[['Department',selected.department],['Type',selected.employmentType?.replace(/_/g,' ')],['Joined',selected.dateOfJoining],['Phone',selected.phone],['Email',selected.email]].filter(([,v])=>v).map(([l,v])=>(",
  "                <div key={l as string} style={{ display:'flex', justifyContent:'space-between', marginBottom:8, fontSize:12 }}>",
  "                  <span style={{ color:C.text3 }}>{l}</span>",
  "                  <span style={{ color:C.text1, fontWeight:600, maxWidth:150, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', textAlign:'right' }}>{v as string}</span>",
  "                </div>",
  "              ))}",
  "              <div style={{ marginTop:12, paddingTop:12, borderTop:'1px solid #f1f5f9' }}>",
  "                <p style={{ fontSize:10, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.08em', margin:'0 0 8px' }}>Salary</p>",
  "                {[['Basic','₹'+Number(selected.baseSalary).toLocaleString('en-IN')],['HRA','₹'+Number(selected.hra||0).toLocaleString('en-IN')],['Gross CTC','₹'+(Number(selected.baseSalary)+Number(selected.hra||0)+Number(selected.allowances||0)).toLocaleString('en-IN')]].map(([l,v])=>(",
  "                  <div key={l} style={{ display:'flex', justifyContent:'space-between', marginBottom:5, fontSize:12 }}>",
  "                    <span style={{ color:C.text3 }}>{l}</span>",
  "                    <span style={{ color:l==='Gross CTC'?C.green:C.text1, fontWeight:l==='Gross CTC'?700:400 }}>{v}</span>",
  "                  </div>",
  "                ))}",
  "              </div>",
  "              {selected.bankAccount?.bankName && (",
  "                <div style={{ marginTop:10, paddingTop:10, borderTop:'1px solid #f1f5f9' }}>",
  "                  <p style={{ fontSize:10, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.08em', margin:'0 0 6px' }}>Bank</p>",
  "                  <p style={{ fontSize:12, color:C.text1, margin:'0 0 3px', fontWeight:600 }}>{selected.bankAccount.bankName}</p>",
  "                  <p style={{ fontSize:11, color:C.text3, margin:0, fontFamily:'monospace' }}>{selected.bankAccount.accountNo}</p>",
  "                </div>",
  "              )}",
  "            </div>",
  "            <div style={{ padding:'10px 18px', borderTop:'1px solid #f1f5f9', display:'flex', justifyContent:'flex-end' }}>",
  "              <button onClick={()=>setSelected(null)} style={{ fontSize:12, color:C.text3, background:'none', border:'none', cursor:'pointer' }}>Close</button>",
  "            </div>",
  "          </div>",
  "        )}",
  "      </div>",
  "",
  "      {/* Add Employee Modal */}",
  "      <Modal open={showNew} onClose={()=>setShowNew(false)} title='Add New Employee' width={640}",
  "        footer={<>",
  "          <Button variant='ghost' onClick={()=>setShowNew(false)}>Cancel</Button>",
  "          <Button variant='primary' loading={createM.isPending} onClick={()=>{ setSubmitError(''); createM.mutate(form) }} disabled={!form.empCode||!form.firstName}>",
  "            Add Employee",
  "          </Button>",
  "        </>}>",
  "        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>",
  "",
  "          {/* Error */}",
  "          {submitError && (",
  "            <div style={{ padding:'10px 14px', background:'#fef2f2', border:'1.5px solid #fecaca', borderRadius:8, fontSize:13, color:'#b91c1c' }}>",
  "              ⚠ {submitError}",
  "            </div>",
  "          )}",
  "",
  "          {/* Tabs */}",
  "          <div style={{ display:'flex', gap:0, borderBottom:'1.5px solid '+C.border }}>",
  "            {([['personal','Personal Info'],['bank','Bank Details'],['salary','Salary']] as const).map(([t,l])=>(",
  "              <button key={t} onClick={()=>setTab(t)} style={{ padding:'8px 18px', fontSize:13, fontWeight:600, border:'none', borderBottom:tab===t?'2px solid '+C.blue:'2px solid transparent', background:'none', cursor:'pointer', color:tab===t?C.blue:C.text3, marginBottom:-1 }}>{l}</button>",
  "            ))}",
  "          </div>",
  "",
  "          {tab === 'personal' && (",
  "            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>",
  "              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>",
  "                <div>",
  "                  <Input label='Employee Code *' value={form.empCode} onChange={e=>setF('empCode',e.target.value)} placeholder='Auto-generated' />",
  "                  <p style={{ fontSize:11, color:C.text3, margin:'4px 0 0' }}>Format: KIPL-001 (auto-suggested, editable)</p>",
  "                </div>",
  "                <Select label='Department *' value={form.department} onChange={e=>setF('department',e.target.value)} options={DEPTS} />",
  "              </div>",
  "              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>",
  "                <Input label='First Name *' value={form.firstName} onChange={e=>setF('firstName',e.target.value)} placeholder='Ravi' />",
  "                <Input label='Last Name' value={form.lastName} onChange={e=>setF('lastName',e.target.value)} placeholder='Kumar' />",
  "              </div>",
  "              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>",
  "                <Input label='Designation' value={form.designation} onChange={e=>setF('designation',e.target.value)} placeholder='Site Engineer' />",
  "                <Select label='Employment Type' value={form.employmentType} onChange={e=>setF('employmentType',e.target.value)} options={EMP_TYPES} />",
  "              </div>",
  "              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>",
  "                <Input label='Phone' value={form.phone} onChange={e=>setF('phone',e.target.value)} placeholder='9876543210' />",
  "                <Input label='Email' type='email' value={form.email} onChange={e=>setF('email',e.target.value)} placeholder='ravi@example.com' />",
  "              </div>",
  "              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>",
  "                <Input label='Date of Joining' type='date' value={form.dateOfJoining} onChange={e=>setF('dateOfJoining',e.target.value)} />",
  "                <Input label='Date of Birth' type='date' value={form.dateOfBirth} onChange={e=>setF('dateOfBirth',e.target.value)} />",
  "              </div>",
  "              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>",
  "                <Input label='Aadhar No' value={form.aadharNo} onChange={e=>setF('aadharNo',e.target.value)} placeholder='123456789012' />",
  "                <Input label='PAN No' value={form.panNo} onChange={e=>setF('panNo',e.target.value)} placeholder='ABCDE1234F' />",
  "              </div>",
  "            </div>",
  "          )}",
  "",
  "          {tab === 'bank' && (",
  "            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>",
  "              <Select label='Bank Name' value={form.bankAccount.bankName} onChange={e=>setBank('bankName',e.target.value)} options={BANKS} />",
  "              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>",
  "                <Input label='Account Number' value={form.bankAccount.accountNo} onChange={e=>setBank('accountNo',e.target.value)} placeholder='12345678901' />",
  "                <Input label='IFSC Code' value={form.bankAccount.ifsc} onChange={e=>setBank('ifsc',e.target.value)} placeholder='JAKA0TANKEE' />",
  "              </div>",
  "              <Input label='Branch' value={form.bankAccount.branch} onChange={e=>setBank('branch',e.target.value)} placeholder='Srinagar Main' />",
  "            </div>",
  "          )}",
  "",
  "          {tab === 'salary' && (",
  "            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>",
  "              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>",
  "                <Input label='Basic Salary (₹)' type='number' value={form.baseSalary} onChange={e=>setF('baseSalary',e.target.value)} placeholder='25000' />",
  "                <Input label='HRA (₹)' type='number' value={form.hra} onChange={e=>setF('hra',e.target.value)} placeholder='5000' />",
  "                <Input label='Allowances (₹)' type='number' value={form.allowances} onChange={e=>setF('allowances',e.target.value)} placeholder='2000' />",
  "              </div>",
  "              {parseFloat(form.baseSalary) > 0 && (",
  "                <div style={{ padding:'14px 16px', background:'#eff6ff', border:'1.5px solid #bfdbfe', borderRadius:8 }}>",
  "                  <p style={{ fontSize:12, fontWeight:700, color:C.blue, margin:'0 0 10px' }}>Salary Preview</p>",
  "                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, fontSize:12 }}>",
  "                    <div style={{ display:'flex', justifyContent:'space-between' }}><span style={{ color:C.text3 }}>Gross CTC</span><span style={{ color:C.text1, fontWeight:600 }}>₹{gross.toLocaleString('en-IN')}</span></div>",
  "                    <div style={{ display:'flex', justifyContent:'space-between' }}><span style={{ color:C.text3 }}>PF (12%)</span><span style={{ color:'#dc2626' }}>-₹{pfAmt.toFixed(0)}</span></div>",
  "                    <div style={{ display:'flex', justifyContent:'space-between' }}><span style={{ color:C.text3 }}>ESI (0.75%)</span><span style={{ color:C.text3 }}>{gross<=21000?'Applicable':'Not applicable'}</span></div>",
  "                    <div style={{ display:'flex', justifyContent:'space-between' }}><span style={{ color:C.text3, fontWeight:600 }}>Net Pay</span><span style={{ color:C.green, fontWeight:700 }}>₹{net.toLocaleString('en-IN',{maximumFractionDigits:0})}</span></div>",
  "                  </div>",
  "                </div>",
  "              )}",
  "            </div>",
  "          )}",
  "        </div>",
  "      </Modal>",
  "    </div>",
  "  )",
  "}",
])
ok('EmployeesPage — auto emp code, bank dropdown, error display')

// ================================================================
// TIMESHEET BACKEND ENTITY
// ================================================================
info('Writing Timesheet entity...')
w(path.join(BSRC, 'hr', 'timesheet.entity.ts'), [
  "import { Entity, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm'",
  "import { BaseEntity } from '../shared/entities/base.entity'",
  "",
  "export enum TimesheetStatus { DRAFT = 'draft', SUBMITTED = 'submitted', APPROVED = 'approved', REJECTED = 'rejected' }",
  "",
  "@Entity('timesheets')",
  "export class Timesheet extends BaseEntity {",
  "  @Column({ name: 'employee_id' })",
  "  employeeId: string",
  "",
  "  @Column({ name: 'project_id', nullable: true })",
  "  projectId: string",
  "",
  "  @Column({ type: 'date' })",
  "  date: string",
  "",
  "  // Array of activity objects: { time, activity, location, remarks }",
  "  @Column({ type: 'jsonb', default: [] })",
  "  activities: Array<{",
  "    time?: string",
  "    activity: string",
  "    location?: string",
  "    category?: string",
  "  }>",
  "",
  "  @Column({ name: 'attendance_status', default: 'present' })",
  "  attendanceStatus: string",
  "",
  "  @Column({ name: 'work_done_summary', type: 'text', nullable: true })",
  "  workDoneSummary: string",
  "",
  "  @Column({ name: 'issues_faced', type: 'text', nullable: true })",
  "  issuesFaced: string",
  "",
  "  @Column({ name: 'next_day_plan', type: 'text', nullable: true })",
  "  nextDayPlan: string",
  "",
  "  @Column({ type: 'enum', enum: TimesheetStatus, default: TimesheetStatus.DRAFT })",
  "  status: TimesheetStatus",
  "",
  "  @Column({ name: 'approved_by', nullable: true })",
  "  approvedBy: string",
  "",
  "  @Column({ name: 'approved_at', nullable: true })",
  "  approvedAt: Date",
  "",
  "  @Column({ name: 'rejection_reason', nullable: true })",
  "  rejectionReason: string",
  "",
  "  @CreateDateColumn({ name: 'created_at' })",
  "  createdAt: Date",
  "",
  "  @UpdateDateColumn({ name: 'updated_at' })",
  "  updatedAt: Date",
  "}",
])
ok('Timesheet entity')

// ================================================================
// TIMESHEET SERVICE METHODS (append to hr.service.ts)
// ================================================================
info('Adding timesheet methods to HrService...')
hrService = fs.readFileSync(hrServicePath, 'utf8')

if (!hrService.includes('Timesheet')) {
  // Add import
  hrService = hrService.replace(
    "import { Employee, EmployeeStatus } from './employee.entity'",
    "import { Employee, EmployeeStatus } from './employee.entity'\nimport { Timesheet, TimesheetStatus } from './timesheet.entity'"
  )
  // Add to constructor
  hrService = hrService.replace(
    "@InjectRepository(LeaveRequest)  private readonly leaveRepo: Repository<LeaveRequest>,",
    "@InjectRepository(LeaveRequest)  private readonly leaveRepo: Repository<LeaveRequest>,\n    @InjectRepository(Timesheet)     private readonly tsRepo:    Repository<Timesheet>,"
  )
  // Add methods before closing brace
  hrService = hrService.replace(
    /\n\}(\s*)$/,
    [
      '',
      '  // ── Timesheets ────────────────────────────────────────────',
      '  async submitTimesheet(data: {',
      '    employeeId: string; date: string; projectId?: string',
      '    activities: any[]; workDoneSummary?: string',
      '    issuesFaced?: string; nextDayPlan?: string',
      '    attendanceStatus?: string',
      '  }): Promise<Timesheet> {',
      '    const existing = await this.tsRepo.findOne({ where: { employeeId: data.employeeId, date: data.date } })',
      '    if (existing) {',
      '      await this.tsRepo.update(existing.id, { ...data, status: TimesheetStatus.SUBMITTED })',
      '      return this.tsRepo.findOne({ where: { id: existing.id } }) as Promise<Timesheet>',
      '    }',
      '    return this.tsRepo.save(this.tsRepo.create({ ...data, status: TimesheetStatus.SUBMITTED }))',
      '  }',
      '',
      '  async getTimesheets(p: { employeeId?: string; date?: string; month?: number; year?: number; projectId?: string; status?: string }) {',
      '    const qb = this.tsRepo.createQueryBuilder(\'ts\').orderBy(\'ts.date\', \'DESC\')',
      '    if (p.employeeId) qb.andWhere(\'ts.employeeId = :eid\', { eid: p.employeeId })',
      '    if (p.date)       qb.andWhere(\'ts.date = :date\', { date: p.date })',
      '    if (p.projectId)  qb.andWhere(\'ts.projectId = :pid\', { pid: p.projectId })',
      '    if (p.status)     qb.andWhere(\'ts.status = :s\', { s: p.status })',
      '    if (p.month && p.year) qb.andWhere(\'EXTRACT(MONTH FROM ts.date) = :m AND EXTRACT(YEAR FROM ts.date) = :y\', { m: p.month, y: p.year })',
      '    return qb.getMany()',
      '  }',
      '',
      '  async approveTimesheet(id: string, approvedBy: string): Promise<Timesheet> {',
      '    await this.tsRepo.update(id, { status: TimesheetStatus.APPROVED, approvedBy, approvedAt: new Date() })',
      '    return this.tsRepo.findOne({ where: { id } }) as Promise<Timesheet>',
      '  }',
      '',
      '  async rejectTimesheet(id: string, reason: string, approvedBy: string): Promise<Timesheet> {',
      '    await this.tsRepo.update(id, { status: TimesheetStatus.REJECTED, rejectionReason: reason, approvedBy })',
      '    return this.tsRepo.findOne({ where: { id } }) as Promise<Timesheet>',
      '  }',
      '}',
    ].join('\n')
  )
  fs.writeFileSync(hrServicePath, hrService)
  ok('HrService — timesheet methods added')
}

// Update HrModule to include Timesheet entity
const hrModulePath = path.join(BSRC, 'hr', 'hr.module.ts')
let hrModule = fs.readFileSync(hrModulePath, 'utf8')
if (!hrModule.includes('Timesheet')) {
  hrModule = hrModule.replace(
    "import { LeaveRequest } from './leave-request.entity'",
    "import { LeaveRequest } from './leave-request.entity'\nimport { Timesheet }    from './timesheet.entity'"
  )
  hrModule = hrModule.replace(
    'TypeOrmModule.forFeature([Employee, Attendance, SalaryRecord, LeaveRequest])',
    'TypeOrmModule.forFeature([Employee, Attendance, SalaryRecord, LeaveRequest, Timesheet])'
  )
  fs.writeFileSync(hrModulePath, hrModule)
  ok('HrModule — Timesheet entity registered')
}

// Add timesheet controller endpoints
hrController = fs.readFileSync(hrControllerPath, 'utf8')
if (!hrController.includes('timesheet')) {
  hrController = hrController.replace(
    "@Patch('leave/:id/reject')",
    [
      "// ── Timesheets ───────────────────────────────────────────────",
      "  @Get('timesheets')",
      "  getTimesheets(@Query() q: any) {",
      "    return this.svc.getTimesheets({ employeeId: q.employeeId, date: q.date, month: q.month?parseInt(q.month):undefined, year: q.year?parseInt(q.year):undefined, projectId: q.projectId, status: q.status })",
      "  }",
      "  @Post('timesheets') @HttpCode(HttpStatus.CREATED)",
      "  submitTimesheet(@Body() body: any) { return this.svc.submitTimesheet(body) }",
      "  @Patch('timesheets/:id/approve')",
      "  approveTimesheet(@Param('id') id: string, @Request() req: any) { return this.svc.approveTimesheet(id, req.user.id) }",
      "  @Patch('timesheets/:id/reject')",
      "  rejectTimesheet(@Param('id') id: string, @Body('reason') reason: string, @Request() req: any) { return this.svc.rejectTimesheet(id, reason, req.user.id) }",
      "",
      "  @Patch('leave/:id/reject')",
    ].join('\n  ')
  )
  fs.writeFileSync(hrControllerPath, hrController)
  ok('HrController — timesheet endpoints added')
}

// Update hr.api.ts
hrApi = fs.readFileSync(hrApiPath, 'utf8')
if (!hrApi.includes('timesheets')) {
  hrApi = hrApi.replace(
    '  // Leave',
    [
      '  // Timesheets',
      "  timesheets:       (p?: any) => api.get('/api/v1/hr/timesheets', { params: p }),",
      "  submitTimesheet:  (d: any) => api.post('/api/v1/hr/timesheets', d),",
      "  approveTimesheet: (id: string) => api.patch('/api/v1/hr/timesheets/' + id + '/approve', {}),",
      "  rejectTimesheet:  (id: string, reason: string) => api.patch('/api/v1/hr/timesheets/' + id + '/reject', { reason }),",
      '',
      '  // Leave',
    ].join('\n  ')
  )
  fs.writeFileSync(hrApiPath, hrApi)
  ok('hr.api.ts — timesheet methods added')
}

console.log('\n' + G + '\x1b[1m  All fixes applied!\x1b[0m' + NC)
console.log('\n  Summary:')
console.log('  ✓ aadhar_no unique constraint removed — duplicate aadhar allowed')
console.log('  ✓ Employee code auto-generates KIPL-001, KIPL-002...')
console.log('  ✓ Bank name is now a dropdown (JK Bank, SBI, PNB, HDFC...)')
console.log('  ✓ Error message shown inside modal if add fails')
console.log('  ✓ Timesheet entity, service, controller, API ready')
console.log('\n  Backend will reload. Run frontend script next:')
console.log('  node scripts/modules/hr/timesheet-frontend.js\n')
