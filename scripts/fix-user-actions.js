#!/usr/bin/env node
const fs   = require('fs')
const path = require('path')

const FILE = path.resolve(__dirname, '..', 'frontend', 'src', 'pages', 'settings', 'SystemSettingsPage.tsx')
let src = fs.readFileSync(FILE, 'utf8')

if (src.includes('userMenuOpen')) {
  console.log('ℹ️  Already patched')
  process.exit(0)
}

// Add userMenuOpen state
src = src.replace(
  `  const [showReset, setShowReset] = useState<string|null>(null)`,
  `  const [showReset, setShowReset] = useState<string|null>(null)
  const [userMenuOpen, setUserMenuOpen] = useState<string|null>(null)
  const [editUser, setEditUser] = useState<any>(null)
  const [editForm, setEditForm] = useState({ name:'', email:'' })`
)

// Add deleteUser mutation
src = src.replace(
  `  const toggleActive = useMutation({`,
  `  const deleteUser = useMutation({
    mutationFn: (id: string) => api.delete(\`/api/v1/users/\${id}\`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['all-users'] }),
  })

  const updateUserInfo = useMutation({
    mutationFn: ({ id, data }: any) => api.patch(\`/api/v1/users/\${id}\`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['all-users'] }); setEditUser(null) },
  })

  const toggleActive = useMutation({`
)

// Replace the entire actions cell with 3-dot menu
src = src.replace(
  `              {u.id !== currentUser?.id && (
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
                )}`,
  `              {u.id !== currentUser?.id && (
                <div style={{ position:'relative' }}>
                  {showReset === u.id ? (
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
                    <button onClick={() => setUserMenuOpen(userMenuOpen === u.id ? null : u.id)}
                      style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px',
                        background:'none', border:'1.5px solid '+C.border, borderRadius:8,
                        fontSize:12, color:C.text2, cursor:'pointer', fontWeight:500 }}>
                      Actions ▾
                    </button>
                  )}
                  {userMenuOpen === u.id && (
                    <div style={{ position:'absolute', right:0, top:'100%', zIndex:200, background:'#fff',
                      border:'1.5px solid '+C.border, borderRadius:10, boxShadow:'0 8px 24px rgba(0,0,0,0.12)',
                      minWidth:180, overflow:'hidden', marginTop:4 }}>
                      {[
                        { label:'✏️  Edit Name / Email', onClick: () => { setEditUser(u); setEditForm({ name: u.name, email: u.email }); setUserMenuOpen(null) } },
                        { label:'🔑  Reset Password',    onClick: () => { setShowReset(u.id); setUserMenuOpen(null) } },
                        { label: u.isActive !== false ? '🔴  Deactivate' : '🟢  Activate',
                          onClick: () => { toggleActive.mutate({ id: u.id, isActive: !u.isActive }); setUserMenuOpen(null) },
                          color: u.isActive !== false ? C.amber : C.green },
                        { label:'🗑️  Delete User', color: C.red,
                          onClick: () => {
                            if (window.confirm('Delete ' + u.name + '?\\n\\nThis cannot be undone.')) {
                              deleteUser.mutate(u.id)
                              setUserMenuOpen(null)
                            }
                          }
                        },
                      ].map(item => (
                        <button key={item.label} onClick={item.onClick}
                          style={{ width:'100%', padding:'10px 16px', background:'none', border:'none',
                            cursor:'pointer', textAlign:'left', fontSize:13,
                            color: item.color ?? C.text1, fontWeight:500 }}
                          onMouseEnter={e => (e.currentTarget.style.background='#f8faff')}
                          onMouseLeave={e => (e.currentTarget.style.background='none')}>
                          {item.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}`
)

// Add edit user inline form after the table
src = src.replace(
  `    </div>\n  )\n}\n\nexport default function SystemSettingsPage`,
  `    {editUser && (
      <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center' }}
        onClick={() => setEditUser(null)}>
        <div onClick={e => e.stopPropagation()}
          style={{ background:'#fff', borderRadius:16, padding:28, width:420, boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
          <h3 style={{ fontSize:15, fontWeight:700, color:C.text1, margin:'0 0 20px' }}>Edit User — {editUser.name}</h3>
          <div style={{ display:'flex', flexDirection:'column', gap:14, marginBottom:20 }}>
            {[{label:'Full Name', key:'name'},{label:'Email', key:'email'}].map(f => (
              <div key={f.key}>
                <label style={{ fontSize:12, fontWeight:600, color:C.text2, display:'block', marginBottom:5 }}>{f.label}</label>
                <input value={(editForm as any)[f.key]} onChange={e => setEditForm(ef => ({...ef,[f.key]:e.target.value}))}
                  style={{ width:'100%', padding:'9px 12px', border:'1.5px solid '+C.border, borderRadius:8, fontSize:13, outline:'none', boxSizing:'border-box' }} />
              </div>
            ))}
          </div>
          <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
            <button onClick={() => setEditUser(null)}
              style={{ padding:'9px 20px', background:'none', border:'1.5px solid '+C.border, borderRadius:8, fontSize:13, cursor:'pointer' }}>
              Cancel
            </button>
            <button onClick={() => updateUserInfo.mutate({ id: editUser.id, data: editForm })}
              style={{ padding:'9px 20px', background:C.blue, color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer' }}>
              Save Changes
            </button>
          </div>
        </div>
      </div>
    )}
    </div>\n  )\n}\n\nexport default function SystemSettingsPage`
)

// Close menu on outside click — add onClick to wrapper
src = src.replace(
  `      <div style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:16, overflow:'hidden' }}>`,
  `      <div style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:16, overflow:'hidden' }} onClick={() => setUserMenuOpen(null)}>`
)

fs.writeFileSync(FILE, src, 'utf8')
console.log('✅  User Management — 3-dot Actions menu added')
console.log('   Options: Edit Name/Email | Reset Password | Activate/Deactivate | Delete')
