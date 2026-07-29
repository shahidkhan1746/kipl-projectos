import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { updatesApi, type UpdatePhoto } from '@/api/updates.api'
import { PublicShell, Lightbox, EmptyState, P } from './_SiteChrome'

const CAT_COLOR: Record<string, string> = {
  milestone: '#0A6FD1', civil: '#8A6E3F', mechanical: '#0891b2', electrical: '#d97706',
  safety: '#dc2626', survey: '#7c3aed', general: '#42596B',
}
const fmt = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
const PER_PAGE = 6

export default function TimelinePage() {
  const { data: rows = [], isLoading } = useQuery({ queryKey: ['pub-timeline'], queryFn: () => updatesApi.publicTimeline() })
  const [box, setBox] = useState<{ src: string; caption?: string } | null>(null)
  const [page, setPage] = useState(1)

  const totalPages = Math.max(1, Math.ceil((rows as any[]).length / PER_PAGE))
  const cur = Math.min(page, totalPages)
  const pageRows = (rows as any[]).slice((cur - 1) * PER_PAGE, cur * PER_PAGE)
  const goto = (p: number) => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  return (
    <PublicShell title="Construction Timeline"
      subtitle="A dated record of progress on the 38.5 MLD sewage treatment plant at Nishat, Srinagar.">
      {isLoading ? <EmptyState text="Loading…" />
        : rows.length === 0 ? <EmptyState text="Progress updates will appear here as work advances." />
        : (
        <>
        <div style={{ position: 'relative', paddingLeft: 28 }}>
          <div style={{ position: 'absolute', left: 7, top: 6, bottom: 6, width: 2, background: P.line }} />
          {pageRows.map((u: any) => (
            <article key={u.id} style={{ position: 'relative', marginBottom: 34 }}>
              <div style={{ position: 'absolute', left: -28, top: 4, width: 16, height: 16, borderRadius: '50%',
                background: '#fff', border: '3px solid ' + (CAT_COLOR[u.category] ?? P.water) }} />
              <div style={{ background: '#fff', border: '1px solid ' + P.line, borderRadius: 14, padding: '18px 20px',
                boxShadow: '0 1px 3px rgba(8,25,42,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
                    color: CAT_COLOR[u.category] ?? P.water }}>{u.category}</span>
                  <span style={{ fontSize: 13, color: P.faint }}>{fmt(u.date)}</span>
                </div>
                <h3 style={{ fontSize: 19, fontWeight: 800, color: P.ink, margin: '0 0 6px', letterSpacing: '-0.01em' }}>{u.title}</h3>
                {u.description && <p style={{ fontSize: 14.5, lineHeight: 1.6, color: P.body, margin: 0 }}>{u.description}</p>}
                {u.photos?.length > 0 && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                    {u.photos.map((p: UpdatePhoto, i: number) => (
                      <img key={i} src={p.url} alt={p.caption ?? u.title} loading="lazy"
                        onClick={() => setBox({ src: p.url, caption: p.caption ?? u.title })}
                        style={{ width: 120, height: 90, objectFit: 'cover', borderRadius: 8, cursor: 'zoom-in', border: '1px solid ' + P.line }} />
                    ))}
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>

        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 24, flexWrap: 'wrap' }}>
            <PageBtn disabled={cur === 1} onClick={() => goto(cur - 1)}>← Prev</PageBtn>
            {Array.from({ length: totalPages }).map((_, i) => (
              <PageBtn key={i} active={cur === i + 1} onClick={() => goto(i + 1)}>{i + 1}</PageBtn>
            ))}
            <PageBtn disabled={cur === totalPages} onClick={() => goto(cur + 1)}>Next →</PageBtn>
          </div>
        )}
        </>
      )}
      <Lightbox src={box?.src ?? null} caption={box?.caption} onClose={() => setBox(null)} />
    </PublicShell>
  )
}

function PageBtn({ children, active, disabled, onClick }: { children: any; active?: boolean; disabled?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ minWidth: 38, padding: '8px 12px', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: disabled ? 'default' : 'pointer',
        border: '1px solid ' + (active ? P.ink : P.line), background: active ? P.ink : '#fff',
        color: active ? '#fff' : disabled ? '#B8C6CE' : P.body, opacity: disabled ? 0.6 : 1, transition: 'all .15s' }}>
      {children}
    </button>
  )
}
