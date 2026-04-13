#!/usr/bin/env node
/**
 * KIPL ProjectOS — User Management
 * 1. Adds PATCH /users/:id to backend (toggle active, change role, reset password)
 * 2. Adds User Management section to SystemSettingsPage (super_admin + project_manager)
 */

const fs   = require('fs')
const path = require('path')
const ROOT = path.resolve(__dirname, '..')

// ── 1. Backend — add PATCH to users.controller.ts ────────────────────────────
console.log('\n📌  1/3 — Backend: users.controller.ts\n')

const ctrlPath = path.join(ROOT, 'backend', 'src', 'users', 'users.controller.ts')
let ctrl = fs.readFileSync(ctrlPath, 'utf8')

if (ctrl.includes("@Patch(':id')")) {
  console.log('  ℹ️   PATCH already exists')
} else {
  // Add Patch to imports
  ctrl = ctrl.replace(
    /import \{([^}]+)\} from '@nestjs\/common'/,
    (m, imports) => {
      if (imports.includes('Patch')) return m
      return `import {${imports.trim()}, Patch, Body, Param, HttpCode, HttpStatus} from '@nestjs/common'`
    }
  )

  // Add PATCH route before last closing brace
  const patchRoute = `
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  updateUser(@Param('id') id: string, @Body() body: { isActive?: boolean; role?: string; name?: string; email?: string }) {
    return this.usersService.updateUser(id, body)
  }

  @Patch(':id/reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Param('id') id: string, @Body() body: { password: string }) {
    return this.usersService.resetPassword(id, body.password)
  }
`
  ctrl = ctrl.slice(0, ctrl.lastIndexOf('}')) + patchRoute + '\n}'
  fs.writeFileSync(ctrlPath, ctrl, 'utf8')
  console.log('  ✅  PATCH /users/:id added')
  console.log('  ✅  PATCH /users/:id/reset-password added')
}

// ── 2. Backend — add updateUser + resetPassword to users.service.ts ───────────
console.log('\n📌  2/3 — Backend: users.service.ts\n')

const svcPath = path.join(ROOT, 'backend', 'src', 'users', 'users.service.ts')
let svc = fs.readFileSync(svcPath, 'utf8')

if (svc.includes('updateUser')) {
  console.log('  ℹ️   updateUser already exists')
} else {
  // Check if bcrypt is imported
  if (!svc.includes('bcrypt')) {
    svc = svc.replace(
      /^import /m,
      `import * as bcrypt from 'bcrypt'\nimport `
    )
  }

  const methods = `
  async updateUser(id: string, data: { isActive?: boolean; role?: string; name?: string; email?: string }) {
    const update: any = {}
    if (data.isActive !== undefined) update.isActive = data.isActive
    if (data.role)  update.role  = data.role
    if (data.name)  update.name  = data.name
    if (data.email) update.email = data.email
    await this.userRepo.update(id, update)
    return this.userRepo.findOne({ where: { id } })
  }

  async resetPassword(id: string, password: string) {
    const hash = await bcrypt.hash(password, 10)
    await this.userRepo.update(id, { passwordHash: hash })
    return { success: true, message: 'Password reset successfully' }
  }

  async createUser(data: { name: string; email: string; role: string; password: string }) {
    const hash = await bcrypt.hash(data.password, 10)
    const user = this.userRepo.create({
      name: data.name,
      email: data.email,
      role: data.role as any,
      passwordHash: hash,
      isActive: true,
    })
    return this.userRepo.save(user)
  }
`

  svc = svc.slice(0, svc.lastIndexOf('}')) + methods + '\n}'
  fs.writeFileSync(svcPath, svc, 'utf8')
  console.log('  ✅  updateUser() added')
  console.log('  ✅  resetPassword() added')
  console.log('  ✅  createUser() added')
}

// ── 3. Frontend — add User Management to SystemSettingsPage ───────────────────
console.log('\n📌  3/3 — Frontend: SystemSettingsPage.tsx\n')

const settingsPath = path.join(ROOT, 'frontend', 'src', 'pages', 'settings', 'SystemSettingsPage.tsx')
let settings = fs.readFileSync(settingsPath, 'utf8')

