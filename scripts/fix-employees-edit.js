#!/usr/bin/env node
/**
 * Add Edit button to EmployeesPage side panel
 * Clicking Edit opens the Add form pre-filled with selected employee data
 */

const fs   = require('fs')
const path = require('path')

const FILE = path.resolve(__dirname, '..', 'frontend', 'src', 'pages', 'hr', 'EmployeesPage.tsx')
let src = fs.readFileSync(FILE, 'utf8')

// ── 1. Add editId state and updateM mutation ──────────────────────────────────
src = src.replace(
  `  const [selected, setSelected] = useState<any>(null)`,
  `  const [selected, setSelected] = useState<any>(null)
  const [editId, setEditId]       = useState<string|null>(null)`
)

// Find where createM mutation is defined and add updateM after it
src = src.replace(
  `  const createM = useMutation({`,
  `  const updateM = useMutation({
    mutationFn: (data: any) => hrApi.updateEmployee(editId!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] })
      setShowNew(false)
      setEditId(null)
      setForm({...BLANK})
    },
  })

  const deleteM = useMutation({
    mutationFn: (id: string) => hrApi.deleteEmployee(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] })
      setSelected(null)
    },
  })

  const createM = useMutation({`
)

// ── 2. Add openEdit function ──────────────────────────────────────────────────
src = src.replace(
  `  const setF = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))`,
  `  const setF = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))

  function openEdit(emp: any) {
    setForm({
      empCode:        emp.empCode ?? '',
      firstName:      emp.firstName ?? '',
      lastName:       emp.lastName ?? '',
      designation:    emp.designation ?? '',
      department:     emp.department ?? 'Civil',
      phone:          emp.phone ?? '',
      email:          emp.email ?? '',
      dateOfJoining:  emp.dateOfJoining?.split('T')[0] ?? '',
      dateOfBirth:    emp.dateOfBirth?.split('T')[0] ?? '',
      aadharNo:       emp.aadharNo ?? '',
      panNo:          emp.panNo ?? '',
      employmentType: emp.employmentType ?? 'full_time',
      baseSalary:     emp.baseSalary ?? '',
      hra:            emp.hra ?? '',
      allowances:     emp.allowances ?? '',
      createLogin:    false, loginEmail:'', loginRole:'engineer', loginPassword:'',
    })
    setEditId(emp.id)
    setShowNew(true)
  }`
)

// ── 3. Fix the save button to handle both create and update ───────────────────
src = src.replace(
  `<Button variant='primary' loading={createM.isPending} onClick={()=>{ setSubmitError(''); createM.mutate(form) }} disabled={!form.empCode||!form.firstName}>`,
  `<Button variant='primary' loading={createM.isPending||updateM.isPending} onClick={()=>{ setSubmitError(''); editId ? updateM.mutate(form) : createM.mutate(form) }} disabled={!form.empCode||!form.firstName}>`
)

// ── 4. Fix modal title to show Edit vs Add ────────────────────────────────────
src = src.replace(
  `<h2 style={{ fontSize:16, fontWeight:700, color:C.text1, margin:0 }}>Add New Employee</h2>`,
  `<h2 style={{ fontSize:16, fontWeight:700, color:C.text1, margin:0 }}>{editId ? 'Edit Employee' : 'Add New Employee'}</h2>`
)

// ── 5. Reset editId when modal closes ────────────────────────────────────────
src = src.replace(
  `setShowNew(false); setForm({...BLANK}); setStep('weather')`,
  `setShowNew(false); setForm({...BLANK}); setStep('weather'); setEditId(null)`
)

// Also fix the X button close
src = src.replace(
  /onClick=\{.*?setShowNew\(false\).*?\}/,
  `onClick={()=>{ setShowNew(false); setForm({...BLANK}); setEditId(null) }}`
)

// ── 6. Add Edit + Delete buttons in the selected employee panel ───────────────
src = src.replace(
  `<p style={{ fontSize:11, color:'rgba(255,255,255,0.3)', margin:'4px 0 0', fontFamily:'monospace' }}>{selected.empCode}</p>`,
  `<p style={{ fontSize:11, color:'rgba(255,255,255,0.3)', margin:'4px 0 0', fontFamily:'monospace' }}>{selected.empCode}</p>
              <div style={{ display:'flex', gap:8, marginTop:12 }}>
                <button onClick={() => openEdit(selected)}
                  style={{ flex:1, padding:'8px 0', background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.2)', borderRadius:8, color:'#fff', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                  ✏️ Edit
                </button>
                <button onClick={() => { if(confirm('Delete ' + selected.firstName + '?')) deleteM.mutate(selected.id) }}
                  style={{ padding:'8px 14px', background:'rgba(220,38,38,0.3)', border:'1px solid rgba(220,38,38,0.4)', borderRadius:8, color:'#fca5a5', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                  🗑
                </button>
              </div>`
)

fs.writeFileSync(FILE, src, 'utf8')
console.log('✅  Edit + Delete buttons added to employee panel')
console.log('   Click any employee → Edit button appears in side panel')
console.log('   Edit opens the form pre-filled with employee data')
console.log('   Delete prompts confirmation then removes employee')
