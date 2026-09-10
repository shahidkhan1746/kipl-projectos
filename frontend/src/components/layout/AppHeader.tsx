import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Bell, SignOut, CaretDown, Camera, Warning, CheckCircle,
  ClockCountdown, FileText, BookOpen, UserCircle,
  ArrowSquareOut, Lock, Gear, Envelope, List,
  Buildings, MapPin, Sparkle } from '@phosphor-icons/react'
import { useAuthStore } from '@/store/auth.store'
import { useQuery } from '@tanstack/react-query'
import { tasksApi }    from '@/api/tasks.api'
import { meetingsApi } from '@/api/meetings.api'
import { diaryApi }    from '@/api/diary.api'
import { hrApi }       from '@/api/hr.api'
import { settingsApi } from '@/api/settings.api'
import { projectsApi } from '@/api/projects.api'
import { authApi } from '@/api/auth.api'
import { profileApi } from '@/api/profile.api'
import { PENDING_ITEMS } from '@/components/ui/DataCompletenessModal'

const C = {
  navy:'#1a2540', blue:'#2563eb', border:'#e2e8f0',
  text1:'#0f172a', text2:'#475569', text3:'#94a3b8',
  red:'#dc2626', amber:'#d97706', green:'#059669',
}

const ROLE_LABELS: Record<string,string> = {
  super_admin:'Super Admin', admin:'Admin', project_manager:'Project Manager',
  liaison_officer:'Liaison Officer', hr_officer:'HR Officer',
  engineer:'Site Engineer', accounts:'Accounts Officer',
  qa_engineer:'QA Engineer', supervisor:'Site Supervisor',
  accountant:'Accountant', field_staff:'Field Staff', viewer:'Viewer',
}

const PAGE_TITLES: Record<string, { title: string; sub: string }> = {
  '/profile':             { title:'My Profile',        sub:'Personal identity & security settings' },
  '/dashboard':           { title:'Dashboard',         sub:'Project overview' },
  '/ai':                  { title:'ProjectOS Intelligence', sub:'AI engineering & operations advisor' },
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
  '/hr/leave':            { title:'Leave',              sub:'Applications & approvals' },
  '/hr/salary':           { title:'Salary',             sub:'Payroll management' },
  '/jha':                 { title:'JHA Compliance',     sub:'Star-rating checklist' },
  '/fleet':               { title:'Fleet & Plant Log',  sub:'Machinery and vehicles' },
  '/om':                  { title:'O&M',                sub:'STP operations' },
  '/material-register':   { title:'Cement & Steel',     sub:'Material register' },
  '/site-orders':         { title:'Site Order Book',    sub:'Site instructions' },
  '/compliance':          { title:'Contract Compliance',sub:'Tender obligations' },
  '/updates':             { title:'Project Updates',    sub:'Public site CMS' },
  '/settings/ai':         { title:'AI Settings',        sub:'Providers and keys' },
  '/settings/storage':    { title:'Storage',            sub:'Cloud media' },
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
  action?:  string
  time?:    string
  who?:     'you' | 'team'   // 'you' = personal, 'team' = PM oversight
}

function NotifDot({ cat }: { cat: NotifCategory }) {
  const bg = cat === 'critical' ? C.red : cat === 'warning' ? C.amber : C.blue
  return <div style={{ width:8, height:8, borderRadius:'50%', background:bg, flexShrink:0, marginTop:5 }} />
}

