import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Warning, CheckCircle, X, ArrowRight, CalendarBlank } from '@phosphor-icons/react'
import { settingsApi } from '@/api/settings.api'
import { useAuthStore } from '@/store/auth.store'

const C = {
  navy:'#1a2540', blue:'#2563eb', amber:'#d97706', green:'#059669',
  red:'#dc2626', border:'#e2e8f0', text1:'#0f172a', text2:'#475569', text3:'#94a3b8',
}

export interface PendingItem {
  key: string; label: string; question: string; source: string
  fieldType: 'text' | 'date' | 'yesno'; required: boolean
  plannedEndDate?: string   // for delay calculation
  plannedEndLabel?: string  // e.g. "Planned approval: 31-Jan-2026"
}

export const PENDING_ITEMS: PendingItem[] = [
  {
    key: 'project.contract_value', label: 'Contract Value',
    question: 'What is the exact contract value from LOI CE/UEED/PS/2287-91?',
    source: 'Source: LOI CE/UEED/PS/2287-91 (27-Sep-2025) — PBG confirmed at ₹13,99,95,000 (5% of contract value)',
    fieldType: 'text', required: true,
  },
  {
    key: 'project.agreement_execution_date', label: 'Agreement Execution Date',
    question: 'Has the formal agreement with UEED been executed? If yes, enter the actual execution date.',
    source: 'LOA issued 27-Sep-2025. Agreement should have been executed within 30 days. Ref: KIPL/UEED/Dal Lake/0032-25 (23-Dec-2025)',
    fieldType: 'yesno', required: true,
    plannedEndDate: '2025-10-27',
    plannedEndLabel: 'Agreement should have been executed by: 27-Oct-2025 (30 days from LOA)',
  },
  {
    key: 'project.land_demarcation_status', label: 'STP Site Demarcation (LCMA)',
    question: 'Has LCMA completed formal demarcation of STP site at Gupt Ganga, Ishber Nishat? If yes, enter the date demarcation was completed.',
    source: 'Allotment order: CE/UEED/PS/2929-42 (07-Nov-2025). Demarcation status unconfirmed.',
    fieldType: 'yesno', required: true,
    plannedEndDate: '2025-11-07',
    plannedEndLabel: 'Should have been completed with allotment order: 07-Nov-2025',
  },
  {
    key: 'project.tree_cutting_clearance_date', label: 'Tree Cutting Clearance Date',
    question: 'Was tree cutting clearance received from LCMA/Forest Dept? If yes, enter the exact date.',
    source: 'Master Letter Register shows: 12-Feb-2026. Source letter not yet verified. Requested: 22-Nov-2025.',
    fieldType: 'yesno', required: false,
    plannedEndDate: '2025-12-01',
    plannedEndLabel: 'Planned clearance: 01-Dec-2025 (10 days after 22-Nov-2025 request)',
  },
  {
    key: 'project.vsc_approval_status', label: 'VSC Ground Improvement Approval (KELLER)',
    question: 'Has UEED issued go-ahead for Vibro Stone Column ground improvement? If yes, enter the date go-ahead was received.',
    source: 'Requested 24-Mar-2026 (Ref: KIPL/UEED/DAL LAKE/48-26). Status unknown.',
    fieldType: 'yesno', required: true,
    plannedEndDate: '2026-01-01',
    plannedEndLabel: 'Should have been approved before STP civil works start: 01-Jan-2026',
  },
  {
    key: 'project.bep_approval_date', label: 'BEP Final Approval by UEED',
    question: 'Has UEED approved the Basic Engineering Package? If yes, enter the approval date.',
    source: 'BEP R1: 31-Jan-2026. R2: 25-Feb-2026. R3: 16-Mar-2026. Structural: 23-Mar-2026. Ref: 0044-26, 0046-26.',
    fieldType: 'yesno', required: true,
    plannedEndDate: '2026-02-28',
    plannedEndLabel: 'Planned BEP approval: 28-Feb-2026 (30 days after R1 submission)',
  },
  {
    key: 'project.loi_second_ref', label: 'Second LOI Details (CE/UEED/PS/2412-15)',
    question: 'Please provide the subject and key details of LOI ref CE/UEED/PS/2412-15 dated 07-Oct-2025.',
    source: 'Referenced in records but letter not yet shared for verification.',
    fieldType: 'text', required: false,
  },
]

