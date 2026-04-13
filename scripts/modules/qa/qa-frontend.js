// Run from project root: node scripts/modules/qa/frontend.js
const fs   = require('fs')
const path = require('path')

const G = '\x1b[32m', NC = '\x1b[0m'
const ok = s => console.log(G + '  ✓' + NC + ' ' + s)

console.log('\n\x1b[1mBuilding QA Module — Frontend\x1b[0m\n')

// ── QA API ────────────────────────────────────────────────────
fs.mkdirSync(path.join('frontend', 'src', 'api'), { recursive: true })
fs.writeFileSync(path.join('frontend', 'src', 'api', 'qa.api.ts'), [
  "import api from './client'",
  "export const qaApi = {",
  "  dashboard:       (projectId: string) => api.get('/api/v1/qa/dashboard', { params: { projectId } }),",
  "  checklists:      (projectId: string, category?: string) => api.get('/api/v1/qa/checklists', { params: { projectId, category } }),",
  "  seedChecklists:  (projectId: string) => api.post('/api/v1/qa/checklists/seed', { projectId }),",
  "  getChecklist:    (id: string) => api.get('/api/v1/qa/checklists/' + id),",
  "  createChecklist: (d: any) => api.post('/api/v1/qa/checklists', d),",
  "  inspections:     (p?: any) => api.get('/api/v1/qa/inspections', { params: p }),",
  "  createInspection:(d: any) => api.post('/api/v1/qa/inspections', d),",
  "  updateInspection:(id: string, d: any) => api.patch('/api/v1/qa/inspections/' + id, d),",
  "  ncrs:            (p?: any) => api.get('/api/v1/qa/ncrs', { params: p }),",
  "  createNcr:       (d: any) => api.post('/api/v1/qa/ncrs', d),",
  "  closeNcr:        (id: string, d: any) => api.patch('/api/v1/qa/ncrs/' + id + '/close', d),",
  "}",
].join('\n'))
ok('qa.api.ts')

