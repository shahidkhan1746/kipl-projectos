import { useEffect, useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'

// Shared palette with PublicSitePage
export const P = {
  paper:'#FFFFFF', mist:'#EEF3F0', line:'#DBE6E0',
  ink:'#0A1E28', body:'#3F5763', faint:'#6B8592',
  water:'#0E6E8C', aqua:'#2FB98C', brand:'#3E9B7A',
}

const NAV = [
  { to:'/site',            label:'Overview' },
  { to:'/site/technology', label:'How It Works' },
  { to:'/site/timeline',   label:'Timeline' },
  { to:'/site/gallery',    label:'Gallery' },
  { to:'/site/team',       label:'Team' },
]

export function PublicShell({ title, subtitle, children }:{ title:string; subtitle?:string; children:ReactNode }) {
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => { setMenuOpen(false) }, [pathname])

  return (
    <div className="public-shell" style={{ minHeight:'100vh', display:'flex', flexDirection:'column', background:P.mist, color:P.ink,
      fontFamily:'system-ui,-apple-system,Segoe UI,Roboto,sans-serif' }}>
      <style>{`
        @supports (min-height: 100dvh) { .public-shell { min-height: 100dvh !important; } }
        .public-site-header { -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); }
        .public-site-mobile-menu { display: none; }
        @media (max-width: 800px) {
          .public-site-header-inner { padding-left: 16px !important; padding-right: 16px !important; gap: 12px !important; }
          .public-site-desktop-nav { display: none !important; }
          .public-site-mobile-menu { display: inline-flex !important; }
          .public-site-hero { padding: 34px 18px 32px !important; }
          .public-site-main { padding: 30px 18px 64px !important; }
        }
        @media (max-width: 380px) {
          .public-site-brand-subtitle { display: none; }
          .public-site-hero { padding-top: 28px !important; }
        }
      `}</style>
      <header className="public-site-header" style={{ position:'sticky', top:0, zIndex:20, background:'rgba(8,25,42,0.96)',
        WebkitBackdropFilter:'blur(8px)', backdropFilter:'blur(8px)', borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
        <div className="public-site-header-inner" style={{ maxWidth:1180, margin:'0 auto', padding:'0 24px', minHeight:60,
          display:'flex', alignItems:'center', gap:26 }}>
          <Link to="/site" style={{ display:'flex', flexDirection:'column', textDecoration:'none', lineHeight:1.15 }}>
            <span style={{ fontSize:16, fontWeight:800, color:'#fff', letterSpacing:'-0.01em' }}>KIPL <span style={{ color:P.aqua }}>Srinagar</span></span>
            <span className="public-site-brand-subtitle" style={{ fontSize:11, color:'#8CA6BA', fontWeight:500 }}>Dal Lake Sewerage Scheme</span>
          </Link>
          <nav className="public-site-desktop-nav" aria-label="Public site navigation" style={{ display:'flex', gap:22, marginLeft:'auto', alignItems:'center' }}>
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
          <button
            type="button"
            className="public-site-mobile-menu"
            aria-expanded={menuOpen}
            aria-controls="public-mobile-navigation"
            onClick={() => setMenuOpen(open => !open)}
            style={{ marginLeft:'auto', alignItems:'center', justifyContent:'center', minWidth:44, minHeight:44,
              padding:'8px 12px', borderRadius:8, border:'1px solid rgba(255,255,255,.18)',
              background:'rgba(255,255,255,.08)', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer' }}
          >
            {menuOpen ? 'Close' : 'Menu'}
          </button>
        </div>
        {menuOpen && (
          <nav id="public-mobile-navigation" aria-label="Mobile public site navigation"
            style={{ display:'grid', gap:4, padding:'8px max(16px, env(safe-area-inset-right)) 14px max(16px, env(safe-area-inset-left))',
              borderTop:'1px solid rgba(255,255,255,.08)', background:'#08192a' }}>
            {NAV.map(n => {
              const on = pathname === n.to
              return <Link key={n.to} to={n.to} onClick={() => setMenuOpen(false)}
                style={{ minHeight:44, display:'flex', alignItems:'center', padding:'8px 12px', borderRadius:8,
                  fontSize:14, fontWeight:on?700:600, color:on?P.aqua:'#C3D4E0', background:on?'rgba(47,185,140,.1)':'transparent' }}>{n.label}</Link>
            })}
            <Link to="/login" onClick={() => setMenuOpen(false)} style={{ minHeight:44, display:'flex', alignItems:'center', justifyContent:'center',
              marginTop:4, fontSize:13.5, fontWeight:800, color:P.ink, background:P.aqua, padding:'8px 16px', borderRadius:8 }}>Staff Login</Link>
          </nav>
        )}
      </header>

      <section className="public-site-hero" style={{ background:P.ink, color:'#fff', padding:'46px 24px 40px' }}>
        <div style={{ maxWidth:1180, margin:'0 auto' }}>
          <h1 style={{ fontSize:'clamp(28px,4vw,42px)', fontWeight:800, margin:0, letterSpacing:'-0.02em' }}>{title}</h1>
          {subtitle && <p style={{ fontSize:16, color:'#9DB4C6', margin:'10px 0 0', maxWidth:640 }}>{subtitle}</p>}
        </div>
      </section>

      <main className="public-site-main" style={{ flex:1, width:'100%', maxWidth:1180, margin:'0 auto', padding:'40px 24px 80px' }}>{children}</main>

      <footer style={{ background:P.ink, color:'#8CA6BA', padding:'34px 24px', fontSize:13 }}>
        <div style={{ maxWidth:1180, margin:'0 auto', display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
          <span>© {new Date().getFullYear()} Khilari Infrastructure Pvt. Ltd.</span>
          <span>kiplstpsrinagar.com</span>
        </div>
        <div style={{ maxWidth:1180, margin:'26px auto 0', paddingTop:22, borderTop:'1px solid rgba(255,255,255,0.08)',
          display:'flex', alignItems:'center', justifyContent:'center', gap:16, flexWrap:'wrap' }}>
          <span style={{ flex:1, maxWidth:120, height:1, background:'linear-gradient(90deg,transparent,rgba(255,255,255,.16),transparent)' }} />
          <span style={{ fontFamily:'ui-monospace,monospace', fontSize:10.5, letterSpacing:'0.14em', textTransform:'uppercase', color:'#7A93A6', whiteSpace:'nowrap' }}>Conceived, designed &amp; engineered by</span>
          <a className="sc-credit" href="https://shahid.co.in" target="_blank" rel="noopener noreferrer"
            style={{ display:'inline-flex', alignItems:'center', gap:5, fontWeight:800, fontSize:15, letterSpacing:'-0.01em',
              textDecoration:'none', whiteSpace:'nowrap',
              backgroundImage:`linear-gradient(92deg,${P.brand},${P.aqua} 60%,#7FE9DC)`,
              WebkitBackgroundClip:'text', backgroundClip:'text', color:'transparent' }}>
            Shahid&nbsp;Khan<span className="sc-arrow" style={{ WebkitTextFillColor:P.aqua, color:P.aqua, fontSize:12, transition:'transform .25s ease' }}>↗</span>
          </a>
          <span style={{ flex:1, maxWidth:120, height:1, background:'linear-gradient(90deg,transparent,rgba(255,255,255,.16),transparent)' }} />
        </div>
        <style>{`.sc-credit:hover .sc-arrow{transform:translate(2px,-2px)}`}</style>
      </footer>
    </div>
  )
}

// Minimal full-screen media viewer (photos & videos)
export function Lightbox({
  src,
  caption,
  isVideo,
  videoProvider,
  onClose,
}: {
  src: string | null
  caption?: string
  isVideo?: boolean
  videoProvider?: 'upload' | 'youtube' | 'vimeo' | 'external'
  onClose: () => void
}) {
  useEffect(() => {
    if (!src) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [src, onClose])

  if (!src) return null

  const isEmbed = videoProvider === 'youtube' || videoProvider === 'vimeo' || src.includes('youtube.com/embed') || src.includes('player.vimeo.com')

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(4,12,22,0.95)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24, cursor: 'zoom-out'
      }}
    >
      <div className="lightbox-media-container" onClick={e => e.stopPropagation()} style={{ position: 'relative', maxWidth: '94%', width: isVideo ? 800 : 'auto', maxHeight: '82vh', cursor: 'default' }}>
        {isVideo ? (
          isEmbed ? (
            <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', borderRadius: 12, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.7)', background: '#000' }}>
              <iframe
                src={src}
                title={caption ?? 'Video player'}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
              />
            </div>
          ) : (
            <video
              src={src}
              controls
              autoPlay
              playsInline
              className="lightbox-video"
              style={{ width: '100%', maxHeight: '80vh', borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.7)', background: '#000' }}
            />
          )
        ) : (
          <img
            src={src}
            alt={caption ?? ''}
            className="lightbox-image"
            style={{ maxWidth: '100%', maxHeight: '82vh', objectFit: 'contain', borderRadius: 8, boxShadow: '0 20px 60px rgba(0,0,0,0.5)', display: 'block', margin: '0 auto' }}
          />
        )}
      </div>
      {caption && <p style={{ color: '#C3D4E0', fontSize: 14, margin: 0, textAlign: 'center', maxWidth: 700 }}>{caption}</p>}
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
