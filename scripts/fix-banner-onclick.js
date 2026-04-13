const fs   = require('fs')
const path = require('path')

const filePath = path.join(
  process.env.HOME || process.env.USERPROFILE,
  'Desktop', 'kipl-srinagar', 'frontend', 'src', 'components', 'layout', 'AppHeader.tsx'
)

let src = fs.readFileSync(filePath, 'utf8')

const OLD = `                <div style={{ margin:'10px 12px 0', padding:'8px 12px', borderRadius:8,
                  background:'#fffbeb', border:'1px solid #fde68a',
                  display:'flex', alignItems:'center', gap:8 }}>
                  <Warning size={13} color={C.amber} weight='fill' />
                  <p style={{ fontSize:11, color:C.amber, margin:0, fontWeight:600 }}>
                    Project data incomplete — tap to complete
                  </p>
                </div>`

const NEW = `                <div
                  onClick={() => { setShowProfile(false); window.dispatchEvent(new Event('open-data-modal')) }}
                  style={{ margin:'10px 12px 0', padding:'8px 12px', borderRadius:8,
                    background:'#fffbeb', border:'1px solid #fde68a',
                    display:'flex', alignItems:'center', gap:8,
                    cursor:'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.background='#fef3c7')}
                  onMouseLeave={e => (e.currentTarget.style.background='#fffbeb')}>
                  <Warning size={13} color={C.amber} weight='fill' />
                  <p style={{ fontSize:11, color:C.amber, margin:0, fontWeight:600 }}>
                    Project data incomplete — tap to complete
                  </p>
                </div>`

if (src.includes(OLD)) {
  src = src.replace(OLD, NEW)
  fs.writeFileSync(filePath, src)
  console.log('✅ Done — banner is now clickable')
} else {
  console.log('❌ Exact string not found — writing patch differently')
  // Patch just the div opening tag on the exact line
  src = src.replace(
    `                <div style={{ margin:'10px 12px 0', padding:'8px 12px', borderRadius:8,\n                  background:'#fffbeb', border:'1px solid #fde68a',\n                  display:'flex', alignItems:'center', gap:8 }}>`,
    `                <div onClick={() => { setShowProfile(false); window.dispatchEvent(new Event('open-data-modal')) }} style={{ margin:'10px 12px 0', padding:'8px 12px', borderRadius:8, background:'#fffbeb', border:'1px solid #fde68a', display:'flex', alignItems:'center', gap:8, cursor:'pointer' }}>`
  )
  fs.writeFileSync(filePath, src)
  console.log('✅ Done — fallback patch applied')
}
