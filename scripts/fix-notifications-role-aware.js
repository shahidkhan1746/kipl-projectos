const fs   = require('fs')
const path = require('path')

const headerPath = path.join(
  process.env.HOME || process.env.USERPROFILE,
  'Desktop', 'kipl-srinagar', 'frontend', 'src', 'components', 'layout', 'AppHeader.tsx'
)

let src = fs.readFileSync(headerPath, 'utf8')

// Replace the entire useNotifications hook
const OLD_HOOK_START = `// ── Hook: build all notifications ─────────────────────────────────────────────
function useNotifications() {`
const OLD_HOOK_END   = `  // Sort: critical first, then warning, then info
  const order: Record<NotifCategory, number> = { critical:0, warning:1, info:2 }
  notifs.sort((a, b) => order[a.category] - order[b.category])

  return {
    notifs,
    critical: notifs.filter(n => n.category === 'critical').length,
    total:    notifs.length,
  }
}`

const NEW_HOOK = `// ── Hook: build role-aware, person-aware notifications ───────────────────────
function useNotifications() {
  const { activeProjectId, user } = useAuthStore()
  const today = new Date().toISOString().split('T')[0]

  const isPM      = user?.role === 'super_admin' || user?.role === 'project_manager'
  const isHR      = user?.role === 'hr_officer'  || isPM
  const isLiaison = user?.role === 'liaison_officer' || isPM

  // ── Fetch all tasks (PM sees all, others see only assigned to them) ─────────
  const { data: allTasks } = useQuery({
    queryKey: ['notif-tasks-all', activeProjectId],
    queryFn:  () => tasksApi.list({ projectId: activeProjectId ?? undefined }).then(r => r.data),
    enabled:  !!activeProjectId, refetchInterval: 60000,
  })

  const { data: myTasks } = useQuery({
    queryKey: ['notif-tasks-mine', user?.id],
    queryFn:  () => tasksApi.list({ projectId: activeProjectId ?? undefined, assignedTo: user?.id }).then(r => r.data),
    enabled:  !!user?.id, refetchInterval: 60000,
  })

  const { data: meetings } = useQuery({
    queryKey: ['notif-meetings'],
    queryFn:  () => meetingsApi.dashboard(user?.id ?? '').then(r => r.data),
    enabled:  !!user?.id, refetchInterval: 60000,
  })

  const { data: diaryDash } = useQuery({
    queryKey: ['notif-diary', activeProjectId],
    queryFn:  () => diaryApi.dashboard(activeProjectId!).then(r => r.data),
    enabled:  !!activeProjectId && isPM, refetchInterval: 300000,
  })

  const { data: diaryList } = useQuery({
    queryKey: ['notif-diary-list', activeProjectId],
    queryFn:  () => diaryApi.list({ projectId: activeProjectId, limit: 1 }).then(r => r.data),
    enabled:  !!activeProjectId && (isPM || user?.role === 'engineer' || user?.role === 'supervisor'),
    refetchInterval: 300000,
  })

  const { data: hrDash } = useQuery({
    queryKey: ['notif-hr', activeProjectId],
    queryFn:  () => hrApi.dashboard(activeProjectId!).then(r => r.data),
    enabled:  !!activeProjectId && isHR, refetchInterval: 300000,
  })

  const [pendingData, setPendingData] = useState<string[]>([])
  useEffect(() => {
    if (!isPM) return
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
  }, [isPM])

  const notifs: Notif[] = []

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION A — MY OWN TASKS (visible to everyone for their assigned tasks)
  // "You have work to do / update"
  // ─────────────────────────────────────────────────────────────────────────────
  const myOverdue = (myTasks ?? []).filter((t: any) =>
    t.dueDate && t.dueDate < today && t.status !== 'done' && t.status !== 'blocked'
  )
  myOverdue.slice(0, 5).forEach((t: any) => {
    const days = Math.floor((Date.now() - new Date(t.dueDate).getTime()) / 86400000)
    notifs.push({
      id: 'my-task-' + t.id,
      category: days > 3 ? 'critical' : 'warning',
      icon: <ClockCountdown size={14} />,
      title: '⚠ Your Task is Overdue',
      body: \`"\${t.title}" was due \${days} day\${days !== 1 ? 's' : ''} ago — please update your status\`,
      action: \`/tasks?taskId=\${t.id}\`,
      time: t.dueDate,
      who: 'you',
    })
  })

  // Tasks assigned to me that are blocked — I need to take action
  const myBlocked = (myTasks ?? []).filter((t: any) => t.status === 'blocked')
  myBlocked.forEach((t: any) => {
    notifs.push({
      id: 'my-blocked-' + t.id,
      category: 'warning',
      icon: <Warning size={14} />,
      title: '🔴 Your Task is Blocked',
      body: \`"\${t.title}" is blocked — add a comment explaining the blocker\`,
      action: \`/tasks?taskId=\${t.id}\`,
      who: 'you',
    })
  })

  // Tasks in review assigned to me — I need to check if feedback came
  const myInReview = (myTasks ?? []).filter((t: any) => t.status === 'review')
  myInReview.forEach((t: any) => {
    notifs.push({
      id: 'my-review-' + t.id,
      category: 'info',
      icon: <CheckCircle size={14} />,
      title: '📋 Your Task is In Review',
      body: \`"\${t.title}" is pending review — awaiting approval from PM\`,
      action: \`/tasks?taskId=\${t.id}\`,
      who: 'you',
    })
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION B — PM / MANAGER VIEW (team-wide oversight)
  // "Your team has work pending"
  // ─────────────────────────────────────────────────────────────────────────────
  if (isPM) {
    // Team overdue tasks (excluding mine — already shown above)
    const teamOverdue = (allTasks ?? []).filter((t: any) =>
      t.dueDate && t.dueDate < today &&
      t.status !== 'done' && t.status !== 'blocked' &&
      t.assignedTo !== user?.id
    )
    // Group by assignee
    const byAssignee: Record<string, any[]> = {}
    teamOverdue.forEach((t: any) => {
      const name = t.assignedName || 'Unassigned'
      if (!byAssignee[name]) byAssignee[name] = []
      byAssignee[name].push(t)
    })
    Object.entries(byAssignee).forEach(([name, tasks]) => {
      const worst = Math.max(...tasks.map((t: any) =>
        Math.floor((Date.now() - new Date(t.dueDate).getTime()) / 86400000)
      ))
      notifs.push({
        id: 'team-overdue-' + name,
        category: worst > 7 ? 'critical' : 'warning',
        icon: <UserCircle size={14} />,
        title: \`\${name} — \${tasks.length} Overdue Task\${tasks.length !== 1 ? 's' : ''}\`,
        body: tasks.map((t: any) => t.title).slice(0, 2).join(', ') +
          (tasks.length > 2 ? \` +\${tasks.length - 2} more\` : '') +
          \` — Oldest: \${worst} days overdue\`,
        action: '/tasks',
        who: 'team',
      })
    })

    // Tasks with no assignee
    const unassigned = (allTasks ?? []).filter((t: any) =>
      !t.assignedTo && t.status !== 'done'
    )
    if (unassigned.length > 0) {
      notifs.push({
        id: 'unassigned-tasks',
        category: 'warning',
        icon: <UserCircle size={14} />,
        title: \`\${unassigned.length} Task\${unassigned.length !== 1 ? 's' : ''} Not Assigned\`,
        body: unassigned.map((t: any) => t.title).slice(0, 2).join(', ') +
          (unassigned.length > 2 ? \` +\${unassigned.length - 2} more\` : ''),
        action: '/tasks',
        who: 'team',
      })
    }

    // Meeting actions overdue
    const overdueActions = meetings?.overdueActions ?? 0
    if (overdueActions > 0) {
      notifs.push({
        id: 'meeting-actions', category: 'warning',
        icon: <CheckCircle size={14} />,
        title: 'Meeting Actions Overdue',
        body: \`\${overdueActions} action item\${overdueActions !== 1 ? 's' : ''} past due date — assign or close them\`,
        action: '/meetings',
        who: 'team',
      })
    }

    // Today's diary not filed
    const latestEntry = Array.isArray(diaryList) ? diaryList[0] : null
    const latestDate  = latestEntry?.date?.split('T')[0]
    if (latestDate !== today) {
      notifs.push({
        id: 'diary-today', category: 'warning',
        icon: <BookOpen size={14} />,
        title: "📋 Today's Site Diary Not Filed",
        body: 'No site diary entry for ' + new Date().toLocaleDateString('en-IN', { day:'numeric', month:'short' }) + ' — site engineer needs to file it',
        action: '/diary?action=new',
        who: 'team',
      })
    } else if (latestEntry?.status === 'draft') {
      notifs.push({
        id: 'diary-draft', category: 'info',
        icon: <BookOpen size={14} />,
        title: "📝 Today's Diary in Draft",
        body: "Site diary for today not yet submitted — pending engineer's submission",
        action: '/diary',
        who: 'team',
      })
    }

    // EOT accumulating
    const eotDays = diaryDash?.eotClaimDays ?? 0
    if (eotDays > 0) {
      notifs.push({
        id: 'eot-days', category: eotDays > 30 ? 'critical' : 'warning',
        icon: <Warning size={14} />,
        title: \`EOT: \${eotDays} Claim Days on Record\`,
        body: \`\${diaryDash?.hoursLostWeather ?? 0} hours lost to weather — document for formal EOT submission\`,
        action: '/diary',
        who: 'team',
      })
    }

    // Attendance
    const presentToday = hrDash?.presentToday ?? 0
    const totalEmp     = hrDash?.totalEmployees ?? 0
    if (totalEmp > 0 && presentToday === 0) {
      notifs.push({
        id: 'attendance-zero', category: 'warning',
        icon: <UserCircle size={14} />,
        title: "🧑‍💼 Attendance Not Marked Today",
        body: \`No attendance recorded. \${totalEmp} employee\${totalEmp !== 1 ? 's' : ''} on roster — mark now\`,
        action: '/hr/attendance?action=mark',
        who: 'team',
      })
    }

    // Known pending letters >14 days
    const knownPendingLetters = [
      { ref:'KIPL/UEED/DAL LAKE/48-26',    subject:'VSC Ground Improvement Approval',  sent:'2026-03-24' },
      { ref:'KIPL/UEED/Dal Lake/0044-26',  subject:'BEP R3 Final Approval',            sent:'2026-03-16' },
    ].map(l => ({ ...l, days: Math.floor((Date.now() - new Date(l.sent).getTime()) / 86400000) }))
     .filter(l => l.days > 14)

    knownPendingLetters.forEach(l => {
      notifs.push({
        id: 'letter-' + l.ref, category: 'critical',
        icon: <FileText size={14} />,
        title: \`No Response — \${l.days} Days\`,
        body: \`\${l.ref} — \${l.subject}\`,
        action: '/liaison/letters',
        who: 'team',
      })
    })

    // WBS blockers
    ;[
      { id:'bep', title:'BEP Approval Pending by UEED', body:'BEP R3 submitted 16-Mar-2026 — no approval yet. Blocking STP civil works start.', days:26 },
      { id:'vsc', title:'VSC Approval Pending by UEED', body:'KELLER go-ahead requested 24-Mar-2026 — no response. Ground improvement cannot start.', days:18 },
    ].forEach(b => {
      notifs.push({
        id: 'wbs-' + b.id, category: 'critical',
        icon: <Hammer size={14} />,
        title: b.title,
        body: b.body,
        action: '/wbs',
        who: 'team',
      })
    })

    // Incomplete project data
    const requiredPending = pendingData.filter(label =>
      PENDING_ITEMS.find(p => p.label === label && p.required)
    )
    if (requiredPending.length > 0) {
      notifs.push({
        id: 'data-completeness', category: 'warning',
        icon: <Warning size={14} />,
        title: \`\${requiredPending.length} Required Project Data Missing\`,
        body: requiredPending.slice(0, 2).join(', ') +
          (requiredPending.length > 2 ? \` +\${requiredPending.length - 2} more\` : ''),
        action: '/settings/system',
        who: 'team',
      })
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION C — LIAISON OFFICER VIEW
  // ─────────────────────────────────────────────────────────────────────────────
  if (isLiaison && !isPM) {
    const overdueActions = meetings?.overdueActions ?? 0
    if (overdueActions > 0) {
      notifs.push({
        id: 'liaison-actions', category: 'warning',
        icon: <FileText size={14} />,
        title: 'Meeting Action Items Overdue',
        body: \`\${overdueActions} action items assigned to you are past due date\`,
        action: '/meetings',
        who: 'you',
      })
    }
    ;[
      { ref:'KIPL/UEED/DAL LAKE/48-26', subject:'VSC Approval — Follow up with UEED EXEN', sent:'2026-03-24' },
      { ref:'KIPL/UEED/Dal Lake/0044-26', subject:'BEP R3 Approval — Follow up with UEED EXEN', sent:'2026-03-16' },
    ].map(l => ({ ...l, days: Math.floor((Date.now() - new Date(l.sent).getTime()) / 86400000) }))
     .filter(l => l.days > 14)
     .forEach(l => {
       notifs.push({
         id: 'liaison-letter-' + l.ref, category: 'critical',
         icon: <FileText size={14} />,
         title: \`Follow Up Required — \${l.days} Days\`,
         body: l.subject,
         action: '/liaison/letters',
         who: 'you',
       })
     })
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION D — ENGINEER / SUPERVISOR VIEW
  // ─────────────────────────────────────────────────────────────────────────────
  if (user?.role === 'engineer' || user?.role === 'supervisor') {
    const latestEntry = Array.isArray(diaryList) ? diaryList[0] : null
    const latestDate  = latestEntry?.date?.split('T')[0]
    if (latestDate !== today) {
      notifs.push({
        id: 'eng-diary-today', category: 'warning',
        icon: <BookOpen size={14} />,
        title: "📋 File Today's Site Diary",
        body: 'You need to submit the daily site diary for ' +
          new Date().toLocaleDateString('en-IN', { day:'numeric', month:'short' }),
        action: '/diary?action=new',
        who: 'you',
      })
    }
  }

  // Sort: critical → warning → info, then "you" before "team"
  const order: Record<NotifCategory, number> = { critical:0, warning:1, info:2 }
  notifs.sort((a, b) => {
    const catDiff = order[a.category] - order[b.category]
    if (catDiff !== 0) return catDiff
    if (a.who === 'you' && b.who !== 'you') return -1
    if (b.who === 'you' && a.who !== 'you') return  1
    return 0
  })

  return {
    notifs,
    critical: notifs.filter(n => n.category === 'critical').length,
    myCount:  notifs.filter(n => n.who === 'you').length,
    total:    notifs.length,
  }
}`