// ── Delay calculator ──────────────────────────────────────────────────────────
function calcDelay(plannedEnd: string, actualDate: string): number {
  const p = new Date(plannedEnd)
  const a = new Date(actualDate)
  const diff = Math.floor((a.getTime() - p.getTime()) / (1000 * 60 * 60 * 24))
  return diff > 0 ? diff : 0
}

function formatDelay(days: number): string {
  if (days === 0) return '✅ On time or early'
  if (days <= 30)  return `⚠️ ${days} days delayed`
  if (days <= 90)  return `🔴 ${days} days delayed — EOT applicable`
  return `🔴 ${days} days delayed — Major EOT claim`
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useDataCompleteness() {
  const [pending, setPending] = useState<PendingItem[]>([])
  const [loading, setLoading] = useState(true)

  async function refresh() {
    setLoading(true)
    try {
      const incomplete: PendingItem[] = []
      for (const item of PENDING_ITEMS) {
        try {
          const res = await settingsApi.get(item.key)
          const val = res?.data?.value
          if (!val || val === 'pending' || val.trim() === '') incomplete.push(item)
        } catch { incomplete.push(item) }
      }
      setPending(incomplete)
    } finally { setLoading(false) }
  }

  useEffect(() => { refresh() }, [])
  return { pending, loading, refresh, total: PENDING_ITEMS.length }
}

// ── Modal ─────────────────────────────────────────────────────────────────────
export function DataCompletenessModal() {
  const { user }             = useAuthStore()
  const { pending, refresh } = useDataCompleteness()
  const [open, setOpen]      = useState(false)
  const [current, setCurrent]= useState(0)
  // values: { [key]: answer, [key+'_date']: date }
  const [values, setValues]  = useState<Record<string, string>>({})
  const [saving, setSaving]  = useState(false)

  useEffect(() => {
    const key = `data_modal_dismissed_${new Date().toDateString()}_${user?.id ?? ''}`
    const wasDismissed = sessionStorage.getItem(key) === 'true'
    if (!wasDismissed && pending.length > 0 && user) {
      const timer = setTimeout(() => setOpen(true), 1500)
      return () => clearTimeout(timer)
    }
  }, [pending.length, user])

  // Manual trigger from profile banner
  useEffect(() => {
    function handleForceOpen() {
      const key = `data_modal_dismissed_${new Date().toDateString()}_${user?.id ?? ''}`
      sessionStorage.removeItem(key)
      setCurrent(0)
      setOpen(true)
    }
    window.addEventListener('open-data-modal', handleForceOpen)
    return () => window.removeEventListener('open-data-modal', handleForceOpen)
  }, [user])

  async function saveItem(item: PendingItem) {
    const val     = values[item.key]
    const dateVal = values[item.key + '_date']
    if (!val?.trim()) return

    setSaving(true)
    try {
      // Save main value
      await settingsApi.set(item.key, val.trim())

      // If confirmed with a date, save date and calculate delay
      if (val === 'Yes — Confirmed' && dateVal && item.plannedEndDate) {
        const delayDays = calcDelay(item.plannedEndDate, dateVal)
        await settingsApi.set(item.key + '_actual_date', dateVal)
        await settingsApi.set(item.key + '_delay_days', String(delayDays))
      }

      await refresh()
      if (current < pending.length - 1) setCurrent(c => c + 1)
      else setOpen(false)
    } finally { setSaving(false) }
  }

  function dismiss() {
    const key = `data_modal_dismissed_${new Date().toDateString()}_${user?.id ?? ''}`
    sessionStorage.setItem(key, 'true')
    setOpen(false)
  }

  if (!open || pending.length === 0) return null
  const item = pending[current]
  if (!item) return null

  const answer   = values[item.key] ?? ''
  const dateVal  = values[item.key + '_date'] ?? ''
  const isYes    = answer === 'Yes — Confirmed'
  const delayDays = isYes && dateVal && item.plannedEndDate
    ? calcDelay(item.plannedEndDate, dateVal) : null
  const required = pending.filter(p => p.required).length

  // Can save when: has answer AND (if Yes, has date too)
  const canSave = answer.trim() && (item.fieldType !== 'yesno' || !isYes || !!dateVal)

  return createPortal(
    <div style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(15,23,42,0.6)',
      backdropFilter:'blur(4px)', display:'flex', alignItems:'center',
      justifyContent:'center', padding:20 }}>
      <div style={{ background:'#fff', borderRadius:20, width:'100%', maxWidth:540,
        boxShadow:'0 24px 80px rgba(0,0,0,0.2)', overflow:'hidden' }}>

        {/* Header */}
        <div style={{ background:C.navy, padding:'20px 24px',
          display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:40, height:40, borderRadius:10, background:'rgba(217,119,6,0.2)',
              display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Warning size={20} color='#fbbf24' weight='fill' />
            </div>
            <div>
              <p style={{ fontSize:15, fontWeight:800, color:'#fff', margin:0 }}>
                Incomplete Project Data
              </p>
              <p style={{ fontSize:12, color:'rgba(255,255,255,0.5)', margin:0 }}>
                {pending.length} item{pending.length !== 1 ? 's' : ''} need your confirmation
              </p>
            </div>
          </div>
          <button onClick={dismiss} style={{ background:'none', border:'none',
            cursor:'pointer', color:'rgba(255,255,255,0.4)', padding:4,
            display:'flex', alignItems:'center' }}>
            <X size={18} />
          </button>
        </div>

        {/* Progress bar */}
        <div style={{ height:3, background:'#f1f5f9' }}>
          <div style={{ height:'100%', background:C.amber, transition:'width 0.3s',
            width:`${(current / pending.length) * 100}%` }} />
        </div>

        {/* Body */}
        <div style={{ padding:'24px 24px 16px' }}>

          {/* Counter + badge */}
          <div style={{ display:'flex', alignItems:'center',
            justifyContent:'space-between', marginBottom:18 }}>
            <span style={{ fontSize:11, fontWeight:700, color:C.text3,
              textTransform:'uppercase', letterSpacing:'0.06em' }}>
              Item {current + 1} of {pending.length}
            </span>
            {required > 0 && (
              <span style={{ fontSize:10, padding:'2px 8px', borderRadius:99,
                background:'#fef2f2', color:C.red, fontWeight:700 }}>
                {required} Required
              </span>
            )}
          </div>

          {/* Question card */}
          <div style={{ background:'#f8fafc', borderRadius:12,
            padding:'16px 18px', marginBottom:16 }}>
            <p style={{ fontSize:14, fontWeight:700, color:C.text1,
              margin:'0 0 8px', lineHeight:1.5 }}>
              {item.label}
              {item.required && <span style={{ color:C.red }}> *</span>}
            </p>
            <p style={{ fontSize:13, color:C.text2, margin:'0 0 10px', lineHeight:1.6 }}>
              {item.question}
            </p>
            <p style={{ fontSize:11, color:C.text3, margin:0, fontStyle:'italic' }}>
              {item.source}
            </p>
          </div>

          {/* Input area */}
          {item.fieldType === 'yesno' ? (
            <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:8 }}>
              {/* Yes / No / Unknown buttons */}
              <div style={{ display:'flex', gap:10 }}>
                {['Yes — Confirmed', 'No — Still Pending', 'Unknown'].map(opt => (
                  <button key={opt}
                    onClick={() => setValues(v => ({ ...v, [item.key]: opt }))}
                    style={{ flex:1, padding:'10px 6px', borderRadius:10,
                      fontSize:12, fontWeight:600, cursor:'pointer',
                      border: answer === opt
                        ? `2px solid ${opt === 'Yes — Confirmed' ? C.green : opt === 'No — Still Pending' ? C.red : C.amber}`
                        : `1.5px solid ${C.border}`,
                      background: answer === opt
                        ? opt === 'Yes — Confirmed' ? '#f0fdf4' : opt === 'No — Still Pending' ? '#fef2f2' : '#fffbeb'
                        : '#fff',
                      color: answer === opt
                        ? opt === 'Yes — Confirmed' ? C.green : opt === 'No — Still Pending' ? C.red : C.amber
                        : C.text2 }}>
                    {opt}
                  </button>
                ))}
              </div>

              {/* Date field — only when Yes selected */}
              {isYes && (
                <div style={{ background:'#f0fdf4', border:`1.5px solid #bbf7d0`,
                  borderRadius:10, padding:'14px 16px' }}>
                  {item.plannedEndLabel && (
                    <p style={{ fontSize:11, color:C.green, fontWeight:600,
                      margin:'0 0 10px', display:'flex', alignItems:'center', gap:6 }}>
                      <CalendarBlank size={13} />
                      {item.plannedEndLabel}
                    </p>
                  )}
                  <label style={{ fontSize:12, fontWeight:600, color:C.text2,
                    display:'block', marginBottom:6 }}>
                    Actual completion / approval date *
                  </label>
                  <input type='date'
                    value={dateVal}
                    onChange={e => setValues(v => ({ ...v, [item.key + '_date']: e.target.value }))}
                    style={{ width:'100%', padding:'9px 12px',
                      border:`1.5px solid ${dateVal ? '#86efac' : C.border}`,
                      borderRadius:8, fontSize:13, outline:'none',
                      fontFamily:'inherit', boxSizing:'border-box' as any }} />

                  {/* Delay calculation */}
                  {delayDays !== null && dateVal && (
                    <div style={{ marginTop:10, padding:'8px 12px', borderRadius:8,
                      background: delayDays === 0 ? '#dcfce7' : delayDays <= 30 ? '#fffbeb' : '#fef2f2',
                      border: `1px solid ${delayDays === 0 ? '#86efac' : delayDays <= 30 ? '#fde68a' : '#fca5a5'}` }}>
                      <p style={{ fontSize:13, fontWeight:700, margin:0,
                        color: delayDays === 0 ? C.green : delayDays <= 30 ? C.amber : C.red }}>
                        {formatDelay(delayDays)}
                      </p>
                      {delayDays > 0 && (
                        <p style={{ fontSize:11, color:C.text3, margin:'4px 0 0' }}>
                          Will be recorded in delay register and linked to EOT claim
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : item.fieldType === 'date' ? (
            <input type='date' value={answer}
              onChange={e => setValues(v => ({ ...v, [item.key]: e.target.value }))}
              style={{ width:'100%', padding:'10px 14px', border:`1.5px solid ${C.border}`,
                borderRadius:10, fontSize:13, outline:'none', marginBottom:16,
                fontFamily:'inherit', boxSizing:'border-box' as any }} />
          ) : (
            <input type='text' value={answer} placeholder='Enter value...'
              onChange={e => setValues(v => ({ ...v, [item.key]: e.target.value }))}
              style={{ width:'100%', padding:'10px 14px', border:`1.5px solid ${C.border}`,
                borderRadius:10, fontSize:13, outline:'none', marginBottom:16,
                fontFamily:'inherit', boxSizing:'border-box' as any }} />
          )}

          {/* Footer actions */}
          <div style={{ display:'flex', gap:10, justifyContent:'space-between',
            alignItems:'center', marginTop:16 }}>
            <button onClick={dismiss}
              style={{ fontSize:12, color:C.text3, background:'none',
                border:'none', cursor:'pointer' }}>
              Remind me next login
            </button>
            <div style={{ display:'flex', gap:8 }}>
              {!item.required && (
                <button onClick={() => setCurrent(c => Math.min(c + 1, pending.length - 1))}
                  style={{ padding:'9px 16px', fontSize:12, color:C.text2,
                    background:'none', border:`1.5px solid ${C.border}`,
                    borderRadius:8, cursor:'pointer' }}>
                  Skip
                </button>
              )}
              <button onClick={() => saveItem(item)} disabled={saving || !canSave}
                style={{ padding:'9px 20px', fontSize:13, fontWeight:700, color:'#fff',
                  background: canSave ? C.blue : C.text3, border:'none',
                  borderRadius:8, cursor: canSave ? 'pointer' : 'not-allowed',
                  display:'flex', alignItems:'center', gap:6 }}>
                {saving ? 'Saving...' : current < pending.length - 1
                  ? <><span>Save & Next</span><ArrowRight size={14}/></>
                  : <><CheckCircle size={14}/><span>Complete</span></>}
              </button>
            </div>
          </div>
        </div>

        {/* Dot navigation */}
        <div style={{ display:'flex', justifyContent:'center', gap:6,
          padding:'12px 24px 20px' }}>
          {pending.map((_, i) => (
            <div key={i} onClick={() => setCurrent(i)}
              style={{ width: i === current ? 20 : 6, height:6, borderRadius:99,
                cursor:'pointer', transition:'all 0.2s',
                background: i === current ? C.blue : i < current ? C.green : C.border }} />
          ))}
        </div>
      </div>
    </div>,
    document.body
  )
}
