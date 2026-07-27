import { useEffect, useRef, useState, useCallback } from 'react'

/* ═══════════════════════════════════════════════════════════════════════
   PUBLIC SITE — kiplstpsrinagar.com   ·   Route: /site  (no auth)

   Hero: the aerial descent clip, pinned to the viewport and scrubbed by
   scroll position. Scroll down, the drone descends. No Three.js.

   SBR cycle: explained by an accurate basin cross-section further down,
   built from the R1 schedule (65.5 × 29 × 6 m, decanter on the west edge,
   fine-bubble diffuser grid on the floor).
   ═══════════════════════════════════════════════════════════════════════ */

/* If you named the file differently, change this one line. */
const VIDEO_SRC = '/assets/plant-descent.mp4'

const SITE = {
  startDate: '2025-11-07',
  endDate:   '2028-05-07',
  contractCr: 279.99,
  capacityMld: 38.5,
  networkKm: 210,
  pumpingStations: 10,
  manholes: '3,728',
  chambers: '15,814',
  omYears: 5,
  siteAreaSqm: '24,678',
  basin: '65.5 × 29 × 6 m',
}

const C = {
  paper:'#FFFFFF', mist:'#F1F5F8', line:'#DCE5EA',
  ink:'#08192A', body:'#42596B', faint:'#6E8494',
  deep:'#08192A', water:'#0A6FD1', waterDark:'#0757A6',
  aqua:'#33B58C', raw:'#8A6E3F',
  // KIPL brand — pulled from the company seal
  brand:'#3E9B7A',     // laurel-wreath green
  brandRed:'#C64A42',  // outer-ring crimson
  violet:'#565A9E',    // inner-disc indigo
}

/* Copy panels over the video. Screen 0 is the title. */
const PANELS = [
  { kind:'title' as const, no:'', title:'', blurb:'' },
  { kind:'step' as const,  no:'01', title:'The site',      blurb:'Two and a half hectares at Nishat, between the Foreshore Road and the wetland. Four SBR basins, inlet works, sludge handling, and a strip held in reserve for tertiary treatment.' },
  { kind:'step' as const,  no:'02', title:'The basins',    blurb:'Four reinforced concrete basins, each 65.5 metres by 29, standing six metres above ground. They run the same cycle a quarter-turn apart, so one is always decanting while another fills.' },
  { kind:'step' as const,  no:'03', title:'Inlet works',   blurb:'Sewage arrives at the stilling chamber, passes mechanical and manual fine screens, then two vortex grit chambers that spin out sand and grit before it reaches the biology.' },
  { kind:'step' as const,  no:'04', title:'Return',        blurb:'Decanted effluent passes the chlorine contact tank and discharges west into the wetland. Dal Lake lies a little over three hundred metres beyond the tree line.' },
]

/* ══════════════════════════════════════════════════════════════════════
   SBR CYCLE — basin cross-section, 29 m across, 6 m deep.
   Phases are the real C-Tech sequence. Durations are set at
   commissioning, so they are described rather than numbered.
   ══════════════════════════════════════════════════════════════════════ */
const PHASES = [
  { key:'fill',    name:'Fill',
    level:.88, clarity:0,   sludge:.06, bubbles:false, decant:false,
    text:'Screened, de-gritted sewage enters from the distribution channel on the east side. Mixing keeps the solids in suspension so the incoming load meets the biomass already in the tank.' },
  { key:'react',   name:'React',
    level:.92, clarity:.35, sludge:.06, bubbles:true,  decant:false,
    text:'Fine-bubble diffusers across the floor aerate the basin. Micro-organisms consume the organic load, and alternating aerobic and anoxic conditions strip nitrogen out of the water.' },
  { key:'settle',  name:'Settle',
    level:.92, clarity:1,   sludge:.30, bubbles:false, decant:false,
    text:'Aeration stops. With nothing stirring it, the biomass flocculates and sinks, leaving clarified water above a distinct sludge blanket. No separate clarifier is needed — the basin does both jobs.' },
  { key:'decant',  name:'Decant',
    level:.42, clarity:1,   sludge:.30, bubbles:false, decant:true,
    text:'A floating decanter on the west edge draws the clarified supernatant off the surface without disturbing the settled sludge. That water is the treated effluent, and it leaves for the contact tank.' },
]