// ── QA Page ───────────────────────────────────────────────────
fs.mkdirSync(path.join('frontend', 'src', 'pages', 'qa'), { recursive: true })
fs.writeFileSync(path.join('frontend', 'src', 'pages', 'qa', 'QaPage.tsx'), `import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckSquare, Plus, Warning, ClipboardText, X } from '@phosphor-icons/react'
import { qaApi } from '@/api/qa.api'
import { useAuthStore } from '@/store/auth.store'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'

const C = {
  card:'#fff', border:'#e2e8f0', text1:'#0f172a', text2:'#475569', text3:'#94a3b8',
  blue:'#2563eb', green:'#059669', amber:'#d97706', red:'#dc2626', navy:'#1a2540',
}

const CAT_LABELS: Record<string,string> = {
  sewer_network:'Sewer Network', manhole:'Manhole', pipe_laying:'Pipe Laying',
  earthwork:'Earthwork', concrete:'Concrete', ips_civil:'IPS Civil',
  ips_em:'IPS E&M', stp:'STP', road_restoration:'Road Restoration',
  testing:'Testing', material:'Material', safety:'Safety',
}

const RESULT_STYLE: Record<string,any> = {
  pass:      { bg:'#ecfdf5', color:'#047857', border:'#a7f3d0', label:'PASS' },
  fail:      { bg:'#fef2f2', color:'#b91c1c', border:'#fecaca', label:'FAIL' },
  na:        { bg:'#f8fafc', color:'#64748b', border:'#e2e8f0', label:'N/A' },
  passed:    { bg:'#ecfdf5', color:'#047857', border:'#a7f3d0' },
  failed:    { bg:'#fef2f2', color:'#b91c1c', border:'#fecaca' },
  conditional:{ bg:'#fffbeb', color:'#b45309', border:'#fde68a' },
  submitted: { bg:'#eff6ff', color:'#1d4ed8', border:'#bfdbfe' },
  draft:     { bg:'#f8fafc', color:'#64748b', border:'#e2e8f0' },
  open:      { bg:'#fef2f2', color:'#b91c1c', border:'#fecaca' },
  closed:    { bg:'#ecfdf5', color:'#047857', border:'#a7f3d0' },
  under_review:{ bg:'#fffbeb', color:'#b45309', border:'#fde68a' },
}

const SEV_STYLE: Record<string,any> = {
  minor:    { bg:'#fffbeb', color:'#b45309' },
  major:    { bg:'#fef2f2', color:'#b91c1c' },
  critical: { bg:'#450a0a', color:'#fca5a5' },
}

type Tab = 'inspections' | 'checklists' | 'ncrs'

export default function QaPage() {
  const { activeProjectId, user } = useAuthStore()
  const qc = useQueryClient()
  const [tab, setTab]               = useState<Tab>('inspections')
  const [showInsp, setShowInsp]     = useState(false)
  const [showNcr, setShowNcr]       = useState(false)
  const [activeInsp, setActiveInsp] = useState<any>(null)
  const [selectedCl, setSelectedCl] = useState<any>(null)
  const [responses, setResponses]   = useState<Record<string,string>>({})

  const [inspForm, setInspForm] = useState({
    date: new Date().toISOString().split('T')[0],
    workItem: '', location: '', chainage: '',
    checklistId: '', inspectedBy: user?.name ?? '',
    contractorRep: '', engineerRep: '',
  })

  const [ncrForm, setNcrForm] = useState({
    date: new Date().toISOString().split('T')[0],
    workItem: '', location: '', description: '',
    severity: 'minor', raisedBy: user?.name ?? '',
    rootCause: '', targetDate: '',
  })

  const { data: dash } = useQuery({
    queryKey: ['qa-dash', activeProjectId],
    queryFn:  () => qaApi.dashboard(activeProjectId!).then(r => r.data),
    enabled:  !!activeProjectId,
  })

  const { data: checklists } = useQuery({
    queryKey: ['qa-cl', activeProjectId],
    queryFn:  () => qaApi.checklists(activeProjectId!).then(r => r.data),
    enabled:  !!activeProjectId,
  })

  const { data: inspections, isLoading: inspLoading } = useQuery({
    queryKey: ['qa-insp', activeProjectId],
    queryFn:  () => qaApi.inspections({ projectId: activeProjectId }).then(r => r.data),
    enabled:  !!activeProjectId,
  })

  const { data: ncrs, isLoading: ncrLoading } = useQuery({
    queryKey: ['qa-ncr', activeProjectId],
    queryFn:  () => qaApi.ncrs({ projectId: activeProjectId }).then(r => r.data),
    enabled:  !!activeProjectId && tab === 'ncrs',
  })

  const seedM = useMutation({
    mutationFn: () => qaApi.seedChecklists(activeProjectId!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['qa-cl'] }),
  })

  const createInspM = useMutation({
    mutationFn: () => {
      const cl = (checklists ?? []).find((c: any) => c.id === inspForm.checklistId)
      const respArr = cl ? cl.items.map((item: any) => ({
        itemId: item.id,
        question: item.question,
        result: responses[item.id] ?? 'na',
        remarks: '',
      })) : []
      return qaApi.createInspection({
        ...inspForm, projectId: activeProjectId,
        responses: respArr, submitted: true,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['qa-insp'] })
      qc.invalidateQueries({ queryKey: ['qa-dash'] })
      setShowInsp(false)
      setInspForm({ date: new Date().toISOString().split('T')[0], workItem:'', location:'', chainage:'', checklistId:'', inspectedBy: user?.name??'', contractorRep:'', engineerRep:'' })
      setResponses({})
      setSelectedCl(null)
    },
  })

  const createNcrM = useMutation({
    mutationFn: () => qaApi.createNcr({ ...ncrForm, projectId: activeProjectId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['qa-ncr'] })
      qc.invalidateQueries({ queryKey: ['qa-dash'] })
      setShowNcr(false)
    },
  })

  const closeNcrM = useMutation({
    mutationFn: ({ id, action }: any) => qaApi.closeNcr(id, { correctiveAction: action }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['qa-ncr'] }),
  })

  const clList   = checklists   ?? []
  const inspList = inspections  ?? []
  const ncrList  = ncrs         ?? []

  function loadChecklist(clId: string) {
    const cl = clList.find((c: any) => c.id === clId)
    setSelectedCl(cl ?? null)
    setResponses({})
    setInspForm((f: any) => ({ ...f, checklistId: clId, workItem: cl?.workItem ?? f.workItem }))
  }

  const kpis = [
    { label:'Total Inspections', value: dash?.totalInspections ?? 0, color: C.blue },
    { label:'Passed',            value: dash?.passed ?? 0,           color: C.green },
    { label:'Failed',            value: dash?.failed ?? 0,           color: C.red },
    { label:'Pass Rate',         value: (dash?.passRate ?? '0')+'%', color: C.green },
    { label:'Open NCRs',         value: dash?.openNcrs ?? 0,         color: (dash?.openNcrs ?? 0) > 0 ? C.red : C.green },
  ]

  return (
    <div className="fade-in" style={{ display:'flex', flexDirection:'column', gap:24 }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:800, color:C.text1, margin:0, letterSpacing:'-0.02em' }}>Quality Assurance</h1>
          <p style={{ fontSize:14, color:C.text3, marginTop:4 }}>Clause 33 — Inspections · Checklists · NCRs</p>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          {clList.length === 0 && (
            <Button variant="secondary" size="md" loading={seedM.isPending} onClick={() => seedM.mutate()}>Load QA Checklists</Button>
          )}
          <Button variant="secondary" size="md" icon={<Warning size={15}/>} onClick={() => setShowNcr(true)}>Raise NCR</Button>
          <Button variant="primary" size="md" icon={<Plus size={15}/>} onClick={() => setShowInsp(true)}>New Inspection</Button>
        </div>
      </div>

      {/* KPI cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:14 }}>
        {kpis.map(k => (
          <div key={k.label} style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:12, padding:'16px 18px', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize:10, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>{k.label}</div>
            <div style={{ fontSize:22, fontWeight:800, color:k.color, fontVariantNumeric:'tabular-nums' }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', borderBottom:'1.5px solid '+C.border }}>
        {([
          ['inspections', 'Inspections ('+inspList.length+')'],
          ['checklists',  'Checklists ('+clList.length+')'],
          ['ncrs',        'NCRs ('+(dash?.totalNcrs ?? 0)+')'],
        ] as const).map(([t, l]) => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding:'10px 20px', fontSize:13, fontWeight:600, border:'none', background:'none', cursor:'pointer',
            borderBottom: tab===t ? '2px solid '+C.blue : '2px solid transparent',
            color: tab===t ? C.blue : C.text3, marginBottom:-1,
          }}>{l}</button>
        ))}
      </div>

      {/* Inspections */}
      {tab === 'inspections' && (
        <div style={{ background:C.card, borderRadius:16, border:'1.5px solid '+C.border, overflow:'hidden', boxShadow:'0 1px 6px rgba(0,0,0,0.05)' }}>
          {inspLoading ? <div style={{ display:'flex', justifyContent:'center', padding:40 }}><Spinner /></div>
          : inspList.length === 0 ? (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'56px 24px', gap:10 }}>
              <CheckSquare size={32} color={C.border} />
              <p style={{ fontSize:14, fontWeight:600, color:C.text3, margin:0 }}>No inspections yet</p>
              <Button variant="primary" size="sm" icon={<Plus size={13}/>} onClick={() => setShowInsp(true)}>Record first inspection</Button>
            </div>
          ) : (
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'#f8f9fc', borderBottom:'1.5px solid '+C.border }}>
                  {['Date','Work Item','Location','Inspected By','Pass','Fail','Result','NCR'].map(h => (
                    <th key={h} style={{ padding:'10px 16px', textAlign:'left', fontSize:10, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.06em', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {inspList.map((i: any, idx: number) => {
                  const rs = RESULT_STYLE[i.overallResult] ?? RESULT_STYLE.draft
                  return (
                    <tr key={i.id} style={{ borderBottom: idx < inspList.length-1 ? '1px solid #f1f5f9' : 'none' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f8faff')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <td style={{ padding:'12px 16px', fontSize:12, color:C.text2, whiteSpace:'nowrap' }}>{i.date}</td>
                      <td style={{ padding:'12px 16px', fontSize:13, fontWeight:600, color:C.text1 }}>{i.workItem}</td>
                      <td style={{ padding:'12px 16px', fontSize:12, color:C.text2 }}>{i.location ?? '—'}{i.chainage ? ' (Ch: '+i.chainage+')' : ''}</td>
                      <td style={{ padding:'12px 16px', fontSize:12, color:C.text2 }}>{i.inspectedBy}</td>
                      <td style={{ padding:'12px 16px', fontSize:14, fontWeight:700, color:C.green }}>{i.passCount}</td>
                      <td style={{ padding:'12px 16px', fontSize:14, fontWeight:700, color:i.failCount > 0 ? C.red : C.text3 }}>{i.failCount}</td>
                      <td style={{ padding:'12px 16px' }}>
                        <span style={{ display:'inline-flex', padding:'3px 10px', borderRadius:999, fontSize:11, fontWeight:700, background:rs.bg, color:rs.color, border:'1.5px solid '+(rs.border ?? C.border) }}>{i.overallResult}</span>
                      </td>
                      <td style={{ padding:'12px 16px' }}>
                        {i.failCount > 0 && !i.ncrRaised && (
                          <button onClick={() => { setNcrForm((f: any) => ({ ...f, workItem: i.workItem, location: i.location ?? '' })); setShowNcr(true) }}
                            style={{ padding:'4px 8px', fontSize:10, fontWeight:600, color:C.red, background:'#fef2f2', border:'1.5px solid #fecaca', borderRadius:5, cursor:'pointer' }}>
                            Raise NCR
                          </button>
                        )}
                        {i.ncrRaised && <span style={{ fontSize:11, color:C.text3 }}>NCR raised</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Checklists */}
      {tab === 'checklists' && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:14 }}>
          {clList.length === 0 ? (
            <div style={{ gridColumn:'1/-1', background:C.card, borderRadius:16, border:'1.5px solid '+C.border, padding:'56px 24px', display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
              <ClipboardText size={32} color={C.border} />
              <p style={{ fontSize:14, fontWeight:600, color:C.text3, margin:0 }}>No checklists loaded</p>
              <p style={{ fontSize:12, color:'#cbd5e1', margin:0 }}>8 checklists based on tender specs will be loaded</p>
              <Button variant="primary" loading={seedM.isPending} onClick={() => seedM.mutate()}>Load QA Checklists</Button>
            </div>
          ) : clList.map((cl: any) => (
            <div key={cl.id} style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:14, padding:'18px 20px', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:10 }}>
                <div>
                  <h3 style={{ fontSize:14, fontWeight:700, color:C.text1, margin:'0 0 4px' }}>{cl.title}</h3>
                  <span style={{ fontSize:10, padding:'2px 8px', borderRadius:999, background:'#eff6ff', color:C.blue, border:'1px solid #bfdbfe', fontWeight:700 }}>{CAT_LABELS[cl.category] ?? cl.category}</span>
                </div>
                <span style={{ fontSize:12, color:C.text3, marginLeft:8, flexShrink:0 }}>{cl.items?.length ?? 0} items</span>
              </div>
              {cl.workItem && <p style={{ fontSize:12, color:C.text3, margin:'0 0 10px' }}>Work: {cl.workItem}</p>}
              <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                {(cl.items ?? []).slice(0, 4).map((item: any, i: number) => (
                  <div key={i} style={{ fontSize:12, color:C.text2, display:'flex', gap:6, alignItems:'flex-start' }}>
                    <span style={{ color:C.blue, flexShrink:0, marginTop:1 }}>✓</span>
                    <span style={{ lineHeight:1.4 }}>{item.question}</span>
                  </div>
                ))}
                {(cl.items ?? []).length > 4 && (
                  <p style={{ fontSize:11, color:C.text3, margin:0 }}>+{(cl.items ?? []).length - 4} more items</p>
                )}
              </div>
              <div style={{ marginTop:12, paddingTop:12, borderTop:'1px solid #f1f5f9' }}>
                <button onClick={() => { setSelectedCl(cl); setInspForm((f: any) => ({ ...f, checklistId: cl.id, workItem: cl.workItem ?? '' })); setShowInsp(true) }}
                  style={{ padding:'6px 14px', background:'#eff6ff', border:'1.5px solid #bfdbfe', borderRadius:7, fontSize:12, color:C.blue, cursor:'pointer', fontWeight:600 }}>
                  Start Inspection
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* NCRs */}
      {tab === 'ncrs' && (
        <div style={{ background:C.card, borderRadius:16, border:'1.5px solid '+C.border, overflow:'hidden', boxShadow:'0 1px 6px rgba(0,0,0,0.05)' }}>
          {ncrLoading ? <div style={{ display:'flex', justifyContent:'center', padding:40 }}><Spinner /></div>
          : ncrList.length === 0 ? (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'56px 24px', gap:10 }}>
              <Warning size={32} color={C.border} />
              <p style={{ fontSize:14, fontWeight:600, color:C.text3, margin:0 }}>No NCRs raised</p>
            </div>
          ) : (
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'#f8f9fc', borderBottom:'1.5px solid '+C.border }}>
                  {['NCR No.','Date','Work Item','Location','Description','Severity','Status','Target Date','Action'].map(h => (
                    <th key={h} style={{ padding:'10px 16px', textAlign:'left', fontSize:10, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.06em', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ncrList.map((n: any, i: number) => {
                  const ss  = RESULT_STYLE[n.status]  ?? RESULT_STYLE.open
                  const sev = SEV_STYLE[n.severity]   ?? SEV_STYLE.minor
                  return (
                    <tr key={n.id} style={{ borderBottom: i < ncrList.length-1 ? '1px solid #f1f5f9' : 'none' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f8faff')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <td style={{ padding:'12px 16px', fontSize:12, fontWeight:700, color:C.red, fontFamily:'monospace' }}>{n.ncrNo}</td>
                      <td style={{ padding:'12px 16px', fontSize:12, color:C.text2, whiteSpace:'nowrap' }}>{n.date}</td>
                      <td style={{ padding:'12px 16px', fontSize:13, fontWeight:600, color:C.text1 }}>{n.workItem}</td>
                      <td style={{ padding:'12px 16px', fontSize:12, color:C.text2 }}>{n.location ?? '—'}</td>
                      <td style={{ padding:'12px 16px', fontSize:12, color:C.text2, maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{n.description}</td>
                      <td style={{ padding:'12px 16px' }}>
                        <span style={{ fontSize:10, padding:'2px 8px', borderRadius:999, fontWeight:700, background:sev.bg, color:sev.color, textTransform:'uppercase' }}>{n.severity}</span>
                      </td>
                      <td style={{ padding:'12px 16px' }}>
                        <span style={{ fontSize:10, padding:'2px 8px', borderRadius:999, fontWeight:700, background:ss.bg, color:ss.color, border:'1.5px solid '+(ss.border??C.border) }}>{n.status.replace(/_/g,' ')}</span>
                      </td>
                      <td style={{ padding:'12px 16px', fontSize:12, color:C.text2 }}>{n.targetDate ?? '—'}</td>
                      <td style={{ padding:'12px 16px' }}>
                        {n.status === 'open' && (
                          <button onClick={() => {
                            const action = prompt('Corrective action taken:')
                            if (action) closeNcrM.mutate({ id: n.id, action })
                          }} style={{ padding:'4px 8px', fontSize:10, fontWeight:600, color:'#047857', background:'#ecfdf5', border:'1.5px solid #a7f3d0', borderRadius:5, cursor:'pointer' }}>
                            Close NCR
                          </button>
                        )}
                        {n.status === 'closed' && <span style={{ fontSize:11, color:C.green }}>✓ Closed</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* New Inspection Modal */}
      <Modal open={showInsp} onClose={() => { setShowInsp(false); setSelectedCl(null); setResponses({}) }} title="New QA Inspection" width={700}
        footer={<>
          <Button variant="ghost" onClick={() => { setShowInsp(false); setSelectedCl(null); setResponses({}) }}>Cancel</Button>
          <Button variant="primary" loading={createInspM.isPending} onClick={() => createInspM.mutate()} disabled={!inspForm.workItem}>Submit Inspection</Button>
        </>}>
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Input label="Date" type="date" value={inspForm.date} onChange={e => setInspForm((f: any) => ({ ...f, date: e.target.value }))} />
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:5 }}>Checklist</label>
              <select value={inspForm.checklistId} onChange={e => loadChecklist(e.target.value)}
                style={{ width:'100%', padding:'10px 13px', background:'#fff', border:'1.5px solid #d1d5db', borderRadius:8, fontSize:13, color:'#111827', outline:'none', fontFamily:'inherit', cursor:'pointer' }}>
                <option value="">Select checklist...</option>
                {clList.map((cl: any) => (
                  <option key={cl.id} value={cl.id}>{cl.title}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
            <Input label="Work Item *" value={inspForm.workItem} onChange={e => setInspForm((f: any) => ({ ...f, workItem: e.target.value }))} placeholder="Pipe laying at Node 102" />
            <Input label="Location / Zone" value={inspForm.location} onChange={e => setInspForm((f: any) => ({ ...f, location: e.target.value }))} placeholder="Nishat, Zone 3" />
            <Input label="Chainage" value={inspForm.chainage} onChange={e => setInspForm((f: any) => ({ ...f, chainage: e.target.value }))} placeholder="CH: 0+450" />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
            <Input label="Inspected By" value={inspForm.inspectedBy} onChange={e => setInspForm((f: any) => ({ ...f, inspectedBy: e.target.value }))} />
            <Input label="Contractor Rep." value={inspForm.contractorRep} onChange={e => setInspForm((f: any) => ({ ...f, contractorRep: e.target.value }))} />
            <Input label="Engineer / AEE Rep." value={inspForm.engineerRep} onChange={e => setInspForm((f: any) => ({ ...f, engineerRep: e.target.value }))} />
          </div>

          {selectedCl && (
            <div style={{ border:'1.5px solid '+C.border, borderRadius:10, overflow:'hidden' }}>
              <div style={{ padding:'10px 16px', background:'#f8f9fc', borderBottom:'1.5px solid '+C.border }}>
                <h3 style={{ fontSize:13, fontWeight:700, color:C.text1, margin:0 }}>{selectedCl.title}</h3>
              </div>
              {selectedCl.items.map((item: any) => {
                const val = responses[item.id] ?? 'na'
                return (
                  <div key={item.id} style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:12, padding:'12px 16px', borderBottom:'1px solid #f1f5f9', alignItems:'center' }}>
                    <div>
                      <p style={{ fontSize:13, color:C.text1, margin:0, lineHeight:1.4 }}>
                        {item.required && <span style={{ color:C.red, marginRight:4 }}>*</span>}
                        {item.question}
                      </p>
                      {item.referenceSpec && <p style={{ fontSize:10, color:C.text3, margin:'3px 0 0', fontStyle:'italic' }}>{item.referenceSpec}</p>}
                    </div>
                    <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                      {(['pass','fail','na'] as const).map(r => {
                        const rs = RESULT_STYLE[r]
                        return (
                          <button key={r} onClick={() => setResponses(prev => ({ ...prev, [item.id]: r }))}
                            style={{ padding:'5px 12px', borderRadius:6, fontSize:11, fontWeight:700, cursor:'pointer', border:'1.5px solid '+(val===r?rs.border:C.border), background:val===r?rs.bg:'#fff', color:val===r?rs.color:C.text3, transition:'all 0.1s' }}>
                            {rs.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
              <div style={{ padding:'10px 16px', background:'#f8f9fc', display:'flex', gap:16, fontSize:12 }}>
                <span style={{ color:C.green, fontWeight:700 }}>Pass: {Object.values(responses).filter(v => v==='pass').length}</span>
                <span style={{ color:C.red, fontWeight:700 }}>Fail: {Object.values(responses).filter(v => v==='fail').length}</span>
                <span style={{ color:C.text3 }}>N/A: {Object.values(responses).filter(v => v==='na').length}</span>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Raise NCR Modal */}
      <Modal open={showNcr} onClose={() => setShowNcr(false)} title="Raise Non-Conformance Report (NCR)" width={560}
        footer={<>
          <Button variant="ghost" onClick={() => setShowNcr(false)}>Cancel</Button>
          <Button variant="danger" loading={createNcrM.isPending} onClick={() => createNcrM.mutate()} disabled={!ncrForm.workItem || !ncrForm.description} icon={<Warning size={14}/>}>Raise NCR</Button>
        </>}>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ padding:'10px 14px', background:'#fef2f2', border:'1.5px solid #fecaca', borderRadius:8, fontSize:12, color:'#b91c1c' }}>
            NCRs are formal non-conformance records per Tender Clause 33. They are tracked until corrective action is verified.
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Input label="Date" type="date" value={ncrForm.date} onChange={e => setNcrForm((f: any) => ({ ...f, date: e.target.value }))} />
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:5 }}>Severity</label>
              <select value={ncrForm.severity} onChange={e => setNcrForm((f: any) => ({ ...f, severity: e.target.value }))}
                style={{ width:'100%', padding:'10px 13px', background:'#fff', border:'1.5px solid #d1d5db', borderRadius:8, fontSize:13, color:'#111827', outline:'none', fontFamily:'inherit', cursor:'pointer' }}>
                <option value="minor">Minor</option>
                <option value="major">Major</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Input label="Work Item *" value={ncrForm.workItem} onChange={e => setNcrForm((f: any) => ({ ...f, workItem: e.target.value }))} placeholder="Pipe laying 200mm dia" />
            <Input label="Location" value={ncrForm.location} onChange={e => setNcrForm((f: any) => ({ ...f, location: e.target.value }))} placeholder="Zone 3, Node 450" />
          </div>
          <div>
            <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:5 }}>Description of Non-Conformance *</label>
            <textarea value={ncrForm.description} onChange={e => setNcrForm((f: any) => ({ ...f, description: e.target.value }))} rows={3}
              placeholder="Describe what was found to be non-conforming..."
              style={{ width:'100%', padding:'9px 13px', background:'#fff', border:'1.5px solid #d1d5db', borderRadius:8, fontSize:13, color:'#111827', outline:'none', fontFamily:'inherit', resize:'none' }} />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Input label="Raised By" value={ncrForm.raisedBy} onChange={e => setNcrForm((f: any) => ({ ...f, raisedBy: e.target.value }))} />
            <Input label="Target Close Date" type="date" value={ncrForm.targetDate} onChange={e => setNcrForm((f: any) => ({ ...f, targetDate: e.target.value }))} />
          </div>
          <div>
            <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:5 }}>Root Cause (if known)</label>
            <textarea value={ncrForm.rootCause} onChange={e => setNcrForm((f: any) => ({ ...f, rootCause: e.target.value }))} rows={2}
              placeholder="Why did this non-conformance occur?"
              style={{ width:'100%', padding:'9px 13px', background:'#fff', border:'1.5px solid #d1d5db', borderRadius:8, fontSize:13, color:'#111827', outline:'none', fontFamily:'inherit', resize:'none' }} />
          </div>
        </div>
      </Modal>
    </div>
  )
}
`)
ok('QaPage.tsx')

