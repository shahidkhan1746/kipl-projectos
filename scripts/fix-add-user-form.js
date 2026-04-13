#!/usr/bin/env node
const fs   = require('fs')
const path = require('path')

const FILE = path.resolve(__dirname, '..', 'frontend', 'src', 'pages', 'settings', 'SystemSettingsPage.tsx')
let src = fs.readFileSync(FILE, 'utf8')

// Replace the overflowing 5-column grid with a proper 2x2 + button layout
src = src.replace(
  `          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr auto', gap:12, alignItems:'flex-end' }}>
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
          </div>`,

  `          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
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
          </div>`
)

fs.writeFileSync(FILE, src)
console.log('✅  Add user form fixed — 2-column grid with full-width button row')
