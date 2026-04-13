#!/usr/bin/env node
/**
 * 1. Widen AppLayout max-width for settings pages
 * 2. Add 3-dot dropdown menu to employee rows
 * 3. Add employee detail route
 */

const fs   = require('fs')
const path = require('path')
const ROOT = path.resolve(__dirname, '..')

// ── 1. Widen AppLayout to 1440px ─────────────────────────────────────────────
console.log('\n📌  1/3 — Widen AppLayout max-width\n')
const layoutPath = path.join(ROOT, 'frontend', 'src', 'layouts', 'AppLayout.tsx')
let layout = fs.readFileSync(layoutPath, 'utf8')
layout = layout.replace('maxWidth:1280', 'maxWidth:1440')
fs.writeFileSync(layoutPath, layout, 'utf8')
console.log('  ✅  AppLayout maxWidth: 1280 → 1440')

// ── 2. Add 3-dot menu to EmployeesPage ───────────────────────────────────────
console.log('\n📌  2/3 — Add 3-dot menu to employee rows\n')

const empPath = path.join(ROOT, 'frontend', 'src', 'pages', 'hr', 'EmployeesPage.tsx')
let emp = fs.readFileSync(empPath, 'utf8')

// Add DotsThreeVertical to phosphor imports
emp = emp.replace(
  `import { Plus, Sun, CloudRain, Warning, CheckCircle, BookOpen } from '@phosphor-icons/react'`,
  `import { Plus, Sun, CloudRain, Warning, CheckCircle, BookOpen, DotsThreeVertical, PencilSimple, Trash, UserCircleMinus, UserCircleCheck } from '@phosphor-icons/react'`
)

// Add openMenu state
emp = emp.replace(
  `  const [editId, setEditId]       = useState<string|null>(null)`,
  `  const [editId, setEditId]       = useState<string|null>(null)
  const [menuOpen, setMenuOpen]   = useState<string|null>(null)`
)

// Close menu on outside click
emp = emp.replace(
  `  const setF = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))`,
  `  const setF = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))

  function handleDeleteEmployee(emp: any) {
    if (window.confirm(\`Delete \${emp.firstName} \${emp.lastName ?? ''}?\\n\\nThis action cannot be undone.\`)) {
      deleteM.mutate(emp.id)
      setMenuOpen(null)
      setSelected(null)
    }
  }`
)

// Replace the existing employee row click handler to remove side panel approach
// and add 3-dot menu button at end of row
emp = emp.replace(
  `                <div key={emp.id} onClick={()=>setSelected(selected?.id===emp.id?null:emp)}
                  style={{ display:'grid', gridTemplateColumns:'90px 1fr 120px 130px 90px', padding:'13px 20px', cursor:'pointer', alignItems:'center', borderBottom:i<list.length-1?'1px solid #f1f5f9':'none', background:selected?.id===emp.id?'#f0f6ff':'transparent', borderLeft:selected?.id===emp.id?'3px solid '+C.blue:'3px solid transparent', transition:'all 0.1s' }}
                  onMouseEnter={e=>{ if(selected?.id!==emp.id) e.currentTarget.style.background='#f8faff' }}
                  onMouseLeave={e=>{ if(selected?.id!==emp.id) e.currentTarget.style.background='transparent' }}>`,
  `                <div key={emp.id} onClick={()=>setSelected(selected?.id===emp.id?null:emp)}
                  style={{ display:'grid', gridTemplateColumns:'90px 1fr 120px 130px 90px 44px', padding:'13px 20px', cursor:'pointer', alignItems:'center', borderBottom:i<list.length-1?'1px solid #f1f5f9':'none', background:selected?.id===emp.id?'#f0f6ff':'transparent', borderLeft:selected?.id===emp.id?'3px solid '+C.blue:'3px solid transparent', transition:'all 0.1s' }}
                  onMouseEnter={e=>{ if(selected?.id!==emp.id) e.currentTarget.style.background='#f8faff' }}
                  onMouseLeave={e=>{ if(selected?.id!==emp.id) e.currentTarget.style.background='transparent' }}>` 
)