// Add QA to App.tsx routes
const appPath = path.join('frontend', 'src', 'App.tsx')
let app = fs.readFileSync(appPath, 'utf8')
if (!app.includes('QaPage')) {
  app = app.replace(
    "import AccountingPage",
    "import QaPage         from '@/pages/qa/QaPage'\nimport AccountingPage"
  )
  app = app.replace(
    'path="accounting"',
    'path="qa" element={<QaPage />} />\n          <Route path="accounting"'
  )
  fs.writeFileSync(appPath, app)
  ok('App.tsx — /qa route added')
}

// Add to Sidebar
const sidebarPath = path.join('frontend', 'src', 'components', 'layout', 'Sidebar.tsx')
let sidebar = fs.readFileSync(sidebarPath, 'utf8')
if (!sidebar.includes("path:'/qa'")) {
  sidebar = sidebar.replace(
    "{ label:'BOQ & Costs'",
    "{ label:'Quality (QA)', path:'/qa', icon:CheckSquare, end:true },\n    { label:'BOQ & Costs'"
  )
  // Add CheckSquare to import
  sidebar = sidebar.replace(
    'Buildings, SignOut,',
    'Buildings, SignOut, CheckSquare,'
  )
  fs.writeFileSync(sidebarPath, sidebar)
  ok('Sidebar — QA link added')
}

console.log('\n\x1b[32m\x1b[1m  QA Frontend complete!\x1b[0m' + NC)
console.log('\n  URL: /qa')
console.log('\n  Features:')
console.log('  - 8 pre-loaded inspection checklists from tender specs')
console.log('  - Pipe laying, manhole, concrete pour, material, testing, road, safety')
console.log('  - Pass/Fail/N/A per checklist item with reference spec shown')
console.log('  - Auto-calculates overall result (passed/failed/conditional)')
console.log('  - NCR auto-numbered NCR-0001, NCR-0002...')
console.log('  - Close NCR with corrective action')
console.log('  - KPI dashboard: pass rate, open NCRs\n')
