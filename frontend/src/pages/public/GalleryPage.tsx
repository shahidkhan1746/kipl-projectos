import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { updatesApi } from '@/api/updates.api'
import { PublicShell, Lightbox, EmptyState, P } from './_SiteChrome'

const fmt = (d:string) => new Date(d).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })

export default function GalleryPage() {
  const { data: photos = [], isLoading } = useQuery({ queryKey:['pub-gallery'], queryFn:()=>updatesApi.publicGallery() })
  const [box, setBox] = useState<{ src:string; caption?:string } | null>(null)

  return (
    <PublicShell title="Site Gallery"
      subtitle="Every photograph from the project, newest first. Tap any image to enlarge.">
      {isLoading ? <EmptyState text="Loading…" />
        : photos.length === 0 ? <EmptyState text="Photos from the site will appear here." />
        : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:12 }}>
          {photos.map((p:any, i:number) => (
            <figure key={i} onClick={()=>setBox({ src:p.url, caption:`${p.caption} · ${fmt(p.date)}` })}
              style={{ margin:0, position:'relative', aspectRatio:'4/3', borderRadius:12, overflow:'hidden',
                cursor:'zoom-in', border:'1px solid '+P.line, background:'#fff' }}>
              <img src={p.url} alt={p.caption} loading="lazy"
                style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
              <figcaption style={{ position:'absolute', left:0, right:0, bottom:0, padding:'20px 12px 9px',
                background:'linear-gradient(transparent,rgba(8,25,42,0.82))', color:'#fff' }}>
                <span style={{ fontSize:12.5, fontWeight:600, display:'block', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.caption}</span>
                <span style={{ fontSize:11, color:'#B8CAD8' }}>{fmt(p.date)}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
      <Lightbox src={box?.src ?? null} caption={box?.caption} onClose={()=>setBox(null)} />
    </PublicShell>
  )
}