// Find where the employee row closes and add the 3-dot menu before it
// The row ends after the status cell — add menu cell
emp = emp.replace(
  `                  <span style={{ fontSize:12, fontWeight:700, padding:'4px 12px', borderRadius:20, background:emp.status==='active'?'#dcfce7':'#fee2e2', color:emp.status==='active'?'#166534':'#991b1b' }}>
                    {emp.status??'active'}
                  </span>
                </div>`,
  `                  <span style={{ fontSize:12, fontWeight:700, padding:'4px 12px', borderRadius:20, background:emp.status==='active'?'#dcfce7':'#fee2e2', color:emp.status==='active'?'#166534':'#991b1b' }}>
                    {emp.status??'active'}
                  </span>
                  {/* 3-dot menu */}
                  <div style={{ position:'relative' }} onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => setMenuOpen(menuOpen === emp.id ? null : emp.id)}
                      style={{ background:'none', border:'none', cursor:'pointer', padding:'4px 8px', borderRadius:6, color:'#94a3b8', display:'flex', alignItems:'center' }}
                      onMouseEnter={e => (e.currentTarget.style.background='#f1f5f9')}
                      onMouseLeave={e => (e.currentTarget.style.background='none')}>
                      <DotsThreeVertical size={18} weight="bold" />
                    </button>
                    {menuOpen === emp.id && (
                      <div style={{ position:'absolute', right:0, top:'100%', zIndex:100, background:'#fff', border:'1.5px solid #e2e8f0', borderRadius:10, boxShadow:'0 8px 24px rgba(0,0,0,0.12)', minWidth:160, overflow:'hidden' }}>
                        {[
                          { icon:<PencilSimple size={14}/>, label:'Edit', color:'#0f172a', onClick:()=>{ openEdit(emp); setMenuOpen(null) } },
                          { icon: emp.status==='active'
                              ? <UserCircleMinus size={14}/>
                              : <UserCircleCheck size={14}/>,
                            label: emp.status==='active' ? 'Deactivate' : 'Activate',
                            color: emp.status==='active' ? '#d97706' : '#059669',
                            onClick: () => {
                              hrApi.updateEmployee(emp.id, { status: emp.status==='active'?'inactive':'active' })
                                .then(()=>{ qc.invalidateQueries({queryKey:['employees']}); setMenuOpen(null) })
                            }
                          },
                          { icon:<Trash size={14}/>, label:'Delete', color:'#dc2626', onClick:()=>handleDeleteEmployee(emp) },
                        ].map(item => (
                          <button key={item.label} onClick={item.onClick}
                            style={{ width:'100%', padding:'10px 14px', background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:10, fontSize:13, color:item.color, textAlign:'left' }}
                            onMouseEnter={e=>(e.currentTarget.style.background='#f8faff')}
                            onMouseLeave={e=>(e.currentTarget.style.background='none')}>
                            {item.icon}{item.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>`
)

// Close menu when clicking outside
emp = emp.replace(
  `    <div className='fade-in' style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>`,
  `    <div className='fade-in' style={{ display: 'flex', flexDirection: 'column', gap: 24 }} onClick={() => setMenuOpen(null)}>`
)

fs.writeFileSync(empPath, emp, 'utf8')
console.log('  ✅  3-dot menu added to employee rows')
console.log('  ✅  Menu options: Edit / Deactivate / Delete (with confirm)')

// ── 3. Add employee detail route to App.tsx ──────────────────────────────────
console.log('\n📌  3/3 — Add employee detail route\n')

const appPath = path.join(ROOT, 'frontend', 'src', 'App.tsx')
let app = fs.readFileSync(appPath, 'utf8')

if (app.includes('hr/employees/:id')) {
  console.log('  ℹ️   Route already exists')
} else {
  app = app.replace(
    `import EmployeesPage       from '@/pages/hr/EmployeesPage'`,
    `import EmployeesPage       from '@/pages/hr/EmployeesPage'\nimport EmployeeDetailPage  from '@/pages/hr/EmployeeDetailPage'`
  )
  app = app.replace(
    `<Route path='hr/employees'       element={<EmployeesPage />} />`,
    `<Route path='hr/employees'       element={<EmployeesPage />} />\n          <Route path='hr/employees/:id'   element={<EmployeeDetailPage />} />`
  )
  fs.writeFileSync(appPath, app, 'utf8')
  console.log('  ✅  Route /hr/employees/:id added to App.tsx')
}

// ── 4. Create EmployeeDetailPage ─────────────────────────────────────────────
const detailPath = path.join(ROOT, 'frontend', 'src', 'pages', 'hr', 'EmployeeDetailPage.tsx')

