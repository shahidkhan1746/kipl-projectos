import { useQuery } from '@tanstack/react-query'
import { updatesApi } from '@/api/updates.api'
import { PublicShell, EmptyState, P } from './_SiteChrome'
import { TravelPartnerLink } from './TravelPartnerLink'

export default function TeamPage() {
  const { data: rows = [], isLoading } = useQuery({ queryKey:['pub-team'], queryFn:()=>updatesApi.publicTeam() })

  // group by department, preserving sort order
  const groups: Record<string, any[]> = {}
  for (const m of rows) {
    const d = m.department || 'Project Team'
    ;(groups[d] ??= []).push(m)
  }

  return (
    <PublicShell title="Project Team"
      subtitle="The people delivering the Nishat sewage treatment plant for Srinagar.">
      {isLoading ? <EmptyState text="Loading…" />
        : rows.length === 0 ? <EmptyState text="Team profiles will appear here soon." />
        : Object.entries(groups).map(([dept, members]) => (
          <div key={dept} style={{ marginBottom:40 }}>
            <h2 style={{ fontSize:13, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em',
              color:P.water, margin:'0 0 16px' }}>{dept}</h2>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(210px,1fr))', gap:16 }}>
              {members.map((m:any) => (
                <div key={m.id} style={{ background:'#fff', border:'1px solid '+P.line, borderRadius:16,
                  padding:'26px 20px', textAlign:'center', boxShadow:'0 1px 3px rgba(8,25,42,0.05)' }}>
                  <div style={{ width:88, height:88, borderRadius:'50%', margin:'0 auto 14px', overflow:'hidden',
                    background:P.mist, border:'3px solid '+P.line }}>
                    {m.photoUrl
                      ? <img src={m.photoUrl} alt={m.name} loading="lazy" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                      : <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%',
                          fontSize:30, fontWeight:800, color:P.faint }}>{m.name?.charAt(0)}</div>}
                  </div>
                  <p style={{ fontSize:16, fontWeight:800, color:P.ink, margin:'0 0 3px' }}>{m.name}</p>
                  <p style={{ fontSize:13.5, fontWeight:600, color:P.water, margin:0 }}>{m.title}</p>
                  {m.bio && <p style={{ fontSize:12.5, lineHeight:1.55, color:P.body, margin:'10px 0 0' }}>{m.bio}</p>}
                </div>
              ))}
            </div>
          </div>
        ))}
      <p style={{ margin:'8px 0 0', paddingTop:20, borderTop:'1px solid '+P.line, maxWidth:620,
        fontSize:14, lineHeight:1.6, color:P.body }}>
        Coming to Srinagar to work with the team? Travel and stays for visiting engineers and corporate
        groups are arranged by <TravelPartnerLink style={{ color:P.water, fontWeight:600, textUnderlineOffset:3 }} />,
        our travel partner in Srinagar.
      </p>
    </PublicShell>
  )
}
