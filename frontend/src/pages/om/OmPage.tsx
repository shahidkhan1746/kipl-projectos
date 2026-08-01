import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Drop, Warning, Plus, Gear, Wrench } from '@phosphor-icons/react'
import { omApi } from '@/api/om.api'
import { useAuthStore } from '@/store/auth.store'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'

const C = {
  card:'#fff', border:'#e2e8f0', text1:'#0f172a', text2:'#475569', text3:'#94a3b8',
  blue:'#2563eb', green:'#059669', amber:'#d97706', red:'#dc2626', navy:'#1a2540', criticalBg:'#fef2f2',
}
type Tab = 'dash' | 'log' | 'events'

// Numeric fields for the process log (used to build the payload)
const NUM_FIELDS = [
  'inflowMld','outflowMld','inBod','inCod','inTss',
  'outBod','outCod','outTss','outPh','outDo','outFecalColiform','outAmmN','outTotalN','outTotalP',
  'mlss','svi','doAeration','chlorineResidual','powerKwh','dgHours','sludgeM3',
]
const LOG_BLANK: any = { date: new Date().toISOString().split('T')[0], shift:'', operator:'', remarks:'' }
const EVT_BLANK: any = { type:'breakdown', equipment:'', startAt: new Date().toISOString().slice(0,16), endAt:'', cause:'', action:'', attendedBy:'', remarks:'' }

const inr = (n: any) => 'Rs ' + (Number(n)||0).toLocaleString('en-IN', { maximumFractionDigits:0 })