function BasinDiagram() {
  const [i, setI] = useState(0)
  const [running, setRunning] = useState(true)
  const wrapRef = useRef<HTMLDivElement>(null)

  /* Advance only while the diagram is on screen and not hovered */
  useEffect(() => {
    if (!running) return
    const t = setTimeout(() => setI(v => (v + 1) % PHASES.length), 4200)
    return () => clearTimeout(t)
  }, [i, running])

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setRunning(e.isIntersecting), { threshold: .3 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const p = PHASES[i]
  /* Geometry: 29 m wide, 6 m deep, drawn into a 420 × 190 box */
  const X0 = 30, X1 = 390, FLOOR = 158, TOP = 26
  const depth = FLOOR - TOP
  const waterH = Math.max(4, p.level * depth)
  const sludgeH = Math.max(2, p.sludge * depth * .55)

  return (
    <div className="bd" ref={wrapRef}
         onMouseEnter={() => setRunning(false)}
         onMouseLeave={() => setRunning(true)}>

      <div className="bd-tabs" role="tablist" aria-label="Treatment cycle phase">
        {PHASES.map((ph, k) => (
          <button key={ph.key} role="tab" aria-selected={k === i}
                  className={'bd-tab' + (k === i ? ' on' : '')}
                  onClick={() => { setI(k); setRunning(false) }}>
            <span className="bd-tab-n">{String(k + 1).padStart(2, '0')}</span>
            {ph.name}
          </button>
        ))}
      </div>

      <svg className="bd-svg" viewBox="0 0 420 190" role="img"
           aria-label={`Basin cross-section during the ${p.name.toLowerCase()} phase`}>
        {/* ground line */}
        <line x1="0" y1={FLOOR + 14} x2="420" y2={FLOOR + 14} className="bd-ground" />

        {/* water — grows from the floor up */}
        <rect x={X0 + 4} y={FLOOR - waterH} width={X1 - X0 - 8} height={waterH}
              className={'bd-water' + (p.clarity > .8 ? ' clear' : p.clarity > .2 ? ' mid' : '')} />

        {/* sludge blanket */}
        <rect x={X0 + 4} y={FLOOR - sludgeH} width={X1 - X0 - 8} height={sludgeH}
              className="bd-sludge" style={{ opacity: p.sludge > .1 ? 1 : 0 }} />

        {/* aeration */}
        <g className="bd-bubbles" style={{ opacity: p.bubbles ? 1 : 0 }}>
          {Array.from({ length: 22 }).map((_, k) => (
            <circle key={k} cx={X0 + 22 + k * 15.5} cy={FLOOR - 10} r="2.6"
                    style={{ animationDelay: `${(k % 7) * .28}s` }} />
          ))}
        </g>

        {/* diffuser grid on the floor */}
        {Array.from({ length: 8 }).map((_, k) => (
          <rect key={k} x={X0 + 24 + k * 42} y={FLOOR - 6} width="26" height="4" rx="2"
                className="bd-diffuser" />
        ))}

        {/* decanter, west edge (left) */}
        <g className={'bd-decanter' + (p.decant ? ' on' : '')}
           style={{ transform: `translateY(${FLOOR - waterH - 8}px)` }}>
          <rect x={X0 + 12} y="0" width="62" height="9" rx="2" />
          <rect x={X0 + 26} y="9" width="34" height="5" rx="1.5" className="bd-trough" />
        </g>

        {/* effluent arrow, only while decanting */}
        <g className={'bd-out' + (p.decant ? ' on' : '')}>
          <path d={`M ${X0 - 2} ${FLOOR - waterH - 4} L ${X0 - 22} ${FLOOR - waterH - 4}`} />
          <path d={`M ${X0 - 18} ${FLOOR - waterH - 8} L ${X0 - 24} ${FLOOR - waterH - 4} L ${X0 - 18} ${FLOOR - waterH}`} />
        </g>

        {/* basin walls — drawn last so they sit over the water */}
        <rect x={X0 - 8} y={TOP - 8} width="8" height={FLOOR - TOP + 16} className="bd-wall" />
        <rect x={X1} y={TOP - 8} width="8" height={FLOOR - TOP + 16} className="bd-wall" />
        <rect x={X0 - 8} y={FLOOR} width={X1 - X0 + 16} height="8" className="bd-wall" />

        {/* dimension labels */}
        <text x={(X0 + X1) / 2} y={FLOOR + 30} className="bd-dim">29 m across · 6 m deep</text>
        <text x={X0 + 16} y={TOP - 14} className="bd-note">West · decanter</text>
        <text x={X1 - 16} y={TOP - 14} className="bd-note" textAnchor="end">East · inlet</text>
      </svg>

      <p className="bd-text">{p.text}</p>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════ */

function useCountUp(target: number, decimals = 0) {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const fmt = (v: number) =>
      v.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.textContent = fmt(target); return
    }
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      io.disconnect()
      const t0 = performance.now()
      const step = (t: number) => {
        const k = Math.min(1, (t - t0) / 1400)
        el.textContent = fmt(target * (1 - Math.pow(1 - k, 3)))
        if (k < 1) requestAnimationFrame(step)
      }
      requestAnimationFrame(step)
    }, { threshold: .4 })
    io.observe(el)
    return () => io.disconnect()
  }, [target, decimals])
  return ref
}

