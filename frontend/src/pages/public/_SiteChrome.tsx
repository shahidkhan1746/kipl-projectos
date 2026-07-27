import { useEffect, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'

// Shared palette with PublicSitePage
export const P = {
  paper:'#FFFFFF', mist:'#F1F5F8', line:'#DCE5EA',
  ink:'#08192A', body:'#42596B', faint:'#6E8494',
  water:'#0A6FD1', aqua:'#2DD4BF',
}

const NAV = [
  { to:'/site',          label:'Overview' },
  { to:'/site/timeline', label:'Timeline' },
  { to:'/site/gallery',  label:'Gallery' },
  { to:'/site/team',     label:'Team' },
]

export function PublicShell({ title, subtitle, children }:{ title:string; subtitle?:string; children:ReactNode }) {
  const { pathname } = useLocation()
  return (
    <div style={{ minHeight:'100vh', background:P.mist, color:P.ink,
      fontFamily:'system-ui,-apple-system,Segoe UI,Roboto,sans-serif' }}>
      <header style={{ position:'sticky', top:0, zIndex:20, background:'rgba(8,25,42,0.96)',
        backdropFilter:'blur(8px)', borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ maxWidth:1180, margin:'0 auto', padding:'0 24px', height:60,
          display:'flex', alignItems:'center', gap:26 }}>
          <Link to="/site" style={{ display:'flex', flexDirection:'column', textDecoration:'none', lineHeight:1.15 }}>
            <span style={{ fontSize:15, fontWeight:800, color:'#fff', letterSpacing:'-0.01em' }}>Nishat 38.5 MLD STP</span>
            <span style={{ fontSize:11, color:'#8CA6BA', fontWeight:500 }}>Srinagar · Khilari Infrastructure</span>
          </Link>
          <nav style={{ display:'flex', gap:22, marginLeft:'auto', alignItems:'center' }}>
            {NAV.map(n => {
              const on = pathname === n.to
              return (
                <Link key={n.to} to={n.to} style={{ fontSize:14.5, fontWeight:on?700:500, textDecoration:'none',
                  color: on ? P.aqua : '#C3D4E0' }}>{n.label}</Link>
              )
            })}
            <Link to="/login" style={{ fontSize:13.5, fontWeight:700, textDecoration:'none', color:P.ink,
              background:P.aqua, padding:'8px 16px', borderRadius:8 }}>Staff Login</Link>
          </nav>
        </div>
      </header>

      <section style={{ background:P.ink, color:'#fff', padding:'46px 24px 40px' }}>
        <div style={{ maxWidth:1180, margin:'0 auto' }}>
          <h1 style={{ fontSize:'clamp(28px,4vw,42px)', fontWeight:800, margin:0, letterSpacing:'-0.02em' }}>{title}</h1>
          {subtitle && <p style={{ fontSize:16, color:'#9DB4C6', margin:'10px 0 0', maxWidth:640 }}>{subtitle}</p>}
        </div>
      </section>

      <main style={{ maxWidth:1180, margin:'0 auto', padding:'40px 24px 80px' }}>{children}</main>

      <footer style={{ background:P.ink, color:'#8CA6BA', padding:'34px 24px', fontSize:13 }}>
        <div style={{ maxWidth:1180, margin:'0 auto', display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
          <span>© {new Date().getFullYear()} Khilari Infrastructure Pvt. Ltd.</span>
          <span>kiplstpsrinagar.com</span>
        </div>
      </footer>
    </div>
  )
}

// Minimal full-screen image viewer
export function Lightbox({ src, caption, onClose }:{ src:string|null; caption?:string; onClose:()=>void }) {
  useEffect(() => {
    if (!src) return
    const onKey = (e:KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [src, onClose])
  if (!src) return null
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:100, background:'rgba(4,12,22,0.94)',
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:14, padding:24, cursor:'zoom-out' }}>
      <img src={src} alt={caption ?? ''} style={{ maxWidth:'92%', maxHeight:'82vh', objectFit:'contain', borderRadius:8, boxShadow:'0 20px 60px rgba(0,0,0,0.5)' }} />
      {caption && <p style={{ color:'#C3D4E0', fontSize:14, margin:0, textAlign:'center' }}>{caption}</p>}
    </div>
  )
}

export function EmptyState({ text }:{ text:string }) {
  return (
    <div style={{ textAlign:'center', padding:'70px 20px', color:P.faint }}>
      <p style={{ fontSize:15, margin:0 }}>{text}</p>
    </div>
  )
}