export default function OmPage() {
  const { activeProjectId } = useAuthStore()
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('dash')
  const [showLog, setShowLog] = useState(false)
  const [logForm, setLogForm] = useState<any>(LOG_BLANK)
  const [showEvt, setShowEvt] = useState(false)
  const [evtForm, setEvtForm] = useState<any>(EVT_BLANK)

  const { data: dash } = useQuery({
    queryKey: ['om-dash', activeProjectId],
    queryFn:  () => omApi.dashboard(activeProjectId!).then(r => r.data),
    enabled:  !!activeProjectId,
  })
  const { data: logs, isLoading: logsLoading } = useQuery({
    queryKey: ['om-logs', activeProjectId],
    queryFn:  () => omApi.logs({ projectId: activeProjectId }).then(r => r.data),
    enabled:  !!activeProjectId && (tab === 'log' || tab === 'dash'),
  })
  const { data: events } = useQuery({
    queryKey: ['om-events', activeProjectId],
    queryFn:  () => omApi.events({ projectId: activeProjectId }).then(r => r.data),
    enabled:  !!activeProjectId && (tab === 'events' || tab === 'dash'),
  })

  const invalidate = () => { ['om-dash','om-logs','om-events'].forEach(k => qc.invalidateQueries({ queryKey: [k] })) }

  const createLog = useMutation({
    mutationFn: () => {
      const payload: any = { projectId: activeProjectId, date: logForm.date }
      if (logForm.shift) payload.shift = logForm.shift
      if (logForm.operator) payload.operator = logForm.operator
      if (logForm.remarks) payload.remarks = logForm.remarks
      NUM_FIELDS.forEach(f => { if (logForm[f] !== '' && logForm[f] != null) payload[f] = parseFloat(logForm[f]) })
      return omApi.createLog(payload)
    },
    onSuccess: () => { invalidate(); setShowLog(false); setLogForm(LOG_BLANK) },
    onError: (e: any) => alert('Could not save log: ' + (e?.response?.data?.message ?? e?.message)),
  })

  const createEvt = useMutation({
    mutationFn: () => {
      const payload: any = { projectId: activeProjectId, type: evtForm.type, equipment: evtForm.equipment,
        startAt: new Date(evtForm.startAt).toISOString(),
        status: evtForm.endAt ? 'closed' : 'open' }
      if (evtForm.endAt) payload.endAt = new Date(evtForm.endAt).toISOString()
      ;['cause','action','attendedBy','remarks'].forEach(k => { if (evtForm[k]) payload[k] = evtForm[k] })
      return omApi.createEvent(payload)
    },
    onSuccess: () => { invalidate(); setShowEvt(false); setEvtForm(EVT_BLANK) },
    onError: (e: any) => alert('Could not save event: ' + (e?.response?.data?.message ?? e?.message)),
  })

  const closeEvt = useMutation({
    mutationFn: (id: string) => omApi.updateEvent(id, { status:'closed', endAt: new Date().toISOString() }),
    onSuccess: invalidate,
  })

  const L = dash?.limits ?? {}
  const setLF = (k: string, v: any) => setLogForm((f: any) => ({ ...f, [k]: v }))
  const setEF = (k: string, v: any) => setEvtForm((f: any) => ({ ...f, [k]: v }))

  return (
    <div className="fade-in" style={{ display:'flex', flexDirection:'column', gap:24 }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:800, color:C.text1, margin:0, letterSpacing:'-0.02em' }}>Operation &amp; Maintenance</h1>
          <p style={{ fontSize:14, color:C.text3, marginTop:4 }}>38.5 MLD SBR STP · Trial run + 5-year O&amp;M · Effluent compliance &amp; breakdown log</p>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <Button variant="secondary" size="md" icon={<Wrench size={14}/>} onClick={() => { setEvtForm(EVT_BLANK); setShowEvt(true) }}>Log Breakdown</Button>
          <Button variant="primary" size="md" icon={<Plus size={14}/>} onClick={() => { setLogForm(LOG_BLANK); setShowLog(true) }}>New Process Log</Button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', borderBottom:'1.5px solid '+C.border }}>
        {([['dash','Dashboard',<Gear size={13}/>],['log','Process Log',<Drop size={13}/>],['events','Breakdowns',<Warning size={13}/>]] as const).map(([t,l,ic]) => (
          <button key={t} onClick={() => setTab(t)} style={{ padding:'10px 18px', fontSize:13, fontWeight:600, border:'none', background:'none', cursor:'pointer',
            borderBottom: tab===t?'2px solid '+C.blue:'2px solid transparent', color: tab===t?C.blue:C.text3, marginBottom:-1, display:'flex', alignItems:'center', gap:6 }}>{ic}{l}</button>
        ))}
      </div>

      {/* ── Dashboard ── */}
      {tab === 'dash' && (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
            {[
              ['Effluent compliance', dash?.compliancePct != null ? dash.compliancePct + '%' : '—', dash?.compliancePct >= 95 ? C.green : dash?.compliancePct >= 80 ? C.amber : C.red, `${dash?.compliantDays ?? 0}/${dash?.effluentDays ?? 0} days within norms`],
              ['Open breakdowns', String(dash?.openBreakdowns ?? 0), (dash?.openBreakdowns ?? 0) > 0 ? C.red : C.green, `${dash?.totalBreakdowns ?? 0} total`],
              ['Breakdown penalty exposure', inr(dash?.breakdownPenaltyExposure), (dash?.breakdownPenaltyExposure ?? 0) > 0 ? C.red : C.text3, 'Rs 15k/day beyond 48h'],
              ['Avg inflow', dash?.avgInflow != null ? dash.avgInflow + ' MLD' : '—', C.navy, `out ${dash?.avgOutflow ?? '—'} MLD`],
            ].map((c: any) => (
              <div key={c[0]} style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:12, padding:'14px 16px' }}>
                <div style={{ fontSize:9, fontWeight:700, color:C.text3, textTransform:'uppercase', marginBottom:6 }}>{c[0]}</div>
                <div style={{ fontSize:20, fontWeight:800, color:c[2] }}>{c[1]}</div>
                <div style={{ fontSize:11, color:C.text3, marginTop:2 }}>{c[3]}</div>
              </div>
            ))}
          </div>

          {/* Effluent vs limits */}
          <div style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:12, padding:'16px' }}>
            <p style={{ fontSize:13, fontWeight:700, color:C.text1, margin:'0 0 4px' }}>Average effluent vs discharge norms</p>
            <p style={{ fontSize:11, color:C.text3, margin:'0 0 12px' }}>NGT/CPCB STP norms for lake discharge. Non-compliant averages in red.</p>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
              {[['BOD', dash?.avgOutBod, L.outBod, 'mg/L'],['COD', dash?.avgOutCod, L.outCod, 'mg/L'],['TSS', dash?.avgOutTss, L.outTss, 'mg/L']].map((p: any) => {
                const bad = p[1] != null && p[1] > p[2]
                return (
                  <div key={p[0]} style={{ border:'1.5px solid '+(bad?'#fecaca':C.border), background:bad?C.criticalBg:'#f8fafc', borderRadius:10, padding:'12px 14px' }}>
                    <div style={{ fontSize:11, color:C.text3, fontWeight:600 }}>{p[0]} <span style={{ color:C.text3 }}>(limit ≤ {p[2]} {p[3]})</span></div>
                    <div style={{ fontSize:20, fontWeight:800, color: bad?C.red:C.green }}>{p[1] != null ? p[1] : '—'} <span style={{ fontSize:11, fontWeight:500, color:C.text3 }}>{p[3]}</span></div>
                  </div>
                )
              })}
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
            {[['Power consumed', (dash?.totalPowerKwh ?? 0).toLocaleString('en-IN') + ' kWh'],['Sludge disposed', (dash?.totalSludgeM3 ?? 0) + ' m³'],['DG running', (dash?.totalDgHours ?? 0) + ' hrs']].map((c: any) => (
              <div key={c[0]} style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:12, padding:'14px 16px' }}>
                <div style={{ fontSize:9, fontWeight:700, color:C.text3, textTransform:'uppercase', marginBottom:6 }}>{c[0]}</div>
                <div style={{ fontSize:18, fontWeight:800, color:C.navy }}>{c[1]}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Process Log ── */}
      {tab === 'log' && (
        <div style={{ background:C.card, borderRadius:16, border:'1.5px solid '+C.border, overflow:'hidden' }}>
          {logsLoading ? <div style={{ display:'flex', justifyContent:'center', padding:40 }}><Spinner /></div>
          : (logs ?? []).length === 0 ? <div style={{ padding:'48px', textAlign:'center', color:C.text3, fontSize:13 }}>No process logs yet. Click “New Process Log”.</div>
          : (
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', minWidth:900 }}>
                <thead><tr style={{ background:C.navy }}>
                  {['Date','In MLD','Out MLD','BOD','COD','TSS','pH','MLSS','Power kWh','Compliance','Operator'].map(h =>
                    <th key={h} style={{ padding:'9px 12px', textAlign:'left', fontSize:10, fontWeight:700, color:'#fff', textTransform:'uppercase', whiteSpace:'nowrap' }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {(logs ?? []).map((l: any, i: number) => {
                    const bad = (l.breaches ?? []).length > 0
                    return (
                      <tr key={l.id} style={{ borderBottom:'1px solid #f1f5f9', background: bad ? C.criticalBg : '#fff' }}>
                        <td style={{ padding:'9px 12px', fontSize:12, fontWeight:600, color:C.text1, whiteSpace:'nowrap' }}>{String(l.date).split('T')[0]}</td>
                        <td style={{ padding:'9px 12px', fontSize:12, color:C.text2 }}>{l.inflowMld ?? '—'}</td>
                        <td style={{ padding:'9px 12px', fontSize:12, color:C.text2 }}>{l.outflowMld ?? '—'}</td>
                        {['outBod','outCod','outTss','outPh'].map(k => {
                          const bK = { outBod:'BOD', outCod:'COD', outTss:'TSS', outPh:'pH' }[k]
                          const breached = (l.breaches ?? []).includes(bK)
                          return <td key={k} style={{ padding:'9px 12px', fontSize:12, fontWeight: breached?700:400, color: breached?C.red:C.text2 }}>{l[k] ?? '—'}</td>
                        })}
                        <td style={{ padding:'9px 12px', fontSize:12, color:C.text2 }}>{l.mlss ?? '—'}</td>
                        <td style={{ padding:'9px 12px', fontSize:12, color:C.text2 }}>{l.powerKwh ?? '—'}</td>
                        <td style={{ padding:'9px 12px' }}>
                          {bad
                            ? <span style={{ fontSize:9, padding:'2px 7px', borderRadius:999, fontWeight:700, background:'#fee2e2', color:C.red }}>BREACH: {(l.breaches ?? []).join(', ')}</span>
                            : <span style={{ fontSize:9, padding:'2px 7px', borderRadius:999, fontWeight:700, background:'#ecfdf5', color:'#047857' }}>OK</span>}
                        </td>
                        <td style={{ padding:'9px 12px', fontSize:11, color:C.text3 }}>{l.operator ?? '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Breakdowns ── */}
      {tab === 'events' && (
        <div style={{ background:C.card, borderRadius:16, border:'1.5px solid '+C.border, overflow:'hidden' }}>
          {(events ?? []).length === 0 ? <div style={{ padding:'48px', textAlign:'center', color:C.text3, fontSize:13 }}>No breakdowns or maintenance events logged.</div>
          : (
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', minWidth:820 }}>
                <thead><tr style={{ background:C.navy }}>
                  {['Equipment','Type','Start','End','Downtime','Status','Penalty','Action'].map(h =>
                    <th key={h} style={{ padding:'9px 12px', textAlign:'left', fontSize:10, fontWeight:700, color:'#fff', textTransform:'uppercase', whiteSpace:'nowrap' }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {(events ?? []).map((e: any, i: number) => (
                    <tr key={e.id} style={{ borderBottom:'1px solid #f1f5f9', background: e.penalty > 0 ? C.criticalBg : '#fff' }}>
                      <td style={{ padding:'9px 12px', fontSize:12, fontWeight:600, color:C.text1 }}>{e.equipment}</td>
                      <td style={{ padding:'9px 12px', fontSize:11, color:C.text2, textTransform:'capitalize' }}>{e.type}</td>
                      <td style={{ padding:'9px 12px', fontSize:11, color:C.text2, whiteSpace:'nowrap' }}>{new Date(e.startAt).toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}</td>
                      <td style={{ padding:'9px 12px', fontSize:11, color:C.text2, whiteSpace:'nowrap' }}>{e.endAt ? new Date(e.endAt).toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) : '—'}</td>
                      <td style={{ padding:'9px 12px', fontSize:12, fontWeight:700, color: e.downtimeHours > 48 ? C.red : C.text2 }}>{e.downtimeHours}h</td>
                      <td style={{ padding:'9px 12px' }}>
                        <span style={{ fontSize:9, padding:'2px 7px', borderRadius:999, fontWeight:700, background: e.status==='open'?'#fee2e2':'#ecfdf5', color: e.status==='open'?C.red:'#047857' }}>{e.status.toUpperCase()}</span>
                      </td>
                      <td style={{ padding:'9px 12px', fontSize:12, fontWeight:700, color: e.penalty>0?C.red:C.text3 }}>{e.penalty>0 ? inr(e.penalty) : '—'}</td>
                      <td style={{ padding:'9px 12px' }}>
                        {e.status === 'open' && <button onClick={() => { if(confirm('Mark this breakdown rectified now?')) closeEvt.mutate(e.id) }}
                          style={{ padding:'4px 10px', fontSize:11, fontWeight:600, color:'#047857', background:'#ecfdf5', border:'1.5px solid #a7f3d0', borderRadius:6, cursor:'pointer' }}>Rectified</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── New Process Log modal ── */}
      <Modal open={showLog} onClose={() => setShowLog(false)} title="New Process Log" width={720}
        footer={<><Button variant="ghost" onClick={() => setShowLog(false)}>Cancel</Button>
          <Button variant="primary" loading={createLog.isPending} onClick={() => createLog.mutate()}>Save Log</Button></>}>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
            <Input label="Date" type="date" value={logForm.date} onChange={e => setLF('date', e.target.value)} />
            <Input label="Shift" value={logForm.shift} onChange={e => setLF('shift', e.target.value)} placeholder="Day / Night" />
            <Input label="Operator" value={logForm.operator} onChange={e => setLF('operator', e.target.value)} />
          </div>
          {[
            ['Flow (MLD)', [['inflowMld','Inflow'],['outflowMld','Outflow']]],
            ['Influent (mg/L)', [['inBod','BOD'],['inCod','COD'],['inTss','TSS']]],
            ['Effluent (mg/L)', [['outBod','BOD'],['outCod','COD'],['outTss','TSS'],['outPh','pH'],['outDo','DO'],['outFecalColiform','Fecal Col.'],['outAmmN','NH₃-N'],['outTotalN','Total N'],['outTotalP','Total P']]],
            ['SBR & utilities', [['mlss','MLSS'],['svi','SVI'],['doAeration','DO aeration'],['chlorineResidual','Cl₂ residual'],['powerKwh','Power kWh'],['dgHours','DG hrs'],['sludgeM3','Sludge m³']]],
          ].map(([grp, fields]: any) => (
            <div key={grp}>
              <p style={{ fontSize:12, fontWeight:700, color:C.text2, margin:'0 0 6px' }}>{grp}</p>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
                {fields.map(([k, lab]: any) => (
                  <Input key={k} label={lab} type="number" value={logForm[k] ?? ''} onChange={e => setLF(k, e.target.value)} />
                ))}
              </div>
            </div>
          ))}
          <Input label="Remarks" value={logForm.remarks} onChange={e => setLF('remarks', e.target.value)} />
        </div>
      </Modal>

      {/* ── New Breakdown / Event modal ── */}
      <Modal open={showEvt} onClose={() => setShowEvt(false)} title="Log Breakdown / Maintenance" width={560}
        footer={<><Button variant="ghost" onClick={() => setShowEvt(false)}>Cancel</Button>
          <Button variant="primary" loading={createEvt.isPending} onClick={() => createEvt.mutate()} disabled={!evtForm.equipment}>Save</Button></>}>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:5 }}>Type</label>
              <select value={evtForm.type} onChange={e => setEF('type', e.target.value)}
                style={{ width:'100%', padding:'10px 12px', border:'1.5px solid #d1d5db', borderRadius:8, fontSize:13, background:'#fff', fontFamily:'inherit', cursor:'pointer' }}>
                <option value="breakdown">Breakdown</option>
                <option value="preventive">Preventive maintenance</option>
                <option value="corrective">Corrective maintenance</option>
              </select>
            </div>
            <Input label="Equipment" value={evtForm.equipment} onChange={e => setEF('equipment', e.target.value)} placeholder="Blower #2 / SBR decanter" />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Input label="Start" type="datetime-local" value={evtForm.startAt} onChange={e => setEF('startAt', e.target.value)} />
            <Input label="End (blank = ongoing)" type="datetime-local" value={evtForm.endAt} onChange={e => setEF('endAt', e.target.value)} />
          </div>
          <Input label="Cause" value={evtForm.cause} onChange={e => setEF('cause', e.target.value)} />
          <Input label="Action taken" value={evtForm.action} onChange={e => setEF('action', e.target.value)} />
          <Input label="Attended by" value={evtForm.attendedBy} onChange={e => setEF('attendedBy', e.target.value)} />
          <p style={{ fontSize:11, color:C.amber, margin:0 }}>Breakdowns unresolved beyond 48 hours attract a Rs 15,000/day penalty (STP O&amp;M scope).</p>
        </div>
      </Modal>
    </div>
  )
}