// ── Hook: build role-aware, person-aware notifications ───────────────────────
function useNotifications() {
  const { activeProjectId, user } = useAuthStore()
  const today = new Date().toISOString().split('T')[0]

  const isPM      = user?.role === 'super_admin' || user?.role === 'project_manager' || user?.role === 'admin'
  const isManager = isPM
  const isHR      = user?.role === 'hr_officer'  || isPM
  const isLiaison = user?.role === 'liaison_officer' || isPM

  const { data: nameRequests } = useQuery({
    queryKey: ['notif-name-requests'],
    queryFn:  () => profileApi.getNameChangeRequests(),
    refetchInterval: 30000,
    enabled:  !!user,
  })

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
    queryFn:  () => meetingsApi.dashboard(activeProjectId!).then(r => r.data),
    enabled:  !!activeProjectId, refetchInterval: 60000,
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
      title: 'Your Task is Overdue',
      body: `"${t.title}" was due ${days} day${days !== 1 ? 's' : ''} ago — please update your status`,
      action: `/tasks?taskId=${t.id}`,
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
      title: 'Your Task is Blocked',
      body: `"${t.title}" is blocked — add a comment explaining the blocker`,
      action: `/tasks?taskId=${t.id}`,
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
      title: 'Your Task is In Review',
      body: `"${t.title}" is pending review — awaiting approval from PM`,
      action: `/tasks?taskId=${t.id}`,
      who: 'you',
    })
  })

  // Name correction status for current user
  if (Array.isArray(nameRequests)) {
    const myPending = nameRequests.find(r => r.userId === user?.id && r.status === 'pending')
    if (myPending) {
      notifs.push({
        id: 'my-name-req-pending',
        category: 'info',
        icon: <ClockCountdown size={14} />,
        title: 'Name Correction Pending',
        body: `Your request to correct name to "${myPending.requestedName}" is awaiting PM/Admin approval`,
        action: '/profile',
        time: myPending.createdAt,
        who: 'you',
      })
    }
    const myApproved = nameRequests.find(r => r.userId === user?.id && r.status === 'approved')
    if (myApproved && myApproved.reviewedAt) {
      const days = Math.floor((Date.now() - new Date(myApproved.reviewedAt).getTime()) / 86400000)
      if (days < 3) {
        notifs.push({
          id: 'my-name-req-approved',
          category: 'info',
          icon: <CheckCircle size={14} />,
          title: 'Name Correction Approved',
          body: `Your name was updated to "${myApproved.requestedName}" by ${myApproved.reviewedBy || 'Manager'}`,
          action: '/profile',
          time: myApproved.reviewedAt,
          who: 'you',
        })
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION B — PM / MANAGER VIEW (team-wide oversight)
  // "Your team has work pending"
  // ─────────────────────────────────────────────────────────────────────────────
  if (isPM) {
    // Pending employee name change requests requiring PM / Admin acceptance
    if (Array.isArray(nameRequests)) {
      const pendingNames = nameRequests.filter(r => r.status === 'pending')
      pendingNames.forEach(r => {
        notifs.push({
          id: 'team-name-req-' + r.id,
          category: 'warning',
          icon: <UserCircle size={14} />,
          title: 'Name Correction Request',
          body: `${r.currentName} requested spelling correction to "${r.requestedName}" — review & accept`,
          action: '/profile',
          time: r.createdAt,
          who: 'team',
        })
      })
    }

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
        title: `${name} — ${tasks.length} Overdue Task${tasks.length !== 1 ? 's' : ''}`,
        body: tasks.map((t: any) => t.title).slice(0, 2).join(', ') +
          (tasks.length > 2 ? ` +${tasks.length - 2} more` : '') +
          ` — Oldest: ${worst} days overdue`,
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
        title: `${unassigned.length} Task${unassigned.length !== 1 ? 's' : ''} Not Assigned`,
        body: unassigned.map((t: any) => t.title).slice(0, 2).join(', ') +
          (unassigned.length > 2 ? ` +${unassigned.length - 2} more` : ''),
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
        body: `${overdueActions} action item${overdueActions !== 1 ? 's' : ''} past due date — assign or close them`,
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
        title: "Today's Site Diary Not Filed",
        body: 'No site diary entry for ' + new Date().toLocaleDateString('en-IN', { day:'numeric', month:'short' }) + ' — site engineer needs to file it',
        action: '/diary?action=new',
        who: 'team',
      })
    } else if (latestEntry?.status === 'draft') {
      notifs.push({
        id: 'diary-draft', category: 'info',
        icon: <BookOpen size={14} />,
        title: "Today's Diary in Draft",
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
        title: `EOT: ${eotDays} Claim Days on Record`,
        body: `${diaryDash?.hoursLostWeather ?? 0} hours lost to weather — document for formal EOT submission`,
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
        title: "Attendance Not Marked Today",
        body: `No attendance recorded. ${totalEmp} employee${totalEmp !== 1 ? 's' : ''} on roster — mark now`,
        action: '/hr/attendance?action=mark',
        who: 'team',
      })
    }

    // Incomplete project data
    const requiredPending = pendingData.filter(label =>
      PENDING_ITEMS.find(p => p.label === label && p.required)
    )
    if (requiredPending.length > 0) {
      notifs.push({
        id: 'data-completeness', category: 'warning',
        icon: <Warning size={14} />,
        title: `${requiredPending.length} Required Project Data Missing`,
        body: requiredPending.slice(0, 2).join(', ') +
          (requiredPending.length > 2 ? ` +${requiredPending.length - 2} more` : ''),
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
        body: `${overdueActions} action items assigned to you are past due date`,
        action: '/meetings',
        who: 'you',
      })
    }
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
        title: "File Today's Site Diary",
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
}