// Find and replace the hook in the file
const hookStart = src.indexOf(OLD_HOOK_START)
const hookEnd   = src.indexOf(OLD_HOOK_END)

if (hookStart === -1) {
  console.log('❌ Could not find hook start — AppHeader may have changed')
  process.exit(1)
}
if (hookEnd === -1) {
  console.log('❌ Could not find hook end')
  process.exit(1)
}

src = src.slice(0, hookStart) + NEW_HOOK + src.slice(hookEnd + OLD_HOOK_END.length)

// Also update the Notif interface to add 'who' field
src = src.replace(
  `interface Notif {
  id:       string
  category: NotifCategory
  icon:     React.ReactNode
  title:    string
  body:     string
  action?:  string   // route to navigate to
  time?:    string
}`,
  `interface Notif {
  id:       string
  category: NotifCategory
  icon:     React.ReactNode
  title:    string
  body:     string
  action?:  string
  time?:    string
  who?:     'you' | 'team'   // 'you' = personal, 'team' = PM oversight
}`
)

// Update the return to use myCount too
src = src.replace(
  `  const { notifs, critical, total } = useNotifications()`,
  `  const { notifs, critical, total, myCount } = useNotifications()`
)

// Update notification header to show personal vs team split
src = src.replace(
  `                <div style={{ display:'flex', gap:6 }}>
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
                </div>`,
  `                <div style={{ display:'flex', gap:6 }}>
                  {myCount > 0 && (
                    <span style={{ fontSize:11, padding:'2px 8px', background:'#fef2f2',
                      color:C.red, borderRadius:999, fontWeight:700 }}>
                      {myCount} For You
                    </span>
                  )}
                  {total > 0 && (
                    <span style={{ fontSize:11, padding:'2px 8px', background:'#fffbeb',
                      color:C.amber, borderRadius:999, fontWeight:700 }}>
                      {total} Total
                    </span>
                  )}
                </div>`
)

