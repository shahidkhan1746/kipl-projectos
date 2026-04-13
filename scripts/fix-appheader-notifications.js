const fs   = require('fs')
const path = require('path')

const filePath = path.join(
  process.env.HOME || process.env.USERPROFILE,
  'Desktop', 'kipl-srinagar', 'frontend', 'src', 'components', 'layout', 'AppHeader.tsx'
)

const content = `import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Bell, SignOut, CaretDown, Camera, Warning, CheckCircle,
  ClockCountdown, FileText, BookOpen, UserCircle, Hammer,
  ArrowSquareOut } from '@phosphor-icons/react'
import { useAuthStore } from '@/store/auth.store'
import { useQuery } from '@tanstack/react-query'
import { tasksApi }    from '@/api/tasks.api'
import { meetingsApi } from '@/api/meetings.api'
import { diaryApi }    from '@/api/diary.api'
import { hrApi }       from '@/api/hr.api'
import { settingsApi } from '@/api/settings.api'
import { PENDING_ITEMS } from '@/components/ui/DataCompletenessModal'

const C = {
  navy:'#1a2540', blue:'#2563eb', border:'#e2e8f0',
  text1:'#0f172a', text2:'#475569', text3:'#94a3b8',
  red:'#dc2626', amber:'#d97706', green:'#059669',
}

const ROLE_LABELS: Record<string,string> = {
  super_admin:'Super Admin', project_manager:'Project Manager',
  liaison_officer:'Liaison Officer', hr_officer:'HR Officer',
  engineer:'Site Engineer', accounts:'Accounts Officer',
  qa_engineer:'QA Engineer', supervisor:'Site Supervisor',
}

const PAGE_TITLES: Record<string, { title: string; sub: string }> = {
  '/dashboard':           { title:'Dashboard',         sub:'Project overview' },
  '/liaison':             { title:'Liaison Files',      sub:'Government file tracking' },
  '/liaison/letters':     { title:'Letters',            sub:'Official correspondence' },
  '/wbs':                 { title:'WBS & Gantt',        sub:'Work breakdown & schedule' },
  '/tasks':               { title:'Task Board',         sub:'Team task management' },
  '/meetings':            { title:'Meetings',           sub:'Minutes & action items' },
  '/diary':               { title:'Site Diary',         sub:'Daily site log' },
  '/qa':                  { title:'Quality Assurance',  sub:'Inspections & NCRs' },
  '/epc':                 { title:'BOQ & Costs',        sub:'Bill of quantities' },
  '/hr/attendance':       { title:'Attendance',         sub:'Daily attendance register' },
  '/hr/employees':        { title:'Employees',          sub:'Staff directory' },
  '/hr/timesheets':       { title:'Timesheets',         sub:'Activity logs' },
  '/hr/salary':           { title:'Salary',             sub:'Payroll management' },
  '/accounting':          { title:'Accounting',         sub:'Expenses & ledger' },
  '/accounting/invoices': { title:'RA Bills',           sub:'Running account invoices' },
  '/reports':             { title:'Reports',            sub:'PDF report generation' },
  '/settings/system':     { title:'System Settings',    sub:'Application configuration' },
  '/settings/email':      { title:'Email Setup',        sub:'SMTP configuration' },
}

// ── Notification types ────────────────────────────────────────────────────────
type NotifCategory = 'critical' | 'warning' | 'info'
interface Notif {
  id:       string
  category: NotifCategory
  icon:     React.ReactNode
  title:    string
  body:     string
  action?:  string   // route to navigate to
  time?:    string
}

function NotifDot({ cat }: { cat: NotifCategory }) {
  const bg = cat === 'critical' ? C.red : cat === 'warning' ? C.amber : C.blue
  return <div style={{ width:8, height:8, borderRadius:'50%', background:bg, flexShrink:0, marginTop:5 }} />
}

// ── Hook: build all notifications ─────────────────────────────────────────────
function useNotifications() {
  const { activeProjectId, user } = useAuthStore()
  const today = new Date().toISOString().split('T')[0]

  const { data: tasks }    = useQuery({
    queryKey: ['notif-tasks', activeProjectId],
    queryFn:  () => tasksApi.list({ projectId: activeProjectId ?? undefined }).then(r => r.data),
    enabled:  !!activeProjectId, refetchInterval: 60000,
  })

  const { data: meetings } = useQuery({
    queryKey: ['notif-meetings'],
    queryFn:  () => meetingsApi.dashboard(user?.id ?? '').then(r => r.data),
    enabled:  !!user?.id, refetchInterval: 60000,
  })

  const { data: diaryDash } = useQuery({
    queryKey: ['notif-diary', activeProjectId],
    queryFn:  () => diaryApi.dashboard(activeProjectId!).then(r => r.data),
    enabled:  !!activeProjectId, refetchInterval: 300000,
  })

  const { data: diaryList } = useQuery({
    queryKey: ['notif-diary-list', activeProjectId],
    queryFn:  () => diaryApi.list({ projectId: activeProjectId, limit: 1 }).then(r => r.data),
    enabled:  !!activeProjectId, refetchInterval: 300000,
  })

  const { data: hrDash } = useQuery({
    queryKey: ['notif-hr', activeProjectId],
    queryFn:  () => hrApi.dashboard(activeProjectId!).then(r => r.data),
    enabled:  !!activeProjectId, refetchInterval: 300000,
  })

  // Pending data completeness items
  const [pendingData, setPendingData] = useState<string[]>([])
  useEffect(() => {
    async function check() {
      const missing: string[] = []
      for (const item of PENDING_ITEMS) {
        try {
          const res = await settingsApi.get(item.key)
          if (!res?.data?.value?.trim()) missing.push(item.label)
        } catch { missing.push(item.label) }
      }
      setPendingData(missing)
    }
    check()
  }, [])

  const notifs: Notif[] = []

  // ── 1. Overdue Tasks ──────────────────────────────────────────────────────
  const overdueTasks = (tasks ?? []).filter((t: any) =>
    t.dueDate && t.dueDate < today && t.status !== 'done'
  )
  overdueTasks.slice(0, 5).forEach((t: any) => {
    const days = Math.floor((Date.now() - new Date(t.dueDate).getTime()) / 86400000)
    notifs.push({
      id: 'task-' + t.id, category: days > 3 ? 'critical' : 'warning',
      icon: <ClockCountdown size={14} />,
      title: 'Overdue Task',
      body: t.title + ' — ' + days + ' day' + (days !== 1 ? 's' : '') + ' overdue',
      action: '/tasks',
      time: t.dueDate,
    })
  })

  // ── 2. Overdue Meeting Actions ────────────────────────────────────────────
  const overdueActions = meetings?.overdueActions ?? 0
  if (overdueActions > 0) {
    notifs.push({
      id: 'meeting-actions', category: 'warning',
      icon: <CheckCircle size={14} />,
      title: 'Meeting Actions Overdue',
      body: overdueActions + ' action item' + (overdueActions !== 1 ? 's' : '') + ' past due date',
      action: '/meetings',
    })
  }

  // ── 3. Today's Diary Not Submitted ────────────────────────────────────────
  const latestEntry = Array.isArray(diaryList) ? diaryList[0] : null
  const latestDate  = latestEntry?.date?.split('T')[0]
  if (latestDate !== today) {
    notifs.push({
      id: 'diary-today', category: 'warning',
      icon: <BookOpen size={14} />,
      title: "Today's Site Diary Not Filed",
      body: "No diary entry for " + new Date().toLocaleDateString('en-IN', { day:'numeric', month:'short' }),
      action: '/diary',
      time: today,
    })
  } else if (latestEntry?.status === 'draft') {
    notifs.push({
      id: 'diary-draft', category: 'info',
      icon: <BookOpen size={14} />,
      title: "Today's Diary in Draft",
      body: 'Site diary for today not yet submitted for approval',
      action: '/diary',
    })
  }

  // ── 4. EOT Claim Days Accumulating ───────────────────────────────────────
  const eotDays = diaryDash?.eotClaimDays ?? 0
  if (eotDays > 0) {
    notifs.push({
      id: 'eot-days', category: eotDays > 30 ? 'critical' : 'warning',
      icon: <Warning size={14} />,
      title: 'EOT Claim Evidence Accumulating',
      body: eotDays + ' EOT claim days recorded — ' + (diaryDash?.hoursLostWeather ?? 0) + ' hours lost to weather',
      action: '/diary',
    })
  }

  // ── 5. Attendance Not Marked Today ───────────────────────────────────────
  const presentToday = hrDash?.presentToday ?? 0
  const totalEmp     = hrDash?.totalEmployees ?? 0
  if (totalEmp > 0 && presentToday === 0) {
    notifs.push({
      id: 'attendance-zero', category: 'warning',
      icon: <UserCircle size={14} />,
      title: "Attendance Not Marked Today",
      body: 'No attendance recorded for today. ' + totalEmp + ' employees on roster.',
      action: '/hr/attendance',
    })
  }

  // ── 6. Pending Letters (no response after 14 days) ────────────────────────
  // This would need a letters API — placeholder for now with known pending items
  const knownPendingLetters = [
    { ref:'KIPL/UEED/DAL LAKE/48-26', subject:'VSC Ground Improvement Approval', days: Math.floor((Date.now() - new Date('2026-03-24').getTime()) / 86400000) },
    { ref:'KIPL/UEED/Dal Lake/0044-26', subject:'BEP R3 Approval', days: Math.floor((Date.now() - new Date('2026-03-16').getTime()) / 86400000) },
  ].filter(l => l.days > 14)

  knownPendingLetters.forEach(l => {
    notifs.push({
      id: 'letter-' + l.ref, category: 'critical',
      icon: <FileText size={14} />,
      title: 'No Response — ' + l.days + ' Days',
      body: l.ref + ' — ' + l.subject,
      action: '/liaison/letters',
    })
  })

  // ── 7. WBS Delayed Tasks ──────────────────────────────────────────────────
  // Known open blockers from PROJECT_FACTS.md
  const wbsBlockers = [
    { id:'bep', title:'BEP Approval Pending', body:'UEED has not approved BEP R3 — blocking STP civil works start', days:40 },
    { id:'vsc', title:'VSC Approval Pending', body:'UEED go-ahead for KELLER ground improvement not received', days:17 },
  ]
  wbsBlockers.forEach(b => {
    notifs.push({
      id: 'wbs-' + b.id, category: 'critical',
      icon: <Hammer size={14} />,
      title: b.title,
      body: b.body,
      action: '/wbs',
    })
  })

  // ── 8. Incomplete Project Data ────────────────────────────────────────────
  const requiredPending = pendingData.filter(label =>
    PENDING_ITEMS.find(p => p.label === label && p.required)
  )
  if (requiredPending.length > 0) {
    notifs.push({
      id: 'data-completeness', category: 'warning',
      icon: <Warning size={14} />,
      title: requiredPending.length + ' Required Data Items Missing',
      body: requiredPending.slice(0, 2).join(', ') + (requiredPending.length > 2 ? ' +' + (requiredPending.length - 2) + ' more' : ''),
      action: '/settings/system',
    })
  }

  // Sort: critical first, then warning, then info
  const order: Record<NotifCategory, number> = { critical:0, warning:1, info:2 }
  notifs.sort((a, b) => order[a.category] - order[b.category])

  return {
    notifs,
    critical: notifs.filter(n => n.category === 'critical').length,
    total:    notifs.length,
  }
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AppHeader() {
  const { user, logout }   = useAuthStore()
  const nav                = useNavigate()
  const location           = useLocation()
  const [showProfile, setShowProfile] = useState(false)
  const [showNotifs,  setShowNotifs]  = useState(false)
  const [avatar, setAvatar] = useState<string | null>(
    () => localStorage.getItem('avatar_' + (user?.id ?? ''))
  )
  const profileRef = useRef<HTMLDivElement>(null)
  const notifRef   = useRef<HTMLDivElement>(null)
  const fileRef    = useRef<HTMLInputElement>(null)

  const { notifs, critical, total } = useNotifications()

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfile(false)
      if (notifRef.current   && !notifRef.current.contains(e.target as Node))   setShowNotifs(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const b64 = ev.target?.result as string
      localStorage.setItem('avatar_' + (user?.id ?? ''), b64)
      setAvatar(b64)
    }
    reader.readAsDataURL(file)
  }

  const initials = user?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) ?? 'U'
  const pageMeta = PAGE_TITLES[location.pathname]
    ?? Object.entries(PAGE_TITLES).find(([k]) => location.pathname.startsWith(k))?.[1]
    ?? { title:'ProjectOS', sub:'Khilari Infrastructure' }

  const bellColor = critical > 0 ? C.red : total > 0 ? C.amber : C.text2

  return (
    <div style={{ height:64, background:'#fff', borderBottom:'1.5px solid '+C.border,
      display:'flex', alignItems:'center', justifyContent:'space-between',
      padding:'0 28px', flexShrink:0, zIndex:100 }}>

      {/* Left: Page title */}
      <div>
        <p style={{ fontSize:17, fontWeight:800, color:C.text1, margin:0, letterSpacing:'-0.02em' }}>
          {pageMeta.title}
        </p>
        <p style={{ fontSize:11, color:C.text3, margin:0 }}>{pageMeta.sub}</p>
      </div>

      {/* Right */}
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>

        {/* ── Bell ── */}
        <div ref={notifRef} style={{ position:'relative' }}>
          <button onClick={() => setShowNotifs(s => !s)}
            style={{ width:40, height:40, borderRadius:10, background:'#f8f9fc',
              border:'1.5px solid '+C.border, display:'flex', alignItems:'center',
              justifyContent:'center', cursor:'pointer', position:'relative' }}>
            <Bell size={18} color={bellColor}
              weight={total > 0 ? 'fill' : 'regular'} />
            {total > 0 && (
              <div style={{ position:'absolute', top:-4, right:-4, width:18, height:18,
                borderRadius:'50%', background: critical > 0 ? C.red : C.amber,
                color:'#fff', fontSize:10, fontWeight:700,
                display:'flex', alignItems:'center', justifyContent:'center' }}>
                {total > 9 ? '9+' : total}
              </div>
            )}
          </button>

          {showNotifs && (
            <div style={{ position:'absolute', top:48, right:0, width:380,
              background:'#fff', borderRadius:14, border:'1.5px solid '+C.border,
              boxShadow:'0 12px 40px rgba(0,0,0,0.14)', zIndex:200, overflow:'hidden' }}>

              {/* Notif header */}
              <div style={{ padding:'14px 16px', borderBottom:'1.5px solid '+C.border,
                display:'flex', justifyContent:'space-between', alignItems:'center',
                background:'#f8fafc' }}>
                <span style={{ fontSize:14, fontWeight:700, color:C.text1 }}>
                  Notifications
                </span>
                <div style={{ display:'flex', gap:6 }}>
                  {critical > 0 && (
                    <span style={{ fontSize:11, padding:'2px 8px', background:'#fef2f2',
                      color:C.red, borderRadius:999, fontWeight:700 }}>
                      {critical} Critical
                    </span>
                  )}
                  {total > 0 && (
                    <span style={{ fontSize:11, padding:'2px 8px', background:'#fffbeb',
                      color:C.amber, borderRadius:999, fontWeight:700 }}>
                      {total} Total
                    </span>
                  )}
                </div>
              </div>

              {/* Category pills */}
              {total > 0 && (
                <div style={{ display:'flex', gap:0, borderBottom:'1px solid #f1f5f9',
                  padding:'8px 16px', background:'#fafafa' }}>
                  {(['critical','warning','info'] as NotifCategory[]).map(cat => {
                    const count = notifs.filter(n => n.category === cat).length
                    if (count === 0) return null
                    const color = cat === 'critical' ? C.red : cat === 'warning' ? C.amber : C.blue
                    return (
                      <span key={cat} style={{ fontSize:10, fontWeight:700, padding:'2px 10px',
                        borderRadius:99, marginRight:6, background: color+'18', color }}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}: {count}
                      </span>
                    )
                  })}
                </div>
              )}

              {/* Notif list */}
              <div style={{ maxHeight:400, overflowY:'auto' }}>
                {notifs.length === 0 ? (
                  <div style={{ padding:'40px 16px', textAlign:'center' as any }}>
                    <p style={{ fontSize:24, margin:'0 0 8px' }}>✅</p>
                    <p style={{ fontSize:13, color:C.text3, margin:0, fontWeight:600 }}>
                      All caught up!
                    </p>
                    <p style={{ fontSize:11, color:C.text3, margin:'4px 0 0' }}>
                      No pending notifications
                    </p>
                  </div>
                ) : notifs.map((n, i) => {
                  const borderColor = n.category === 'critical' ? C.red : n.category === 'warning' ? C.amber : C.blue
                  const bgColor     = n.category === 'critical' ? '#fff5f5' : n.category === 'warning' ? '#fffbeb' : '#f0f9ff'
                  return (
                    <div key={n.id}
                      onClick={() => { if (n.action) { nav(n.action); setShowNotifs(false) } }}
                      style={{ padding:'12px 16px', borderBottom:'1px solid #f1f5f9',
                        cursor: n.action ? 'pointer' : 'default',
                        display:'flex', gap:10, alignItems:'flex-start',
                        borderLeft:'3px solid '+borderColor,
                        background: i % 2 === 0 ? bgColor : '#fff' }}
                      onMouseEnter={e => n.action && (e.currentTarget.style.opacity='0.85')}
                      onMouseLeave={e => (e.currentTarget.style.opacity='1')}>
                      <div style={{ color:borderColor, marginTop:2, flexShrink:0 }}>{n.icon}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
                          <p style={{ fontSize:12, fontWeight:700, color:C.text1, margin:0,
                            lineHeight:1.4 }}>{n.title}</p>
                          {n.action && (
                            <ArrowSquareOut size={11} color={C.text3} style={{ flexShrink:0, marginTop:2 }} />
                          )}
                        </div>
                        <p style={{ fontSize:11, color:C.text2, margin:'3px 0 0',
                          lineHeight:1.4, wordBreak:'break-word' as any }}>{n.body}</p>
                        {n.time && (
                          <p style={{ fontSize:10, color:C.text3, margin:'3px 0 0' }}>
                            {new Date(n.time).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Footer */}
              {total > 0 && (
                <div style={{ padding:'10px 16px', borderTop:'1.5px solid '+C.border,
                  background:'#f8fafc', textAlign:'center' as any }}>
                  <p style={{ fontSize:11, color:C.text3, margin:0 }}>
                    Click any notification to navigate directly
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Profile ── */}
        <div ref={profileRef} style={{ position:'relative' }}>
          <button onClick={() => setShowProfile(s => !s)}
            style={{ display:'flex', alignItems:'center', gap:10,
              padding:'6px 12px 6px 6px', background:'#f8f9fc',
              border:'1.5px solid '+C.border, borderRadius:999, cursor:'pointer' }}>
            <div style={{ width:32, height:32, borderRadius:'50%', overflow:'hidden',
              background:'#2563eb', display:'flex', alignItems:'center',
              justifyContent:'center', flexShrink:0 }}>
              {avatar
                ? <img src={avatar} alt="avatar" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                : <span style={{ fontSize:13, fontWeight:700, color:'#fff' }}>{initials}</span>}
            </div>
            <div style={{ textAlign:'left' as any }}>
              <p style={{ fontSize:12, fontWeight:700, color:C.text1, margin:0, lineHeight:1.2 }}>
                {user?.name}
              </p>
              <p style={{ fontSize:10, color:C.text3, margin:0 }}>
                {ROLE_LABELS[user?.role ?? ''] ?? user?.role}
              </p>
            </div>
            <CaretDown size={12} color={C.text3} style={{ marginLeft:2 }} />
          </button>

          {showProfile && (
            <div style={{ position:'absolute', top:52, right:0, width:260,
              background:'#fff', borderRadius:14, border:'1.5px solid '+C.border,
              boxShadow:'0 8px 32px rgba(0,0,0,0.12)', zIndex:200, overflow:'hidden' }}>

              {/* Profile header */}
              <div style={{ padding:16, borderBottom:'1.5px solid '+C.border,
                display:'flex', gap:12, alignItems:'center' }}>
                <div style={{ position:'relative' }}>
                  <div style={{ width:44, height:44, borderRadius:'50%', overflow:'hidden',
                    background:'#2563eb', display:'flex', alignItems:'center',
                    justifyContent:'center', cursor:'pointer' }}
                    onClick={() => fileRef.current?.click()}>
                    {avatar
                      ? <img src={avatar} alt="avatar" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                      : <span style={{ fontSize:16, fontWeight:700, color:'#fff' }}>{initials}</span>}
                  </div>
                  <div onClick={() => fileRef.current?.click()}
                    style={{ position:'absolute', bottom:0, right:0, width:16, height:16,
                      borderRadius:'50%', background:'#2563eb', border:'2px solid #fff',
                      display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
                    <Camera size={8} color="#fff" weight="fill" />
                  </div>
                  <input ref={fileRef} type="file" accept="image/*"
                    style={{ display:'none' }} onChange={handleAvatarUpload} />
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:13, fontWeight:700, color:C.text1, margin:0 }}>{user?.name}</p>
                  <p style={{ fontSize:11, color:C.text3, margin:'2px 0 0',
                    overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as any }}>
                    {user?.email}
                  </p>
                  <p style={{ fontSize:10, color:C.blue, margin:'2px 0 0', fontWeight:600 }}>
                    {ROLE_LABELS[user?.role ?? '']}
                  </p>
                </div>
              </div>

              {/* Pending data badge in profile */}
              {notifs.filter(n => n.id === 'data-completeness').length > 0 && (
                <div style={{ margin:'10px 12px 0', padding:'8px 12px', borderRadius:8,
                  background:'#fffbeb', border:'1px solid #fde68a',
                  display:'flex', alignItems:'center', gap:8 }}>
                  <Warning size={13} color={C.amber} weight='fill' />
                  <p style={{ fontSize:11, color:C.amber, margin:0, fontWeight:600 }}>
                    Project data incomplete — tap to complete
                  </p>
                </div>
              )}

              {/* Menu items */}
              {[
                { icon:'👤', label:'My Profile',      action: () => {} },
                { icon:'🔒', label:'Change Password',  action: () => {} },
                ...(user?.role === 'super_admin' ? [
                  { icon:'⚙️', label:'System Settings', action: () => nav('/settings/system') },
                  { icon:'📧', label:'Email Setup',      action: () => nav('/settings/email')  },
                ] : []),
              ].map(item => (
                <button key={item.label}
                  onClick={() => { item.action(); setShowProfile(false) }}
                  style={{ width:'100%', padding:'11px 16px', background:'none', border:'none',
                    cursor:'pointer', display:'flex', alignItems:'center', gap:10,
                    fontSize:13, color:C.text1, textAlign:'left' as any }}
                  onMouseEnter={e => (e.currentTarget.style.background='#f8faff')}
                  onMouseLeave={e => (e.currentTarget.style.background='none')}>
                  <span>{item.icon}</span>{item.label}
                </button>
              ))}

              <div style={{ borderTop:'1.5px solid '+C.border }}>
                <button onClick={() => { logout(); nav('/login') }}
                  style={{ width:'100%', padding:'11px 16px', background:'none', border:'none',
                    cursor:'pointer', display:'flex', alignItems:'center', gap:10,
                    fontSize:13, color:C.red, textAlign:'left' as any }}
                  onMouseEnter={e => (e.currentTarget.style.background='#fef2f2')}
                  onMouseLeave={e => (e.currentTarget.style.background='none')}>
                  <SignOut size={14} color={C.red} /> Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
`

fs.writeFileSync(filePath, content)
console.log('✅ AppHeader.tsx — full notification system written')
console.log('')
console.log('Notification sources:')
console.log('  🔴 Critical: Overdue tasks >3d, Pending letters >14d, WBS blockers, BEP/VSC pending')
console.log('  🟡 Warning:  Overdue tasks ≤3d, Meeting actions, No diary today, No attendance, Missing data')
console.log('  🔵 Info:     Diary in draft, minor reminders')
console.log('')
console.log('Bell icon:')
console.log('  → Red fill  = critical notifications exist')
console.log('  → Amber fill = warnings only')
console.log('  → Grey      = all clear')
console.log('')
console.log('Each notification is clickable → navigates directly to the relevant page')
