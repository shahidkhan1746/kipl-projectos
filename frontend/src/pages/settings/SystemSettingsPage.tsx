import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { settingsApi } from '@/api/settings.api'
import api from '@/api/client'
import { useAuthStore } from '@/store/auth.store'
import { Button } from '@/components/ui/Button'
import { Users, ToggleLeft, ToggleRight, Key, Plus, X } from '@phosphor-icons/react'
import { Input } from '@/components/ui/Input'

const C = {
  card:'#fff', border:'#e2e8f0', text1:'#0f172a', text2:'#475569', text3:'#94a3b8',
  blue:'#2563eb', green:'#059669', amber:'#d97706', red:'#dc2626', navy:'#1a2540',
}


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
  const nav = useNavigate()
  const qc = useQueryClient()
  const { user: currentUser } = useAuthStore()
  const [showAdd, setShowAdd] = useState(false)
  const [showReset, setShowReset] = useState<string|null>(null)
  const [userMenuOpen, setUserMenuOpen] = useState<string|null>(null)
  const [editUser, setEditUser] = useState<any>(null)
  const [editForm, setEditForm] = useState({ name:'', email:'' })
  const [newPwd, setNewPwd] = useState('')
  const [newUser, setNewUser] = useState({ name:'', email:'', role:'engineer', password:'' })

  const { data: users = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => api.get('/api/v1/users').then(r => r.data),
  })

  const deleteUser = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/users/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['all-users'] }),
  })

  const updateUserInfo = useMutation({
    mutationFn: ({ id, data }: any) => api.patch(`/api/v1/users/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['all-users'] }); setEditUser(null) },
  })

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: any) => api.patch(`/api/v1/users/${id}`, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['all-users'] }),
  })

  const changeRole = useMutation({
    mutationFn: ({ id, role }: any) => api.patch(`/api/v1/users/${id}`, { role }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['all-users'] }),
  })

  const resetPwd = useMutation({
    mutationFn: ({ id, password }: any) => api.patch(`/api/v1/users/${id}/reset-password`, { password }),
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
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
              <label style={{ fontSize:12, fontWeight:600, color:C.text2 }}>Full Name *</label>
              <input value={newUser.name} onChange={e => setNewUser(u => ({...u,name:e.target.value}))}
                placeholder="Gowhar Shah"
                style={{ padding:'9px 12px', border:'1.5px solid '+C.border, borderRadius:8, fontSize:13, outline:'none', fontFamily:'inherit' }} />
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
              <label style={{ fontSize:12, fontWeight:600, color:C.text2 }}>Email *</label>
              <input value={newUser.email} onChange={e => setNewUser(u => ({...u,email:e.target.value}))}
                placeholder="gowhar@kipl.in"
                style={{ padding:'9px 12px', border:'1.5px solid '+C.border, borderRadius:8, fontSize:13, outline:'none', fontFamily:'inherit' }} />
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
              <label style={{ fontSize:12, fontWeight:600, color:C.text2 }}>Role *</label>
              <select value={newUser.role} onChange={e => setNewUser(u => ({...u,role:e.target.value}))}
                style={{ padding:'9px 12px', border:'1.5px solid '+C.border, borderRadius:8, fontSize:13, background:'#fff', outline:'none' }}>
                {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
              <label style={{ fontSize:12, fontWeight:600, color:C.text2 }}>Password *</label>
              <input type="password" value={newUser.password} onChange={e => setNewUser(u => ({...u,password:e.target.value}))}
                placeholder="Min 8 characters"
                style={{ padding:'9px 12px', border:'1.5px solid '+C.border, borderRadius:8, fontSize:13, outline:'none', fontFamily:'inherit' }} />
            </div>
            <div style={{ gridColumn:'1/-1', display:'flex', gap:10, justifyContent:'flex-end', paddingTop:4 }}>
              <button onClick={() => setShowAdd(false)}
                style={{ padding:'9px 20px', background:'none', border:'1.5px solid '+C.border, borderRadius:8, fontSize:13, fontWeight:600, color:C.text2, cursor:'pointer' }}>
                Cancel
              </button>
              <button onClick={() => createUser.mutate(newUser)} disabled={!newUser.name||!newUser.email||!newUser.password}
                style={{ padding:'9px 20px', background: (!newUser.name||!newUser.email||!newUser.password) ? '#93c5fd' : C.blue, color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer' }}>
                Create User
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
              <td style={{ padding:'13px 18px', borderBottom:'1px solid #f1f5f9', cursor:'pointer' }}
                onClick={() => nav(`/settings/users/${u.id}`)}>
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
                      fontSize:12, background:'#fff', outline:'none', fontWeight:600,
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
                            if (window.confirm('Delete ' + u.name + '?\n\nThis cannot be undone.')) {
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
              )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    {editUser && (
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
    </div>
  )
}

export default function SystemSettingsPage() {
  const qc = useQueryClient()
  const [logo, setLogo] = useState<string | null>(() => localStorage.getItem('company_logo'))
  const [saved, setSaved] = useState<Record<string,boolean>>({})

  const [form, setForm] = useState({
    weather_api_key:  '',
    company_name:     'Khilari Infrastructure Pvt. Ltd.',
    company_tagline:  'Infrastructure · Excellence · Integrity',
    project_name:     'Dal Lake Sewerage Scheme',
    client_name:      'J&K UEED',
    contract_value:   '27999',
    allotment_no:     'CE/UEED/PS/01 OF 2025-26',
  })

  const { data: settings } = useQuery({
    queryKey: ['all-settings'],
    queryFn:  () => settingsApi.getAll().then(r => r.data),
  })

  useEffect(() => {
    if (settings) {
      const map: Record<string,string> = {}
      settings.forEach((s: any) => { map[s.key] = s.value })
      setForm(f => ({
        weather_api_key: map.weather_api_key ?? f.weather_api_key,
        company_name:    map.company_name    ?? f.company_name,
        company_tagline: map.company_tagline ?? f.company_tagline,
        project_name:    map.project_name    ?? f.project_name,
        client_name:     map.client_name     ?? f.client_name,
        contract_value:  map.contract_value  ?? f.contract_value,
        allotment_no:    map.allotment_no    ?? f.allotment_no,
      }))
    }
  }, [settings])

  const saveM = useMutation({
    mutationFn: (key: string) => settingsApi.set(key, (form as any)[key], key, 'system'),
    onSuccess: (_, key) => { setSaved(s => ({ ...s, [key]: true })); setTimeout(() => setSaved(s => ({ ...s, [key]: false })), 2000); qc.invalidateQueries({ queryKey: ['all-settings'] }) },
  })

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const b64 = ev.target?.result as string
      localStorage.setItem('company_logo', b64)
      setLogo(b64)
      window.dispatchEvent(new Event('logo-updated'))
    }
    reader.readAsDataURL(file)
  }

  const SETTINGS_GROUPS = [
    {
      title: '🌤️ Weather Widget',
      desc: 'Get a free API key from openweathermap.org → Sign up → API Keys',
      fields: [{ key:'weather_api_key', label:'OpenWeatherMap API Key', placeholder:'Paste your free API key here...' }],
    },
    {
      title: '🏢 Company Identity',
      desc: 'Shown in sidebar, PDF headers, and reports',
      fields: [
        { key:'company_name',    label:'Company Name',    placeholder:'Khilari Infrastructure Pvt. Ltd.' },
        { key:'company_tagline', label:'Company Tagline', placeholder:'Infrastructure · Excellence · Integrity' },
      ],
    },
    {
      title: '📋 Project Details',
      desc: 'Shown across all modules and PDFs',
      fields: [
        { key:'project_name',   label:'Project Name',    placeholder:'Dal Lake Sewerage Scheme' },
        { key:'client_name',    label:'Client',          placeholder:'J&K UEED' },
        { key:'allotment_no',   label:'Allotment No.',   placeholder:'CE/UEED/PS/01 OF 2025-26' },
        { key:'contract_value', label:'Contract Value (₹ Lakhs)', placeholder:'27999' },
      ],
    },
  ]

  return (
    <div className="fade-in" style={{ display:'flex', flexDirection:'column', gap:24, maxWidth:'100%' }}>
      <div>
        <h1 style={{ fontSize:24, fontWeight:800, color:C.text1, margin:0, letterSpacing:'-0.02em' }}>System Settings</h1>
        <p style={{ fontSize:14, color:C.text3, marginTop:4 }}>Super Admin only — configure system-wide settings</p>
      </div>

      {/* Company Logo */}
      <div style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:16, padding:'24px', boxShadow:'0 1px 6px rgba(0,0,0,0.05)' }}>
        <h3 style={{ fontSize:15, fontWeight:700, color:C.text1, margin:'0 0 6px' }}>🖼️ Company Logo</h3>
        <p style={{ fontSize:13, color:C.text3, margin:'0 0 16px' }}>Shown in sidebar top-left and PDF document headers</p>
        <div style={{ display:'flex', alignItems:'center', gap:20 }}>
          <div style={{ width:80, height:80, borderRadius:12, border:'2px dashed '+C.border, display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', background:'#f8f9fc' }}>
            {logo
              ? <img src={logo} alt="logo" style={{ width:'100%', height:'100%', objectFit:'contain' }} />
              : <span style={{ fontSize:28 }}>🏢</span>}
          </div>
          <div>
            <label style={{ display:'inline-block', padding:'9px 18px', background:C.blue, color:'#fff', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer' }}>
              Upload Logo
              <input type="file" accept="image/*" style={{ display:'none' }} onChange={handleLogoUpload} />
            </label>
            <p style={{ fontSize:11, color:C.text3, margin:'8px 0 0' }}>PNG or SVG recommended · Max 2MB · Will appear in sidebar</p>
          </div>
        </div>
      </div>

      {/* Settings groups */}
      {SETTINGS_GROUPS.map(group => (
        <div key={group.title} style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:16, padding:'24px', boxShadow:'0 1px 6px rgba(0,0,0,0.05)' }}>
          <h3 style={{ fontSize:15, fontWeight:700, color:C.text1, margin:'0 0 4px' }}>{group.title}</h3>
          <p style={{ fontSize:13, color:C.text3, margin:'0 0 18px' }}>{group.desc}</p>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            {group.fields.map(f => (
              <div key={f.key} style={{ display:'flex', gap:10, alignItems:'flex-end' }}>
                <div style={{ flex:1 }}>
                  <Input label={f.label} value={(form as any)[f.key]} placeholder={f.placeholder}
                    onChange={e => setForm(fm => ({ ...fm, [f.key]: e.target.value }))} />
                </div>
                <button onClick={() => saveM.mutate(f.key)}
                  style={{ padding:'10px 16px', background:saved[f.key]?C.green:C.blue, color:'#fff', border:'none', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap', height:42 }}>
                  {saved[f.key] ? '✓ Saved' : 'Save'}
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
      <UserManagement />
    </div>
  )
}
