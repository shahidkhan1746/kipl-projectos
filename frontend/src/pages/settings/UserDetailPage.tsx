import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Key, ToggleLeft, ToggleRight, Trash, FloppyDisk } from '@phosphor-icons/react'
import api from '@/api/client'

const C = {
  card:'#fff', border:'#e2e8f0', text1:'#0f172a', text2:'#475569', text3:'#94a3b8',
  blue:'#2563eb', green:'#059669', amber:'#d97706', red:'#dc2626', navy:'#1a2540',
}

const ROLE_OPTIONS = [
  { value:'super_admin',     label:'Super Admin'     },
  { value:'project_manager', label:'Project Manager' },
  { value:'liaison_officer', label:'Liaison Officer' },
  { value:'hr_officer',      label:'HR Officer'      },
  { value:'engineer',        label:'Site Engineer'   },
  { value:'accounts',        label:'Accounts'        },
  { value:'qa_engineer',     label:'QA Engineer'     },
  { value:'supervisor',      label:'Site Supervisor' },
]

const ROLE_COLORS: Record<string,string> = {
  super_admin:'#f59e0b', project_manager:'#f59e0b',
  liaison_officer:'#3b82f6', hr_officer:'#8b5cf6',
  engineer:'#10b981', accounts:'#f97316',
  qa_engineer:'#ec4899', supervisor:'#06b6d4',
}

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const qc  = useQueryClient()

  const [form, setForm]         = useState<any>(null)
  const [newPwd, setNewPwd]     = useState('')
  const [showPwd, setShowPwd]   = useState(false)
  const [saved, setSaved]       = useState(false)

  const { data: user, isLoading } = useQuery({
    queryKey: ['user', id],
    queryFn:  () => api.get(`/api/v1/users/${id}`).then(r => { setForm(r.data); return r.data }),
    enabled:  !!id,
  })

  const updateM = useMutation({
    mutationFn: (data: any) => api.patch(`/api/v1/users/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all-users'] })
      qc.invalidateQueries({ queryKey: ['user', id] })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    },
  })

  const resetPwdM = useMutation({
    mutationFn: () => api.patch(`/api/v1/users/${id}/reset-password`, { password: newPwd }),
    onSuccess: () => { setNewPwd(''); setShowPwd(false) },
  })

  const deleteM = useMutation({
    mutationFn: () => api.delete(`/api/v1/users/${id}`),
    onSuccess: () => nav('/settings/system'),
  })

  if (isLoading || !form) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:400 }}>
      <div style={{ width:36, height:36, border:'3px solid '+C.blue, borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
    </div>
  )

  const roleColor = ROLE_COLORS[user?.role] ?? C.blue

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:24, maxWidth:900 }}>

      {/* Back */}
      <button onClick={() => nav('/settings/system')}
        style={{ display:'flex', alignItems:'center', gap:8, background:'none', border:'none', cursor:'pointer', color:C.text2, fontSize:13, fontWeight:600, width:'fit-content', padding:'4px 0' }}>
        <ArrowLeft size={16} /> Back to Settings
      </button>

      {/* Header */}
      <div style={{ background:C.navy, borderRadius:16, padding:'28px 32px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:18 }}>
          <div style={{ width:60, height:60, borderRadius:'50%', background: roleColor + '33', border:'2px solid '+ roleColor + '66', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <span style={{ fontSize:22, fontWeight:700, color: roleColor }}>{user?.name?.charAt(0)}</span>
          </div>
          <div>
            <h1 style={{ fontSize:20, fontWeight:800, color:'#fff', margin:'0 0 4px' }}>{user?.name}</h1>
            <p style={{ fontSize:13, color:'rgba(255,255,255,0.55)', margin:'0 0 6px' }}>{user?.email}</p>
            <span style={{ fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20,
              background: roleColor + '33', color: roleColor }}>
              {ROLE_OPTIONS.find(r => r.value === user?.role)?.label ?? user?.role}
            </span>
          </div>
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <span style={{ padding:'6px 14px', borderRadius:20, fontSize:12, fontWeight:700,
            background: user?.isActive !== false ? 'rgba(5,150,105,0.2)' : 'rgba(220,38,38,0.2)',
            color: user?.isActive !== false ? '#34d399' : '#f87171' }}>
            {user?.isActive !== false ? '● ACTIVE' : '● INACTIVE'}
          </span>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>

        {/* Edit Details */}
        <div style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:14, padding:'22px 24px' }}>
          <h3 style={{ fontSize:14, fontWeight:700, color:C.text1, margin:'0 0 18px' }}>Account Details</h3>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            {[
              { label:'Full Name',   key:'name',        type:'text'  },
              { label:'Email',       key:'email',       type:'email' },
              { label:'Phone',       key:'phone',       type:'tel'   },
              { label:'Department',  key:'department',  type:'text'  },
              { label:'Designation', key:'designation', type:'text'  },
            ].map(f => (
              <div key={f.key}>
                <label style={{ fontSize:12, fontWeight:600, color:C.text2, display:'block', marginBottom:5 }}>{f.label}</label>
                <input type={f.type} value={form[f.key] ?? ''}
                  onChange={e => setForm((p: any) => ({ ...p, [f.key]: e.target.value }))}
                  style={{ width:'100%', padding:'9px 12px', border:'1.5px solid '+C.border, borderRadius:8, fontSize:13, outline:'none', boxSizing:'border-box', fontFamily:'inherit' }}
                  onFocus={e => (e.target.style.borderColor=C.blue)}
                  onBlur={e => (e.target.style.borderColor=C.border)} />
              </div>
            ))}
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:C.text2, display:'block', marginBottom:5 }}>Role</label>
              <select value={form.role ?? ''} onChange={e => setForm((p: any) => ({ ...p, role: e.target.value }))}
                style={{ width:'100%', padding:'9px 12px', border:'1.5px solid '+C.border, borderRadius:8, fontSize:13, background:'#fff', outline:'none' }}>
                {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <button onClick={() => updateM.mutate({ name:form.name, email:form.email, role:form.role, phone:form.phone, department:form.department, designation:form.designation })}
              style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'10px', background: saved ? C.green : C.blue, color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer', marginTop:4 }}>
              <FloppyDisk size={15} weight="bold" />
              {saved ? '✓ Saved' : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Security & Status */}
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

          {/* Reset Password */}
          <div style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:14, padding:'22px 24px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
              <Key size={16} color={C.blue} weight="bold" />
              <h3 style={{ fontSize:14, fontWeight:700, color:C.text1, margin:0 }}>Reset Password</h3>
            </div>
            {showPwd ? (
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)}
                  placeholder="New password (min 8 chars)" autoFocus
                  style={{ padding:'9px 12px', border:'1.5px solid '+C.border, borderRadius:8, fontSize:13, outline:'none', fontFamily:'inherit' }}
                  onFocus={e => (e.target.style.borderColor=C.blue)}
                  onBlur={e => (e.target.style.borderColor=C.border)} />
                <div style={{ display:'flex', gap:10 }}>
                  <button onClick={() => resetPwdM.mutate()} disabled={newPwd.length < 6}
                    style={{ flex:1, padding:'9px', background: newPwd.length < 6 ? '#93c5fd' : C.blue, color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer' }}>
                    Set Password
                  </button>
                  <button onClick={() => { setShowPwd(false); setNewPwd('') }}
                    style={{ padding:'9px 14px', background:'none', border:'1.5px solid '+C.border, borderRadius:8, fontSize:13, cursor:'pointer' }}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowPwd(true)}
                style={{ width:'100%', padding:'10px', background:'none', border:'1.5px solid '+C.border, borderRadius:8, fontSize:13, fontWeight:600, color:C.text2, cursor:'pointer' }}>
                Change Password
              </button>
            )}
          </div>

          {/* Account Status */}
          <div style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:14, padding:'22px 24px' }}>
            <h3 style={{ fontSize:14, fontWeight:700, color:C.text1, margin:'0 0 14px' }}>Account Status</h3>
            <button onClick={() => updateM.mutate({ isActive: !user?.isActive })}
              style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 14px',
                background: user?.isActive !== false ? '#f0fdf4' : '#fef2f2',
                border:'1.5px solid '+(user?.isActive !== false ? '#bbf7d0' : '#fecaca'),
                borderRadius:10, cursor:'pointer' }}>
              <span style={{ fontSize:13, fontWeight:600, color: user?.isActive !== false ? C.green : C.red }}>
                {user?.isActive !== false ? 'Account is Active' : 'Account is Inactive'}
              </span>
              {user?.isActive !== false
                ? <ToggleRight size={28} color={C.green} weight="fill" />
                : <ToggleLeft size={28} color={C.text3} />}
            </button>
            <p style={{ fontSize:12, color:C.text3, margin:'8px 0 0' }}>
              {user?.isActive !== false
                ? 'User can log in and access the system'
                : 'User cannot log in until reactivated'}
            </p>
          </div>

          {/* Danger Zone */}
          <div style={{ background:'#fef2f2', border:'1.5px solid #fecaca', borderRadius:14, padding:'22px 24px' }}>
            <h3 style={{ fontSize:14, fontWeight:700, color:C.red, margin:'0 0 8px' }}>Danger Zone</h3>
            <p style={{ fontSize:12, color:'#ef4444', margin:'0 0 14px' }}>Permanently delete this user account. This cannot be undone.</p>
            <button onClick={() => { if (window.confirm('Permanently delete ' + user?.name + '?\n\nThis cannot be undone.')) deleteM.mutate() }}
              style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 16px', background:'#dc2626', color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer' }}>
              <Trash size={15} weight="bold" /> Delete User Account
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