// Add "FOR YOU" / "TEAM" label to each notification row
src = src.replace(
  `                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
                          <p style={{ fontSize:12, fontWeight:700, color:C.text1, margin:0,
                            lineHeight:1.4 }}>{n.title}</p>
                          {n.action && (
                            <ArrowSquareOut size={11} color={C.text3} style={{ flexShrink:0, marginTop:2 }} />
                          )}
                        </div>`,
  `                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:6, flex:1, minWidth:0 }}>
                            {n.who === 'you' && (
                              <span style={{ fontSize:9, fontWeight:800, padding:'1px 5px',
                                borderRadius:99, background:'#fef2f2', color:C.red,
                                flexShrink:0, letterSpacing:'0.04em' }}>YOU</span>
                            )}
                            {n.who === 'team' && (
                              <span style={{ fontSize:9, fontWeight:800, padding:'1px 5px',
                                borderRadius:99, background:'#eff6ff', color:C.blue,
                                flexShrink:0, letterSpacing:'0.04em' }}>TEAM</span>
                            )}
                            <p style={{ fontSize:12, fontWeight:700, color:C.text1, margin:0,
                              lineHeight:1.4 }}>{n.title}</p>
                          </div>
                          {n.action && (
                            <ArrowSquareOut size={11} color={C.text3} style={{ flexShrink:0, marginTop:2 }} />
                          )}
                        </div>`
)

