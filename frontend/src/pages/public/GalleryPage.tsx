import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { updatesApi } from '@/api/updates.api'
import { PublicShell, Lightbox, EmptyState, P } from './_SiteChrome'
import { VideoCamera, PlayCircle, Image, FilmStrip } from '@phosphor-icons/react'

const fmtDay = (d: string) => new Date(d).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

export default function GalleryPage() {
  const { data: mediaItems = [], isLoading } = useQuery({ queryKey: ['pub-gallery'], queryFn: () => updatesApi.publicGallery() })
  const [box, setBox] = useState<{ src: string; caption?: string; isVideo?: boolean; videoProvider?: any } | null>(null)
  const [filter, setFilter] = useState<'all' | 'photos' | 'videos'>('all')

  const filteredItems = (mediaItems as any[]).filter(item => {
    const isVid = item.mediaType === 'video' || !!item.provider
    if (filter === 'photos') return !isVid
    if (filter === 'videos') return isVid
    return true
  })

  const photoCount = (mediaItems as any[]).filter(m => m.mediaType !== 'video' && !m.provider).length
  const videoCount = (mediaItems as any[]).filter(m => m.mediaType === 'video' || !!m.provider).length

  // Group items by day (API returns newest-first)
  const groups: { date: string; items: any[] }[] = []
  for (const p of filteredItems) {
    const key = String(p.date || '').slice(0, 10)
    let g = groups.find(x => x.date === key)
    if (!g) { g = { date: key, items: [] }; groups.push(g) }
    g.items.push(p)
  }

  return (
    <PublicShell title="Site Media Gallery"
      subtitle="Photographs and drone video recordings from the project, grouped by day. Tap any item to view or play.">

      {/* Media Type Filter Tabs */}
      {!isLoading && (mediaItems as any[]).length > 0 && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 32, flexWrap: 'wrap' }}>
          <button
            onClick={() => setFilter('all')}
            style={{
              padding: '8px 16px', borderRadius: 20, fontSize: 13, fontWeight: 700, cursor: 'pointer',
              border: '1px solid ' + (filter === 'all' ? P.ink : P.line),
              background: filter === 'all' ? P.ink : '#fff',
              color: filter === 'all' ? '#fff' : P.body,
              display: 'flex', alignItems: 'center', gap: 6, transition: 'all .15s'
            }}
          >
            <FilmStrip size={15} /> All Media ({(mediaItems as any[]).length})
          </button>
          <button
            onClick={() => setFilter('photos')}
            style={{
              padding: '8px 16px', borderRadius: 20, fontSize: 13, fontWeight: 700, cursor: 'pointer',
              border: '1px solid ' + (filter === 'photos' ? P.ink : P.line),
              background: filter === 'photos' ? P.ink : '#fff',
              color: filter === 'photos' ? '#fff' : P.body,
              display: 'flex', alignItems: 'center', gap: 6, transition: 'all .15s'
            }}
          >
            <Image size={15} /> Photos ({photoCount})
          </button>
          <button
            onClick={() => setFilter('videos')}
            style={{
              padding: '8px 16px', borderRadius: 20, fontSize: 13, fontWeight: 700, cursor: 'pointer',
              border: '1px solid ' + (filter === 'videos' ? P.ink : P.line),
              background: filter === 'videos' ? P.ink : '#fff',
              color: filter === 'videos' ? '#fff' : P.body,
              display: 'flex', alignItems: 'center', gap: 6, transition: 'all .15s'
            }}
          >
            <VideoCamera size={15} /> Site & Drone Videos ({videoCount})
          </button>
        </div>
      )}

      {isLoading ? <EmptyState text="Loading…" />
        : (mediaItems as any[]).length === 0 ? <EmptyState text="Media from the site will appear here." />
        : filteredItems.length === 0 ? <EmptyState text={`No ${filter} available yet.`} />
        : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 44 }}>
          {groups.map(g => (
            <section key={g.date}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
                <h2 style={{ fontSize: 19, fontWeight: 800, color: P.ink, margin: 0, whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>{fmtDay(g.date)}</h2>
                <span style={{ fontSize: 12, fontWeight: 600, color: P.faint, background: '#fff', border: '1px solid ' + P.line, borderRadius: 20, padding: '3px 11px' }}>
                  {g.items.length} item{g.items.length > 1 ? 's' : ''}
                </span>
                <div style={{ flex: 1, height: 1, background: P.line }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(250px,1fr))', gap: 16 }}>
                {g.items.map((p: any, i: number) => {
                  const isVid = p.mediaType === 'video' || !!p.provider
                  return (
                    <figure key={i} className="gal-card" role="button" tabIndex={0}
                      onClick={() => setBox({ src: p.url, caption: `${p.caption} · ${fmtDay(g.date)}`, isVideo: isVid, videoProvider: p.provider })}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setBox({ src: p.url, caption: `${p.caption} · ${fmtDay(g.date)}`, isVideo: isVid, videoProvider: p.provider }) } }}
                      style={{ margin: 0, position: 'relative', aspectRatio: '4/3', borderRadius: 14, overflow: 'hidden',
                        cursor: 'pointer', background: '#0b1f28', border: '1px solid ' + P.line, boxShadow: '0 2px 12px rgba(8,25,42,0.10)' }}>
                      {p.thumbnail ? (
                        <img src={p.thumbnail} alt={p.caption} loading="lazy" className="gal-img"
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform .45s ease' }} />
                      ) : isVid ? (
                        <video src={p.url} className="gal-img" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      ) : (
                        <img src={p.url} alt={p.caption} loading="lazy" className="gal-img"
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform .45s ease' }} />
                      )}

                      {/* Video Play Badge Indicator */}
                      {isVid && (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)', pointerEvents: 'none' }}>
                          <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'rgba(10,30,40,0.85)', WebkitBackdropFilter: 'blur(4px)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff', boxShadow: '0 4px 14px rgba(0,0,0,0.4)' }}>
                            <PlayCircle size={28} color="#fff" weight="fill" />
                          </div>
                        </div>
                      )}

                      <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {isVid && (
                          <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#fff', background: '#7c3aed', padding: '3px 9px', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            <VideoCamera size={11} weight="fill" /> Video
                          </span>
                        )}
                        {p.category && p.category !== 'general' && (
                          <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.05em',
                            textTransform: 'uppercase', color: '#fff', background: 'rgba(8,25,42,0.7)', padding: '3px 9px', borderRadius: 20 }}>{p.category}</span>
                        )}
                      </div>

                      <figcaption className="gal-cap" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '28px 12px 11px',
                        color: '#fff', background: 'linear-gradient(transparent,rgba(8,25,42,0.92))', transform: 'translateY(100%)', transition: 'transform .3s ease' }}>
                        <span style={{ fontSize: 12.5, fontWeight: 700, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.caption}</span>
                      </figcaption>
                    </figure>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      )}
      <style>{`
        @media (hover:hover) and (pointer:fine) {
          .gal-card:hover .gal-img,.gal-card:focus-visible .gal-img{transform:scale(1.06)}
          .gal-card:hover .gal-cap,.gal-card:focus-visible .gal-cap{transform:translateY(0)!important}
        }
        @media (hover:none), (pointer:coarse) {
          .gal-card .gal-cap{transform:translateY(0)!important}
        }
      `}</style>
      <Lightbox src={box?.src ?? null} caption={box?.caption} isVideo={box?.isVideo} videoProvider={box?.videoProvider} onClose={() => setBox(null)} />
    </PublicShell>
  )
}
