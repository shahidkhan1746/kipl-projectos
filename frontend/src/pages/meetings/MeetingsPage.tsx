import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Users, CheckSquare, Warning, BookOpen } from '@phosphor-icons/react'
import { meetingsApi } from '@/api/meetings.api'
import api from '@/api/client'
import { useAuthStore } from '@/store/auth.store'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'
import { Sparkle } from '@phosphor-icons/react'
import { aiApi } from '@/api/ai.api'
import { toast } from '@/lib/notify'

const C = {
  card:'#fff', border:'#e2e8f0', text1:'#0f172a', text2:'#475569', text3:'#94a3b8',
  blue:'#2563eb', green:'#059669', amber:'#d97706', red:'#dc2626', navy:'#1a2540',
}

const MEETING_TYPES = [
  { value:'site_progress',  label:'Site Progress Meeting' },
  { value:'coordination',   label:'Coordination Meeting' },
  { value:'safety',         label:'Safety Meeting' },
  { value:'design_review',  label:'Design Review' },
  { value:'quality',        label:'Quality Review' },
  { value:'client_ueed',    label:'Client / UEED Meeting' },
  { value:'lcma',           label:'LCMA Meeting' },
  { value:'internal',       label:'Internal Meeting' },
]

const TYPE_COLORS: Record<string,string> = {
  site_progress:'#2563eb', coordination:'#7c3aed', safety:'#dc2626',
  design_review:'#0891b2', quality:'#059669', client_ueed:'#d97706',
  lcma:'#be185d', internal:'#64748b',
}

const SS: Record<string,any> = {
  draft:      { bg:'#f8fafc', color:'#64748b', border:'#e2e8f0' },
  circulated: { bg:'#eff6ff', color:'#1d4ed8', border:'#bfdbfe' },
  confirmed:  { bg:'#ecfdf5', color:'#047857', border:'#a7f3d0' },
}

const ORGS = ['KIPL','J&K UEED','AMRUT','MoHUA','LCMA','PMC / Consultant','World Bank','ADB','IIT Jammu','NIT Srinagar','DIQC','SMC','PWD','Other']

type Tab = 'meetings' | 'actions'

const BLANK_MEETING = {
  title: '', type: 'site_progress', date: new Date().toISOString().split('T')[0],
  time: '10:00', venue: 'Site Office, Nishat',
  chairedBy: '', minutedBy: '',
  attendees: [{ name:'', organisation:'KIPL', designation:'' }],
  agendaItems: [{ item:'', discussion:'', decision:'', responsible:'', dueDate:'' }],
  actionItems: [] as any[],
  nextMeetingDate: '', nextMeetingVenue: '', remarks: '',
}