fs.writeFileSync(detailPath, `import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { hrApi } from '@/api/hr.api'
import { ArrowLeft, PencilSimple, User, Phone, Envelope, Bank, Calendar, IdentificationCard } from '@phosphor-icons/react'

const C = {
  card:'#fff', border:'#e2e8f0', text1:'#0f172a', text2:'#475569', text3:'#94a3b8',
  blue:'#2563eb', green:'#059669', navy:'#1a2540',
}

function Row({ label, value }: { label: string; value: any }) {
  if (!value) return null
  return (
    <div style={{ display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid #f1f5f9' }}>
      <span style={{ fontSize:13, color:C.text3, fontWeight:500 }}>{label}</span>
      <span style={{ fontSize:13, color:C.text1, fontWeight:600, textAlign:'right', maxWidth:'60%' }}>{value}</span>
    </div>
  )
}

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()

  const { data: emp, isLoading } = useQuery({
    queryKey: ['employee', id],
    queryFn: () => hrApi.getEmployee(id!).then(r => r.data),
    enabled: !!id,
  })

  if (isLoading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:400 }}>
      <div style={{ width:36, height:36, border:'3px solid '+C.blue, borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
    </div>
  )

  if (!emp) return (
    <div style={{ textAlign:'center', padding:80, color:C.text3 }}>Employee not found</div>
  )

  const fullName = emp.firstName + ' ' + (emp.lastName ?? '')
  const initials = emp.firstName[0] + (emp.lastName?.[0] ?? '')
  const grossCtc = (Number(emp.baseSalary??0) + Number(emp.hra??0) + Number(emp.allowances??0))

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
      {/* Back button */}
      <button onClick={() => nav('/hr/employees')}
        style={{ display:'flex', alignItems:'center', gap:8, background:'none', border:'none', cursor:'pointer', color:C.text2, fontSize:13, fontWeight:600, width:'fit-content', padding:'6px 0' }}>
        <ArrowLeft size={16} /> Back to Employees
      </button>

      {/* Header card */}
      <div style={{ background:C.navy, borderRadius:16, padding:'28px 32px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:18 }}>
          <div style={{ width:64, height:64, borderRadius:'50%', background:'rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <span style={{ fontSize:24, fontWeight:700, color:'#fff' }}>{initials}</span>
          </div>
          <div>
            <h1 style={{ fontSize:22, fontWeight:800, color:'#fff', margin:'0 0 4px' }}>{fullName}</h1>
            <p style={{ fontSize:14, color:'rgba(255,255,255,0.6)', margin:'0 0 4px' }}>{emp.designation ?? '—'}</p>
            <span style={{ fontSize:11, fontWeight:700, fontFamily:'monospace', color:'rgba(255,255,255,0.4)' }}>{emp.empCode}</span>
          </div>
        </div>
        <div style={{ display:'flex', gap:12, alignItems:'center' }}>
          <span style={{ padding:'6px 16px', borderRadius:20, background: emp.status==='active'?'rgba(5,150,105,0.2)':'rgba(220,38,38,0.2)', color: emp.status==='active'?'#34d399':'#f87171', fontSize:12, fontWeight:700 }}>
            {emp.status?.toUpperCase() ?? 'ACTIVE'}
          </span>
          <button onClick={() => nav('/hr/employees')}
            style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 18px', background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.2)', borderRadius:10, color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer' }}>
            <PencilSimple size={14} /> Edit
          </button>
        </div>
      </div>

      {/* Details grid */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:20 }}>

        {/* Personal Info */}
        <div style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:14, padding:'20px 22px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
            <User size={16} color={C.blue} weight="bold" />
            <h3 style={{ fontSize:13, fontWeight:700, color:C.text1, margin:0 }}>Personal Info</h3>
          </div>
          <Row label="Department" value={emp.department} />
          <Row label="Employment Type" value={emp.employmentType?.replace(/_/g,' ')} />
          <Row label="Date of Joining" value={emp.dateOfJoining ? new Date(emp.dateOfJoining).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : null} />
          <Row label="Date of Birth" value={emp.dateOfBirth ? new Date(emp.dateOfBirth).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : null} />
        </div>

        {/* Contact */}
        <div style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:14, padding:'20px 22px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
            <Phone size={16} color={C.blue} weight="bold" />
            <h3 style={{ fontSize:13, fontWeight:700, color:C.text1, margin:0 }}>Contact</h3>
          </div>
          <Row label="Phone" value={emp.phone} />
          <Row label="Email" value={emp.email} />
          <Row label="Aadhar No" value={emp.aadharNo} />
          <Row label="PAN No" value={emp.panNo} />
        </div>

        {/* Salary */}
        <div style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:14, padding:'20px 22px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
            <Bank size={16} color={C.blue} weight="bold" />
            <h3 style={{ fontSize:13, fontWeight:700, color:C.text1, margin:0 }}>Salary & Bank</h3>
          </div>
          <Row label="Basic Salary" value={emp.baseSalary ? '₹' + Number(emp.baseSalary).toLocaleString('en-IN') : null} />
          <Row label="HRA" value={emp.hra ? '₹' + Number(emp.hra).toLocaleString('en-IN') : null} />
          <Row label="Allowances" value={emp.allowances ? '₹' + Number(emp.allowances).toLocaleString('en-IN') : null} />
          <Row label="Gross CTC" value={grossCtc > 0 ? '₹' + grossCtc.toLocaleString('en-IN') : null} />
          {emp.bankAccount?.bankName && <>
            <div style={{ margin:'12px 0 8px', borderTop:'1px solid #f1f5f9', paddingTop:12 }}>
              <Row label="Bank" value={emp.bankAccount.bankName} />
              <Row label="Account No" value={emp.bankAccount.accountNo} />
              <Row label="IFSC" value={emp.bankAccount.ifsc} />
            </div>
          </>}
        </div>
      </div>
    </div>
  )
}
`)
console.log('  ✅  EmployeeDetailPage.tsx created')

console.log('\n🏁  Done')
console.log('   • AppLayout widened to 1440px')
console.log('   • Employee rows have 3-dot menu (Edit/Deactivate/Delete)')
console.log('   • /hr/employees/:id route + full detail page created\n')
console.log('   NOTE: Add getEmployee to hr.api.ts if missing:')
console.log('   getEmployee: (id) => api.get("/api/v1/hr/employees/" + id)\n')