interface AppHeaderProps {
  onToggleSidebar?: () => void
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AppHeader({ onToggleSidebar }: AppHeaderProps) {
  const { user, logout, activeProjectId, setProject } = useAuthStore()
  const { data: projects } = useQuery({
    queryKey: ['header-projects'],
    queryFn: () => projectsApi.list().then(r => Array.isArray(r.data) ? r.data : (r.data?.data ?? [])),
    enabled: !!user,
  })
  const nav                = useNavigate()
  const location           = useLocation()
  const [showProfile, setShowProfile] = useState(false)
  const [showNotifs,  setShowNotifs]  = useState(false)
  const [showProjectSelect, setShowProjectSelect] = useState(false)
  const [avatar, setAvatar] = useState<string | null>(
    () => localStorage.getItem('avatar_' + (user?.id ?? ''))
  )
  const profileRef = useRef<HTMLDivElement>(null)
  const notifRef   = useRef<HTMLDivElement>(null)
  const projectRef = useRef<HTMLDivElement>(null)
  const fileRef    = useRef<HTMLInputElement>(null)

  const { notifs, critical, total, myCount } = useNotifications()

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfile(false)
      if (notifRef.current   && !notifRef.current.contains(e.target as Node))   setShowNotifs(false)
      if (projectRef.current && !projectRef.current.contains(e.target as Node)) setShowProjectSelect(false)
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

  const allProjects = Array.isArray(projects) && projects.length > 0
    ? (projects.some((p: any) => p.code === 'ANG' || p.code === 'ANG-STP-2026' || p.name?.includes('Anantnag'))
        ? projects
        : [...projects, {
            id: '2cab433d-0cb2-4739-8a27-de97f4a510a8',
            name: 'Anantnag',
            code: 'ANG',
            status: 'upcoming',
            location: 'Anantnag, Kashmir',
          }]
      )
    : [
        {
          id: '4a5176c7-0f53-42cc-bbd8-1a7259648a96',
          name: 'Dal Lake Sewerage Scheme',
          code: 'DAL-STP-2025',
          status: 'active',
          location: 'Srinagar, J&K',
        },
        {
          id: '2cab433d-0cb2-4739-8a27-de97f4a510a8',
          name: 'Anantnag',
          code: 'ANG',
          status: 'upcoming',
          location: 'Anantnag, Kashmir',
        },
      ]

  const currentProject = allProjects.find((p: any) => p.id === activeProjectId && p.status === 'active')
    || allProjects.find((p: any) => p.code === 'DAL-STP-2025')
    || allProjects.find((p: any) => p.status === 'active')
    || allProjects.find((p: any) => p.id === activeProjectId)
    || allProjects[0]

  useEffect(() => {
    const dalLake = allProjects.find((p: any) => p.code === 'DAL-STP-2025' || p.status === 'active')
    if (!activeProjectId && dalLake?.id) {
      setProject(dalLake.id)
    } else if (activeProjectId === '2cab433d-0cb2-4739-8a27-de97f4a510a8' && dalLake?.id) {
      setProject(dalLake.id)
    }
  }, [])

  const initials = user?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) ?? 'U'
  const pageMeta = PAGE_TITLES[location.pathname]
    ?? Object.entries(PAGE_TITLES).find(([k]) => location.pathname.startsWith(k))?.[1]
    ?? { title:'ProjectOS', sub:'Khilari Infrastructure' }

