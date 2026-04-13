const fs   = require('fs')
const path = require('path')

const SRC = path.join(process.env.HOME || process.env.USERPROFILE, 'Desktop', 'kipl-srinagar', 'frontend', 'src')

// ── 1. DataCompletenessModal.tsx ─────────────────────────────────────────────
const MODAL_FILE = path.join(SRC, 'components', 'ui', 'DataCompletenessModal.tsx')
fs.writeFileSync(MODAL_FILE, `import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Warning, CheckCircle, X, ArrowRight } from '@phosphor-icons/react'
import { settingsApi } from '@/api/settings.api'
import { useAuthStore } from '@/store/auth.store'

const C = {
  navy:'#1a2540', blue:'#2563eb', amber:'#d97706', green:'#059669',
  red:'#dc2626', border:'#e2e8f0', text1:'#0f172a', text2:'#475569', text3:'#94a3b8',
}

export interface PendingItem {
  key: string; label: string; question: string; source: string
  fieldType: 'text' | 'date' | 'select' | 'yesno'; options?: string[]; required: boolean
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
    question: 'Has the formal agreement with UEED been executed? If yes, enter the date.',
    source: 'Last known: Pending as of 23-Dec-2025 (Ref: KIPL/UEED/Dal Lake/0032-25)',
    fieldType: 'date', required: true,
  },
  {
    key: 'project.land_demarcation_status', label: 'STP Site Demarcation Status',
    question: 'Has LCMA completed formal demarcation of STP site at Gupt Ganga, Ishber Nishat?',
    source: 'Allotment order: CE/UEED/PS/2929-42 (07-Nov-2025). Demarcation status unconfirmed.',
    fieldType: 'yesno', required: true,
  },
  {
    key: 'project.tree_cutting_clearance_date', label: 'Tree Cutting Clearance Date',
    question: 'Confirm the exact date tree cutting clearance was received from LCMA/Forest Dept.',
    source: 'Master Letter Register shows: 12-Feb-2026. Source letter not yet verified.',
    fieldType: 'date', required: false,
  },
  {
    key: 'project.vsc_approval_status', label: 'VSC Ground Improvement Approval',
    question: 'Has UEED issued go-ahead for Vibro Stone Column (KELLER) ground improvement?',
    source: 'Requested 24-Mar-2026 (Ref: KIPL/UEED/DAL LAKE/48-26). Status unknown.',
    fieldType: 'yesno', required: true,
  },
  {
    key: 'project.bep_approval_date', label: 'BEP Final Approval Date',
    question: 'Has UEED approved BEP R3? If yes, enter the date.',
    source: 'BEP R3 submitted 16-Mar-2026 (Ref: 0044-26). Structural drawings: 0046-26. Approval pending.',
    fieldType: 'date', required: true,
  },
  {
    key: 'project.loi_second_ref', label: 'Second LOI Details (CE/UEED/PS/2412-15)',
    question: 'Please provide subject and key details of LOI ref CE/UEED/PS/2412-15 dated 07-Oct-2025.',
    source: 'Referenced in records but letter not yet shared for verification.',
    fieldType: 'text', required: false,
  },
]

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

export function DataCompletenessModal() {
  const { user }             = useAuthStore()
  const { pending, refresh } = useDataCompleteness()
  const [open, setOpen]      = useState(false)
  const [current, setCurrent]= useState(0)
  const [values, setValues]  = useState<Record<string, string>>({})
  const [saving, setSaving]  = useState(false)

  useEffect(() => {
    const key = \`data_modal_dismissed_\${new Date().toDateString()}_\${user?.id ?? ''}\`
    const wasDismissed = sessionStorage.getItem(key) === 'true'
    if (!wasDismissed && pending.length > 0 && user) {
      const timer = setTimeout(() => setOpen(true), 1500)
      return () => clearTimeout(timer)
    }
  }, [pending.length, user])

  async function saveItem(item: PendingItem) {
    const val = values[item.key]
    if (!val?.trim()) return
    setSaving(true)
    try {
      await settingsApi.set(item.key, val.trim())
      await refresh()
      if (current < pending.length - 1) setCurrent(c => c + 1)
      else setOpen(false)
    } finally { setSaving(false) }
  }

  function dismiss() {
    const key = \`data_modal_dismissed_\${new Date().toDateString()}_\${user?.id ?? ''}\`
    sessionStorage.setItem(key, 'true')
    setOpen(false)
  }

  if (!open || pending.length === 0) return null
  const item = pending[current]
  if (!item) return null
  const required = pending.filter(p => p.required).length

  return createPortal(
    <div style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(15,23,42,0.6)',
      backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:'#fff', borderRadius:20, width:'100%', maxWidth:520,
        boxShadow:'0 24px 80px rgba(0,0,0,0.2)', overflow:'hidden' }}>

        {/* Header */}
        <div style={{ background:C.navy, padding:'20px 24px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:40, height:40, borderRadius:10, background:'rgba(217,119,6,0.2)',
              display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Warning size={20} color='#fbbf24' weight='fill' />
            </div>
            <div>
              <p style={{ fontSize:15, fontWeight:800, color:'#fff', margin:0 }}>Incomplete Project Data</p>
              <p style={{ fontSize:12, color:'rgba(255,255,255,0.5)', margin:0 }}>
                {pending.length} item{pending.length !== 1 ? 's' : ''} need your confirmation
              </p>
            </div>
          </div>
          <button onClick={dismiss} style={{ background:'none', border:'none', cursor:'pointer',
            color:'rgba(255,255,255,0.4)', padding:4, display:'flex', alignItems:'center' }}>
            <X size={18} />
          </button>
        </div>

        {/* Progress bar */}
        <div style={{ height:3, background:'#f1f5f9' }}>
          <div style={{ height:'100%', background:C.amber, transition:'width 0.3s',
            width:\`\${(current / pending.length) * 100}%\` }} />
        </div>

        {/* Body */}
        <div style={{ padding:'24px 24px 16px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
            <span style={{ fontSize:11, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.06em' }}>
              Item {current + 1} of {pending.length}
            </span>
            {required > 0 && (
              <span style={{ fontSize:10, padding:'2px 8px', borderRadius:99,
                background:'#fef2f2', color:C.red, fontWeight:700 }}>
                {required} Required
              </span>
            )}
          </div>

          <div style={{ background:'#f8fafc', borderRadius:12, padding:'16px 18px', marginBottom:16 }}>
            <p style={{ fontSize:14, fontWeight:700, color:C.text1, margin:'0 0 8px', lineHeight:1.5 }}>
              {item.label}{item.required && <span style={{ color:C.red }}> *</span>}
            </p>
            <p style={{ fontSize:13, color:C.text2, margin:'0 0 10px', lineHeight:1.6 }}>{item.question}</p>
            <p style={{ fontSize:11, color:C.text3, margin:0, fontStyle:'italic' }}>{item.source}</p>
          </div>

          {item.fieldType === 'yesno' ? (
            <div style={{ display:'flex', gap:10, marginBottom:16 }}>
              {['Yes — Confirmed', 'No — Still Pending', 'Unknown'].map(opt => (
                <button key={opt} onClick={() => setValues(v => ({ ...v, [item.key]: opt }))}
                  style={{ flex:1, padding:'10px 6px', borderRadius:10, fontSize:12, fontWeight:600,
                    cursor:'pointer', border: values[item.key] === opt ? \`2px solid \${C.blue}\` : \`1.5px solid \${C.border}\`,
                    background: values[item.key] === opt ? '#eff6ff' : '#fff',
                    color: values[item.key] === opt ? C.blue : C.text2 }}>
                  {opt}
                </button>
              ))}
            </div>
          ) : (
            <input type={item.fieldType === 'date' ? 'date' : 'text'}
              value={values[item.key] ?? ''}
              onChange={e => setValues(v => ({ ...v, [item.key]: e.target.value }))}
              placeholder={item.fieldType === 'text' ? 'Enter value...' : undefined}
              style={{ width:'100%', padding:'10px 14px', border:\`1.5px solid \${C.border}\`,
                borderRadius:10, fontSize:13, outline:'none', marginBottom:16,
                fontFamily:'inherit', boxSizing:'border-box' as any }} />
          )}

          <div style={{ display:'flex', gap:10, justifyContent:'space-between', alignItems:'center' }}>
            <button onClick={dismiss}
              style={{ fontSize:12, color:C.text3, background:'none', border:'none', cursor:'pointer' }}>
              Remind me next login
            </button>
            <div style={{ display:'flex', gap:8 }}>
              {!item.required && (
                <button onClick={() => setCurrent(c => Math.min(c + 1, pending.length - 1))}
                  style={{ padding:'9px 16px', fontSize:12, color:C.text2, background:'none',
                    border:\`1.5px solid \${C.border}\`, borderRadius:8, cursor:'pointer' }}>
                  Skip
                </button>
              )}
              <button onClick={() => saveItem(item)}
                disabled={saving || !values[item.key]?.trim()}
                style={{ padding:'9px 20px', fontSize:13, fontWeight:700, color:'#fff',
                  background: values[item.key]?.trim() ? C.blue : C.text3, border:'none',
                  borderRadius:8, cursor: values[item.key]?.trim() ? 'pointer' : 'not-allowed',
                  display:'flex', alignItems:'center', gap:6 }}>
                {saving ? 'Saving...' : current < pending.length - 1
                  ? <><span>Save & Next</span><ArrowRight size={14}/></>
                  : <><CheckCircle size={14}/><span>Complete</span></>}
              </button>
            </div>
          </div>
        </div>

        {/* Dot navigation */}
        <div style={{ display:'flex', justifyContent:'center', gap:6, padding:'12px 24px 20px' }}>
          {pending.map((_, i) => (
            <div key={i} onClick={() => setCurrent(i)}
              style={{ width: i === current ? 20 : 6, height:6, borderRadius:99, cursor:'pointer',
                background: i === current ? C.blue : i < current ? C.green : C.border,
                transition:'all 0.2s' }} />
          ))}
        </div>
      </div>
    </div>,
    document.body
  )
}
`)
console.log('✅ DataCompletenessModal.tsx created')

