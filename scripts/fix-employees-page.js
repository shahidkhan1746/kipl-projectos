#!/usr/bin/env node
/**
 * Fix EmployeesPage.tsx:
 * 1. Add Liaison/Communications to departments
 * 2. Fix emp code to auto-count from existing employees
 * 3. Add login credentials section (email + role + password)
 */

const fs   = require('fs')
const path = require('path')

const FILE = path.resolve(__dirname, '..', 'frontend', 'src', 'pages', 'hr', 'EmployeesPage.tsx')
let src = fs.readFileSync(FILE, 'utf8')

// ── 1. Fix departments list ───────────────────────────────────────────────────
src = src.replace(
  `const DEPTS = ['Civil','Electrical','Mechanical','HR','Admin','Security','Labour','Other'].map(d=>({value:d,label:d}))`,
  `const DEPTS = ['Civil','Electrical','Mechanical','HR','Admin','Liaison / Communications','Security','Labour','Operations','Other'].map(d=>({value:d,label:d}))`
)
console.log('✅  Departments updated — added Liaison / Communications, Operations')

// ── 2. Fix emp code to count from existing list ───────────────────────────────
// The current code calls hrApi to get next code — let's also fix the initial blank form
// to use the employees list length for auto-suggestion
src = src.replace(
  `  empCode:'', firstName:'', lastName:'', designation:'', department:'Civil',`,
  `  empCode:'', firstName:'', lastName:'', designation:'', department:'Civil', createLogin: false, loginEmail:'', loginRole:'engineer', loginPassword:'',`
)
console.log('✅  Form state extended with login fields')

// ── 3. Add login section to the Personal Info tab ────────────────────────────
// Find the employee code input section and add login toggle after it
const loginSection = `
                  {/* Login credentials */}
                  <div style={{ gridColumn:'1/-1', background:'#f8fafc', border:'1.5px solid #e2e8f0', borderRadius:12, padding:'16px 18px', marginTop:8 }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: form.createLogin ? 16 : 0 }}>
                      <div>
                        <p style={{ fontSize:13, fontWeight:700, color:'#0f172a', margin:0 }}>Create System Login</p>
                        <p style={{ fontSize:11, color:'#94a3b8', margin:'2px 0 0' }}>Give this employee access to ProjectOS</p>
                      </div>
                      <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer' }}>
                        <div onClick={() => setF('createLogin', !form.createLogin)}
                          style={{ width:44, height:24, borderRadius:99, background: form.createLogin ? '#2563eb' : '#e2e8f0', position:'relative', transition:'background 0.2s', cursor:'pointer' }}>
                          <div style={{ width:20, height:20, borderRadius:'50%', background:'#fff', position:'absolute', top:2, left: form.createLogin ? 22 : 2, transition:'left 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.2)' }} />
                        </div>
                      </label>
                    </div>
                    {form.createLogin && (
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                          <label style={{ fontSize:12, fontWeight:600, color:'#475569' }}>Login Email *</label>
                          <input value={form.loginEmail} onChange={e => setF('loginEmail', e.target.value)}
                            placeholder={form.firstName ? (form.firstName.toLowerCase() + '@kipl.in') : 'user@kipl.in'}
                            style={{ padding:'9px 12px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:13, color:'#0f172a', outline:'none', fontFamily:'inherit' }}
                            onFocus={e => { e.target.style.borderColor='#2563eb' }}
                            onBlur={e => { e.target.style.borderColor='#e2e8f0' }} />
                        </div>
                        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                          <label style={{ fontSize:12, fontWeight:600, color:'#475569' }}>Role *</label>
                          <select value={form.loginRole} onChange={e => setF('loginRole', e.target.value)}
                            style={{ padding:'9px 12px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:13, color:'#0f172a', outline:'none', background:'#fff', fontFamily:'inherit' }}>
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
                            style={{ padding:'9px 12px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:13, color:'#0f172a', outline:'none', fontFamily:'inherit' }}
                            onFocus={e => { e.target.style.borderColor='#2563eb' }}
                            onBlur={e => { e.target.style.borderColor='#e2e8f0' }} />
                        </div>
                        <div style={{ display:'flex', alignItems:'flex-end', paddingBottom:2 }}>
                          <p style={{ fontSize:11, color:'#94a3b8', margin:0 }}>
                            💡 Suggested: <strong style={{ color:'#2563eb' }}>{form.firstName?.toLowerCase() || 'name'}@kipl.in</strong>
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
`

// Insert login section before the closing of the Personal Info tab grid
src = src.replace(
  `<Select label='Department *' value={form.department} onChange={e=>setF('department',e.target.value)} options={DEPTS} />`,
  `<Select label='Department *' value={form.department} onChange={e=>setF('department',e.target.value)} options={DEPTS} />
${loginSection}`
)
console.log('✅  Login credentials section added to employee form')

// ── 4. Fix emp code auto-generation using employees list length ────────────────
// After employees load, suggest next code
src = src.replace(
  `        setForm((f: any) => ({ ...f, empCode: r.data?.code ?? '' }))`,
  `        setForm((f: any) => ({ ...f, empCode: r.data?.code ?? ('KIPL-' + String((employees?.length ?? 0) + 1).padStart(3,'0')) }))`
)
console.log('✅  Employee code counter fixed to use existing count')

// ── 5. Include login data in the create mutation ──────────────────────────────
src = src.replace(
  `      empCode:       d.empCode.trim(),`,
  `      empCode:       d.empCode.trim(),
      ...(d.createLogin && d.loginEmail && d.loginPassword ? {
        createLogin:   true,
        loginEmail:    d.loginEmail.trim(),
        loginRole:     d.loginRole,
        loginPassword: d.loginPassword,
      } : {}),`
)
console.log('✅  Login data included in create mutation payload')

fs.writeFileSync(FILE, src, 'utf8')

console.log('\n🏁  EmployeesPage.tsx patched')
console.log('   Now the backend also needs to handle createLogin in hrApi.createEmployee')
console.log('   Check if hr.service.ts creates a user when createLogin=true\n')