if (settings.includes('UserManagement')) {
  console.log('  ℹ️   User Management already present')
} else {
  // Add api import
  if (!settings.includes("import api from")) {
    settings = settings.replace(
      `import { settingsApi } from '@/api/settings.api'`,
      `import { settingsApi } from '@/api/settings.api'\nimport api from '@/api/client'\nimport { useAuthStore } from '@/store/auth.store'`
    )
  }

  // Add Users icon import
  settings = settings.replace(
    `import { Button } from '@/components/ui/Button'`,
    `import { Button } from '@/components/ui/Button'\nimport { Users, ToggleLeft, ToggleRight, Key, Plus, X } from '@phosphor-icons/react'`
  )

  // Add UserManagement component before the default export
  const userMgmtComponent = `
const ROLE_OPTIONS = [
  { value: 'super_admin',     label: 'Super Admin' },
  { value: 'project_manager', label: 'Project Manager' },
  { value: 'liaison_officer', label: 'Liaison Officer' },
  { value: 'hr_officer',      label: 'HR Officer' },
  { value: 'engineer',        label: 'Site Engineer' },
  { value: 'accounts',        label: 'Accounts' },
  { value: 'qa_engineer',     label: 'QA Engineer' },
  { value: 'supervisor',      label: 'Site Supervisor' },
]

const ROLE_COLORS: Record<string,string> = {
  super_admin:'#f59e0b', project_manager:'#f59e0b',
  liaison_officer:'#3b82f6', hr_officer:'#8b5cf6',
  engineer:'#10b981', accounts:'#f97316',
  qa_engineer:'#ec4899', supervisor:'#06b6d4',
}

function UserManagement() {
  const qc = useQueryClient()
  const { user: currentUser } = useAuthStore()
  const [showAdd, setShowAdd] = useState(false)
  const [showReset, setShowReset] = useState<string|null>(null)
  const [newPwd, setNewPwd] = useState('')
  const [newUser, setNewUser] = useState({ name:'', email:'', role:'engineer', password:'' })

  const { data: users = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => api.get('/api/v1/users').then(r => r.data),
  })

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: any) => api.patch(\`/api/v1/users/\${id}\`, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['all-users'] }),
  })

  const changeRole = useMutation({
    mutationFn: ({ id, role }: any) => api.patch(\`/api/v1/users/\${id}\`, { role }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['all-users'] }),
  })

  const resetPwd = useMutation({
    mutationFn: ({ id, password }: any) => api.patch(\`/api/v1/users/\${id}/reset-password\`, { password }),
    onSuccess: () => { setShowReset(null); setNewPwd('') },
  })

  const createUser = useMutation({
    mutationFn: (data: any) => api.post('/api/v1/users', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['all-users'] }); setShowAdd(false); setNewUser({ name:'', email:'', role:'engineer', password:'' }) },
  })

  return (
    <div style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:16, overflow:'hidden' }}>
      <div style={{ padding:'18px 22px', borderBottom:'1.5px solid '+C.border, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <Users size={18} color={C.blue} weight="bold" />
          <div>
            <h2 style={{ fontSize:15, fontWeight:700, color:C.text1, margin:0 }}>User Management</h2>
            <p style={{ fontSize:12, color:C.text3, margin:0 }}>Manage system access and roles</p>
          </div>
        </div>
        <button onClick={() => setShowAdd(true)}
          style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', background:C.blue, color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer' }}>
          <Plus size={14} weight="bold" /> Add User
        </button>
      </div>

      {/* Add user form */}
      {showAdd && (
        <div style={{ padding:'18px 22px', borderBottom:'1.5px solid '+C.border, background:'#f8fafc' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr auto', gap:12, alignItems:'flex-end' }}>
            {[
              { label:'Full Name', key:'name', placeholder:'Gowhar Shah' },
              { label:'Email', key:'email', placeholder:'gowhar@kipl.in' },
            ].map(f => (
              <div key={f.key} style={{ display:'flex', flexDirection:'column', gap:5 }}>
                <label style={{ fontSize:12, fontWeight:600, color:C.text2 }}>{f.label}</label>
                <input value={(newUser as any)[f.key]} onChange={e => setNewUser(u => ({...u,[f.key]:e.target.value}))}
                  placeholder={f.placeholder}
                  style={{ padding:'8px 12px', border:'1.5px solid '+C.border, borderRadius:8, fontSize:13, outline:'none', fontFamily:'inherit' }} />
              </div>
            ))}
            <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
              <label style={{ fontSize:12, fontWeight:600, color:C.text2 }}>Role</label>
              <select value={newUser.role} onChange={e => setNewUser(u => ({...u,role:e.target.value}))}
                style={{ padding:'8px 12px', border:'1.5px solid '+C.border, borderRadius:8, fontSize:13, background:'#fff', outline:'none' }}>
                {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
              <label style={{ fontSize:12, fontWeight:600, color:C.text2 }}>Password</label>
              <input type="password" value={newUser.password} onChange={e => setNewUser(u => ({...u,password:e.target.value}))}
                placeholder="Min 8 chars"
                style={{ padding:'8px 12px', border:'1.5px solid '+C.border, borderRadius:8, fontSize:13, outline:'none', fontFamily:'inherit' }} />
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => createUser.mutate(newUser)} disabled={!newUser.name||!newUser.email||!newUser.password}
                style={{ padding:'8px 16px', background:C.green, color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer' }}>
                Create
              </button>
              <button onClick={() => setShowAdd(false)}
                style={{ padding:'8px 12px', background:'none', border:'1.5px solid '+C.border, borderRadius:8, cursor:'pointer' }}>
                <X size={14} color={C.text3} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Users list */}
      <table style={{ width:'100%', borderCollapse:'collapse' }}>
        <thead>
          <tr style={{ background:'#f8fafc' }}>
            {['Name','Email','Role','Status','Actions'].map(h => (
              <th key={h} style={{ padding:'10px 18px', textAlign:'left', fontSize:11, fontWeight:700,
                color:C.text3, textTransform:'uppercase', letterSpacing:'0.05em', borderBottom:'1.5px solid '+C.border }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(users as any[]).map((u: any) => (
            <tr key={u.id}
              style={{ opacity: u.isActive === false ? 0.5 : 1 }}
              onMouseEnter={e => (e.currentTarget.style.background='#f8faff')}
              onMouseLeave={e => (e.currentTarget.style.background='transparent')}>
              <td style={{ padding:'13px 18px', borderBottom:'1px solid #f1f5f9' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:32, height:32, borderRadius:'50%', background:(ROLE_COLORS[u.role]??'#3b82f6')+'22',
                    display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <span style={{ fontSize:12, fontWeight:700, color:ROLE_COLORS[u.role]??'#3b82f6' }}>
                      {u.name?.charAt(0)??'U'}
                    </span>
                  </div>
                  <span style={{ fontSize:13, fontWeight:600, color:C.text1 }}>{u.name}</span>
                </div>
              </td>
              <td style={{ padding:'13px 18px', fontSize:13, color:C.text2, borderBottom:'1px solid #f1f5f9' }}>{u.email}</td>
              <td style={{ padding:'13px 18px', borderBottom:'1px solid #f1f5f9' }}>
                {u.id === currentUser?.id ? (
                  <span style={{ fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20,
                    color:ROLE_COLORS[u.role]??'#3b82f6', background:(ROLE_COLORS[u.role]??'#3b82f6')+'20' }}>
                    {ROLE_OPTIONS.find(r=>r.value===u.role)?.label??u.role}
                  </span>
                ) : (
                  <select value={u.role}
                    onChange={e => changeRole.mutate({ id: u.id, role: e.target.value })}
                    style={{ padding:'4px 10px', border:'1.5px solid '+C.border, borderRadius:8,
                      fontSize:12, background:'#fff', color:C.text1, outline:'none', fontWeight:600,
                      color: ROLE_COLORS[u.role]??C.text1 }}>
                    {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                )}
              </td>
              <td style={{ padding:'13px 18px', borderBottom:'1px solid #f1f5f9' }}>
                {u.id === currentUser?.id ? (
                  <span style={{ fontSize:11, color:C.green, fontWeight:600 }}>● Active (you)</span>
                ) : (
                  <button onClick={() => toggleActive.mutate({ id: u.id, isActive: !u.isActive })}
                    style={{ display:'flex', alignItems:'center', gap:6, background:'none', border:'none', cursor:'pointer',
                      fontSize:12, fontWeight:600, color: u.isActive !== false ? C.green : C.text3 }}>
                    {u.isActive !== false
                      ? <><ToggleRight size={22} color={C.green} weight="fill" /> Active</>
                      : <><ToggleLeft size={22} color={C.text3} /> Inactive</>}
                  </button>
                )}
              </td>
              <td style={{ padding:'13px 18px', borderBottom:'1px solid #f1f5f9' }}>
                {u.id !== currentUser?.id && (
                  showReset === u.id ? (
                    <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                      <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)}
                        placeholder="New password" autoFocus
                        style={{ padding:'6px 10px', border:'1.5px solid '+C.border, borderRadius:8, fontSize:12, outline:'none', width:140 }} />
                      <button onClick={() => resetPwd.mutate({ id: u.id, password: newPwd })}
                        disabled={newPwd.length < 6}
                        style={{ padding:'6px 12px', background:C.blue, color:'#fff', border:'none', borderRadius:8, fontSize:12, cursor:'pointer' }}>
                        Save
                      </button>
                      <button onClick={() => { setShowReset(null); setNewPwd('') }}
                        style={{ background:'none', border:'none', cursor:'pointer', color:C.text3 }}>
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setShowReset(u.id)}
                      style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px',
                        background:'none', border:'1.5px solid '+C.border, borderRadius:8,
                        fontSize:12, color:C.text2, cursor:'pointer', fontWeight:500 }}>
                      <Key size={13} /> Reset Password
                    </button>
                  )
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

`

  settings = settings.replace(
    'export default function SystemSettingsPage()',
    userMgmtComponent + 'export default function SystemSettingsPage()'
  )

  // Add UserManagement component at the bottom of the page
  settings = settings.replace(
    /(\s*<\/div>\s*)$/,
    `
      {/* User Management — visible to super_admin and project_manager */}
      <UserManagement />
$1`
  )

  fs.writeFileSync(settingsPath, settings, 'utf8')
  console.log('  ✅  UserManagement component added to SystemSettingsPage')
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log('\n' + '─'.repeat(56))
console.log('\n🏁  User Management built\n')
console.log('  Features:')
console.log('  ✓ List all users with role badges')
console.log('  ✓ Toggle Active/Inactive per user (HR Officer on/off)')
console.log('  ✓ Change role via dropdown')
console.log('  ✓ Reset any user\'s password inline')
console.log('  ✓ Add new user with name/email/role/password')
console.log('  ✓ Cannot deactivate yourself')
console.log('\n  Accessible at: /settings/system (super_admin + project_manager)\n')
