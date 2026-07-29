import { Drop, Wind, FunnelSimple, Export, Pause, ArrowRight } from '@phosphor-icons/react'
import { PublicShell, P } from './_SiteChrome'

// The Nishat plant runs the C-Tech SBR (Sequencing Batch Reactor) process.
const PHASES = [
  { Icon: Drop,        name: 'Fill',    color: '#0A6FD1',
    text: 'Screened, de-gritted sewage enters the basin from the distribution channel. Mixing keeps solids in suspension so the incoming load meets the biomass already in the tank.' },
  { Icon: Wind,        name: 'React',   color: '#2FB98C',
    text: 'Fine-bubble diffusers across the floor aerate the basin. Micro-organisms consume the organic load; alternating aerobic and anoxic conditions strip nitrogen out of the water.' },
  { Icon: FunnelSimple, name: 'Settle', color: '#8A6E3F',
    text: 'Aeration stops. With nothing stirring it, the biomass flocculates and sinks, leaving clarified water above a distinct sludge blanket — no separate clarifier needed.' },
  { Icon: Export,      name: 'Decant',  color: '#0E6E8C',
    text: 'A floating decanter draws the clarified supernatant off the surface without disturbing the settled sludge. That water is the treated effluent, and it leaves for the chlorine contact tank.' },
  { Icon: Pause,       name: 'Idle',    color: '#6B8592',
    text: 'A short buffer while surplus sludge is wasted and the basin readies for the next fill. The four basins run this cycle a quarter-turn apart, so the plant never stops accepting flow.' },
]

// Drop your NotebookLM exports into frontend/public/assets/tech/ with these names.
const INFOGRAPHICS = [
  { src: '/assets/tech/infographic-1.png', caption: 'The SBR treatment cycle' },
  { src: '/assets/tech/infographic-2.png', caption: 'Plant layout — Nishat' },
  { src: '/assets/tech/infographic-3.png', caption: 'Sewer network & pumping' },
  { src: '/assets/tech/infographic-4.png', caption: 'Nutrient removal' },
]
const VIDEO_SRC = '/assets/tech/process.mp4'

const FACTS = [
  ['38.5 MLD', 'Design capacity'],
  ['4', 'SBR basins · 65.5 × 29 × 6 m'],
  ['C-Tech', 'SBR process technology'],
  ['210 km', 'New sewer network'],
  ['< 10 mg/L', 'Effluent BOD target'],
  ['300 m', 'To Dal Lake, downstream'],
]

function hideOnError(e: React.SyntheticEvent<HTMLImageElement>) {
  const fig = (e.target as HTMLImageElement).closest('figure') as HTMLElement | null
  if (fig) fig.style.display = 'none'
}

export default function TechnologyPage() {
  return (
    <PublicShell title="How the Plant Works"
      subtitle="The Sequencing Batch Reactor (SBR) technology behind the 38.5 MLD sewage treatment plant at Nishat, Srinagar.">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 56 }}>

        {/* Intro */}
        <section>
          <p style={{ fontSize: 'clamp(16px,1.6vw,20px)', lineHeight: 1.7, color: P.body, maxWidth: '68ch', margin: 0 }}>
            A sequencing batch reactor treats sewage in <b>one tank, in timed stages</b>, rather than moving it through a
            chain of separate units. Each basin fills, aerates, settles and decants in sequence — doing the work of an
            aeration tank and a clarifier in the same vessel. It is compact, flexible with load, and well suited to a
            sensitive catchment like Dal Lake.
          </p>
        </section>

        {/* The cycle */}
        <section>
          <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase', color: P.water, margin: '0 0 18px' }}>The treatment cycle</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: 16 }}>
            {PHASES.map((ph, i) => (
              <div key={ph.name} style={{ background: '#fff', border: '1px solid ' + P.line, borderRadius: 16, padding: '22px 20px', boxShadow: '0 1px 3px rgba(8,25,42,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 11, background: ph.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ph.Icon size={22} color={ph.color} weight="duotone" />
                  </div>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: P.faint }}>{String(i + 1).padStart(2, '0')}</span>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: P.ink, margin: 0 }}>{ph.name}</h3>
                </div>
                <p style={{ fontSize: 14, lineHeight: 1.6, color: P.body, margin: 0 }}>{ph.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Video */}
        <section>
          <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase', color: P.water, margin: '0 0 14px' }}>Explainer</p>
          <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', border: '1px solid ' + P.line, background: P.ink, aspectRatio: '16/9' }}>
            <video src={VIDEO_SRC} controls playsInline preload="metadata"
              style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }}
              onError={e => { const w = (e.target as HTMLVideoElement).parentElement; if (w) w.innerHTML = '<div style="height:100%;display:grid;place-content:center;color:#9DB4C6;font-size:13px;text-align:center;padding:24px">Explainer video will appear here.<br/>Add <code>process.mp4</code> to <code>public/assets/tech/</code></div>' }} />
          </div>
        </section>

        {/* Infographics */}
        <section>
          <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase', color: P.water, margin: '0 0 14px' }}>Infographics</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 18 }}>
            {INFOGRAPHICS.map(g => (
              <figure key={g.src} style={{ margin: 0, background: '#fff', border: '1px solid ' + P.line, borderRadius: 14, overflow: 'hidden' }}>
                <img src={g.src} alt={g.caption} loading="lazy" onError={hideOnError}
                  style={{ width: '100%', display: 'block' }} />
                <figcaption style={{ fontSize: 13, fontWeight: 600, color: P.body, padding: '12px 14px' }}>{g.caption}</figcaption>
              </figure>
            ))}
          </div>
        </section>

        {/* Facts */}
        <section>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 14 }}>
            {FACTS.map(([v, l]) => (
              <div key={l} style={{ background: '#fff', border: '1px solid ' + P.line, borderRadius: 14, padding: '20px 18px' }}>
                <div style={{ fontSize: 'clamp(22px,2.4vw,30px)', fontWeight: 800, color: P.brand, letterSpacing: '-0.02em', lineHeight: 1 }}>{v}</div>
                <div style={{ fontSize: 12.5, color: P.faint, marginTop: 8 }}>{l}</div>
              </div>
            ))}
          </div>
          <a href="/site/timeline" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 24, fontWeight: 700, color: P.water, textDecoration: 'none' }}>
            See construction progress <ArrowRight size={15} />
          </a>
        </section>

      </div>
    </PublicShell>
  )
}