// ── 2. NotificationBell.tsx ──────────────────────────────────────────────────
const BELL_FILE = path.join(SRC, 'components', 'ui', 'NotificationBell.tsx')
fs.writeFileSync(BELL_FILE, `import { useState } from 'react'
import { Bell, Warning, CheckCircle } from '@phosphor-icons/react'
import { useDataCompleteness, PENDING_ITEMS } from './DataCompletenessModal'

const C = {
  blue:'#2563eb', amber:'#d97706', green:'#059669',
  border:'#e2e8f0', text1:'#0f172a', text3:'#94a3b8', red:'#dc2626',
}

export function NotificationBell() {
  const { pending } = useDataCompleteness()
  const [open, setOpen] = useState(false)
  const count = pending.length

  return (
    <div style={{ position:'relative' }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ position:'relative', background:'none', border:'none', cursor:'pointer',
          width:38, height:38, borderRadius:10, display:'flex', alignItems:'center',
          justifyContent:'center', color: count > 0 ? C.amber : '#94a3b8' }}
        onMouseEnter={e => (e.currentTarget.style.background='#f1f5f9')}
        onMouseLeave={e => (e.currentTarget.style.background='none')}>
        <Bell size={20} weight={count > 0 ? 'fill' : 'regular'} />
        {count > 0 && (
          <span style={{ position:'absolute', top:4, right:4, width:16, height:16,
            borderRadius:'50%', background:C.amber, color:'#fff', fontSize:9, fontWeight:800,
            display:'flex', alignItems:'center', justifyContent:'center', border:'2px solid #fff' }}>
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <>
          <div style={{ position:'fixed', inset:0, zIndex:998 }} onClick={() => setOpen(false)} />
          <div style={{ position:'absolute', right:0, top:'calc(100% + 8px)', zIndex:999,
            background:'#fff', border:\`1.5px solid \${C.border}\`, borderRadius:14,
            boxShadow:'0 12px 40px rgba(0,0,0,0.12)', width:340, overflow:'hidden' }}>

            <div style={{ padding:'14px 16px', borderBottom:\`1px solid \${C.border}\`,
              display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontSize:13, fontWeight:700, color:C.text1 }}>Project Data Completeness</span>
              <span style={{ fontSize:11, padding:'2px 8px', borderRadius:99, fontWeight:700,
                background: count === 0 ? '#dcfce7' : '#fffbeb',
                color: count === 0 ? C.green : C.amber }}>
                {count === 0 ? 'All complete ✓' : \`\${count} pending\`}
              </span>
            </div>

            <div style={{ maxHeight:360, overflowY:'auto' }}>
              {PENDING_ITEMS.map(item => {
                const isPending = pending.some(p => p.key === item.key)
                return (
                  <div key={item.key} style={{ padding:'12px 16px', borderBottom:'1px solid #f8fafc',
                    background: isPending ? '#fffbeb' : '#fff',
                    display:'flex', alignItems:'flex-start', gap:10 }}>
                    <div style={{ marginTop:1, flexShrink:0 }}>
                      {isPending
                        ? <Warning size={14} color={C.amber} weight='fill' />
                        : <CheckCircle size={14} color={C.green} weight='fill' />}
                    </div>
                    <div style={{ flex:1 }}>
                      <p style={{ fontSize:12, fontWeight:600, margin:'0 0 2px',
                        color: isPending ? C.amber : C.green }}>
                        {item.label}
                        {item.required && isPending && <span style={{ color:C.red }}> *</span>}
                      </p>
                      <p style={{ fontSize:11, color:C.text3, margin:0, lineHeight:1.4 }}>
                        {isPending ? item.source : 'Confirmed ✓'}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>

            {count > 0 && (
              <div style={{ padding:'10px 16px', borderTop:\`1px solid \${C.border}\`, background:'#f8fafc' }}>
                <p style={{ fontSize:11, color:C.text3, margin:0, textAlign:'center' as any }}>
                  Will popup again on next login until all items are confirmed
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
`)
console.log('✅ NotificationBell.tsx created')

