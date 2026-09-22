import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckSquare, Plus, Warning, ClipboardText, X, Flask, Cube, Trash, CheckCircle, ArrowRight } from '@phosphor-icons/react'
import { qaApi } from '@/api/qa.api'
import { useAuthStore } from '@/store/auth.store'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'
import { QueryBanner } from '@/components/ui/QueryBanner'
import { formatDate } from '@/lib/date'
import { toast } from '@/lib/notify'

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

const CONCRETE_GRADES = ['M15', 'M20', 'M25', 'M30', 'M35', 'M40']
const GRADE_FCK: Record<string, number> = {
  M15: 15, M20: 20, M25: 25, M30: 30, M35: 35, M40: 40,
}

type Tab = 'inspections' | 'checklists' | 'ncrs' | 'cubes'

export default function QaPage() {
  const { activeProjectId, user } = useAuthStore()
  const qc = useQueryClient()
  const [tab, setTab]               = useState<Tab>('inspections')
  const [showInsp, setShowInsp]     = useState(false)
  const [showNcr, setShowNcr]       = useState(false)
  const [showCubeModal, setShowCubeModal] = useState(false)
  const [breakModal, setBreakModal] = useState<{ open: boolean; type: '7d' | '28d'; cube: any | null }>({
    open: false, type: '7d', cube: null,
  })
  const [activeInsp, setActiveInsp] = useState<any>(null)
  const [selectedCl, setSelectedCl] = useState<any>(null)
  const [responses, setResponses]   = useState<Record<string,string>>({})

  const [cubeForm, setCubeForm] = useState({
    castDate: new Date().toISOString().split('T')[0],
    structure: '',
    location: '',
    grade: 'M25',
    targetStrengthMpa: 25,
    mixType: 'design',
    cementBrand: 'UltraTech',
    cementType: 'OPC_43',
    waterCementRatio: '0.45',
    slumpMm: '100',
    curingCondition: 'lab_tank',
    cubeCount: 6,
    sampleNo: '',
    supplierBatch: '',
    castBy: user?.name ?? '',
  })

  const [breakForm, setBreakForm] = useState({
    loadsKn: ['', '', ''],
    breakDate: new Date().toISOString().split('T')[0],
    technician: user?.name ?? '',
    notes: '',
  })

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

  const { data: inspections, isLoading: inspLoading, isError: inspError, refetch: refetchInsp } = useQuery({
    queryKey: ['qa-insp', activeProjectId],
    queryFn:  () => qaApi.inspections({ projectId: activeProjectId }).then(r => r.data),
    enabled:  !!activeProjectId,
  })

  const { data: ncrs, isLoading: ncrLoading, isError: ncrError, refetch: refetchNcr } = useQuery({
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

  const { data: cubeTests, isLoading: cubeLoading, isError: cubeError, refetch: refetchCubes } = useQuery({
    queryKey: ['qa-cubes', activeProjectId],
    queryFn:  () => qaApi.cubeTests(activeProjectId || undefined).then(r => r.data),
    enabled:  !!activeProjectId,
  })

  const createCubeM = useMutation({
    mutationFn: (d: any) => qaApi.createCubeTest({ ...d, projectId: activeProjectId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['qa-cubes'] })
      qc.invalidateQueries({ queryKey: ['qa-dash'] })
      setShowCubeModal(false)
      toast.success('Concrete cube sample registered successfully!')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Failed to register cube sample')
    },
  })

  const record7dM = useMutation({
    mutationFn: ({ id, d }: { id: string; d: any }) => qaApi.record7DayBreak(id, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['qa-cubes'] })
      qc.invalidateQueries({ queryKey: ['qa-dash'] })
      setBreakModal({ open: false, type: '7d', cube: null })
      toast.success('7-day crushing loads recorded and projected!')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Failed to record 7-day break')
    },
  })

  const record28dM = useMutation({
    mutationFn: ({ id, d }: { id: string; d: any }) => qaApi.record28DayBreak(id, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['qa-cubes'] })
      qc.invalidateQueries({ queryKey: ['qa-dash'] })
      setBreakModal({ open: false, type: '28d', cube: null })
      toast.success('28-day compliance check recorded successfully!')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Failed to record 28-day break')
    },
  })

  const deleteCubeM = useMutation({
    mutationFn: (id: string) => qaApi.deleteCubeTest(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['qa-cubes'] })
      qc.invalidateQueries({ queryKey: ['qa-dash'] })
      toast.success('Cube record deleted.')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Failed to delete cube record')
    },
  })

  const clList   = checklists   ?? []
  const inspList = inspections  ?? []
  const ncrList  = ncrs         ?? []
  const cubeList = cubeTests    ?? []

  const todayStr = new Date().toISOString().split('T')[0]
  const cubesDue7d = cubeList.filter((c: any) => c.status === '7D_DUE' || (c.status === 'CAST' && c.dueDate7d <= todayStr)).length
  const cubesDue28d = cubeList.filter((c: any) => c.status === '28D_DUE' || (c.status === '7D_TESTED' && c.dueDate28d <= todayStr)).length
  const passedCubes = cubeList.filter((c: any) => c.status === 'PASSED').length
  const failedCubes = cubeList.filter((c: any) => c.status === 'FAILED').length
  const atRiskCubes = cubeList.filter((c: any) => c.status === 'AT_RISK').length
  const tested28Count = passedCubes + failedCubes
  const cubePassRate = tested28Count > 0 ? Math.round((passedCubes / tested28Count) * 100) + '%' : '—'

  function loadChecklist(clId: string) {
    const cl = clList.find((c: any) => c.id === clId)
    setSelectedCl(cl ?? null)
    setResponses({})
    setInspForm((f: any) => ({ ...f, checklistId: clId, workItem: cl?.workItem ?? f.workItem }))
  }

  function openBreakDialog(type: '7d' | '28d', cube: any) {
    const defaultLoads = type === '7d' && cube.loadsKn7d?.length
      ? cube.loadsKn7d.map(String)
      : type === '28d' && cube.loadsKn28d?.length
      ? cube.loadsKn28d.map(String)
      : ['', '', '']
    setBreakForm({
      loadsKn: defaultLoads,
      breakDate: new Date().toISOString().split('T')[0],
      technician: user?.name ?? '',
      notes: cube.notes ?? '',
    })
    setBreakModal({ open: true, type, cube })
  }

  const kpis = tab === 'cubes' ? [
    { label:'Total Cube Sets',   value: cubeList.length, color: C.blue },
    { label:'7-Day Tests Due',   value: cubesDue7d,      color: cubesDue7d > 0 ? C.amber : C.green },
    { label:'28-Day Tests Due',  value: cubesDue28d,     color: cubesDue28d > 0 ? C.amber : C.green },
    { label:'At Risk (< fck)',   value: atRiskCubes,     color: atRiskCubes > 0 ? C.red : C.green },
    { label:'28D Pass Rate',     value: cubePassRate,    color: failedCubes > 0 ? C.red : C.green },
  ] : [
    { label:'Total Inspections', value: dash?.totalInspections ?? 0, color: C.blue },
    { label:'Passed',            value: dash?.passed ?? 0,           color: C.green },
    { label:'Failed',            value: dash?.failed ?? 0,           color: C.red },
    { label:'Pass Rate',         value: (dash?.passRate ?? '0')+'%', color: C.green },
    { label:'Open NCRs',         value: dash?.openNcrs ?? 0,         color: (dash?.openNcrs ?? 0) > 0 ? C.red : C.green },
  ]

  return (
    <div className="fade-in" style={{ display:'flex', flexDirection:'column', gap:24 }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:800, color:C.text1, margin:0, letterSpacing:'-0.02em' }}>Quality Assurance</h1>
          <p style={{ fontSize:14, color:C.text3, marginTop:4 }}>Clause 33 — Inspections · Checklists · Concrete Cube Tests · NCRs</p>
        </div>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
          {clList.length === 0 && (
            <Button variant="secondary" size="md" loading={seedM.isPending} onClick={() => seedM.mutate()}>Load QA Checklists</Button>
          )}
          <Button variant="secondary" size="md" icon={<Cube size={15}/>} onClick={() => setShowCubeModal(true)}>Log Cube Set</Button>
          <Button variant="secondary" size="md" icon={<Warning size={15}/>} onClick={() => setShowNcr(true)}>Raise NCR</Button>
          <Button variant="primary" size="md" icon={<Plus size={15}/>} onClick={() => setShowInsp(true)}>New Inspection</Button>
        </div>
      </div>

      {/* KPI cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(130px, 1fr))', gap:14 }}>
        {kpis.map(k => (
          <div key={k.label} style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:12, padding:'16px 18px', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize:10, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>{k.label}</div>
            <div style={{ fontSize:22, fontWeight:800, color:k.color, fontVariantNumeric:'tabular-nums' }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', borderBottom:'1.5px solid '+C.border, overflowX:'auto', WebkitOverflowScrolling:'touch' }}>
        {([
          ['inspections', 'Inspections ('+inspList.length+')'],
          ['checklists',  'Checklists ('+clList.length+')'],
          ['ncrs',        'NCRs ('+(dash?.totalNcrs ?? 0)+')'],
          ['cubes',       'Concrete Cubes ('+cubeList.length+')'],
        ] as const).map(([t, l]) => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding:'10px 20px', fontSize:13, fontWeight:600, border:'none', background:'none', cursor:'pointer',
            borderBottom: tab===t ? '2px solid '+C.blue : '2px solid transparent',
            color: tab===t ? C.blue : C.text3, marginBottom:-1, whiteSpace:'nowrap',
          }}>{l}</button>
        ))}
      </div>

      {/* Inspections */}
      {tab === 'inspections' && (
        <div style={{ background:C.card, borderRadius:16, border:'1.5px solid '+C.border, overflow:'hidden', boxShadow:'0 1px 6px rgba(0,0,0,0.05)' }}>
          {inspError ? <div style={{ padding: 16 }}><QueryBanner isError onRetry={() => refetchInsp()} /></div>
          : inspLoading ? <div style={{ display:'flex', justifyContent:'center', padding:40 }}><Spinner /></div>
          : inspList.length === 0 ? (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'56px 24px', gap:10 }}>
              <CheckSquare size={32} color={C.border} />
              <p style={{ fontSize:14, fontWeight:600, color:C.text3, margin:0 }}>No inspections yet</p>
              <Button variant="primary" size="sm" icon={<Plus size={13}/>} onClick={() => setShowInsp(true)}>Record first inspection</Button>
            </div>
          ) : (
            <div className="table-responsive" style={{ overflowX: 'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', minWidth:640 }}>
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
                        <td style={{ padding:'12px 16px', fontSize:12, color:C.text2, whiteSpace:'nowrap' }}>{formatDate(i.date)}</td>
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
            </div>
          )}
        </div>
      )}

      {/* Checklists */}
      {tab === 'checklists' && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(300px, 1fr))', gap:14 }}>
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
          {ncrError ? <div style={{ padding: 16 }}><QueryBanner isError onRetry={() => refetchNcr()} /></div>
          : ncrLoading ? <div style={{ display:'flex', justifyContent:'center', padding:40 }}><Spinner /></div>
          : ncrList.length === 0 ? (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'56px 24px', gap:10 }}>
              <Warning size={32} color={C.border} />
              <p style={{ fontSize:14, fontWeight:600, color:C.text3, margin:0 }}>No NCRs raised</p>
            </div>
          ) : (
            <div className="table-responsive" style={{ overflowX: 'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', minWidth:640 }}>
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
                        <td style={{ padding:'12px 16px', fontSize:12, color:C.text2, whiteSpace:'nowrap' }}>{formatDate(n.date)}</td>
                        <td style={{ padding:'12px 16px', fontSize:13, fontWeight:600, color:C.text1 }}>{n.workItem}</td>
                        <td style={{ padding:'12px 16px', fontSize:12, color:C.text2 }}>{n.location ?? '—'}</td>
                        <td style={{ padding:'12px 16px', fontSize:12, color:C.text2, maxWidth:200 }}>{n.description}</td>
                        <td style={{ padding:'12px 16px' }}>
                          <span style={{ display:'inline-flex', padding:'2px 8px', borderRadius:999, fontSize:10, fontWeight:700, background:sev.bg, color:sev.color, border:'1px solid '+sev.border }}>{n.severity}</span>
                        </td>
                        <td style={{ padding:'12px 16px' }}>
                          <span style={{ display:'inline-flex', padding:'3px 10px', borderRadius:999, fontSize:11, fontWeight:700, background:ss.bg, color:ss.color, border:'1.5px solid '+ss.border }}>{n.status}</span>
                        </td>
                        <td style={{ padding:'12px 16px', fontSize:12, color:C.text2 }}>{n.targetDate ? formatDate(n.targetDate) : '—'}</td>
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
            </div>
          )}
        </div>
      )}

      {/* Concrete Cubes Tab */}
      {tab === 'cubes' && (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10 }}>
            <div>
              <h2 style={{ fontSize:16, fontWeight:700, color:C.text1, margin:'0 0 2px' }}>
                IS 456 / IS 516 Concrete Cube Register
              </h2>
              <p style={{ fontSize:12, color:C.text3, margin:0 }}>
                150mm Cube Compressive Strength Tests · IS 456 / ACI 209R 28-Day Strength Projections
              </p>
            </div>
            <Button variant="primary" size="sm" icon={<Plus size={14}/>} onClick={() => setShowCubeModal(true)}>
              + Cast New Cube Set
            </Button>
          </div>

          <div style={{ background:C.card, borderRadius:16, border:'1.5px solid '+C.border, overflow:'hidden', boxShadow:'0 1px 6px rgba(0,0,0,0.05)' }}>
            {cubeError ? <div style={{ padding: 16 }}><QueryBanner isError onRetry={() => refetchCubes()} /></div>
            : cubeLoading ? <div style={{ display:'flex', justifyContent:'center', padding:40 }}><Spinner /></div>
            : cubeList.length === 0 ? (
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'56px 24px', gap:10 }}>
                <Cube size={36} color={C.border} />
                <p style={{ fontSize:14, fontWeight:600, color:C.text3, margin:0 }}>No concrete cube sets logged yet</p>
                <p style={{ fontSize:12, color:'#94a3b8', margin:0 }}>Record 150mm cube casting details and track 7d/28d breaks</p>
                <Button variant="primary" size="sm" icon={<Plus size={13}/>} onClick={() => setShowCubeModal(true)}>Log First Cube Set</Button>
              </div>
            ) : (
              <div className="table-responsive" style={{ overflowX: 'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', minWidth:980, fontSize:12 }}>
                  <thead>
                    <tr style={{ background:'#f8f9fc', borderBottom:'1.5px solid '+C.border }}>
                      {['Sample No & Date','Structure & Location','Grade / Mix','7-Day Crushing (MPa)','Projected 28D (IS 456)','28-Day Crushing (MPa)','Status','Actions'].map(h => (
                        <th key={h} style={{ padding:'11px 16px', textAlign:'left', fontSize:10, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.06em', whiteSpace:'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {cubeList.map((c: any, idx: number) => {
                      const fck = Number(c.targetStrengthMpa || 25)
                      const actual7d = c.actual7dStrengthMpa != null ? Number(c.actual7dStrengthMpa) : null
                      const actual28d = c.actual28dStrengthMpa != null ? Number(c.actual28dStrengthMpa) : null
                      const proj28d = c.predicted28dStrengthMpa != null ? Number(c.predicted28dStrengthMpa) : null

                      let statusBadge = { bg:'#f8fafc', color:'#64748b', border:'#e2e8f0', label:'Curing (0-6d)' }
                      if (c.status === 'PASSED') {
                        statusBadge = { bg:'#ecfdf5', color:'#047857', border:'#a7f3d0', label:'✅ PASSED (28D)' }
                      } else if (c.status === 'FAILED') {
                        statusBadge = { bg:'#fef2f2', color:'#b91c1c', border:'#fecaca', label:'❌ FAILED (28D)' }
                      } else if (c.status === 'AT_RISK') {
                        statusBadge = { bg:'#fff1f2', color:'#e11d48', border:'#fecdd3', label:'⚠️ AT RISK (< fck)' }
                      } else if (c.status === '7D_TESTED') {
                        statusBadge = { bg:'#eff6ff', color:'#1d4ed8', border:'#bfdbfe', label:'7D Tested · On Track' }
                      } else if (c.status === '7D_DUE') {
                        statusBadge = { bg:'#fffbeb', color:'#b45309', border:'#fde68a', label:'7-Day Test Due' }
                      } else if (c.status === '28D_DUE') {
                        statusBadge = { bg:'#fffbeb', color:'#b45309', border:'#fde68a', label:'28-Day Test Due' }
                      }

                      return (
                        <tr key={c.id} style={{ borderBottom: idx < cubeList.length-1 ? '1px solid #f1f5f9' : 'none' }}>
                          <td style={{ padding:'12px 16px', whiteSpace:'nowrap' }}>
                            <div style={{ fontWeight:700, color:C.text1, fontFamily:'monospace', fontSize:13 }}>
                              {c.sampleNo || 'CUBE-'+c.id.slice(0,6)}
                            </div>
                            <div style={{ fontSize:11, color:C.text3, marginTop:2 }}>
                              Cast: {formatDate(c.castDate)}
                            </div>
                          </td>

                          <td style={{ padding:'12px 16px' }}>
                            <div style={{ fontWeight:600, color:C.text1 }}>{c.structure}</div>
                            <div style={{ fontSize:11, color:C.text3 }}>{c.location || '—'}</div>
                          </td>

                          <td style={{ padding:'12px 16px' }}>
                            <span style={{ fontWeight:800, color:C.blue, background:'#eff6ff', padding:'2px 8px', borderRadius:6, border:'1px solid #bfdbfe' }}>
                              {c.grade} ({fck} MPa)
                            </span>
                            <div style={{ fontSize:10, color:C.text3, marginTop:4 }}>
                              {c.cementBrand} · {c.cementType} · w/c: {c.waterCementRatio}
                            </div>
                          </td>

                          <td style={{ padding:'12px 16px' }}>
                            {actual7d != null ? (
                              <div>
                                <span style={{ fontWeight:700, fontSize:13, color: actual7d >= fck * 0.65 ? C.green : C.amber }}>
                                  {actual7d.toFixed(1)} MPa
                                </span>
                                <div style={{ fontSize:10, color:C.text3 }}>
                                  Loads: {c.loadsKn7d?.join(', ')} kN
                                </div>
                              </div>
                            ) : (
                              <div>
                                <span style={{ fontSize:11, color:C.text3 }}>Due: {formatDate(c.dueDate7d)}</span>
                                <button onClick={() => openBreakDialog('7d', c)}
                                  style={{ display:'block', marginTop:4, padding:'2px 8px', fontSize:10, fontWeight:700, color:C.blue, background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:5, cursor:'pointer' }}>
                                  + Record 7D
                                </button>
                              </div>
                            )}
                          </td>

                          <td style={{ padding:'12px 16px' }}>
                            {proj28d != null ? (
                              <div>
                                <span style={{ fontWeight:800, fontSize:13, color: proj28d >= fck ? C.green : C.red }}>
                                  {proj28d.toFixed(1)} MPa
                                </span>
                                <div style={{ fontSize:10, color: proj28d >= fck ? C.green : C.red }}>
                                  {proj28d >= fck ? `+${(proj28d - fck).toFixed(1)} above fck` : `${(proj28d - fck).toFixed(1)} deficit`}
                                </div>
                              </div>
                            ) : (
                              <span style={{ fontSize:11, color:C.text3 }}>Awaiting 7d</span>
                            )}
                          </td>

                          <td style={{ padding:'12px 16px' }}>
                            {actual28d != null ? (
                              <div>
                                <span style={{ fontWeight:800, fontSize:13, color: actual28d >= fck ? C.green : C.red }}>
                                  {actual28d.toFixed(1)} MPa
                                </span>
                                <div style={{ fontSize:10, color:C.text3 }}>
                                  Loads: {c.loadsKn28d?.join(', ')} kN
                                </div>
                              </div>
                            ) : (
                              <div>
                                <span style={{ fontSize:11, color:C.text3 }}>Due: {formatDate(c.dueDate28d)}</span>
                                <button onClick={() => openBreakDialog('28d', c)}
                                  style={{ display:'block', marginTop:4, padding:'2px 8px', fontSize:10, fontWeight:700, color: actual7d != null ? C.blue : C.text3, background: actual7d != null ? '#eff6ff' : '#f1f5f9', border:'1px solid ' + (actual7d != null ? '#bfdbfe' : '#e2e8f0'), borderRadius:5, cursor:'pointer' }}>
                                  + Record 28D
                                </button>
                              </div>
                            )}
                          </td>

                          <td style={{ padding:'12px 16px' }}>
                            <span style={{ display:'inline-flex', padding:'3px 10px', borderRadius:999, fontSize:11, fontWeight:700, background:statusBadge.bg, color:statusBadge.color, border:'1.5px solid '+statusBadge.border }}>
                              {statusBadge.label}
                            </span>
                          </td>

                          <td style={{ padding:'12px 16px' }}>
                            <button onClick={() => { if (confirm('Delete cube set record?')) deleteCubeM.mutate(c.id) }}
                              style={{ padding:'4px 8px', fontSize:11, color:C.red, background:'none', border:'1px solid #fecaca', borderRadius:6, cursor:'pointer' }}>
                              <Trash size={12}/>
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
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

      {/* Log Cube Set Modal */}
      <Modal open={showCubeModal} onClose={() => setShowCubeModal(false)} title="Log Concrete Cube Set (IS 456 / IS 516)" width={680}
        footer={<>
          <Button variant="ghost" onClick={() => setShowCubeModal(false)}>Cancel</Button>
          <Button variant="primary" loading={createCubeM.isPending}
            onClick={() => {
              if (!cubeForm.structure) { toast.error('Please specify Structure/Member name'); return }
              createCubeM.mutate({
                ...cubeForm,
                targetStrengthMpa: GRADE_FCK[cubeForm.grade] || 25,
                waterCementRatio: Number(cubeForm.waterCementRatio) || 0.45,
                slumpMm: Number(cubeForm.slumpMm) || 100,
                cubeCount: Number(cubeForm.cubeCount) || 6,
              })
            }}>
            Save Cube Set
          </Button>
        </>}>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ padding:'10px 14px', background:'#eff6ff', border:'1.5px solid #bfdbfe', borderRadius:8, fontSize:12, color:'#1e40af' }}>
            Per IS 456 Clause 15.2: Minimum 3 specimens for 7-day test and 3 specimens for 28-day test (6 cubes total). 7-day tests are evaluated for early rate-of-gain and 28-day projection.
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
            <Input label="Date Cast *" type="date" value={cubeForm.castDate} onChange={e => setCubeForm(f => ({ ...f, castDate: e.target.value }))} />
            <Input label="Sample / Cube ID" placeholder="e.g. CUB-2026-042" value={cubeForm.sampleNo} onChange={e => setCubeForm(f => ({ ...f, sampleNo: e.target.value }))} />
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:5 }}>Concrete Grade *</label>
              <select value={cubeForm.grade} onChange={e => setCubeForm(f => ({ ...f, grade: e.target.value, targetStrengthMpa: GRADE_FCK[e.target.value] || 25 }))}
                style={{ width:'100%', padding:'9px 13px', background:'#fff', border:'1.5px solid #d1d5db', borderRadius:8, fontSize:13, color:'#111827', outline:'none' }}>
                {CONCRETE_GRADES.map(g => (
                  <option key={g} value={g}>{g} ({GRADE_FCK[g]} MPa)</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Input label="Structure / Member *" placeholder="e.g. Wet Well Raft Bay-2" value={cubeForm.structure} onChange={e => setCubeForm(f => ({ ...f, structure: e.target.value }))} />
            <Input label="Location / Chainage" placeholder="e.g. Habak IPS, Ch 0+150" value={cubeForm.location} onChange={e => setCubeForm(f => ({ ...f, location: e.target.value }))} />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
            <Input label="Cement Brand" placeholder="UltraTech / ACC / Khyber" value={cubeForm.cementBrand} onChange={e => setCubeForm(f => ({ ...f, cementBrand: e.target.value }))} />
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:5 }}>Cement Type</label>
              <select value={cubeForm.cementType} onChange={e => setCubeForm(f => ({ ...f, cementType: e.target.value }))}
                style={{ width:'100%', padding:'9px 13px', background:'#fff', border:'1.5px solid #d1d5db', borderRadius:8, fontSize:13, color:'#111827', outline:'none' }}>
                <option value="OPC_43">OPC 43</option>
                <option value="OPC_53">OPC 53</option>
                <option value="PPC">PPC (Fly-ash blend)</option>
              </select>
            </div>
            <Input label="w/c Ratio" type="number" step="0.01" value={cubeForm.waterCementRatio} onChange={e => setCubeForm(f => ({ ...f, waterCementRatio: e.target.value }))} />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
            <Input label="Slump (mm)" type="number" value={cubeForm.slumpMm} onChange={e => setCubeForm(f => ({ ...f, slumpMm: e.target.value }))} />
            <Input label="Supplier / Batch No." placeholder="e.g. RMC Batch #104" value={cubeForm.supplierBatch} onChange={e => setCubeForm(f => ({ ...f, supplierBatch: e.target.value }))} />
            <Input label="Cast By / Tech" value={cubeForm.castBy} onChange={e => setCubeForm(f => ({ ...f, castBy: e.target.value }))} />
          </div>
        </div>
      </Modal>

      {/* Break Crushing Modal */}
      <Modal open={breakModal.open} onClose={() => setBreakModal({ open: false, type: '7d', cube: null })}
        title={`Record ${breakModal.type === '7d' ? '7-Day' : '28-Day'} Crushing Loads (IS 516)`} width={620}
        footer={<>
          <Button variant="ghost" onClick={() => setBreakModal({ open: false, type: '7d', cube: null })}>Cancel</Button>
          <Button variant="primary"
            loading={breakModal.type === '7d' ? record7dM.isPending : record28dM.isPending}
            onClick={() => {
              const loads = breakForm.loadsKn.map(v => Number(v)).filter(v => !isNaN(v) && v > 0)
              if (loads.length !== 3) {
                toast.error('Please enter all 3 crushing loads in kN')
                return
              }
              const payload = {
                loadsKn: loads,
                breakDate: breakForm.breakDate,
                technician: breakForm.technician,
                notes: breakForm.notes,
              }
              if (breakModal.type === '7d') {
                record7dM.mutate({ id: breakModal.cube.id, d: payload })
              } else {
                record28dM.mutate({ id: breakModal.cube.id, d: payload })
              }
            }}>
            Save Crushing Results
          </Button>
        </>}>
        {breakModal.cube && (() => {
          const c = breakModal.cube
          const fck = Number(c.targetStrengthMpa || 25)
          const l1 = Number(breakForm.loadsKn[0]) || 0
          const l2 = Number(breakForm.loadsKn[1]) || 0
          const l3 = Number(breakForm.loadsKn[2]) || 0
          const s1 = l1 > 0 ? l1 / 22.5 : null
          const s2 = l2 > 0 ? l2 / 22.5 : null
          const s3 = l3 > 0 ? l3 / 22.5 : null
          const validStrengths = [s1, s2, s3].filter((s): s is number => s !== null)
          const avgMpa = validStrengths.length > 0 ? validStrengths.reduce((a, b) => a + b, 0) / validStrengths.length : 0

          // Outlier check (IS 456: individual results shall not deviate by > 15% from avg)
          const hasOutlier = validStrengths.length === 3 && validStrengths.some(s => Math.abs(s - avgMpa) / avgMpa > 0.15)

          // 7-day projected 28d strength using ACI / IS empirical ratio (OPC ~ 0.67 at 7d)
          const cementType = c.cementType || 'OPC_43'
          const ratio7d = cementType === 'PPC' ? 0.60 : cementType === 'OPC_53' ? 0.70 : 0.67
          const projected28d = avgMpa > 0 ? avgMpa / ratio7d : 0

          return (
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div style={{ padding:'12px 16px', background:'#f8fafc', border:'1.5px solid #e2e8f0', borderRadius:10, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <div style={{ fontSize:14, fontWeight:700, color:C.text1 }}>{c.structure} ({c.sampleNo || 'Cube'})</div>
                  <div style={{ fontSize:12, color:C.text3 }}>Target Grade: <strong style={{ color:C.blue }}>{c.grade} ({fck} MPa)</strong> · Cast: {formatDate(c.castDate)}</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <span style={{ fontSize:11, padding:'3px 8px', borderRadius:6, background:'#eff6ff', color:C.blue, fontWeight:700 }}>
                    150 × 150 mm (Area = 22,500 mm²)
                  </span>
                </div>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <Input label="Testing Date" type="date" value={breakForm.breakDate} onChange={e => setBreakForm(f => ({ ...f, breakDate: e.target.value }))} />
                <Input label="Tested By / Technician" value={breakForm.technician} onChange={e => setBreakForm(f => ({ ...f, technician: e.target.value }))} />
              </div>

              <div>
                <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:6 }}>
                  Compressive Crushing Loads from CTM (in kN) *
                </label>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
                  {[0, 1, 2].map(idx => (
                    <div key={idx}>
                      <Input
                        label={`Cube #${idx + 1} Load (kN)`}
                        type="number"
                        placeholder="e.g. 450"
                        value={breakForm.loadsKn[idx]}
                        onChange={e => {
                          const val = e.target.value
                          setBreakForm(f => {
                            const newLoads = [...f.loadsKn]
                            newLoads[idx] = val
                            return { ...f, loadsKn: newLoads }
                          })
                        }}
                      />
                      {Number(breakForm.loadsKn[idx]) > 0 && (
                        <span style={{ fontSize:11, color:C.text3, marginTop:2, display:'block' }}>
                          = {(Number(breakForm.loadsKn[idx]) / 22.5).toFixed(2)} MPa
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Real-time Math Summary Card */}
              {validStrengths.length > 0 && (
                <div style={{ padding:'14px 16px', background: hasOutlier ? '#fff1f2' : '#f0fdf4', border:`1.5px solid ${hasOutlier ? '#fecdd3' : '#bbf7d0'}`, borderRadius:10 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
                    <span style={{ fontSize:13, fontWeight:600, color:C.text1 }}>
                      Calculated Average Strength:
                    </span>
                    <span style={{ fontSize:20, fontWeight:800, color: hasOutlier ? C.red : C.green, fontFamily:'monospace' }}>
                      {avgMpa.toFixed(2)} MPa
                    </span>
                  </div>

                  {hasOutlier && (
                    <p style={{ fontSize:11, color:C.red, margin:'6px 0 0', fontWeight:600 }}>
                      ⚠️ Outlier Warning: One or more specimens vary by &gt; 15% from average (IS 456 Annex B check).
                    </p>
                  )}

                  {breakModal.type === '7d' && avgMpa > 0 && (
                    <div style={{ marginTop:10, paddingTop:10, borderTop:'1px solid #dcfce7', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <div>
                        <div style={{ fontSize:12, fontWeight:700, color:C.text1 }}>
                          Projected 28-Day Strength (IS 456 / ACI 209R):
                        </div>
                        <div style={{ fontSize:11, color:C.text3 }}>
                          Based on {c.cementType || 'OPC'} empirical curing curve (7d ≈ {(ratio7d * 100).toFixed(0)}% of 28d)
                        </div>
                      </div>
                      <div style={{ textAlign:'right' }}>
                        <span style={{ fontSize:18, fontWeight:800, color: projected28d >= fck ? C.green : C.red, fontFamily:'monospace' }}>
                          {projected28d.toFixed(1)} MPa
                        </span>
                        <div style={{ fontSize:11, fontWeight:700, color: projected28d >= fck ? C.green : C.red }}>
                          {projected28d >= fck ? `✅ Meets Target (${fck} MPa)` : `⚠️ Deficit vs ${fck} MPa`}
                        </div>
                      </div>
                    </div>
                  )}

                  {breakModal.type === '28d' && avgMpa > 0 && (
                    <div style={{ marginTop:10, paddingTop:10, borderTop:'1px solid #dcfce7', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <div style={{ fontSize:12, fontWeight:700, color:C.text1 }}>
                        IS 456 Clause 16 Acceptance Check:
                      </div>
                      <span style={{ fontSize:13, fontWeight:800, color: avgMpa >= fck ? C.green : C.red }}>
                        {avgMpa >= fck ? `✅ PASSED (≥ ${fck} MPa)` : `❌ FAILED (< ${fck} MPa)`}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:5 }}>Remarks / Failure Mode</label>
                <textarea
                  value={breakForm.notes}
                  onChange={e => setBreakForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="e.g. Normal semi-explosive conical failure. Surface dry before test."
                  rows={2}
                  style={{ width:'100%', padding:'8px 12px', background:'#fff', border:'1.5px solid #d1d5db', borderRadius:8, fontSize:12, outline:'none' }}
                />
              </div>
            </div>
          )
        })()}
      </Modal>
    </div>
  )
}