  const bellColor = critical > 0 ? C.red : total > 0 ? C.amber : C.text2

  return (
    <>
      <style>{`
        .app-header-container {
          min-height: calc(60px + env(safe-area-inset-top));
          background: #fff;
          border-bottom: 1.5px solid ${C.border};
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: env(safe-area-inset-top) max(16px, env(safe-area-inset-right)) 0 max(16px, env(safe-area-inset-left));
          flex-shrink: 0;
          z-index: 100;
        }
        @media (min-width: 1024px) {
          .app-header-container {
            min-height: 64px;
            padding: 0 28px;
          }
        }
        .header-title-text {
          font-size: 15px;
          font-weight: 800;
          color: ${C.text1};
          margin: 0;
          letter-spacing: -0.02em;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        @media (min-width: 640px) {
          .header-title-text {
            font-size: 17px;
          }
        }
        .header-sub-text {
          font-size: 11px;
          color: ${C.text3};
          margin: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        @media (max-width: 480px) {
          .header-sub-text {
            display: none;
          }
        }
        .profile-name-text {
          font-size: 12px;
          font-weight: 700;
          color: ${C.text1};
          margin: 0;
          line-height: 1.2;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 110px;
        }
        @media (max-width: 640px) {
          .profile-details-box {
            display: none;
          }
        }
        .header-popover {
          max-height: calc(100vh - 76px);
          overflow-y: auto !important;
          overscroll-behavior: contain;
          -webkit-overflow-scrolling: touch;
        }
        @supports (height: 100dvh) {
          .header-popover { max-height: calc(100dvh - 76px); }
        }
        @media (max-width: 359px) {
          .app-header-container { padding-right: 8px; padding-left: 8px; }
          .profile-caret { display: none; }
        }
      `}</style>

      <header className="app-header-container">
        {/* Left: Mobile hamburger + Page title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1, paddingRight: 8 }}>
          {/* Hamburger button on mobile */}
          <button
            onClick={onToggleSidebar}
            className="mobile-only"
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: '#f8f9fc',
              border: `1.5px solid ${C.border}`,
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: C.text1,
              flexShrink: 0,
            }}
            aria-label="Open navigation menu"
          >
            <List size={20} weight="bold" />
          </button>

          <div style={{ minWidth: 0, flex: 1 }}>
            <p className="header-title-text">
              {pageMeta.title}
            </p>
            <p className="header-sub-text">{pageMeta.sub}</p>
          </div>
        </div>

        {/* Right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>

          {/* ── Project Selector ── */}
          <div ref={projectRef} style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setShowProjectSelect(s => !s)}
              style={{
                height: 38,
                padding: '0 10px 0 8px',
                borderRadius: 10,
                background: '#f8f9fc',
                border: `1.5px solid ${C.border}`,
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                cursor: 'pointer',
                color: C.text1,
              }}
              aria-label="Active site selector"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: currentProject?.status === 'upcoming' ? C.amber : C.green,
                    boxShadow: currentProject?.status === 'upcoming' ? '0 0 0 2px #fef3c7' : '0 0 0 2px #d1fae5',
                    flexShrink: 0,
                  }}
                />
                <Buildings size={15} color={C.blue} weight="bold" />
              </div>

              <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: C.text1, letterSpacing: '-0.01em' }}>
                    {currentProject?.code || 'DAL-STP-2025'}
                  </span>
                  {currentProject?.status === 'upcoming' && (
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 800,
                        padding: '1px 5px',
                        borderRadius: 4,
                        background: '#fef3c7',
                        color: '#b45309',
                      }}
                    >
                      SOON
                    </span>
                  )}
                </div>
              </div>

              <CaretDown size={11} color={C.text3} style={{ marginLeft: 1 }} />
            </button>

            {showProjectSelect && (
              <div
                className="header-popover"
                style={{
                  position: 'absolute',
                  top: 48,
                  right: 0,
                  width: 330,
                  maxWidth: 'calc(100vw - 24px)',
                  background: '#fff',
                  borderRadius: 14,
                  border: `1.5px solid ${C.border}`,
                  boxShadow: '0 12px 40px rgba(0,0,0,0.14)',
                  zIndex: 200,
                  overflow: 'hidden',
                }}
              >
                {/* Header */}
                <div
                  style={{
                    padding: '12px 16px',
                    borderBottom: `1.5px solid ${C.border}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: '#f8fafc',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <MapPin size={14} color={C.blue} weight="fill" />
                    <span style={{ fontSize: 12, fontWeight: 800, color: C.text1 }}>
                      KIPL Kashmir Sites
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 99,
                      background: '#eff6ff',
                      color: C.blue,
                    }}
                  >
                    {allProjects.length} Projects
                  </span>
                </div>

                {/* Project List */}
                <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {allProjects.map((p: any) => {
                    const isSelected = activeProjectId === p.id || (!activeProjectId && p.status === 'active')
                    const isUpcoming = p.status === 'upcoming' || p.code?.includes('ANG') || p.name?.includes('Anantnag')

                    return (
                      <div
                        key={p.id}
                        onClick={() => {
                          setProject(p.id)
                          setShowProjectSelect(false)
                        }}
                        style={{
                          padding: '12px 14px',
                          borderRadius: 10,
                          border: isSelected ? `1.5px solid ${C.blue}` : `1px solid ${C.border}`,
                          background: isSelected ? '#f0f7ff' : '#ffffff',
                          cursor: 'pointer',
                        }}
                        onMouseEnter={e => {
                          if (!isSelected) e.currentTarget.style.background = '#f8fafc'
                        }}
                        onMouseLeave={e => {
                          if (!isSelected) e.currentTarget.style.background = '#ffffff'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                            <span
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                background: isUpcoming ? C.amber : C.green,
                                boxShadow: isUpcoming ? '0 0 0 2px #fef3c7' : '0 0 0 2px #d1fae5',
                                flexShrink: 0,
                              }}
                            />
                            <span style={{ fontSize: 13, fontWeight: 800, color: C.text1 }}>
                              {p.code}
                            </span>
                          </div>

                          {isUpcoming ? (
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 800,
                                padding: '2px 8px',
                                borderRadius: 99,
                                background: '#fffbeb',
                                color: '#b45309',
                                border: '1px solid #fde68a',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              <Sparkle size={10} weight="fill" />
                              COMING SOON
                            </span>
                          ) : (
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: 99,
                                background: '#ecfdf5',
                                color: C.green,
                                border: '1px solid #a7f3d0',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              <CheckCircle size={10} weight="fill" />
                              ACTIVE
                            </span>
                          )}
                        </div>

                        <div style={{ fontSize: 12, fontWeight: 700, color: C.text1, marginTop: 5, lineHeight: 1.3 }}>
                          {p.name}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: C.text3, marginTop: 4 }}>
                          <MapPin size={11} color={C.text3} />
                          <span>{p.location || 'Kashmir, J&K'}</span>
                          {p.contractValue && (
                            <>
                              <span>•</span>
                              <span>₹{(Number(p.contractValue) / 10000000).toFixed(0)} Cr</span>
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Footer */}
                <div
                  style={{
                    padding: '10px 14px',
                    background: '#f8fafc',
                    borderTop: `1px solid ${C.border}`,
                    fontSize: 10,
                    color: C.text3,
                    textAlign: 'center',
                  }}
                >
                  KIPL Kashmir Operations • Multi-project telemetry active
                </div>
              </div>
            )}
          </div>

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
            <div className="header-popover" style={{ position:'absolute', top:48, right:0, width:380, maxWidth:'calc(100vw - 24px)',
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
                    <CheckCircle size={28} color={C.green} weight="fill" style={{ margin:'0 auto 8px', display:'block' }} />
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
            style={{ display:'flex', alignItems:'center', gap:8,
              padding:'5px 10px 5px 5px', background:'#f8f9fc',
              border:'1.5px solid '+C.border, borderRadius:999, cursor:'pointer' }}>
            <div style={{ width:30, height:30, borderRadius:'50%', overflow:'hidden',
              background:'#2563eb', display:'flex', alignItems:'center',
              justifyContent:'center', flexShrink:0 }}>
              {avatar
                ? <img src={avatar} alt="avatar" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                : <span style={{ fontSize:12, fontWeight:700, color:'#fff' }}>{initials}</span>}
            </div>
            <div className="profile-details-box" style={{ textAlign:'left' as any }}>
              <p className="profile-name-text">
                {user?.name}
              </p>
              <p style={{ fontSize:10, color:C.text3, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:110 }}>
                {ROLE_LABELS[user?.role ?? ''] ?? user?.role}
              </p>
            </div>
            <CaretDown className="profile-caret" size={12} color={C.text3} style={{ marginLeft:2 }} />
          </button>

          {showProfile && (
            <div className="header-popover" style={{ position:'absolute', top:52, right:0, width:260, maxWidth:'calc(100vw - 24px)',
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
                <div
                  onClick={() => { setShowProfile(false); window.dispatchEvent(new Event('open-data-modal')) }}
                  style={{ margin:'10px 12px 0', padding:'8px 12px', borderRadius:8,
                    background:'#fffbeb', border:'1px solid #fde68a',
                    display:'flex', alignItems:'center', gap:8,
                    cursor:'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.background='#fef3c7')}
                  onMouseLeave={e => (e.currentTarget.style.background='#fffbeb')}>
                  <Warning size={13} color={C.amber} weight='fill' />
                  <p style={{ fontSize:11, color:C.amber, margin:0, fontWeight:600 }}>
                    Project data incomplete — tap to complete
                  </p>
                </div>
              )}

              {/* Menu items */}
              {[
                { Icon: UserCircle, label:'My Profile',      action: () => nav('/profile') },
                { Icon: Lock,       label:'Change Password', action: () => nav('/profile#security') },
                ...(user?.role === 'super_admin' ? [
                  { Icon: Gear,     label:'System Settings', action: () => nav('/settings/system') },
                  { Icon: Envelope, label:'Email Setup',      action: () => nav('/settings/email')  },
                ] : []),
              ].map(item => (
                <button key={item.label}
                  onClick={() => { item.action(); setShowProfile(false) }}
                  style={{ width:'100%', padding:'11px 16px', background:'none', border:'none',
                    cursor:'pointer', display:'flex', alignItems:'center', gap:10,
                    fontSize:13, color:C.text1, textAlign:'left' as any }}
                  onMouseEnter={e => (e.currentTarget.style.background='#f8faff')}
                  onMouseLeave={e => (e.currentTarget.style.background='none')}>
                  <item.Icon size={16} color={C.text3} />{item.label}
                </button>
              ))}

              <div style={{ borderTop:'1.5px solid '+C.border }}>
                <button onClick={async () => {
                  const rt = useAuthStore.getState().refreshToken
                  try { if (rt) await authApi.logout(rt) } catch { /* still sign out locally */ }
                  logout(); nav('/login')
                }}
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
    </header>
  </>
)
}
