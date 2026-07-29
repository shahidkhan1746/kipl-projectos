import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { updatesApi } from '@/api/updates.api'
import { PublicShell, Lightbox, EmptyState, P } from './_SiteChrome'

const fmtDay = (d: string) => new Date(d).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

export default function GalleryPage() {
  const { data: photos = [], isLoading } = useQuery({ queryKey: ['pub-gallery'], queryFn: () => updatesApi.publicGallery() })
  const [box, setBox] = useState<{ src: string; caption?: string } | null>(null)

  // Group photos by day (API returns newest-first)
  const groups: { date: string; items: any[] }[] = []
  for (const p of (photos as any[])) {
    const key = String(p.date || '').slice(0, 10)
    let g = groups.find(x => x.date === key)
    if (!g) { g = { date: key, items: [] }; groups.push(g) }
    g.items.push(p)
  }

  return (
    <PublicShell title="Site Gallery"
      subtitle="Every photograph from the project, grouped by day. Tap any image to enlarge.">
      {isLoading ? <EmptyState text="Loading…" />
        : photos.length === 0 ? <EmptyState text="Photos from the site will appear here." />
        : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 44 }}>
          {groups.map(g => (
            <section key={g.date}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
                <h2 style={{ fontSize: 19, fontWeight: 800, color: P.ink, margin: 0, whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>{fmtDay(g.date)}</h2>
                <span style={{ fontSize: 12, fontWeight: 600, color: P.faint, background: '#fff', border: '1px solid ' + P.line, borderRadius: 20, padding: '3px 11px' }}>
                  {g.items.length} photo{g.items.length > 1 ? 's' : ''}
                </span>
                <div style={{ flex: 1, height: 1, background: P.line }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(250px,1fr))', gap: 16 }}>
                {g.items.map((p: any, i: number) => (
                  <figure key={i} className="gal-card"
                    onClick={() => setBox({ src: p.url, caption: `${p.caption} · ${fmtDay(g.date)}` })}
                    style={{ margin: 0, position: 'relative', aspectRatio: '4/3', borderRadius: 14, overflow: 'hidden',
                      cursor: 'zoom-in', background: '#0b1f28', border: '1px solid ' + P.line, boxShadow: '0 2px 12px rgba(8,25,42,0.10)' }}>
                    <img src={p.url} alt={p.caption} loading="lazy" className="gal-img"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform .45s ease' }} />
                    {p.category && p.category !== 'general' && (
                      <span style={{ position: 'absolute', top: 10, left: 10, fontSize: 9.5, fontWeight: 700, letterSpacing: '0.05em',
                        textTransform: 'uppercase', color: '#fff', background: 'rgba(8,25,42,0.7)', padding: '3px 9px', borderRadius: 20 }}>{p.category}</span>
                    )}
                    <figcaption className="gal-cap" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '28px 12px 11px',
                      color: '#fff', background: 'linear-gradient(transparent,rgba(8,25,42,0.92))', transform: 'translateY(100%)', transition: 'transform .3s ease' }}>
                      <span style={{ fontSize: 12.5, fontWeight: 700, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.caption}</span>
                    </figcaption>
                  </figure>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
      <style>{`.gal-card:hover .gal-img{transform:scale(1.06)}.gal-card:hover .gal-cap{transform:translateY(0)}`}</style>
      <Lightbox src={box?.src ?? null} caption={box?.caption} onClose={() => setBox(null)} />
    </PublicShell>
  )
}