// ── 3. Patch settings.api.ts ─────────────────────────────────────────────────
const settingsApiPath = path.join(SRC, 'api', 'settings.api.ts')
let settingsApiContent = fs.readFileSync(settingsApiPath, 'utf8')
if (!settingsApiContent.includes("set:")) {
  settingsApiContent = settingsApiContent.replace(
    /export const settingsApi = \{/,
    `export const settingsApi = {\n  set: (key: string, value: string) => api.post('/api/v1/settings', { key, value }),`
  )
  fs.writeFileSync(settingsApiPath, settingsApiContent)
  console.log('✅ settings.api.ts — set() method added')
} else {
  console.log('⏭  settings.api.ts — set() already exists')
}

// ── 4. Patch AppHeader.tsx — replace static bell with NotificationBell ────────
const headerPath = path.join(SRC, 'components', 'layout', 'AppHeader.tsx')
let header = fs.readFileSync(headerPath, 'utf8')

if (!header.includes('NotificationBell')) {
  // Add import at top
  header = `import { NotificationBell } from '@/components/ui/NotificationBell'\n` + header

  // Replace the bell button — try different patterns
  const bellPatterns = [
    // Pattern: <button ...><Bell ... /></button>
    /<button[^>]*onClick[^>]*>\s*\n?\s*<Bell[^/]*\/>\s*\n?\s*<\/button>/g,
    // Pattern: just <Bell ... /> standalone
    /<Bell\s+size=\{[^}]+\}[^>]*\/>/g,
  ]

  let replaced = false
  for (const pattern of bellPatterns) {
    if (pattern.test(header)) {
      header = header.replace(pattern, '<NotificationBell />')
      replaced = true
      break
    }
  }

  if (!replaced) {
    console.log('⚠️  Could not auto-replace Bell — adding NotificationBell manually near bell area')
    // Just add it as close to where Bell is used as possible
    header = header.replace(/(<Bell[^>]*\/>)/, '<NotificationBell />')
  }

  fs.writeFileSync(headerPath, header)
  console.log('✅ AppHeader.tsx — NotificationBell integrated')
} else {
  console.log('⏭  AppHeader.tsx — already has NotificationBell')
}