export default function MeetingsPage() {
  const { activeProjectId, user } = useAuthStore()
  const qc = useQueryClient()
  const [tab, setTab]         = useState<Tab>('meetings')
  const [showNew, setShowNew] = useState(false)
  const [viewMom, setViewMom] = useState<any>(null)
  const [form, setForm]       = useState<any>({ ...BLANK_MEETING, minutedBy: user?.name ?? '' })
  const [step, setStep]       = useState<'details'|'attendees'|'agenda'|'actions'>('details')
  const [typeFilter, setType] = useState('')

  // Staff/engineer names from the DB → suggestions for attendees & chair
  const { data: staff = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => api.get('/api/v1/users').then(r => r.data),
  })
  const peopleNames: string[] = (staff ?? []).map((u: any) => u.name).filter(Boolean)

  const { data: dash } = useQuery({
    queryKey: ['meet-dash', activeProjectId],
    queryFn:  () => meetingsApi.dashboard(activeProjectId!).then(r => r.data),
    enabled:  !!activeProjectId,
  })

  const { data: meetings, isLoading } = useQuery({
    queryKey: ['meetings', activeProjectId, typeFilter],
    queryFn:  () => meetingsApi.list({ projectId: activeProjectId, type: typeFilter || undefined }).then(r => r.data),
    enabled:  !!activeProjectId,
  })

  const createM = useMutation({
    mutationFn: () => {
      let finalRemarks = form.remarks || '';
      if (aiNotes.trim() && !finalRemarks.includes(aiNotes.trim())) {
        finalRemarks = finalRemarks ? finalRemarks + '\n\n[Original Notes]\n' + aiNotes : '[Original Notes]\n' + aiNotes;
      }
      return meetingsApi.create({ ...form, remarks: finalRemarks, projectId: activeProjectId });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meetings'] })
      qc.invalidateQueries({ queryKey: ['meet-dash'] })
      setShowNew(false)
      setForm({ ...BLANK_MEETING, minutedBy: user?.name ?? '' })
      setStep('details')
    },
  })

  const circulateM = useMutation({
    mutationFn: (id: string) => meetingsApi.circulate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meetings'] }),
  })

  const confirmM = useMutation({
    mutationFn: (id: string) => meetingsApi.confirm(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meetings'] }),
  })

  const closeActionM = useMutation({
    mutationFn: ({ id, idx }: any) => meetingsApi.updateAction(id, idx, { status: 'closed' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meetings'] })
      if (viewMom) meetingsApi.getOne(viewMom.id).then(r => setViewMom(r.data))
    },
  })

  const setF = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))

  const [aiNotes, setAiNotes] = useState('')
  const [aiBusy, setAiBusy]   = useState(false)

  async function generateMinutes() {
    if (!aiNotes.trim()) { toast.error('Paste your rough meeting notes first'); return }
    setAiBusy(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      const attendees = (form.attendees ?? [])
        .filter((a: any) => (a.name ?? '').trim())
        .map((a: any) => `${a.name}${a.organisation ? ' (' + a.organisation + ')' : ''}`).join(', ')
      const system = 'You are a construction-project secretary drafting formal Minutes of Meeting for the Dal Lake Sewerage Scheme (38.5 MLD STP, KIPL / J&K UEED). Convert rough notes into structured minutes. Return ONLY valid JSON (no markdown, no code fences, no commentary) matching exactly this shape:\n{"agendaItems":[{"item":"short heading","discussion":"what was discussed","decision":"decision/resolution or empty","responsible":"person or empty","dueDate":"YYYY-MM-DD or empty"}],"actionItems":[{"action":"task","responsible":"person or empty","dueDate":"YYYY-MM-DD or empty"}],"remarks":"any general remarks or empty"}\nRules: do NOT invent facts, names, dates or decisions not present in the notes; leave fields empty when unknown; keep language concise and professional; every distinct topic becomes one agendaItem; every follow-up task becomes one actionItem.'
      const prompt = `Meeting: ${form.title || 'Coordination meeting'}\nType: ${MEETING_TYPES.find(t => t.value === form.type)?.label || form.type}\nDate: ${form.date || today}   Venue: ${form.venue || ''}\nChaired by: ${form.chairedBy || '-'}\nAttendees: ${attendees || '-'}\n\nRough notes:\n${aiNotes}\n\nReturn the structured minutes JSON.`
      const r = await aiApi.generate(prompt, system)
      const raw = (r.data?.text ?? '').trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
      let parsed: any = null
      try {
        const s = raw.indexOf('{'), e = raw.lastIndexOf('}')
        parsed = JSON.parse(s >= 0 && e > s ? raw.slice(s, e + 1) : raw)
      } catch { /* fall through */ }
      if (parsed && (Array.isArray(parsed.agendaItems) || Array.isArray(parsed.actionItems))) {
        const agenda = (parsed.agendaItems ?? []).map((a: any) => ({
          item: a.item ?? '', discussion: a.discussion ?? '', decision: a.decision ?? '',
          responsible: a.responsible ?? '', dueDate: a.dueDate ?? '',
        }))
        const actions = (parsed.actionItems ?? []).map((a: any) => ({
          action: a.action ?? '', responsible: a.responsible ?? '', dueDate: a.dueDate ?? '', status: 'open',
        }))
        setForm((f: any) => ({
          ...f,
          agendaItems: agenda.length ? agenda : f.agendaItems,
          actionItems: actions.length ? actions : f.actionItems,
          remarks: parsed.remarks ? (f.remarks ? f.remarks + '\n' + parsed.remarks : parsed.remarks) : f.remarks,
        }))
        toast.success(`Drafted ${agenda.length} agenda item(s) & ${actions.length} action(s) — review & edit`)
      } else {
        // Model didn't return clean JSON — keep the text so nothing is lost
        setF('remarks', (form.remarks ? form.remarks + '\n\n' : '') + raw)
        toast.info('Minutes drafted into Remarks — please split into items manually')
      }
    } catch (e: any) {
      toast.error('AI minutes failed: ' + (e?.response?.data?.message ?? e?.message))
    } finally { setAiBusy(false) }
  }

  function addAttendee()  { setF('attendees', [...form.attendees, { name:'', organisation:'KIPL', designation:'' }]) }
  function addAgenda()    { setF('agendaItems', [...form.agendaItems, { item:'', discussion:'', decision:'', responsible:'', dueDate:'' }]) }
  function addAction()    { setF('actionItems', [...form.actionItems, { action:'', responsible:'', dueDate:'', status:'open' }]) }

  function setAttendee(i: number, k: string, v: string) {
    setF('attendees', form.attendees.map((a: any, idx: number) => idx===i ? { ...a, [k]:v } : a))
  }
  function setAgenda(i: number, k: string, v: string) {
    setF('agendaItems', form.agendaItems.map((a: any, idx: number) => idx===i ? { ...a, [k]:v } : a))
  }
  function setAction(i: number, k: string, v: string) {
    setF('actionItems', form.actionItems.map((a: any, idx: number) => idx===i ? { ...a, [k]:v } : a))
  }

  const list = meetings ?? []

  // All action items from all meetings
  const allActions = list.flatMap((m: any) =>
    (m.actionItems ?? []).map((a: any, idx: number) => ({ ...a, meetingId: m.id, meetingNo: m.meetingNo, meetingDate: m.date, idx }))
  )
  const openActions    = allActions.filter((a: any) => a.status !== 'closed')
  const overdueActions = openActions.filter((a: any) => a.dueDate && new Date(a.dueDate) < new Date())

  const steps = ['details','attendees','agenda','actions'] as const
  const stepLabels = ['Meeting Details','Attendees','Agenda & Decisions','Action Items']

  return (
    <div className="fade-in" style={{ display:'flex', flexDirection:'column', gap:24 }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:800, color:C.text1, margin:0, letterSpacing:'-0.02em' }}>Meeting Minutes</h1>
          <p style={{ fontSize:14, color:C.text3, marginTop:4 }}>Clause 34 — Coordination Meetings · Action Items · MOM</p>
        </div>
        <Button variant="primary" size="md" icon={<Plus size={15}/>} onClick={() => { setShowNew(true); setStep('details') }}>
          New Meeting
        </Button>
      </div>

      {/* KPI cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
        {[
          { label:'Total Meetings',  value: dash?.totalMeetings ?? 0,   color: C.blue },
          { label:'This Month',      value: dash?.thisMonth ?? 0,        color: C.navy },
          { label:'Open Actions',    value: dash?.openActions ?? 0,      color: (dash?.openActions ?? 0) > 0 ? C.amber : C.green },
          { label:'Overdue Actions', value: dash?.overdueActions ?? 0,   color: (dash?.overdueActions ?? 0) > 0 ? C.red : C.green },
        ].map(k => (
          <div key={k.label} style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:12, padding:'16px 18px', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize:10, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>{k.label}</div>
            <div style={{ fontSize:24, fontWeight:800, color:k.color, fontVariantNumeric:'tabular-nums' }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', borderBottom:'1.5px solid '+C.border }}>
        {([['meetings','Meetings ('+list.length+')'],['actions','Open Actions ('+openActions.length+')']] as const).map(([t,l]) => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding:'10px 20px', fontSize:13, fontWeight:600, border:'none', background:'none', cursor:'pointer',
            borderBottom: tab===t ? '2px solid '+C.blue : '2px solid transparent',
            color: tab===t ? C.blue : C.text3, marginBottom:-1,
          }}>{l}</button>
        ))}
      </div>

      {/* Meetings list */}
      {tab === 'meetings' && (
        <div style={{ background:C.card, borderRadius:16, border:'1.5px solid '+C.border, overflow:'hidden', boxShadow:'0 1px 6px rgba(0,0,0,0.05)' }}>
          <div style={{ padding:'12px 20px', background:'#f8f9fc', borderBottom:'1.5px solid '+C.border, display:'flex', gap:10 }}>
            <select value={typeFilter} onChange={e => setType(e.target.value)}
              style={{ padding:'7px 12px', background:'#fff', border:'1.5px solid '+C.border, borderRadius:8, fontSize:12, color:C.text1, outline:'none', fontFamily:'inherit', cursor:'pointer' }}>
              <option value="">All Types</option>
              {MEETING_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          {isLoading ? <div style={{ display:'flex', justifyContent:'center', padding:40 }}><Spinner /></div>
          : list.length === 0 ? (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'56px 24px', gap:10 }}>
              <BookOpen size={32} color={C.border} />
              <p style={{ fontSize:14, fontWeight:600, color:C.text3, margin:0 }}>No meetings recorded yet</p>
              <Button variant="primary" size="sm" icon={<Plus size={13}/>} onClick={() => setShowNew(true)}>Record first meeting</Button>
            </div>
          ) : (
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'#f8f9fc', borderBottom:'1.5px solid '+C.border }}>
                  {['MOM No.','Date','Type','Title','Chaired By','Attendees','Actions','Status','Actions'].map(h => (
                    <th key={h} style={{ padding:'10px 16px', textAlign:'left', fontSize:10, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.06em', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {list.map((m: any, i: number) => {
                  const ss = SS[m.status] ?? SS.draft
                  const typeColor = TYPE_COLORS[m.type] ?? C.text3
                  const typeLabel = MEETING_TYPES.find(t => t.value === m.type)?.label ?? m.type
                  const openActs = (m.actionItems ?? []).filter((a: any) => a.status !== 'closed').length
                  return (
                    <tr key={m.id} style={{ borderBottom: i < list.length-1 ? '1px solid #f1f5f9' : 'none' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f8faff')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <td style={{ padding:'12px 16px', fontSize:12, fontWeight:700, color:C.blue, fontFamily:'monospace' }}>{m.meetingNo}</td>
                      <td style={{ padding:'12px 16px', fontSize:12, color:C.text2, whiteSpace:'nowrap' }}>
                        {new Date(m.date).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
                      </td>
                      <td style={{ padding:'12px 16px' }}>
                        <span style={{ fontSize:10, padding:'2px 8px', borderRadius:999, fontWeight:700, background:typeColor+'18', color:typeColor, border:'1px solid '+typeColor+'30' }}>{typeLabel}</span>
                      </td>
                      <td style={{ padding:'12px 16px', fontSize:13, fontWeight:600, color:C.text1, maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.title}</td>
                      <td style={{ padding:'12px 16px', fontSize:12, color:C.text2 }}>{m.chairedBy || '—'}</td>
                      <td style={{ padding:'12px 16px', fontSize:12, color:C.text2 }}>{m.attendees?.length ?? 0}</td>
                      <td style={{ padding:'12px 16px' }}>
                        {openActs > 0
                          ? <span style={{ fontSize:11, fontWeight:700, color:C.amber }}>{openActs} open</span>
                          : <span style={{ fontSize:11, color:C.green }}>✓ All closed</span>}
                      </td>
                      <td style={{ padding:'12px 16px' }}>
                        <span style={{ fontSize:10, padding:'2px 8px', borderRadius:999, fontWeight:700, background:ss.bg, color:ss.color, border:'1.5px solid '+ss.border }}>{m.status}</span>
                      </td>
                      <td style={{ padding:'12px 16px' }}>
                        <div style={{ display:'flex', gap:5 }}>
                          <button onClick={() => setViewMom(m)}
                            style={{ padding:'4px 8px', fontSize:10, color:C.text2, background:'none', border:'1.5px solid '+C.border, borderRadius:5, cursor:'pointer' }}>View</button>
                          {m.status === 'draft' && (
                            <button onClick={() => circulateM.mutate(m.id)}
                              style={{ padding:'4px 8px', fontSize:10, fontWeight:600, color:C.blue, background:'#eff6ff', border:'1.5px solid #bfdbfe', borderRadius:5, cursor:'pointer' }}>Circulate</button>
                          )}
                          {m.status === 'circulated' && (
                            <button onClick={() => confirmM.mutate(m.id)}
                              style={{ padding:'4px 8px', fontSize:10, fontWeight:600, color:'#047857', background:'#ecfdf5', border:'1.5px solid #a7f3d0', borderRadius:5, cursor:'pointer' }}>Confirm</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Open Actions tab */}
      {tab === 'actions' && (
        <div style={{ background:C.card, borderRadius:16, border:'1.5px solid '+C.border, overflow:'hidden', boxShadow:'0 1px 6px rgba(0,0,0,0.05)' }}>
          {openActions.length === 0 ? (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'56px 24px', gap:10 }}>
              <CheckSquare size={32} color={C.green} />
              <p style={{ fontSize:14, fontWeight:600, color:C.green, margin:0 }}>All action items closed!</p>
            </div>
          ) : (
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'#f8f9fc', borderBottom:'1.5px solid '+C.border }}>
                  {['MOM','Date','Action Item','Responsible','Due Date','Overdue','Action'].map(h => (
                    <th key={h} style={{ padding:'10px 16px', textAlign:'left', fontSize:10, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.06em', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {openActions.map((a: any, i: number) => {
                  const isOverdue = a.dueDate && new Date(a.dueDate) < new Date()
                  return (
                    <tr key={i} style={{ borderBottom: i < openActions.length-1 ? '1px solid #f1f5f9' : 'none', background: isOverdue ? '#fff5f5' : 'transparent' }}
                      onMouseEnter={e => (e.currentTarget.style.background = isOverdue ? '#fef2f2' : '#f8faff')}
                      onMouseLeave={e => (e.currentTarget.style.background = isOverdue ? '#fff5f5' : 'transparent')}>
                      <td style={{ padding:'12px 16px', fontSize:11, fontWeight:700, color:C.blue, fontFamily:'monospace' }}>{a.meetingNo}</td>
                      <td style={{ padding:'12px 16px', fontSize:12, color:C.text2, whiteSpace:'nowrap' }}>
                        {new Date(a.meetingDate).toLocaleDateString('en-IN', { day:'numeric', month:'short' })}
                      </td>
                      <td style={{ padding:'12px 16px', fontSize:13, color:C.text1, maxWidth:280 }}>{a.action}</td>
                      <td style={{ padding:'12px 16px', fontSize:12, fontWeight:600, color:C.text2 }}>{a.responsible}</td>
                      <td style={{ padding:'12px 16px', fontSize:12, color:isOverdue ? C.red : C.text2, fontWeight:isOverdue?700:400, whiteSpace:'nowrap' }}>{a.dueDate || '—'}</td>
                      <td style={{ padding:'12px 16px' }}>
                        {isOverdue
                          ? <span style={{ fontSize:10, fontWeight:700, color:C.red, background:'#fef2f2', padding:'2px 8px', borderRadius:999 }}>OVERDUE</span>
                          : <span style={{ fontSize:10, color:C.text3 }}>On track</span>}
                      </td>
                      <td style={{ padding:'12px 16px' }}>
                        <button onClick={() => closeActionM.mutate({ id: a.meetingId, idx: a.idx })}
                          style={{ padding:'4px 10px', fontSize:10, fontWeight:600, color:'#047857', background:'#ecfdf5', border:'1.5px solid #a7f3d0', borderRadius:5, cursor:'pointer' }}>
                          ✓ Close
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* New Meeting Modal — 4 step wizard */}
      <Modal open={showNew} onClose={() => { setShowNew(false); setStep('details') }} title="New Meeting Minutes" width={760}
        footer={<>
          <Button variant="ghost" onClick={() => { setShowNew(false); setStep('details') }}>Cancel</Button>
          <div style={{ display:'flex', gap:8 }}>
            {step !== 'details' && (
              <Button variant="secondary" onClick={() => setStep(steps[steps.indexOf(step)-1])}>← Back</Button>
            )}
            {step !== 'actions' ? (
              <Button variant="primary" onClick={() => setStep(steps[steps.indexOf(step)+1])}>Next →</Button>
            ) : (
              <Button variant="primary" loading={createM.isPending} onClick={() => createM.mutate()}>Save MOM</Button>
            )}
          </div>
        </>}>
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

          {/* Step tabs */}
          <div style={{ display:'flex', borderBottom:'1.5px solid '+C.border, marginBottom:4 }}>
            {steps.map((s, i) => (
              <button key={s} onClick={() => setStep(s)} style={{
                padding:'8px 14px', fontSize:12, fontWeight:600, border:'none', background:'none', cursor:'pointer',
                borderBottom: step===s ? '2px solid '+C.blue : '2px solid transparent',
                color: step===s ? C.blue : C.text3, marginBottom:-1,
              }}>{i+1}. {stepLabels[i]}</button>
            ))}
          </div>

          {/* Step 1: Meeting Details */}
          {step === 'details' && (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <Input label="Meeting Title *" value={form.title} onChange={e => setF('title', e.target.value)} placeholder="Monthly Site Progress Meeting — April 2026" />
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div>
                  <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:5 }}>Meeting Type</label>
                  <select value={form.type} onChange={e => setF('type', e.target.value)}
                    style={{ width:'100%', padding:'10px 13px', background:'#fff', border:'1.5px solid #d1d5db', borderRadius:8, fontSize:13, outline:'none', fontFamily:'inherit', cursor:'pointer' }}>
                    {MEETING_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <Input label="Date" type="date" value={form.date} onChange={e => setF('date', e.target.value)} />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <Input label="Time" type="time" value={form.time} onChange={e => setF('time', e.target.value)} />
                <Input label="Venue" value={form.venue} onChange={e => setF('venue', e.target.value)} placeholder="Site Office, Nishat" />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <Input label="Chaired By" list="meeting-people" value={form.chairedBy} onChange={e => setF('chairedBy', e.target.value)} placeholder="Select or type…" />
                <Input label="Minuted By" list="meeting-people" value={form.minutedBy} onChange={e => setF('minutedBy', e.target.value)} placeholder="Select or type…" />
              </div>
              <datalist id="meeting-people">{peopleNames.map(n => <option key={n} value={n} />)}</datalist>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <Input label="Next Meeting Date" type="date" value={form.nextMeetingDate} onChange={e => setF('nextMeetingDate', e.target.value)} />
                <Input label="Next Meeting Venue" value={form.nextMeetingVenue} onChange={e => setF('nextMeetingVenue', e.target.value)} />
              </div>
            </div>
          )}

          {/* Step 2: Attendees */}
          {step === 'attendees' && (
            <div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                <h3 style={{ fontSize:14, fontWeight:700, color:C.text1, margin:0 }}>Attendees ({form.attendees.length})</h3>
                <button onClick={addAttendee} style={{ fontSize:12, color:C.blue, background:'none', border:'none', cursor:'pointer', fontWeight:600 }}>+ Add person</button>
              </div>
              <div style={{ border:'1.5px solid '+C.border, borderRadius:10, overflow:'hidden' }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 140px 1fr 28px', gap:8, padding:'8px 12px', background:'#f8f9fc', borderBottom:'1px solid '+C.border }}>
                  {['Name','Organisation','Designation',''].map(h => (
                    <div key={h} style={{ fontSize:10, fontWeight:700, color:C.text3, textTransform:'uppercase' }}>{h}</div>
                  ))}
                </div>
                {form.attendees.map((a: any, i: number) => (
                  <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 140px 1fr 28px', gap:8, padding:'10px 12px', borderBottom: i < form.attendees.length-1 ? '1px solid #f1f5f9' : 'none', alignItems:'center', background: i%2===0?'#fff':'#fafafa' }}>
                    <input list="meeting-people" value={a.name} onChange={e => setAttendee(i,'name',e.target.value)} placeholder="Full name"
                      style={{ padding:'6px 8px', border:'1px solid #e2e8f0', borderRadius:6, fontSize:12, outline:'none', fontFamily:'inherit', width:'100%' }} />
                    <select value={a.organisation} onChange={e => setAttendee(i,'organisation',e.target.value)}
                      style={{ padding:'6px 8px', border:'1px solid #e2e8f0', borderRadius:6, fontSize:12, outline:'none', fontFamily:'inherit', cursor:'pointer', width:'100%' }}>
                      {ORGS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                    <input value={a.designation} onChange={e => setAttendee(i,'designation',e.target.value)} placeholder="Designation / Role"
                      style={{ padding:'6px 8px', border:'1px solid #e2e8f0', borderRadius:6, fontSize:12, outline:'none', fontFamily:'inherit', width:'100%' }} />
                    <button onClick={() => setF('attendees', form.attendees.filter((_: any, idx: number) => idx!==i))}
                      style={{ background:'none', border:'none', cursor:'pointer', color:'#94a3b8', fontSize:14 }}>✕</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Agenda & Decisions */}
          {step === 'agenda' && (
            <div>
              <div style={{ marginBottom:14, padding:'12px 14px', background:'#f5f3ff', border:'1.5px solid #ddd6fe', borderRadius:10 }}>
                <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:8 }}>
                  <Sparkle size={15} color="#7c3aed" weight="fill" />
                  <span style={{ fontSize:13, fontWeight:700, color:'#5b21b6' }}>Draft minutes from rough notes (AI)</span>
                </div>
                <textarea value={aiNotes} onChange={e => setAiNotes(e.target.value)} rows={3}
                  placeholder="Paste quick notes, e.g. 'Discussed STP civil progress — 60% done. UEED to release RA-3 by 20th. Safety: helmets short, Ravi to procure. Next review 25th.'"
                  style={{ width:'100%', padding:'9px 12px', background:'#fff', border:'1.5px solid #ddd6fe', borderRadius:8, fontSize:12.5, color:'#111827', outline:'none', fontFamily:'inherit', resize:'vertical', boxSizing:'border-box' }} />
                <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:8 }}>
                  <Button variant="primary" size="sm" icon={<Sparkle size={13} />} loading={aiBusy} onClick={generateMinutes}>Generate minutes</Button>
                  <span style={{ fontSize:11, color:'#7c3aed' }}>Fills the agenda &amp; action items below. AI can misread — review before saving.</span>
                </div>
              </div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                <h3 style={{ fontSize:14, fontWeight:700, color:C.text1, margin:0 }}>Agenda Items & Decisions</h3>
                <button onClick={addAgenda} style={{ fontSize:12, color:C.blue, background:'none', border:'none', cursor:'pointer', fontWeight:600 }}>+ Add item</button>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {form.agendaItems.map((a: any, i: number) => (
                  <div key={i} style={{ border:'1.5px solid '+C.border, borderRadius:10, padding:'14px 16px', background: i%2===0?'#fff':'#fafafa' }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                      <span style={{ fontSize:12, fontWeight:700, color:C.blue, background:'#eff6ff', padding:'2px 8px', borderRadius:999 }}>Item {i+1}</span>
                      <button onClick={() => setF('agendaItems', form.agendaItems.filter((_: any, idx: number) => idx!==i))}
                        style={{ background:'none', border:'none', cursor:'pointer', color:'#94a3b8', fontSize:14 }}>✕</button>
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                      <input value={a.item} onChange={e => setAgenda(i,'item',e.target.value)} placeholder="Agenda item heading"
                        style={{ padding:'8px 10px', border:'1px solid #e2e8f0', borderRadius:6, fontSize:13, outline:'none', fontFamily:'inherit', fontWeight:600 }} />
                      <textarea value={a.discussion} onChange={e => setAgenda(i,'discussion',e.target.value)} placeholder="Discussion summary..." rows={2}
                        style={{ padding:'8px 10px', border:'1px solid #e2e8f0', borderRadius:6, fontSize:12, outline:'none', fontFamily:'inherit', resize:'none', color:C.text2 }} />
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 120px', gap:8 }}>
                        <textarea value={a.decision} onChange={e => setAgenda(i,'decision',e.target.value)} placeholder="Decision / Resolution" rows={2}
                          style={{ padding:'8px 10px', border:'1.5px solid #a7f3d0', borderRadius:6, fontSize:12, outline:'none', fontFamily:'inherit', resize:'none', color:C.green }} />
                        <input value={a.responsible} onChange={e => setAgenda(i,'responsible',e.target.value)} placeholder="Responsible person"
                          style={{ padding:'8px 10px', border:'1px solid #e2e8f0', borderRadius:6, fontSize:12, outline:'none', fontFamily:'inherit' }} />
                        <input type="date" value={a.dueDate} onChange={e => setAgenda(i,'dueDate',e.target.value)}
                          style={{ padding:'8px 10px', border:'1px solid #e2e8f0', borderRadius:6, fontSize:12, outline:'none', fontFamily:'inherit' }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Action Items */}
          {step === 'actions' && (
            <div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                <h3 style={{ fontSize:14, fontWeight:700, color:C.text1, margin:0 }}>Action Items</h3>
                <button onClick={addAction} style={{ fontSize:12, color:C.blue, background:'none', border:'none', cursor:'pointer', fontWeight:600 }}>+ Add action</button>
              </div>
              <p style={{ fontSize:12, color:C.text3, margin:'0 0 12px' }}>Action items are tracked until closed. They appear in the Open Actions tab.</p>
              {form.actionItems.length === 0 ? (
                <div style={{ padding:'24px', textAlign:'center', border:'1.5px dashed '+C.border, borderRadius:10 }}>
                  <p style={{ fontSize:13, color:C.text3, margin:'0 0 8px' }}>No action items yet</p>
                  <button onClick={addAction} style={{ fontSize:12, color:C.blue, background:'#eff6ff', border:'1.5px solid #bfdbfe', borderRadius:7, padding:'6px 16px', cursor:'pointer', fontWeight:600 }}>Add action item</button>
                </div>
              ) : (
                <div style={{ border:'1.5px solid '+C.border, borderRadius:10, overflow:'hidden' }}>
                  {form.actionItems.map((a: any, i: number) => (
                    <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 160px 120px 28px', gap:8, padding:'10px 12px', borderBottom: i < form.actionItems.length-1 ? '1px solid #f1f5f9' : 'none', alignItems:'center', background: i%2===0?'#fff':'#fafafa' }}>
                      <input value={a.action} onChange={e => setAction(i,'action',e.target.value)} placeholder="Action item description"
                        style={{ padding:'6px 8px', border:'1px solid #e2e8f0', borderRadius:6, fontSize:12, outline:'none', fontFamily:'inherit', width:'100%' }} />
                      <input value={a.responsible} onChange={e => setAction(i,'responsible',e.target.value)} placeholder="Responsible"
                        style={{ padding:'6px 8px', border:'1px solid #e2e8f0', borderRadius:6, fontSize:12, outline:'none', fontFamily:'inherit', width:'100%' }} />
                      <input type="date" value={a.dueDate} onChange={e => setAction(i,'dueDate',e.target.value)}
                        style={{ padding:'6px 8px', border:'1px solid #e2e8f0', borderRadius:6, fontSize:12, outline:'none', fontFamily:'inherit', width:'100%' }} />
                      <button onClick={() => setF('actionItems', form.actionItems.filter((_: any, idx: number) => idx!==i))}
                        style={{ background:'none', border:'none', cursor:'pointer', color:'#94a3b8', fontSize:14 }}>✕</button>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ marginTop:14 }}>
                <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:5 }}>General Remarks</label>
                <textarea value={form.remarks} onChange={e => setF('remarks', e.target.value)} rows={2}
                  placeholder="Any other remarks or notes..."
                  style={{ width:'100%', padding:'9px 13px', background:'#fff', border:'1.5px solid #d1d5db', borderRadius:8, fontSize:13, color:'#111827', outline:'none', fontFamily:'inherit', resize:'none' }} />
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* View MOM Modal */}
      {viewMom && (
        <Modal open={!!viewMom} onClose={() => setViewMom(null)}
          title={viewMom.meetingNo + ' — ' + viewMom.title}
          width={700}
          footer={<>
            {viewMom.status === 'draft' && <Button variant="primary" size="sm" onClick={() => { circulateM.mutate(viewMom.id); setViewMom(null) }}>Circulate MOM</Button>}
            {viewMom.status === 'circulated' && <Button variant="success" size="sm" onClick={() => { confirmM.mutate(viewMom.id); setViewMom(null) }}>Confirm MOM</Button>}
            <Button variant="ghost" onClick={() => setViewMom(null)}>Close</Button>
          </>}>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            {/* Header info */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              {[
                ['Date', new Date(viewMom.date).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })],
                ['Time & Venue', (viewMom.time || '—') + ' | ' + (viewMom.venue || '—')],
                ['Chaired By', viewMom.chairedBy || '—'],
                ['Minuted By', viewMom.minutedBy || '—'],
              ].map(([l,v]) => (
                <div key={l} style={{ padding:'8px 12px', background:'#f8f9fc', borderRadius:8, border:'1px solid '+C.border }}>
                  <p style={{ fontSize:10, fontWeight:700, color:C.text3, textTransform:'uppercase', margin:'0 0 3px' }}>{l}</p>
                  <p style={{ fontSize:13, color:C.text1, margin:0, fontWeight:500 }}>{v}</p>
                </div>
              ))}
            </div>

            {/* Attendees */}
            {(viewMom.attendees ?? []).length > 0 && (
              <div>
                <h3 style={{ fontSize:13, fontWeight:700, color:C.text1, margin:'0 0 8px' }}>Attendees ({viewMom.attendees.length})</h3>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                  {viewMom.attendees.map((a: any, i: number) => (
                    <div key={i} style={{ padding:'4px 10px', background:'#f8f9fc', border:'1px solid '+C.border, borderRadius:999, fontSize:12 }}>
                      <strong>{a.name}</strong>{a.organisation ? ' — '+a.organisation : ''}{a.designation ? ' ('+a.designation+')' : ''}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Agenda */}
            {(viewMom.agendaItems ?? []).length > 0 && (
              <div>
                <h3 style={{ fontSize:13, fontWeight:700, color:C.text1, margin:'0 0 8px' }}>Agenda & Decisions</h3>
                {viewMom.agendaItems.map((a: any, i: number) => (
                  <div key={i} style={{ marginBottom:10, padding:'12px 14px', border:'1.5px solid '+C.border, borderRadius:8, background:i%2===0?'#fff':'#fafafa' }}>
                    <p style={{ fontSize:13, fontWeight:700, color:C.text1, margin:'0 0 6px' }}>{i+1}. {a.item}</p>
                    {a.discussion && <p style={{ fontSize:12, color:C.text2, margin:'0 0 6px', lineHeight:1.5 }}>{a.discussion}</p>}
                    {a.decision && (
                      <div style={{ padding:'6px 10px', background:'#ecfdf5', border:'1px solid #a7f3d0', borderRadius:6, fontSize:12, color:'#047857', fontWeight:600 }}>
                        Decision: {a.decision}
                      </div>
                    )}
                    {(a.responsible || a.dueDate) && (
                      <p style={{ fontSize:11, color:C.text3, margin:'6px 0 0' }}>
                        {a.responsible && 'Responsible: '+a.responsible}
                        {a.responsible && a.dueDate && ' | '}
                        {a.dueDate && 'Due: '+a.dueDate}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Action Items */}
            {(viewMom.actionItems ?? []).length > 0 && (
              <div>
                <h3 style={{ fontSize:13, fontWeight:700, color:C.text1, margin:'0 0 8px' }}>Action Items</h3>
                {viewMom.actionItems.map((a: any, i: number) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 12px', border:'1px solid '+C.border, borderRadius:7, marginBottom:6, background:a.status==='closed'?'#f0fdf4':'#fff' }}>
                    <div>
                      <p style={{ fontSize:13, color:a.status==='closed'?C.green:C.text1, margin:0, textDecoration:a.status==='closed'?'line-through':'none' }}>{a.action}</p>
                      <p style={{ fontSize:11, color:C.text3, margin:'3px 0 0' }}>{a.responsible}{a.dueDate?' | Due: '+a.dueDate:''}</p>
                    </div>
                    {a.status !== 'closed' && (
                      <button onClick={() => closeActionM.mutate({ id: viewMom.id, idx: i })}
                        style={{ padding:'4px 10px', fontSize:10, fontWeight:600, color:'#047857', background:'#ecfdf5', border:'1.5px solid #a7f3d0', borderRadius:5, cursor:'pointer', flexShrink:0 }}>
                        ✓ Close
                      </button>
                    )}
                    {a.status === 'closed' && <span style={{ fontSize:11, color:C.green, fontWeight:600, flexShrink:0 }}>✓ Closed</span>}
                  </div>
                ))}
              </div>
            )}

            {/* Remarks */}
            {viewMom.remarks && (
              <div>
                <h3 style={{ fontSize:13, fontWeight:700, color:C.text1, margin:'0 0 8px' }}>Remarks & Notes</h3>
                <div style={{ padding:'12px 14px', border:'1px solid '+C.border, borderRadius:8, background:'#f8f9fc' }}>
                  <p style={{ fontSize:13, color:C.text1, margin:0, whiteSpace:'pre-wrap', lineHeight:1.5 }}>
                    {viewMom.remarks}
                  </p>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