fs.writeFileSync(headerPath, src)
console.log('✅ AppHeader.tsx — role-aware notification system complete')
console.log('')
console.log('Notification matrix:')
console.log('')
console.log('  👤 EVERYONE sees:')
console.log('     • Their own overdue tasks (YOU label, red)')
console.log('     • Their own blocked tasks (YOU label)')
console.log('     • Their own tasks in review (YOU label)')
console.log('')
console.log('  🏗  ENGINEER / SUPERVISOR also sees:')
console.log('     • Reminder to file today\'s site diary (YOU label)')
console.log('')
console.log('  📋 LIAISON OFFICER also sees:')
console.log('     • Overdue follow-up letters (YOU label)')
console.log('     • Meeting actions assigned to them')
console.log('')
console.log('  👔 PM / SUPER ADMIN also sees:')
console.log('     • All team overdue tasks grouped by person (TEAM label)')
console.log('     • Unassigned tasks')
console.log('     • Diary not filed / in draft')
console.log('     • Attendance not marked')
console.log('     • EOT claim days accumulating')
console.log('     • Pending letters >14 days')
console.log('     • WBS blockers (BEP, VSC)')
console.log('     • Incomplete project data')
console.log('')
console.log('  Badge priority: YOU items always shown first')
console.log('  "For You" badge = personal tasks | "Total" = everything')