export default function PublicSitePage() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const targetT = useRef(0)
  const rafRef = useRef(0)

  const [panel, setPanel] = useState(0)
  const [scrolled, setScrolled] = useState(false)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)

  const start = new Date(SITE.startDate), end = new Date(SITE.endDate), now = new Date()
  const totalDays = Math.round((+end - +start) / 864e5)
  const dayNo = Math.max(0, Math.min(totalDays, Math.round((+now - +start) / 864e5)))
  const daysLeft = Math.max(0, totalDays - dayNo)
  const elapsedPct = (dayNo / totalDays) * 100

  /* ── Scroll → target time ─────────────────────────────────────────── */
  const onScroll = useCallback(() => {
    const el = stageRef.current
    if (!el) return
    const scrollable = el.offsetHeight - window.innerHeight
    const p = Math.max(0, Math.min(1, -el.getBoundingClientRect().top / scrollable))
    setPanel(Math.max(0, Math.min(PANELS.length - 1, Math.floor(p * PANELS.length))))
    setScrolled(p > .015)
    const v = videoRef.current
    if (v && v.duration) targetT.current = p * (v.duration - 0.05)
  }, [])

  useEffect(() => {
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    onScroll()
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [onScroll])

  /* ── Ease currentTime toward the target so scrubbing isn't jerky ──── */
  useEffect(() => {
    if (!ready) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const loop = () => {
      rafRef.current = requestAnimationFrame(loop)
      const v = videoRef.current
      if (!v || !v.duration || v.seeking) return
      const cur = v.currentTime
      const next = reduced ? targetT.current : cur + (targetT.current - cur) * 0.12
      if (Math.abs(next - cur) > 0.008) {
        try { v.currentTime = next } catch { /* seek not ready */ }
      }
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [ready])

  const crRef  = useCountUp(SITE.contractCr, 2)
  const mldRef = useCountUp(SITE.capacityMld, 1)
  const kmRef  = useCountUp(SITE.networkKm)
  const pctRef = useCountUp(elapsedPct, 1)

  // Coming-soon day counter
  const dayRef = useCountUp(dayNo)
  const remRef = useCountUp(daysLeft)
  // Plant-parameter number display
  const pCapRef = useCountUp(SITE.capacityMld, 1)
  const pNetRef = useCountUp(SITE.networkKm)
  const pBasinRef = useCountUp(4)
  const pPsRef  = useCountUp(SITE.pumpingStations)
  const pMhRef  = useCountUp(3728)
  const pChRef  = useCountUp(15814)
  const pCrRef  = useCountUp(SITE.contractCr, 2)
  const pOmRef  = useCountUp(SITE.omYears)

  return (
    <div className="kipl-site">
      <style>{CSS}</style>

      <header className="bar">
        <div className="bar-in">
          <a href="/site" className="brand">
            <span className="brand-badge">
              <img className="logo-img" src="/assets/kipl-logo.png" alt="Khilari Infrastructure Pvt. Ltd."
                onError={e => { const b = (e.target as HTMLImageElement).parentElement; if (b) b.classList.add('nofile') }} />
              <b className="logo-mono">KIPL</b>
            </span>
            <span className="brand-txt">Dal Lake <b>Sewerage Scheme</b></span>
          </a>
          <nav className="bar-nav">
            <a href="#cycle">How it works</a><a href="#quality">Performance</a>
            <a href="#scope">Scope</a><a href="#programme">Programme</a>
            <a href="/site/timeline">Timeline</a><a href="/site/gallery">Gallery</a><a href="/site/team">Team</a>
          </nav>
          <div className="bar-live"><i /> Day {dayNo.toLocaleString('en-IN')} of {totalDays.toLocaleString('en-IN')}</div>
          <a href="/login" className="bar-login">Staff Login</a>
        </div>
      </header>

      {/* ══ PINNED VIDEO STAGE ══════════════════════════════════════════ */}
      <section className="stage" ref={stageRef}>
        <div className="pin">
          {!failed && (
            <video
              ref={videoRef}
              className={'pin-video' + (ready ? ' in' : '')}
              src={VIDEO_SRC}
              muted
              playsInline
              preload="auto"
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              {...({ 'webkit-playsinline': 'true' } as any)}
              onLoadedMetadata={() => { setReady(true); onScroll() }}
              onError={() => setFailed(true)}
              aria-hidden="true"
            />
          )}
          <div className="pin-veil" />
          {failed && (
            <div className="pin-fallback" role="status">
              Aerial clip unavailable — check <code>{VIDEO_SRC}</code>
            </div>
          )}

          <div className={'pin-copy title' + (panel === 0 ? ' on' : '')}>
            <div className="shell">
              <p className="eyebrow light">Pollution abatement of Dal Lake · J&amp;K UEED</p>
              <h1>Sewage goes in.<br /><span className="grad">Clean water comes out.</span></h1>
              <p className="hero-lede">
                A 38.5 MLD sequencing batch reactor at Nishat, fed by 210 km of new sewer network —
                intercepting the wastewater that reaches Dal Lake today, and returning it treated.
              </p>
              <dl className="hero-facts">
                <div><dt>Plant capacity</dt><dd><span ref={mldRef}>0</span> MLD</dd></div>
                <div><dt>Sewer network</dt><dd><span ref={kmRef}>0</span> km</dd></div>
                <div><dt>Site area</dt><dd>{SITE.siteAreaSqm} m²</dd></div>
              </dl>
              <p className="indicative">
                Visualisation, indicative of an SBR plant of this configuration.
                The Nishat plant is under construction.
              </p>
            </div>
          </div>

          {PANELS.map((s, i) => s.kind === 'step' && (
            <div key={s.no} className={'pin-copy step' + (panel === i ? ' on' : '')}>
              <div className="shell">
                <span className="step-no">{s.no} <i /> {i} of 4</span>
                <h2>{s.title}</h2>
                <p>{s.blurb}</p>
              </div>
            </div>
          ))}

          <div className="rail" aria-hidden="true">
            {PANELS.map((_, i) => <span key={i} className={i <= panel ? 'on' : ''} />)}
          </div>

          <div className={'scroll-cue' + (scrolled ? ' gone' : '')} aria-hidden="true">
            <span>Scroll to descend</span><i />
          </div>
        </div>
      </section>

      {/* ══ COMING SOON · LIVE DAY COUNTER ══════════════════════════════ */}
      <section className="soon">
        <div className="shell soon-in">
          <div className="soon-copy">
            <span className="soon-tag"><i /> Under construction</span>
            <h2>Clean water for Dal&nbsp;Lake,<br /><span className="grad">coming soon.</span></h2>
            <p>Two and a half hectares at Nishat are alive with work — 210 kilometres of new sewer
               going into the ground and four SBR basins rising out of it. Every day on this counter is a
               day closer to the moment sewage stops reaching the lake, and starts leaving the plant clean.</p>
            <a className="soon-cta" href="#cycle">See how it will work →</a>
          </div>
          <div className="soon-count" role="group" aria-label="Construction progress">
            <div className="dc-head">Day of programme</div>
            <div className="dc-num"><span ref={dayRef}>0</span><em>/ {totalDays.toLocaleString('en-IN')}</em></div>
            <div className="dc-bar"><span style={{ width: elapsedPct + '%' }} /></div>
            <dl className="dc-foot">
              <div><dt>Elapsed</dt><dd><span ref={pctRef}>0</span>%</dd></div>
              <div><dt>Days to go</dt><dd><span ref={remRef}>0</span></dd></div>
              <div><dt>Handover</dt><dd>May 2028</dd></div>
            </dl>
          </div>
        </div>
      </section>

      {/* ══ PLANT PARAMETERS · NUMBER DISPLAY ═══════════════════════════ */}
      <section className="params" id="numbers">
        <div className="shell">
          <div className="params-head">
            <p className="eyebrow">The plant, by the numbers</p>
            <h2>Engineered for 38.5&nbsp;million litres a&nbsp;day.</h2>
          </div>
          <div className="params-grid">
            <div className="pc lg"><dt>Plant capacity</dt><dd><span ref={pCapRef}>0</span><em>MLD</em></dd><small>Four SBR basins · C-Tech process</small></div>
            <div className="pc"><dt>SBR basins</dt><dd><span ref={pBasinRef}>0</span></dd><small>65.5 × 29 × 6 m each</small></div>
            <div className="pc"><dt>Sewer network</dt><dd><span ref={pNetRef}>0</span><em>km</em></dd><small>RCC · DI · HDPE</small></div>
            <div className="pc"><dt>Pumping stations</dt><dd><span ref={pPsRef}>0</span></dd><small>Nine + main at Habak</small></div>
            <div className="pc"><dt>Manholes</dt><dd><span ref={pMhRef}>0</span></dd><small>910–1,520 mm dia</small></div>
            <div className="pc"><dt>House chambers</dt><dd><span ref={pChRef}>0</span></dd><small>Connection & property</small></div>
            <div className="pc"><dt>Contract value</dt><dd>₹<span ref={pCrRef}>0</span><em>Cr</em></dd><small>EPC turnkey · fixed cost</small></div>
            <div className="pc"><dt>Operation</dt><dd><span ref={pOmRef}>0</span><em>yr</em></dd><small>O&M after trial run</small></div>
          </div>
        </div>
      </section>

      {/* ══ SBR CYCLE ═══════════════════════════════════════════════════ */}
      <section className="sec" id="cycle">
        <div className="shell">
          <div className="head">
            <p className="eyebrow">How the plant works</p>
            <div>
              <h2>One basin.<br />Four jobs.</h2>
              <p className="lede">
                A sequencing batch reactor does in one tank what a conventional plant needs several
                to do. The basin fills, aerates, settles and decants in sequence, then starts again.
                Four basins run the same cycle offset from one another, so the plant never stops
                accepting flow.
              </p>
            </div>
          </div>
          <BasinDiagram />
          <p className="note">
            <b>Cross-section through one basin</b>, across its 29 metre width. Cycle durations are
            set during commissioning against actual incoming load.
          </p>
        </div>
      </section>

      {/* ══ PERFORMANCE ═════════════════════════════════════════════════ */}
      <section className="sec alt" id="quality">
        <div className="shell">
          <div className="head">
            <p className="eyebrow">Design performance</p>
            <div>
              <h2>What goes in.<br />What comes out.</h2>
              <p className="lede">
                Built to the discharge standards set for sensitive water bodies. Live readings
                publish here once the plant is commissioned and its online monitoring is connected
                to the pollution control board.
              </p>
            </div>
          </div>
          <div className="wq">
            <div className="wq-h"><span>Parameter</span><span>Influent</span><span>Effluent target</span><span>Live</span></div>
            {[
              ['Biochemical oxygen demand','BOD₅ · mg/L','250','< 10'],
              ['Chemical oxygen demand','COD · mg/L','500','< 50'],
              ['Total suspended solids','TSS · mg/L','300','< 10'],
              ['Total nitrogen','TN · mg/L','50','< 10'],
              ['Total phosphorus','TP · mg/L','8','< 1'],
              ['Faecal coliform','FC · MPN/100 mL','10⁶–10⁷','< 100'],
            ].map(([n,u,iv,ov]) => (
              <div className="wq-r" key={n}>
                <div className="wq-p">{n}<small>{u}</small></div>
                <div className="wq-v raw">{iv}</div>
                <div className="wq-v clean">{ov}</div>
                <div className="wq-l">Awaiting commissioning</div>
              </div>
            ))}
          </div>
          <p className="note"><b>Influent figures are design values</b> from the approved detailed
            project report. Verify against the DPR before citing.</p>
        </div>
      </section>

      {/* ══ SCOPE ═══════════════════════════════════════════════════════ */}
      <section className="sec" id="scope">
        <div className="shell">
          <div className="head">
            <p className="eyebrow">Scope of works</p>
            <div>
              <h2>The scheme,<br />in whole numbers.</h2>
              <p className="lede">
                An EPC fixed-cost turnkey contract — survey, design, execution, commissioning and
                five years of operation. Allotment CE/UEED/PS/01 of 2025-26.
              </p>
            </div>
          </div>
          <dl className="scope">
            {[
              ['Treatment plant', `${SITE.capacityMld} MLD`, `Four SBR basins, each ${SITE.basin}, C-Tech process`],
              ['Sewer network', `${SITE.networkKm} km`, 'RCC NP3, DI and HDPE sewer of all diameters'],
              ['Manholes', SITE.manholes, 'RCC manholes, 910 mm to 1,520 mm diameter'],
              ['House chambers', SITE.chambers, 'Masonry connection and property chambers'],
              ['Pumping stations', String(SITE.pumpingStations), 'Nine intermediate stations and the main station at Habak'],
              ['Operation', `${SITE.omYears} years`, 'O&M after a six-month free trial run'],
            ].map(([k,v,d]) => <div key={k}><dt>{k}</dt><dd>{v}<small>{d}</small></dd></div>)}
          </dl>
          <div className="gal">
            {[
              ['/assets/site-aerial.jpg','Plant site at Nishat, looking north over the basin block.'],
              ['/assets/sewer-laying.jpg','Trenching and pipe laying through the command area.'],
            ].map(([src,cap]) => (
              <figure key={src}>
                <div className="ph">
                  <img src={src} alt="" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                  <span>{src}</span>
                </div>
                <figcaption>{cap}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ══ PROGRAMME ═══════════════════════════════════════════════════ */}
      <section className="sec alt" id="programme">
        <div className="shell">
          <div className="head">
            <p className="eyebrow">Programme</p>
            <div>
              <h2>November 2025<br />to May 2028.</h2>
              <p className="lede">
                Thirty months from allotment to handover, then a six-month free trial run and five
                years of operation.
              </p>
            </div>
          </div>
          <div className="tl">
            {[
              ['Nov 2025','Allotment & mobilisation','Work order issued, site established, confirmatory survey begun.','done'],
              ['Jan 2026','Design & third-party vetting','Detailed engineering submitted and independently vetted before departmental approval.','done'],
              ['2026–2027','Network & civil works','Sewer laying, manholes and chambers across the command area, alongside civil works at the pumping stations and plant.','now'],
              ['Late 2027','Electro-mechanical installation','Pumps, blowers, diffusers, decanters, SCADA and online monitoring installed and tested.',''],
              ['2028','Commissioning & trial run','Integrated testing, then a six-month trial run against design performance.',''],
              ['May 2028','Handover','Completion certificate, then five years of operation and maintenance.',''],
            ].map(([d,t,b,st]) => (
              <div className={'tl-r ' + st} key={t}>
                <div className="tl-d">{d}</div>
                <div>
                  <h3>{t}
                    {st === 'now'  && <span className="flag">In progress</span>}
                    {st === 'done' && <span className="flag done">Complete</span>}
                  </h3>
                  <p>{b}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer>
        <div className="shell f-in">
          <div>
            <div className="f-brand">
              <span className="brand-badge lg">
                <img className="logo-img" src="/assets/kipl-logo.png" alt="Khilari Infrastructure Pvt. Ltd."
                  onError={e => { const b = (e.target as HTMLImageElement).parentElement; if (b) b.classList.add('nofile') }} />
                <b className="logo-mono">KIPL</b>
              </span>
              <span className="mark light">Dal Lake <b>Sewerage Scheme</b></span>
            </div>
            <p>Survey, design and execution of the sewerage scheme for Dal Lake uncovered areas,
               for the pollution abatement of Dal Lake — EPC fixed-cost turnkey.</p>
          </div>
          <div>
            <h4>Project</h4>
            <ul>
              <li>J&amp;K Urban Environmental Engineering Department, Srinagar</li>
              <li>Lakes Conservation &amp; Management Authority</li>
              <li>M/S Khilari Infrastructure Pvt. Ltd.</li>
              <li>Allotment CE/UEED/PS/01 of 2025-26</li>
            </ul>
          </div>
          <div>
            <h4>Contact</h4>
            <ul>
              <li><a href="mailto:khilari.srinagar@gmail.com">khilari.srinagar@gmail.com</a></li>
              <li>Project office, Srinagar, J&amp;K</li>
            </ul>
          </div>
        </div>
        <div className="shell f-base">
          <span>© {new Date().getFullYear()} Khilari Infrastructure Pvt. Ltd.</span>
          <span>kiplstpsrinagar.com</span>
        </div>
      </footer>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════ */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@500;700;800&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

.kipl-site{
  --paper:${C.paper}; --mist:${C.mist}; --line:${C.line};
  --ink:${C.ink}; --body:${C.body}; --faint:${C.faint};
  --deep:${C.deep}; --water:${C.water}; --water-dk:${C.waterDark};
  --aqua:${C.aqua}; --raw:${C.raw};
  --brand:${C.brand}; --brand-red:${C.brandRed}; --violet:${C.violet};
  --gut:clamp(20px,4vw,56px);
  background:var(--paper); color:var(--ink);
  font-family:'Inter',system-ui,sans-serif; font-size:17px; line-height:1.65;
  -webkit-font-smoothing:antialiased;
}
.kipl-site *,.kipl-site *::before,.kipl-site *::after{box-sizing:border-box}
.kipl-site h1,.kipl-site h2,.kipl-site h3{font-family:'Manrope',system-ui,sans-serif;
  font-weight:800;line-height:1.03;letter-spacing:-.03em;margin:0;color:var(--ink)}
.kipl-site h1{font-size:clamp(36px,5.6vw,80px)}
.kipl-site h2{font-size:clamp(30px,4.2vw,58px)}
.kipl-site h3{font-size:clamp(18px,1.9vw,23px);letter-spacing:-.02em;line-height:1.2}
.kipl-site p{margin:0 0 1em}
.kipl-site a{color:inherit}
.kipl-site img{max-width:100%;display:block}
.kipl-site code{font-family:'JetBrains Mono',monospace;font-size:.9em}
.kipl-site :focus-visible{outline:2px solid var(--aqua);outline-offset:3px}
.kipl-site .shell{max-width:1320px;margin:0 auto;padding:0 var(--gut)}
.kipl-site .eyebrow{font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:500;
  letter-spacing:.16em;text-transform:uppercase;color:var(--water-dk);margin:0 0 18px}
.kipl-site .eyebrow.light{color:var(--aqua)}
.kipl-site .lede{font-size:clamp(16px,1.45vw,19px);color:var(--body);max-width:60ch;margin-top:22px}

/* Bar */
.kipl-site .bar{position:fixed;top:0;left:0;right:0;z-index:70;
  background:rgba(8,25,42,.74);backdrop-filter:blur(14px);
  border-bottom:1px solid rgba(255,255,255,.1)}
.kipl-site .bar-in{max-width:1320px;margin:0 auto;padding:0 var(--gut);height:60px;
  display:flex;align-items:center;gap:28px}
.kipl-site .mark{font-family:'Manrope',sans-serif;font-weight:500;font-size:15px;
  letter-spacing:-.01em;white-space:nowrap;color:#fff}
.kipl-site .mark b{color:var(--aqua);font-weight:800}
.kipl-site .bar-nav{display:flex;gap:24px;margin-left:auto}
.kipl-site .bar-nav a{font-size:14.5px;font-weight:500;color:#C3D4E0;text-decoration:none;transition:color .2s}
.kipl-site .bar-nav a:hover{color:var(--aqua)}
.kipl-site .bar-live{font-family:'JetBrains Mono',monospace;font-size:11.5px;color:#8FA9BC;
  display:flex;align-items:center;gap:8px;white-space:nowrap}
.kipl-site .bar-live i{width:6px;height:6px;border-radius:50%;background:var(--aqua);
  box-shadow:0 0 0 0 rgba(45,212,191,.6);animation:kp 2.6s infinite}
@keyframes kp{70%{box-shadow:0 0 0 8px rgba(45,212,191,0)}100%{box-shadow:0 0 0 0 rgba(45,212,191,0)}}
.kipl-site .bar-login{font-size:13.5px;font-weight:700;color:#08192A;background:var(--aqua);
  text-decoration:none;padding:8px 16px;border-radius:8px;white-space:nowrap;transition:opacity .2s}
.kipl-site .bar-login:hover{opacity:.86}
@media(max-width:960px){.kipl-site .bar-nav,.kipl-site .bar-live{display:none}
  .kipl-site .bar-nav{margin-left:0}.kipl-site .bar-login{margin-left:auto}}

/* ══ Pinned video stage ══ */
.kipl-site .stage{position:relative;height:600vh;background:var(--deep)}
.kipl-site .pin{position:sticky;top:0;height:100svh;overflow:hidden}
.kipl-site .pin-video{position:absolute;inset:0;width:100%;height:100%;
  object-fit:cover;z-index:0;opacity:0;transition:opacity .9s ease}
.kipl-site .pin-video.in{opacity:1}
.kipl-site .pin-veil{position:absolute;inset:0;z-index:1;pointer-events:none;
  background:linear-gradient(100deg,rgba(8,25,42,.94) 0%,rgba(8,25,42,.78) 32%,
    rgba(8,25,42,.10) 64%,rgba(8,25,42,.46) 100%)}
.kipl-site .pin-fallback{position:absolute;inset:0;z-index:1;display:grid;place-content:center;
  font-family:'JetBrains Mono',monospace;font-size:12.5px;color:#6E8494;text-align:center;padding:24px}

.kipl-site .pin-copy{position:absolute;inset:0;z-index:2;display:flex;align-items:center;
  opacity:0;visibility:hidden;transform:translateY(28px);
  transition:opacity .5s ease,transform .55s cubic-bezier(.22,1,.36,1),visibility .5s}
.kipl-site .pin-copy.on{opacity:1;visibility:visible;transform:none}
.kipl-site .pin-copy h1,.kipl-site .pin-copy h2{color:#fff}
.kipl-site .pin-copy .shell{width:100%}
.kipl-site .pin-copy.step h2{max-width:14ch;font-size:clamp(34px,5vw,68px)}
.kipl-site .pin-copy.step p{margin-top:20px;max-width:48ch;color:#C3D4E0;
  font-size:clamp(16px,1.5vw,19px);line-height:1.62}
.kipl-site .step-no{display:inline-flex;align-items:center;gap:12px;
  font-family:'JetBrains Mono',monospace;font-size:11.5px;letter-spacing:.15em;
  text-transform:uppercase;color:var(--aqua);margin-bottom:20px}
.kipl-site .step-no i{width:26px;height:1px;background:var(--aqua);opacity:.5}
.kipl-site .grad{background:linear-gradient(95deg,var(--aqua),#7FE9DC 55%,#4FC3E8);
  -webkit-background-clip:text;background-clip:text;color:transparent}
.kipl-site .hero-lede{margin-top:24px;max-width:52ch;font-size:clamp(16px,1.5vw,19px);
  color:#C3D4E0;line-height:1.62}
.kipl-site .hero-facts{display:flex;flex-wrap:wrap;margin:34px 0 0;
  border-top:1px solid rgba(255,255,255,.16);padding-top:20px}
.kipl-site .hero-facts div{padding-right:32px;margin-right:32px;
  border-right:1px solid rgba(255,255,255,.16)}
.kipl-site .hero-facts div:last-child{border-right:0;margin-right:0;padding-right:0}
.kipl-site .hero-facts dt{font-family:'JetBrains Mono',monospace;font-size:10.5px;
  letter-spacing:.14em;text-transform:uppercase;color:#8FA9BC;margin-bottom:6px}
.kipl-site .hero-facts dd{margin:0;font-family:'Manrope',sans-serif;font-weight:800;
  font-size:clamp(21px,2.3vw,29px);color:#fff;letter-spacing:-.025em}
.kipl-site .indicative{margin:22px 0 0;font-family:'JetBrains Mono',monospace;
  font-size:10.5px;line-height:1.6;letter-spacing:.03em;color:#6E8494;max-width:46ch}

.kipl-site .rail{position:absolute;right:clamp(16px,3vw,42px);top:50%;
  transform:translateY(-50%);z-index:3;display:flex;flex-direction:column;gap:9px}
.kipl-site .rail span{width:2px;height:34px;background:rgba(255,255,255,.18);
  border-radius:2px;transition:background .45s,height .45s}
.kipl-site .rail span.on{background:var(--aqua);height:44px}
@media(max-width:700px){.kipl-site .rail{display:none}}

.kipl-site .scroll-cue{position:absolute;left:50%;bottom:34px;transform:translateX(-50%);
  z-index:3;display:flex;flex-direction:column;align-items:center;gap:10px;
  font-family:'JetBrains Mono',monospace;font-size:10.5px;letter-spacing:.16em;
  text-transform:uppercase;color:#8FA9BC;transition:opacity .5s;text-align:center}
.kipl-site .scroll-cue.gone{opacity:0}
.kipl-site .scroll-cue i{width:1px;height:34px;transform-origin:top;
  background:linear-gradient(var(--aqua),transparent);animation:cue 2s ease-in-out infinite}
@keyframes cue{0%,100%{transform:scaleY(.4);opacity:.4}50%{transform:scaleY(1);opacity:1}}

/* Numbers */
.kipl-site .strip{background:var(--mist);border-bottom:1px solid var(--line)}
.kipl-site .strip-in{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--line)}
.kipl-site .strip-in>div{background:var(--mist);padding:34px 26px 32px}
.kipl-site .strip-in dt{font-family:'JetBrains Mono',monospace;font-size:10.5px;
  letter-spacing:.14em;text-transform:uppercase;color:var(--faint);margin-bottom:11px}
.kipl-site .strip-in dd{margin:0;font-family:'Manrope',sans-serif;font-weight:800;
  font-size:clamp(26px,3.3vw,44px);letter-spacing:-.035em;line-height:1}
.kipl-site .strip-in em{font-style:normal;font-size:.44em;color:var(--body);font-weight:700}
@media(max-width:860px){.kipl-site .strip-in{grid-template-columns:1fr 1fr}}

/* Sections */
.kipl-site .sec{padding:clamp(72px,9vw,140px) 0}
.kipl-site .sec.alt{background:var(--mist);border-block:1px solid var(--line)}
.kipl-site .head{display:grid;grid-template-columns:minmax(0,.36fr) minmax(0,1fr);
  gap:clamp(20px,5vw,64px);margin-bottom:clamp(40px,5vw,72px)}
@media(max-width:860px){.kipl-site .head{grid-template-columns:1fr;gap:6px}}

/* ══ Basin diagram ══ */
.kipl-site .bd{border:1px solid var(--line);border-radius:5px;overflow:hidden;background:var(--paper)}
.kipl-site .bd-tabs{display:flex;border-bottom:1px solid var(--line);background:var(--mist)}
.kipl-site .bd-tab{flex:1;appearance:none;border:0;background:none;cursor:pointer;
  padding:16px 10px;font:inherit;font-size:14.5px;font-weight:500;color:var(--faint);
  border-right:1px solid var(--line);border-bottom:2px solid transparent;transition:.25s;
  display:flex;align-items:center;justify-content:center;gap:9px}
.kipl-site .bd-tab:last-child{border-right:0}
.kipl-site .bd-tab:hover{color:var(--ink)}
.kipl-site .bd-tab.on{color:var(--ink);background:var(--paper);border-bottom-color:var(--aqua)}
.kipl-site .bd-tab-n{font-family:'JetBrains Mono',monospace;font-size:10.5px;
  letter-spacing:.1em;color:var(--faint)}
.kipl-site .bd-tab.on .bd-tab-n{color:var(--aqua)}
@media(max-width:620px){.kipl-site .bd-tab{flex-direction:column;gap:4px;font-size:13px;padding:12px 4px}}

.kipl-site .bd-svg{display:block;width:100%;height:auto;background:
  linear-gradient(180deg,#F7FAFB 0%,#EDF3F5 100%);padding:clamp(12px,2.5vw,26px)}
.kipl-site .bd-ground{stroke:var(--line);stroke-width:1.5;stroke-dasharray:4 4}
.kipl-site .bd-wall{fill:#9AA7B3}
.kipl-site .bd-water{fill:${C.raw};transition:y .9s cubic-bezier(.4,0,.2,1),
  height .9s cubic-bezier(.4,0,.2,1),fill .9s ease;opacity:.9}
.kipl-site .bd-water.mid{fill:#5F8F86}
.kipl-site .bd-water.clear{fill:${C.aqua}}
.kipl-site .bd-sludge{fill:#4A3A22;transition:y .9s cubic-bezier(.4,0,.2,1),
  height .9s cubic-bezier(.4,0,.2,1),opacity .6s ease}
.kipl-site .bd-diffuser{fill:#7C8B98}
.kipl-site .bd-bubbles{transition:opacity .5s ease}
.kipl-site .bd-bubbles circle{fill:#FFFFFF;opacity:.75;animation:rise 1.9s ease-in infinite}
@keyframes rise{0%{transform:translateY(0);opacity:0}
  15%{opacity:.8}100%{transform:translateY(-98px);opacity:0}}
.kipl-site .bd-decanter{transition:transform .9s cubic-bezier(.4,0,.2,1),opacity .5s ease;opacity:.45}
.kipl-site .bd-decanter.on{opacity:1}
.kipl-site .bd-decanter rect{fill:${C.aqua}}
.kipl-site .bd-decanter .bd-trough{fill:#7C8B98}
.kipl-site .bd-out{opacity:0;transition:opacity .5s ease}
.kipl-site .bd-out.on{opacity:1}
.kipl-site .bd-out path{stroke:${C.aqua};stroke-width:2.5;fill:none;stroke-linecap:round;stroke-linejoin:round}
.kipl-site .bd-dim,.kipl-site .bd-note{font-family:'JetBrains Mono',monospace;
  fill:var(--faint);font-size:9.5px;letter-spacing:.08em;text-transform:uppercase}
.kipl-site .bd-dim{text-anchor:middle}
.kipl-site .bd-text{margin:0;padding:clamp(18px,2.6vw,28px);border-top:1px solid var(--line);
  font-size:15.5px;color:var(--body);line-height:1.6;max-width:78ch}

/* Water quality */
.kipl-site .wq{border:1px solid var(--line);border-radius:4px;overflow:hidden;background:var(--paper)}
.kipl-site .wq-h,.kipl-site .wq-r{display:grid;
  grid-template-columns:minmax(0,1.6fr) 1fr 1fr 1.1fr;gap:14px;
  padding:15px clamp(14px,2.2vw,26px);align-items:center}
.kipl-site .wq-h{background:var(--mist);border-bottom:1px solid var(--line)}
.kipl-site .wq-h span{font-family:'JetBrains Mono',monospace;font-size:10.5px;
  letter-spacing:.13em;text-transform:uppercase;color:var(--faint)}
.kipl-site .wq-r{border-bottom:1px solid var(--line)}
.kipl-site .wq-r:last-child{border-bottom:0}
.kipl-site .wq-p{font-weight:500;font-size:15.5px}
.kipl-site .wq-p small{display:block;font-family:'JetBrains Mono',monospace;
  font-size:11.5px;color:var(--faint);margin-top:3px}
.kipl-site .wq-v{font-family:'JetBrains Mono',monospace;font-size:15px;font-variant-numeric:tabular-nums}
.kipl-site .wq-v.raw{color:#8A5A16}
.kipl-site .wq-v.clean{color:#0F766E;font-weight:500}
.kipl-site .wq-l{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--faint)}
@media(max-width:760px){
  .kipl-site .wq-h{display:none}
  .kipl-site .wq-r{grid-template-columns:1fr auto;gap:5px 12px}
  .kipl-site .wq-p{grid-column:1/-1;margin-bottom:5px}
  .kipl-site .wq-v.raw::before{content:'IN ';color:var(--faint);font-size:10px}
  .kipl-site .wq-v.clean::before{content:'OUT ';color:var(--faint);font-size:10px}
  .kipl-site .wq-l{grid-column:1/-1}
}
.kipl-site .note{margin:18px 0 0;font-size:13.5px;color:var(--faint);max-width:74ch}
.kipl-site .note b{color:var(--body);font-weight:600}

/* Scope */
.kipl-site .scope{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));
  gap:1px;background:var(--line);border:1px solid var(--line);margin:0}
.kipl-site .scope>div{background:var(--paper);padding:clamp(20px,2.6vw,30px)}
.kipl-site .scope dt{font-family:'JetBrains Mono',monospace;font-size:10.5px;
  letter-spacing:.14em;text-transform:uppercase;color:var(--faint);margin-bottom:12px}
.kipl-site .scope dd{margin:0;font-family:'Manrope',sans-serif;font-weight:800;
  font-size:clamp(24px,2.7vw,36px);letter-spacing:-.03em;line-height:1}
.kipl-site .scope dd small{display:block;font-family:'Inter',sans-serif;font-size:13px;
  font-weight:400;letter-spacing:0;color:var(--body);margin-top:10px;line-height:1.5}

/* Gallery */
.kipl-site .gal{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));
  gap:clamp(14px,2vw,24px);margin-top:clamp(26px,3.4vw,44px)}
.kipl-site .gal figure{margin:0}
.kipl-site .ph{position:relative;aspect-ratio:16/9;background:var(--mist);
  border:1px dashed var(--line);border-radius:4px;display:grid;place-content:center;overflow:hidden}
.kipl-site .ph img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.kipl-site .ph span{font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--faint)}
.kipl-site .gal figcaption{margin-top:11px;font-size:13.5px;color:var(--faint)}

/* Timeline */
.kipl-site .tl{border-top:1px solid var(--line)}
.kipl-site .tl-r{display:grid;grid-template-columns:130px 1fr;gap:clamp(16px,3vw,42px);
  padding:26px 0;border-bottom:1px solid var(--line)}
.kipl-site .tl-r.now{background:linear-gradient(90deg,rgba(10,111,209,.055),transparent 60%)}
.kipl-site .tl-d{font-family:'JetBrains Mono',monospace;font-size:12.5px;color:var(--faint);padding-top:5px}
.kipl-site .tl-r.now .tl-d,.kipl-site .tl-r.done .tl-d{color:var(--water-dk)}
.kipl-site .tl-r p{margin:8px 0 0;font-size:14.5px;color:var(--body);max-width:66ch;line-height:1.55}
.kipl-site .flag{display:inline-block;font-family:'JetBrains Mono',monospace;font-size:10px;
  letter-spacing:.12em;text-transform:uppercase;padding:3px 9px;border-radius:3px;
  margin-left:11px;vertical-align:3px;background:rgba(10,111,209,.1);color:var(--water-dk)}
.kipl-site .flag.done{background:rgba(15,118,110,.1);color:#0F766E}
@media(max-width:700px){.kipl-site .tl-r{grid-template-columns:1fr;gap:6px}}

/* Footer */
.kipl-site footer{background:var(--deep);color:#fff;padding:clamp(52px,6.5vw,84px) 0 34px}
.kipl-site .f-in{display:grid;grid-template-columns:minmax(0,1.5fr) repeat(2,minmax(0,1fr));
  gap:clamp(26px,4vw,56px)}
@media(max-width:820px){.kipl-site .f-in{grid-template-columns:1fr;gap:32px}}
.kipl-site .f-in p{margin-top:14px;font-size:14.5px;color:#A9BECD;max-width:44ch;line-height:1.6}
.kipl-site .f-in h4{font-family:'JetBrains Mono',monospace;font-size:10.5px;letter-spacing:.15em;
  text-transform:uppercase;color:#7A93A6;margin:0 0 14px;font-weight:500}
.kipl-site .f-in ul{margin:0;padding:0;list-style:none}
.kipl-site .f-in li{font-size:14.5px;color:#A9BECD;margin-bottom:9px;line-height:1.5}
.kipl-site .f-in a{text-decoration:none;transition:color .2s}
.kipl-site .f-in a:hover{color:var(--aqua)}
.kipl-site .f-base{margin-top:clamp(40px,5vw,64px);padding-top:24px;
  border-top:1px solid rgba(255,255,255,.14);display:flex;flex-wrap:wrap;gap:12px 26px;
  font-family:'JetBrains Mono',monospace;font-size:11px;color:#7A93A6;letter-spacing:.06em}
.kipl-site .f-base span:last-child{margin-left:auto}

/* ══ Brand lockup / logo ══ */
.kipl-site .brand{display:flex;align-items:center;gap:12px;text-decoration:none}
.kipl-site .brand-badge{position:relative;width:38px;height:38px;flex:0 0 38px;border-radius:9px;
  background:#fff;display:grid;place-items:center;overflow:hidden;
  box-shadow:0 1px 0 rgba(255,255,255,.15),0 6px 16px rgba(0,0,0,.28)}
.kipl-site .brand-badge.lg{width:54px;height:54px;flex-basis:54px;border-radius:13px}
.kipl-site .logo-img{width:100%;height:100%;object-fit:contain;padding:3px}
.kipl-site .logo-mono{display:none;font-family:'Manrope',sans-serif;font-weight:800;
  font-size:14px;letter-spacing:.02em;color:#fff}
.kipl-site .brand-badge.lg .logo-mono{font-size:19px}
.kipl-site .brand-badge.nofile{background:linear-gradient(135deg,var(--brand),#2E7C60)}
.kipl-site .brand-badge.nofile .logo-img{display:none}
.kipl-site .brand-badge.nofile .logo-mono{display:block}
.kipl-site .brand-txt{font-family:'Manrope',sans-serif;font-weight:500;font-size:15px;
  letter-spacing:-.01em;white-space:nowrap;color:#fff}
.kipl-site .brand-txt b{color:var(--aqua);font-weight:800}
@media(max-width:560px){.kipl-site .brand-txt{display:none}}
.kipl-site .bar-live i{background:var(--brand-red);box-shadow:0 0 0 0 rgba(198,74,66,.6)}

/* ══ Coming soon · live day counter ══ */
.kipl-site .soon{color:#fff;padding:clamp(64px,8vw,120px) 0;
  border-top:1px solid rgba(255,255,255,.06);
  background:radial-gradient(120% 140% at 100% 0,rgba(62,155,122,.18),transparent 55%),var(--deep)}
.kipl-site .soon-in{display:grid;grid-template-columns:minmax(0,1fr) minmax(300px,420px);
  gap:clamp(36px,6vw,80px);align-items:center}
@media(max-width:900px){.kipl-site .soon-in{grid-template-columns:1fr;gap:40px}}
.kipl-site .soon-copy h2{color:#fff;margin:18px 0 0}
.kipl-site .soon-copy p{margin-top:22px;max-width:52ch;color:#C3D4E0;
  font-size:clamp(16px,1.5vw,19px);line-height:1.62}
.kipl-site .soon-tag{display:inline-flex;align-items:center;gap:9px;
  font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.16em;text-transform:uppercase;
  color:#F0B7B2;background:rgba(198,74,66,.14);border:1px solid rgba(198,74,66,.4);
  padding:6px 13px;border-radius:100px}
.kipl-site .soon-tag i{width:7px;height:7px;border-radius:50%;background:var(--brand-red);
  box-shadow:0 0 0 0 rgba(198,74,66,.6);animation:kp 2.6s infinite}
.kipl-site .soon-cta{display:inline-block;margin-top:28px;font-family:'JetBrains Mono',monospace;
  font-size:13px;letter-spacing:.04em;color:var(--aqua);text-decoration:none;
  border-bottom:1px solid rgba(51,181,140,.45);padding-bottom:3px;transition:.2s}
.kipl-site .soon-cta:hover{color:#fff;border-bottom-color:#fff}
.kipl-site .soon-count{background:rgba(255,255,255,.04);
  border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:clamp(24px,3vw,34px)}
.kipl-site .dc-head{font-family:'JetBrains Mono',monospace;font-size:10.5px;letter-spacing:.16em;
  text-transform:uppercase;color:#8FA9BC;margin-bottom:12px}
.kipl-site .dc-num{font-family:'Manrope',sans-serif;font-weight:800;line-height:.9;
  font-size:clamp(64px,9vw,104px);letter-spacing:-.04em;color:#fff;
  font-variant-numeric:tabular-nums;display:flex;align-items:baseline;gap:12px}
.kipl-site .dc-num em{font-style:normal;font-size:.24em;font-weight:700;color:var(--aqua);letter-spacing:0}
.kipl-site .dc-bar{height:8px;border-radius:100px;background:rgba(255,255,255,.1);
  margin:22px 0 20px;overflow:hidden}
.kipl-site .dc-bar span{display:block;height:100%;border-radius:100px;
  background:linear-gradient(90deg,var(--brand),var(--aqua));
  box-shadow:0 0 18px rgba(51,181,140,.5);transition:width 1.2s cubic-bezier(.22,1,.36,1)}
.kipl-site .dc-foot{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin:0}
.kipl-site .dc-foot dt{font-family:'JetBrains Mono',monospace;font-size:9.5px;letter-spacing:.12em;
  text-transform:uppercase;color:#7A93A6;margin-bottom:6px}
.kipl-site .dc-foot dd{margin:0;font-family:'Manrope',sans-serif;font-weight:800;font-size:20px;
  color:#fff;font-variant-numeric:tabular-nums;letter-spacing:-.02em}

/* ══ Plant parameters · number display ══ */
.kipl-site .params{padding:clamp(72px,9vw,130px) 0;background:var(--paper)}
.kipl-site .params-head{margin-bottom:clamp(36px,4.5vw,60px);max-width:26ch}
.kipl-site .params-head h2{margin-top:6px}
.kipl-site .params-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;
  background:var(--line);border:1px solid var(--line);border-radius:14px;overflow:hidden}
.kipl-site .pc{background:var(--paper);padding:clamp(22px,2.6vw,30px);
  display:flex;flex-direction:column;transition:background .25s}
.kipl-site .pc:hover{background:var(--mist)}
.kipl-site .pc.lg{grid-column:span 2;
  background:linear-gradient(135deg,rgba(62,155,122,.09),rgba(51,181,140,.03))}
.kipl-site .pc dt{font-family:'JetBrains Mono',monospace;font-size:10.5px;letter-spacing:.14em;
  text-transform:uppercase;color:var(--faint);margin-bottom:14px}
.kipl-site .pc dd{margin:0;font-family:'Manrope',sans-serif;font-weight:800;line-height:1;
  font-size:clamp(30px,3.6vw,52px);letter-spacing:-.035em;color:var(--ink);
  font-variant-numeric:tabular-nums;display:flex;align-items:baseline;gap:8px}
.kipl-site .pc.lg dd{font-size:clamp(44px,5.5vw,76px);color:var(--brand)}
.kipl-site .pc dd em{font-style:normal;font-size:.34em;font-weight:700;color:var(--body);letter-spacing:0}
.kipl-site .pc small{margin-top:12px;font-size:12.5px;color:var(--faint);line-height:1.5}
@media(max-width:900px){.kipl-site .params-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:520px){.kipl-site .params-grid{grid-template-columns:1fr}
  .kipl-site .pc.lg{grid-column:span 1}}

/* Footer brand */
.kipl-site .f-brand{display:flex;align-items:center;gap:14px;margin-bottom:6px}

@media(prefers-reduced-motion:reduce){
  .kipl-site .stage{height:200vh}
  .kipl-site .pin-copy{transition-duration:.01ms}
  .kipl-site .bd-bubbles circle{animation:none}
  .kipl-site *{animation-duration:.01ms!important}
}
`
