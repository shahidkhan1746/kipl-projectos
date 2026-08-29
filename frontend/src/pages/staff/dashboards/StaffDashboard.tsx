import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import { tasksApi } from '@/api/tasks.api'
import { wbsApi } from '@/api/wbs.api'
import {
  ClipboardText, CheckCircle, Clock, WarningCircle,
  Sparkle, ImagesSquare, ArrowRight
} from '@phosphor-icons/react'

const C = {
  card: '#fff',
  border: '#e2e8f0',
  text1: '#0f172a',
  text2: '#475569',
  text3: '#94a3b8',
  blue: '#2563eb',
  green: '#059669',
  amber: '#d97706',
  red: '#dc2626',
  navy: '#1a2540',
  bgGray: '#f8fafc',
}

const fmtD = (s?: string) =>
  s ? new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

export default function StaffDashboard() {
  const { user, activeProjectId } = useAuthStore()
  const nav = useNavigate()
  const today = new Date().toISOString().split('T')[0]

  const { data: myTasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['my-tasks', user?.id],
    queryFn: () => tasksApi.list({ projectId: activeProjectId, assignedTo: user?.id }).then(r => r.data),
    enabled: !!user?.id,
  })

  const { data: wbsDash } = useQuery({
    queryKey: ['wbs-dash-summary', activeProjectId],
    queryFn: () => wbsApi.dashboard(activeProjectId!).then(r => r.data),
    enabled: !!activeProjectId,
  })

  const tasksList = myTasks ?? []
  const pendingTasks = tasksList.filter((t: any) => t.status !== 'done')
  const completedTasks = tasksList.filter((t: any) => t.status === 'done')
  const overdueTasks = tasksList.filter((t: any) => t.dueDate && t.dueDate < today && t.status !== 'done')

  const roleLabel = (user?.role || 'Staff').replace('_', ' ').toUpperCase()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1200, margin: '0 auto' }}>
      {/* Welcome Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1a2540 0%, #243356 100%)',
          borderRadius: 16,
          padding: '24px 28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: '#93c5fd',
                background: 'rgba(59,130,246,0.2)',
                padding: '3px 8px',
                borderRadius: 6,
                letterSpacing: '0.08em',
              }}
            >
              {roleLabel}
            </span>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>{fmtD(today)}</span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: '0 0 4px' }}>
            Welcome, {user?.name ?? 'User'}
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', margin: 0 }}>
            Dal Lake Sewerage Scheme · KIPL ProjectOS
          </p>
        </div>

        {wbsDash?.contractPct !== undefined && (
          <div
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 12,
              padding: '12px 18px',
              textAlign: 'right',
            }}
          >
            <div style={{ fontSize: 24, fontWeight: 900, color: '#93c5fd' }}>{wbsDash.contractPct}%</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Contract Timeline Elapsed</div>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        {[
          {
            label: 'My Open Tasks',
            value: pendingTasks.length,
            color: C.blue,
            icon: ClipboardText,
            onClick: () => nav('/tasks'),
          },
          {
            label: 'Overdue Tasks',
            value: overdueTasks.length,
            color: overdueTasks.length > 0 ? C.red : C.green,
            icon: WarningCircle,
            onClick: () => nav('/tasks'),
          },
          {
            label: 'Completed Tasks',
            value: completedTasks.length,
            color: C.green,
            icon: CheckCircle,
            onClick: () => nav('/tasks'),
          },
          {
            label: 'AI Knowledge Assistant',
            value: 'Ready',
            color: '#8b5cf6',
            icon: Sparkle,
            onClick: () => nav('/ai'),
          },
        ].map(k => (
          <div
            key={k.label}
            onClick={k.onClick}
            style={{
              background: C.card,
              border: `1.5px solid ${C.border}`,
              borderRadius: 12,
              padding: '16px 18px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              transition: 'transform 0.15s ease, border-color 0.15s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = k.color
              e.currentTarget.style.transform = 'translateY(-1px)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = C.border
              e.currentTarget.style.transform = 'none'
            }}
          >
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: C.text3, margin: '0 0 6px', textTransform: 'uppercase' }}>
                {k.label}
              </p>
              <p style={{ fontSize: 22, fontWeight: 800, color: C.text1, margin: 0 }}>{k.value}</p>
            </div>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: `${k.color}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <k.icon size={20} color={k.color} weight="bold" />
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 18 }}>
        {/* My Tasks Section */}
        <div
          style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 14,
            padding: 20,
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text1, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <ClipboardText size={18} color={C.blue} weight="bold" />
              My Assigned Tasks
            </h3>
            <button
              onClick={() => nav('/tasks')}
              style={{
                fontSize: 12,
                color: C.blue,
                fontWeight: 600,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              View Board <ArrowRight size={14} />
            </button>
          </div>

          {tasksLoading ? (
            <p style={{ color: C.text3, fontSize: 13, textAlign: 'center', padding: '24px 0' }}>Loading tasks...</p>
          ) : tasksList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 16px', color: C.text3 }}>
              <CheckCircle size={36} color={C.green} style={{ marginBottom: 8 }} />
              <p style={{ fontSize: 13, fontWeight: 600, color: C.text2, margin: '0 0 4px' }}>No active tasks assigned</p>
              <p style={{ fontSize: 12, margin: 0 }}>You are all caught up for today.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {tasksList.slice(0, 5).map((t: any) => {
                const isOverdue = t.dueDate && t.dueDate < today && t.status !== 'done'
                const isDone = t.status === 'done'
                return (
                  <div
                    key={t.id}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 8,
                      border: `1px solid ${C.border}`,
                      background: isDone ? '#f8fafc' : '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: isDone ? C.text3 : C.text1,
                          textDecoration: isDone ? 'line-through' : 'none',
                          margin: '0 0 3px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {t.title}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: C.text3 }}>
                        <span>Due: {fmtD(t.dueDate)}</span>
                        {isOverdue && <span style={{ color: C.red, fontWeight: 700 }}>OVERDUE</span>}
                      </div>
                    </div>

                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: 6,
                        textTransform: 'uppercase',
                        background: isDone ? '#ecfdf5' : t.status === 'in_progress' ? '#eff6ff' : '#f1f5f9',
                        color: isDone ? C.green : t.status === 'in_progress' ? C.blue : C.text2,
                      }}
                    >
                      {t.status?.replace('_', ' ') ?? 'TODO'}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Quick Links & Information */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            style={{
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 14,
              padding: 20,
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            }}
          >
            <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text1, margin: '0 0 14px' }}>
              Quick Navigation
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                onClick={() => nav('/ai')}
                style={{
                  padding: '12px 14px',
                  borderRadius: 8,
                  border: `1px solid #e0e7ff`,
                  background: '#f5f3ff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  textAlign: 'left',
                  width: '100%',
                }}
              >
                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Sparkle size={18} color="#fff" weight="bold" />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#4c1d95', margin: 0 }}>AI Project Assistant</p>
                  <p style={{ fontSize: 11, color: '#6d28d9', margin: 0 }}>Ask questions about technical specs, drawings, or procedures</p>
                </div>
              </button>

              <button
                onClick={() => nav('/updates')}
                style={{
                  padding: '12px 14px',
                  borderRadius: 8,
                  border: `1px solid #e2e8f0`,
                  background: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  textAlign: 'left',
                  width: '100%',
                }}
              >
                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ImagesSquare size={18} color={C.navy} weight="bold" />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: C.text1, margin: 0 }}>Project Progress Updates</p>
                  <p style={{ fontSize: 11, color: C.text2, margin: 0 }}>View recent milestones, site photos, and news</p>
                </div>
              </button>
            </div>
          </div>

          <div
            style={{
              background: '#f8fafc',
              border: `1px solid ${C.border}`,
              borderRadius: 14,
              padding: 16,
            }}
          >
            <p style={{ fontSize: 12, fontWeight: 700, color: C.navy, margin: '0 0 4px' }}>Project Information</p>
            <p style={{ fontSize: 11, color: C.text2, margin: 0, lineHeight: 1.5 }}>
              Dal Lake Sewerage Scheme, Srinagar. For assistance or reporting, please reach out to your Site Supervisor or Project Manager.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