// ── 5. Find main Layout and add DataCompletenessModal ────────────────────────
// Check if there's a layout wrapper in App.tsx or a dedicated layout file
const appTsxPath = path.join(SRC, 'App.tsx')
let appContent = fs.readFileSync(appTsxPath, 'utf8')

if (!appContent.includes('DataCompletenessModal')) {
  appContent = `import { DataCompletenessModal } from '@/components/ui/DataCompletenessModal'\n` + appContent

  // Add modal just after the opening of the main app wrapper
  // Look for a common pattern like <Routes> or <div className or similar
  if (appContent.includes('<Routes>')) {
    appContent = appContent.replace('<Routes>', '<DataCompletenessModal />\n      <Routes>')
  } else if (appContent.includes('<Router>')) {
    appContent = appContent.replace('<Router>', '<Router>\n      <DataCompletenessModal />')
  } else {
    // Fallback — add after first return (
    appContent = appContent.replace(/return \(\s*\n(\s*)</, (m, indent) =>
      `return (\n${indent}<>\n${indent}<DataCompletenessModal />\n${indent}<`)
  }

  fs.writeFileSync(appTsxPath, appContent)
  console.log('✅ App.tsx — DataCompletenessModal added')
} else {
  console.log('⏭  App.tsx — modal already present')
}

console.log(`
🎉 Notification system built!

🔔 Bell icon (AppHeader) — amber with badge count when items pending
📋 Modal (on login) — step-by-step confirmation of 7 pending facts
   Pops up 1.5s after login, once per day per user
   "Remind me next login" dismisses for the session

📝 7 items tracked:
   ✱ Contract Value (Required)
   ✱ Agreement Execution Date (Required)  
   ✱ STP Site Demarcation Status (Required)
   ○ Tree Cutting Clearance Date (Optional)
   ✱ VSC Approval Status (Required)
   ✱ BEP Final Approval Date (Required)
   ○ Second LOI Details (Optional)

Answers saved to system_settings table via /api/v1/settings
`)
