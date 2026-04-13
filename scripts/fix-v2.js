// ================================================================
//  KIPL ProjectOS — Design Fix v2
//  Rectangular cards, light inputs, modal fix, no monospace zero
//  Run: node scripts/fix-v2.js
// ================================================================
const fs   = require('fs')
const path = require('path')
const ROOT = path.join(__dirname, '..')
const SRC  = path.join(ROOT, 'frontend', 'src')
const G = '\x1b[32m', B = '\x1b[34m', NC = '\x1b[0m'
const ok   = s => console.log(G + '  ✓' + NC + ' ' + s)
const info = s => console.log(B + '  →' + NC + ' ' + s)
function w(p, c) { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, c.trimStart(), 'utf8') }

// ── Shared light-theme tokens ──────────────────────────────────
const T = {
  pageBg:    '#f0f2f5',
  cardBg:    '#ffffff',
  cardBg2:   '#f8f9fc',
  sidebarBg: '#1a2540',
  border:    '#e2e8f0',
  text1:     '#0f172a',
  text2:     '#475569',
  text3:     '#94a3b8',
  blue:      '#2563eb',
  inputBg:   '#ffffff',
  inputBorder: '#e5e7eb',
}

// shared input style string for reuse in page files
const INPUT_STYLE = `{ padding:'9px 14px', background:'${T.inputBg}', border:'1.5px solid ${T.inputBorder}', borderRadius:8, fontSize:13, color:'${T.text1}', outline:'none', fontFamily:'inherit', transition:'all 0.15s' }`

// ── index.css — ensure light theme root ───────────────────────
info('Updating index.css...')
w(path.join(SRC, 'index.css'), `
@import "tailwindcss";
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body { height: 100%; background: ${T.pageBg}; color: ${T.text1}; font-family: 'Inter', system-ui, sans-serif; font-size: 14px; line-height: 1.5; -webkit-font-smoothing: antialiased; }
#root { height: 100%; }
::-webkit-scrollbar { width: 5px; height: 5px; }
::-webkit-scrollbar-track { background: ${T.pageBg}; }
::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
@keyframes fadeUp { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
.fade-in { animation: fadeUp 0.2s ease forwards; }
@keyframes spin { to { transform: rotate(360deg); } }
.spin { animation: spin 0.8s linear infinite; display: inline-block; }
a { text-decoration: none; color: inherit; }
input, select, textarea, button { font-family: inherit; }
input::placeholder { color: #94a3b8; }
select option { background: #fff; color: #0f172a; }
`)
ok('index.css')

// ── Dashboard — rectangular cards, no monospace, no % ─────────
info('Updating DashboardPage...')
w(path.join(SRC, 'pages/dashboard/DashboardPage.tsx'), `
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth.store'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { liaisonApi } from '@/api/liaison.api'
import api from '@/api/client'
import { FileText, Warning, CheckCircle, Clock, ArrowRight, TrendUp } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'

interface CardProps {
  label: string; value: number; sub: string
  bg: string; icon: React.ReactNode
}

function StatCard({ label, value, sub, bg, icon }: CardProps) {
  return (
    <div style={{
      background: bg,
      borderRadius: 14,
      padding: '22px 28px',
      display: 'flex',
      alignItems: 'center',
      gap: 20,
      boxShadow: '0 4px 20px rgba(0,0,0,0.14)',
      flex: 1,
    }}>
      <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 34, fontWeight: 800, color: '#fff', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
          {value}
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.75)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {label}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>{sub}</div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { user, activeProjectId } = useAuthStore()
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const { data: project } = useQuery({
    queryKey: ['project', activeProjectId],
    queryFn: () => api.get('/api/v1/projects/' + activeProjectId).then(r => r.data),
    enabled: !!activeProjectId,
  })

  const { data: dash } = useQuery({
    queryKey: ['liaison-dash', activeProjectId],
    queryFn: () => liaisonApi.dashboard(activeProjectId ?? undefined).then(r => r.data),
    enabled: !!activeProjectId,
  })

  const { data: filesData } = useQuery({
    queryKey: ['liaison-files-dash', activeProjectId],
    queryFn: () => liaisonApi.files({ projectId: activeProjectId, limit: 8 }).then(r => r.data),
    enabled: !!activeProjectId,
  })

  const pct = Number(project?.progressPct ?? 0)

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '${T.text1}', margin: 0, letterSpacing: '-0.02em' }}>
            {greeting}, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p style={{ fontSize: 14, color: '${T.text3}', marginTop: 5 }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        {project && (
          <div style={{ padding: '8px 16px', borderRadius: 10, background: '#eff6ff', border: '1.5px solid #bfdbfe', color: '#1d4ed8', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendUp size={14} />
            {project.code ?? 'STP-NSH-001'}
          </div>
        )}
      </div>

      {/* Project progress card */}
      {project && (
        <div style={{ background: '${T.sidebarBg}', borderRadius: 16, padding: '26px 30px', boxShadow: '0 4px 24px rgba(26,37,64,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: '#fff', margin: '0 0 5px' }}>{project.name}</h2>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: 0 }}>
                {project.client ?? 'LCMA / UEED'} · ₹{((Number(project.contractValue) || 0) / 1e7).toFixed(2)} Cr
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 42, fontWeight: 900, color: '#93c5fd', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{pct}%</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Complete</div>
            </div>
          </div>
          <div style={{ height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 999, width: pct + '%', background: 'linear-gradient(90deg, #3b82f6, #34d399)', transition: 'width 1.2s ease', boxShadow: '0 0 10px rgba(59,130,246,0.5)' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>
            <span>Start: {project.startDate ?? '—'}</span>
            <span>End: {project.endDate ?? '—'}</span>
          </div>
        </div>
      )}

      {/* Rectangular stat cards — horizontal layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <StatCard
          label="Total Files" value={dash?.total ?? 0} sub="All liaison files"
          bg="linear-gradient(135deg, #1d4ed8, #3b82f6)"
          icon={<FileText size={24} weight="fill" color="#fff" />}
        />
        <StatCard
          label="Under Review" value={dash?.by_status?.under_review ?? 0} sub="Awaiting approval"
          bg="linear-gradient(135deg, #b45309, #f59e0b)"
          icon={<Clock size={24} weight="fill" color="#fff" />}
        />
        <StatCard
          label="Approved" value={dash?.by_status?.approved ?? 0} sub="Successfully cleared"
          bg="linear-gradient(135deg, #047857, #10b981)"
          icon={<CheckCircle size={24} weight="fill" color="#fff" />}
        />
        <StatCard
          label="Overdue" value={dash?.overdue ?? 0}
          sub={dash?.overdue > 0 ? 'Needs attention' : 'All on track'}
          bg={dash?.overdue > 0 ? 'linear-gradient(135deg, #b91c1c, #ef4444)' : 'linear-gradient(135deg, #047857, #10b981)'}
          icon={<Warning size={24} weight="fill" color="#fff" />}
        />
      </div>

      {/* Recent files table */}
      <div style={{ background: '${T.cardBg}', borderRadius: 16, border: '1.5px solid ${T.border}', overflow: 'hidden', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1.5px solid ${T.border}', background: '${T.cardBg2}' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '${T.text1}', margin: 0 }}>Recent Liaison Files</h2>
          <Link to="/liaison" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: '${T.blue}', fontWeight: 600 }}>
            View all <ArrowRight size={13} />
          </Link>
        </div>
        {!filesData ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 0' }}><Spinner /></div>
        ) : !filesData.files?.length ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: '${T.text3}' }}>No liaison files yet.</p>
            <Link to="/liaison" style={{ fontSize: 13, color: '${T.blue}', marginTop: 8, display: 'inline-block', fontWeight: 600 }}>Create your first file →</Link>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '${T.cardBg2}', borderBottom: '1.5px solid ${T.border}' }}>
                {['File No.', 'Subject', 'Department', 'Priority', 'Status', 'Holder'].map(h => (
                  <th key={h} style={{ padding: '11px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '${T.text3}', textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filesData.files.slice(0, 7).map((f: any, i: number) => (
                <tr key={f.id} style={{ borderBottom: i < filesData.files.length - 1 ? '1px solid #f1f5f9' : 'none', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f8faff')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td style={{ padding: '13px 20px', fontSize: 12, fontWeight: 700, color: '${T.blue}', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{f.fileNumber ?? 'DRAFT'}</td>
                  <td style={{ padding: '13px 20px', fontSize: 13, color: '${T.text1}', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.subject}</td>
                  <td style={{ padding: '13px 20px', fontSize: 12, color: '${T.text2}', whiteSpace: 'nowrap' }}>{f.department ?? '—'}</td>
                  <td style={{ padding: '13px 20px' }}><Badge value={f.priority} size="xs" /></td>
                  <td style={{ padding: '13px 20px' }}><Badge value={f.currentStatus} size="xs" /></td>
                  <td style={{ padding: '13px 20px', fontSize: 12, color: '${T.text2}' }}>{f.currentHolder?.name ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
`)
ok('DashboardPage — rectangular horizontal cards, no slashed zero')

// ── Modal — fix overflow ───────────────────────────────────────
info('Fixing Modal...')
w(path.join(SRC, 'components/ui/Modal.tsx'), `
import { X } from '@phosphor-icons/react'

interface P {
  open: boolean; onClose: () => void; title: string
  children: React.ReactNode; width?: number; footer?: React.ReactNode
}

export function Modal({ open, onClose, title, children, width = 540, footer }: P) {
  if (!open) return null
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="fade-in"
        style={{
          width: '100%', maxWidth: width,
          maxHeight: 'calc(100vh - 40px)',
          display: 'flex', flexDirection: 'column',
          background: '${T.cardBg}',
          border: '1.5px solid ${T.border}',
          borderRadius: 16,
          boxShadow: '0 24px 80px rgba(0,0,0,0.18)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 22px', borderBottom: '1.5px solid ${T.border}', background: '${T.cardBg2}', flexShrink: 0 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: '${T.text1}' }}>{title}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '${T.text3}', padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center', lineHeight: 1 }}>
            <X size={16} />
          </button>
        </div>
        {/* Body — scrollable */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px' }}>{children}</div>
        {/* Footer */}
        {footer && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, padding: '14px 22px', borderTop: '1.5px solid ${T.border}', background: '${T.cardBg2}', flexShrink: 0 }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
`)
ok('Modal — max-height 100vh-40px, scrollable body, never overflows')

// ── LiaisonPage — full light theme rewrite ────────────────────
info('Rewriting LiaisonPage with light theme...')
w(path.join(SRC, 'pages/liaison/LiaisonPage.tsx'), `
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FileText, Plus, MagnifyingGlass, CheckCircle, XCircle, Warning, CaretRight, FunnelSimple } from '@phosphor-icons/react'
import { liaisonApi } from '@/api/liaison.api'
import { useAuthStore } from '@/store/auth.store'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Spinner } from '@/components/ui/Spinner'

const FT = [
  {value:'approval',label:'Approval'},{value:'noc',label:'NOC'},
  {value:'drawing',label:'Drawing Approval'},{value:'estimate',label:'Estimate'},
  {value:'report',label:'Inspection Report'},{value:'letter',label:'Letter'},
  {value:'clearance',label:'Clearance'},{value:'other',label:'Other'},
]
const DEPTS = [
  {value:'LCMA',label:'LCMA'},{value:'UEED',label:'UEED'},{value:'SMC',label:'SMC'},
  {value:'Traffic Police',label:'Traffic Police'},{value:'Forest Dept',label:'Forest Dept'},
  {value:'DC Office',label:'DC Office'},{value:'PWD',label:'PWD'},{value:'Other',label:'Other'},
]
const PRI = [{value:'low',label:'Low'},{value:'medium',label:'Medium'},{value:'high',label:'High'},{value:'urgent',label:'Urgent'}]
const CHAINS: Record<string,string[]> = {
  approval:['JE','AEE','XEN','SE'], noc:['JE','AEE','XEN'], drawing:['JE','XEN'],
  estimate:['AEE','XEN','SE'], report:['XEN'], letter:['XEN'],
  clearance:['JE','AEE','XEN','SE'], other:['JE','AEE','XEN','SE'],
}
const BLK = { subject:'', fileType:'noc', priority:'medium', department:'LCMA', dueDate:'', remarks:'' }

const T = {
  pageBg:'#f0f2f5', cardBg:'#fff', cardBg2:'#f8f9fc',
  border:'#e2e8f0', text1:'#0f172a', text2:'#475569', text3:'#94a3b8',
  blue:'#2563eb',
}

export default function LiaisonPage() {
  const { activeProjectId } = useAuthStore()
  const qc = useQueryClient()
  const [search, setSearch]     = useState('')
  const [status, setStatus]     = useState('')
  const [showNew, setShowNew]   = useState(false)
  const [sel, setSel]           = useState<any>(null)
  const [approveM, setApproveM] = useState<any>(null)
  const [form, setForm]         = useState(BLK)

  const { data: dash } = useQuery({
    queryKey: ['liaison-dash', activeProjectId],
    queryFn: () => liaisonApi.dashboard(activeProjectId ?? undefined).then(r => r.data),
    enabled: !!activeProjectId,
  })

  const { data: fd, isLoading } = useQuery({
    queryKey: ['liaison-files', activeProjectId, status],
    queryFn: () => liaisonApi.files({ projectId: activeProjectId, status: status || undefined, limit: 100 }).then(r => r.data),
    enabled: !!activeProjectId,
  })

  const { data: detail } = useQuery({
    queryKey: ['liaison-file', sel?.id],
    queryFn: () => liaisonApi.file(sel!.id).then(r => r.data),
    enabled: !!sel,
  })

  const createM = useMutation({
    mutationFn: (d: any) => liaisonApi.createFile({ ...d, projectId: activeProjectId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['liaison-files'] }); qc.invalidateQueries({ queryKey: ['liaison-dash'] }); setShowNew(false); setForm(BLK) },
  })

  const approveM2 = useMutation({
    mutationFn: ({ id, action, remarks }: any) => liaisonApi.approveFile(id, { action, remarks }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['liaison-files'] })
      qc.invalidateQueries({ queryKey: ['liaison-file', sel?.id] })
      qc.invalidateQueries({ queryKey: ['liaison-dash'] })
      setApproveM(null)
    },
  })

  const today = new Date().toISOString().split('T')[0]
  const files = (fd?.files ?? []).filter((f: any) =>
    !search || f.subject?.toLowerCase().includes(search.toLowerCase()) || f.fileNumber?.toLowerCase().includes(search.toLowerCase())
  )

  const statItems = [
    { label: 'Total', value: dash?.total ?? 0, color: T.blue },
    { label: 'Under Review', value: dash?.by_status?.under_review ?? 0, color: '#d97706' },
    { label: 'Approved', value: dash?.by_status?.approved ?? 0, color: '#059669' },
    { label: 'Returned', value: dash?.by_status?.returned ?? 0, color: '#dc2626' },
    { label: 'Overdue', value: dash?.overdue ?? 0, color: '#dc2626' },
    { label: 'Urgent', value: dash?.urgent ?? 0, color: '#7c3aed' },
  ]

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: T.text1, margin: '0 0 5px', letterSpacing: '-0.02em' }}>Liaison Files</h1>
          <p style={{ fontSize: 14, color: T.text3, margin: 0 }}>Track government approvals, NOCs and clearances</p>
        </div>
        <Button variant="primary" size="md" icon={<Plus size={15} />} onClick={() => setShowNew(true)}>
          New File
        </Button>
      </div>

      {/* Stat pills */}
      {dash && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {statItems.map(s => (
            <div key={s.label} style={{ background: T.cardBg, border: '1.5px solid ' + T.border, borderRadius: 10, padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <span style={{ fontSize: 22, fontWeight: 800, color: s.color, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{s.value}</span>
              <span style={{ fontSize: 12, color: T.text3, fontWeight: 500 }}>{s.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Search + filter bar */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 400 }}>
          <MagnifyingGlass style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: T.text3 }} size={15} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search files, reference numbers..."
            style={{ width: '100%', paddingLeft: 36, paddingRight: 14, paddingTop: 9, paddingBottom: 9, background: T.cardBg, border: '1.5px solid ' + T.border, borderRadius: 8, fontSize: 13, color: T.text1, outline: 'none', fontFamily: 'inherit' }}
          />
        </div>
        <select
          value={status} onChange={e => setStatus(e.target.value)}
          style={{ padding: '9px 14px', background: T.cardBg, border: '1.5px solid ' + T.border, borderRadius: 8, fontSize: 13, color: T.text1, outline: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          <option value="">All status</option>
          {['draft','submitted','under_review','approved','rejected','returned','closed'].map(s => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>
        <span style={{ fontSize: 12, color: T.text3, padding: '0 4px' }}>{files.length} files</span>
      </div>

      {/* Content */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>

        {/* File list */}
        <div style={{ flex: 1, background: T.cardBg, borderRadius: 16, border: '1.5px solid ' + T.border, overflow: 'hidden', boxShadow: '0 1px 8px rgba(0,0,0,0.05)', minHeight: 420 }}>
          {isLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '64px 0' }}><Spinner /></div>
          ) : files.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '64px 24px', gap: 12 }}>
              <FileText size={32} color="#e2e8f0" />
              <p style={{ fontSize: 14, fontWeight: 600, color: T.text3, margin: 0 }}>No liaison files</p>
              <p style={{ fontSize: 12, color: '#cbd5e1', margin: 0 }}>Create your first liaison file to get started</p>
              <Button variant="secondary" size="sm" icon={<Plus size={13} />} onClick={() => setShowNew(true)}>Create</Button>
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr 100px 90px 110px 100px', padding: '11px 20px', background: T.cardBg2, borderBottom: '1.5px solid ' + T.border }}>
                {['Ref No.', 'Subject', 'Department', 'Priority', 'Status', 'Due Date'].map(h => (
                  <div key={h} style={{ fontSize: 10, fontWeight: 700, color: T.text3, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</div>
                ))}
              </div>
              {files.map((f: any, i: number) => {
                const overdue = f.dueDate && f.dueDate < today && !['approved','closed'].includes(f.currentStatus)
                const isSelected = sel?.id === f.id
                return (
                  <div key={f.id} onClick={() => setSel(f)} style={{
                    display: 'grid', gridTemplateColumns: '130px 1fr 100px 90px 110px 100px',
                    padding: '13px 20px', cursor: 'pointer', alignItems: 'center',
                    borderBottom: i < files.length - 1 ? '1px solid #f1f5f9' : 'none',
                    background: isSelected ? '#f0f6ff' : 'transparent',
                    borderLeft: isSelected ? '3px solid ' + T.blue : '3px solid transparent',
                    transition: 'all 0.1s',
                  }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#f8faff' }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 700, color: T.blue, fontFamily: 'monospace' }}>{f.fileNumber ?? 'DRAFT'}</div>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 16 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: T.text1, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.subject}</p>
                    </div>
                    <div style={{ fontSize: 12, color: T.text2 }}>{f.department ?? '—'}</div>
                    <div><Badge value={f.priority} size="xs" /></div>
                    <div><Badge value={f.currentStatus} size="xs" /></div>
                    <div style={{ fontSize: 11, color: overdue ? '#dc2626' : T.text3, display: 'flex', alignItems: 'center', gap: 4 }}>
                      {overdue && <Warning size={12} color="#dc2626" />}
                      {f.dueDate ?? '—'}
                    </div>
                  </div>
                )
              })}
            </>
          )}
        </div>

        {/* Detail panel */}
        {sel && detail && (
          <div style={{ width: 280, flexShrink: 0, background: T.cardBg, border: '1.5px solid ' + T.border, borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
            <div style={{ padding: '16px 18px', background: T.cardBg2, borderBottom: '1.5px solid ' + T.border, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.blue, fontFamily: 'monospace' }}>{detail.fileNumber ?? 'DRAFT'}</div>
                <p style={{ fontSize: 13, fontWeight: 600, color: T.text1, margin: '4px 0 8px', lineHeight: 1.4 }}>{detail.subject}</p>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  <Badge value={detail.currentStatus} size="xs" />
                  <Badge value={detail.priority} size="xs" />
                  <Badge value={detail.fileType} size="xs" />
                </div>
              </div>
              <button onClick={() => setSel(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.text3, fontSize: 16, padding: 2, lineHeight: 1 }}>✕</button>
            </div>

            <div style={{ padding: '14px 18px', borderBottom: '1.5px solid #f1f5f9' }}>
              {[
                ['Department', detail.department],
                ['Current Holder', detail.currentHolder?.name],
                ['Due Date', detail.dueDate],
                ['Initiated By', detail.initiatedBy?.name],
              ].filter(([,v]) => v).map(([l, v]) => (
                <div key={l as string} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12 }}>
                  <span style={{ color: T.text3, fontWeight: 500 }}>{l}</span>
                  <span style={{ color: T.text1, fontWeight: 600, textAlign: 'right', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v as string}</span>
                </div>
              ))}
              {detail.remarks && (
                <div style={{ marginTop: 8, padding: '8px 10px', background: T.pageBg, borderRadius: 6, fontSize: 12, color: T.text2, lineHeight: 1.5 }}>{detail.remarks}</div>
              )}
            </div>

            <div style={{ padding: '14px 18px', borderBottom: '1.5px solid #f1f5f9' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: T.text3, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Approval Chain</div>
              {detail.approvalSteps?.map((step: any) => (
                <div key={step.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0,
                    background: step.status === 'approved' ? '#ecfdf5' : step.status === 'rejected' ? '#fef2f2' : '#f1f5f9',
                    color: step.status === 'approved' ? '#047857' : step.status === 'rejected' ? '#b91c1c' : T.text3,
                    border: '1.5px solid ' + (step.status === 'approved' ? '#a7f3d0' : step.status === 'rejected' ? '#fecaca' : T.border),
                  }}>{step.stepOrder}</div>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: T.text1 }}>{step.approverRole}</span>
                    {step.approver && <span style={{ fontSize: 11, color: T.text3 }}> · {step.approver.name}</span>}
                  </div>
                  {step.status !== 'pending' && <Badge value={step.status} size="xs" />}
                </div>
              ))}
            </div>

            {detail.currentStatus === 'under_review' && (
              <div style={{ padding: '14px 18px', display: 'flex', gap: 8 }}>
                <Button variant="success" size="sm" icon={<CheckCircle size={13} />} onClick={() => setApproveM({ action: 'approved', remarks: '' })}>Approve</Button>
                <Button variant="danger" size="sm" icon={<XCircle size={13} />} onClick={() => setApproveM({ action: 'rejected', remarks: '' })}>Reject</Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* New File Modal */}
      <Modal open={showNew} onClose={() => setShowNew(false)} title="New Liaison File" width={560}
        footer={<>
          <Button variant="ghost" onClick={() => setShowNew(false)}>Cancel</Button>
          <Button variant="primary" loading={createM.isPending} onClick={() => createM.mutate(form)} disabled={!form.subject}>Create File</Button>
        </>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Select label="File Type" value={form.fileType} onChange={e => setForm(f => ({ ...f, fileType: e.target.value }))} options={FT} />
            <Select label="Department" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} options={DEPTS} />
          </div>
          <Input label="Subject" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="NOC for drain crossing at Nishat road..." />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Select label="Priority" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} options={PRI} />
            <Input label="Due Date" type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
          </div>
          <Textarea label="Remarks (optional)" value={form.remarks} rows={2} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} placeholder="Any additional context..." />
          {form.fileType && (
            <div style={{ padding: '10px 14px', background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: 8, fontSize: 12 }}>
              <span style={{ color: '#64748b' }}>Approval chain: </span>
              {(CHAINS[form.fileType] ?? CHAINS.other).map((r, i, arr) => (
                <span key={r}><span style={{ color: T.blue, fontWeight: 700 }}>{r}</span>{i < arr.length - 1 && <span style={{ color: T.text3 }}> → </span>}</span>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* Approve/Reject Modal */}
      <Modal open={!!approveM} onClose={() => setApproveM(null)}
        title={approveM?.action === 'approved' ? '✓ Approve File' : '✕ Reject File'} width={460}
        footer={<>
          <Button variant="ghost" onClick={() => setApproveM(null)}>Cancel</Button>
          <Button variant={approveM?.action === 'approved' ? 'success' : 'danger'} loading={approveM2.isPending}
            onClick={() => approveM2.mutate({ id: sel?.id, action: approveM?.action, remarks: approveM?.remarks })}>
            Confirm {approveM?.action === 'approved' ? 'Approval' : 'Rejection'}
          </Button>
        </>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ padding: '12px 14px', background: T.cardBg2, border: '1.5px solid ' + T.border, borderRadius: 8, fontSize: 13, color: T.text2 }}>{sel?.subject}</div>
          <Textarea label="Remarks (optional)" rows={3} value={approveM?.remarks ?? ''} onChange={e => setApproveM((a: any) => a ? { ...a, remarks: e.target.value } : null)} placeholder="Notes about this decision..." />
        </div>
      </Modal>
    </div>
  )
}
`)
ok('LiaisonPage — full light theme, grid list, responsive panel')

// ── LettersPage — light theme ─────────────────────────────────
info('Rewriting LettersPage with light theme...')
w(path.join(SRC, 'pages/liaison/LettersPage.tsx'), `
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Envelope, Plus, PaperPlaneTilt, Printer, Eye } from '@phosphor-icons/react'
import { liaisonApi } from '@/api/liaison.api'
import { useAuthStore } from '@/store/auth.store'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Spinner } from '@/components/ui/Spinner'

const TMPL: Record<string,string> = {
  reminder: "With reference to our earlier communication, we wish to bring to your kind notice that the above-mentioned permission/NOC/approval is still pending with your office.\\n\\nWe request you to kindly expedite the matter at the earliest, as further delay is adversely affecting our project progress.\\n\\nWe hope for your prompt and favourable action.",
  covering: "With reference to the above subject, we are hereby submitting the following documents for your kind consideration:\\n\\n1. [Document Name] — [No. of copies]\\n2. [Document Name] — [No. of copies]\\n\\nWe request you to kindly review the enclosed documents and accord the necessary approval at the earliest.",
  reply: "With reference to your letter dated ___________ regarding the above subject, we wish to submit our reply as under:\\n\\n[State your reply clearly and point-wise]\\n\\nWe trust this clarifies the matter to your satisfaction.",
  noc: "We are executing the above-mentioned work on behalf of LCMA/UEED, Srinagar. We require No Objection Certificate (NOC) from your department for [describe work].\\n\\nAll restoration works shall be carried out to your satisfaction at our own cost.",
}
const BLK = { subject:'', toName:'', toOrganization:'LCMA', toEmail:'', body:'', date: new Date().toISOString().split('T')[0] }
const T = { pageBg:'#f0f2f5', cardBg:'#fff', cardBg2:'#f8f9fc', border:'#e2e8f0', text1:'#0f172a', text2:'#475569', text3:'#94a3b8', blue:'#2563eb' }

export default function LettersPage() {
  const { activeProjectId, user } = useAuthStore()
  const qc = useQueryClient()
  const [showNew, setShowNew]   = useState(false)
  const [preview, setPreview]   = useState<any>(null)
  const [sendM, setSendM]       = useState<any>(null)
  const [sendF, setSendF]       = useState({ toEmail:'', subject:'', bodyNote:'' })
  const [form, setForm]         = useState(BLK)

  const { data: letters, isLoading } = useQuery({
    queryKey: ['letters', activeProjectId],
    queryFn: () => liaisonApi.letters({ projectId: activeProjectId }).then(r => r.data),
    enabled: !!activeProjectId,
  })

  const { data: gStatus } = useQuery({
    queryKey: ['gmail-status'],
    queryFn: () => liaisonApi.gmailStatus().then(r => r.data),
  })

  const createM = useMutation({
    mutationFn: (d: any) => liaisonApi.createLetter({ ...d, projectId: activeProjectId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['letters'] }); setShowNew(false); setForm(BLK) },
  })

  const sendM2 = useMutation({
    mutationFn: ({ id, d }: any) => liaisonApi.sendLetter(id, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['letters'] }); setSendM(null) },
  })

  function print(l: any) {
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write('<html><head><title>' + l.letterNumber + '</title><style>body{font-family:Arial,sans-serif;font-size:12px;margin:40px;color:#111;line-height:1.7}.co{font-size:18px;font-weight:bold;color:#2563eb}.body{white-space:pre-wrap;line-height:1.9}</style></head><body><div style="border-bottom:3px solid #2563eb;padding-bottom:8px;margin-bottom:18px"><div class="co">Khilari Infrastructure Pvt. Ltd.</div><div style="font-size:11px;color:#555">Srinagar, J&K</div></div><div style="display:flex;justify-content:space-between;margin-bottom:12px;font-size:11px"><div><b>Ref:</b> ' + l.letterNumber + '</div><div><b>Date:</b> ' + l.date + '</div></div><div style="margin-bottom:12px"><b>To,</b><br>' + (l.toName ?? '') + '<br>' + (l.toOrganization ?? '') + '</div><div style="font-weight:bold;margin-bottom:10px"><u>Sub:</u> ' + l.subject + '</div><hr style="border:none;border-top:1px solid #ddd;margin:10px 0"><div style="margin-bottom:10px">Respected Sir/Madam,</div><div class="body">' + l.body + '</div><div style="margin-top:40px">Yours faithfully,<br><br><br><b>' + (l.signedBy?.name ?? user?.name) + '</b></div></body></html>')
    win.document.close(); win.print()
  }

  const list = Array.isArray(letters) ? letters : []

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: T.text1, margin: '0 0 5px', letterSpacing: '-0.02em' }}>Official Letters</h1>
          <p style={{ fontSize: 14, color: T.text3, margin: 0 }}>Draft and send letters to LCMA, UEED and government departments</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {!gStatus?.configured && (
            <div style={{ padding: '7px 14px', borderRadius: 8, background: '#fffbeb', border: '1.5px solid #fde68a', color: '#b45309', fontSize: 12, fontWeight: 500 }}>
              ⚠ Gmail not connected
            </div>
          )}
          <Button variant="primary" size="md" icon={<Plus size={15} />} onClick={() => setShowNew(true)}>Draft Letter</Button>
        </div>
      </div>

      <div style={{ background: T.cardBg, borderRadius: 16, border: '1.5px solid ' + T.border, overflow: 'hidden', boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
        {isLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '56px 0' }}><Spinner /></div>
        ) : list.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '64px 24px', gap: 12 }}>
            <Envelope size={32} color="#e2e8f0" />
            <p style={{ fontSize: 14, fontWeight: 600, color: T.text3, margin: 0 }}>No letters drafted yet</p>
            <Button variant="secondary" size="sm" icon={<Plus size={13} />} onClick={() => setShowNew(true)}>Draft first letter</Button>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: T.cardBg2, borderBottom: '1.5px solid ' + T.border }}>
                {['Ref No.','Date','To','Subject','Status','Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 20px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: T.text3, textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.map((l: any, i: number) => (
                <tr key={l.id} style={{ borderBottom: i < list.length - 1 ? '1px solid #f1f5f9' : 'none' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f8faff')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td style={{ padding: '13px 20px', fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: T.blue, whiteSpace: 'nowrap' }}>{l.letterNumber ?? '—'}</td>
                  <td style={{ padding: '13px 20px', fontSize: 12, color: T.text2, whiteSpace: 'nowrap' }}>{l.date}</td>
                  <td style={{ padding: '13px 20px', fontSize: 12, color: T.text2, maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.toOrganization ?? '—'}</td>
                  <td style={{ padding: '13px 20px', fontSize: 13, color: T.text1, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.subject}</td>
                  <td style={{ padding: '13px 20px' }}><Badge value={l.status} size="xs" /></td>
                  <td style={{ padding: '13px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <button onClick={() => setPreview(l)} style={{ padding: '5px', background: 'none', border: 'none', cursor: 'pointer', color: T.text3, borderRadius: 6, display: 'flex' }} title="Preview"><Eye size={14} /></button>
                      <button onClick={() => print(l)} style={{ padding: '5px', background: 'none', border: 'none', cursor: 'pointer', color: T.text3, borderRadius: 6, display: 'flex' }} title="Print"><Printer size={14} /></button>
                      <a href={liaisonApi.pdfUrl(l.id)} target="_blank" rel="noreferrer" style={{ padding: '5px 7px', fontSize: 10, fontWeight: 600, color: T.text3, borderRadius: 6, background: 'none' }}>PDF</a>
                      <button onClick={() => { setSendM(l); setSendF({ toEmail: l.toEmail ?? '', subject: 'Ref: ' + l.letterNumber + ' — ' + l.subject, bodyNote: '' }) }}
                        style={{ padding: '5px', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 6, display: 'flex', color: l.status === 'dispatched' ? '#059669' : T.blue }} title="Send via Gmail">
                        <PaperPlaneTilt size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Draft Letter Modal */}
      <Modal open={showNew} onClose={() => setShowNew(false)} title="Draft Official Letter" width={680}
        footer={<><Button variant="ghost" onClick={() => setShowNew(false)}>Cancel</Button><Button variant="primary" loading={createM.isPending} onClick={() => createM.mutate(form)} disabled={!form.subject || !form.body}>Save Letter</Button></>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="To (Name)" value={form.toName} onChange={e => setForm(f => ({ ...f, toName: e.target.value }))} placeholder="Executive Engineer" />
            <Input label="Organisation" value={form.toOrganization} onChange={e => setForm(f => ({ ...f, toOrganization: e.target.value }))} placeholder="LCMA, UEED..." />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Email (for Gmail)" type="email" value={form.toEmail} onChange={e => setForm(f => ({ ...f, toEmail: e.target.value }))} placeholder="officer@jkgov.in" />
            <Input label="Date" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
          </div>
          <Input label="Subject" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="Request for NOC / Approval..." />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: T.text2, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Body</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {[['Reminder','reminder'],['Covering','covering'],['Reply','reply'],['NOC Request','noc']].map(([l,k]) => (
                  <button key={k} onClick={() => setForm(f => ({ ...f, body: TMPL[k] }))}
                    style={{ fontSize: 11, padding: '4px 10px', border: '1.5px solid ' + T.border, borderRadius: 6, background: T.cardBg2, color: T.text2, cursor: 'pointer', fontWeight: 500 }}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <Textarea rows={10} value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} placeholder="Type letter body here, or click a template above..." />
          </div>
        </div>
      </Modal>

      {/* Preview Modal */}
      <Modal open={!!preview} onClose={() => setPreview(null)} title={preview?.letterNumber ?? 'Letter Preview'} width={680}
        footer={<div style={{ display: 'flex', gap: 8, width: '100%' }}>
          <Button variant="secondary" icon={<Printer size={13} />} onClick={() => print(preview)}>Print</Button>
          <Button variant="secondary" icon={<PaperPlaneTilt size={13} />} onClick={() => { setSendM(preview); setPreview(null); setSendF({ toEmail: preview?.toEmail ?? '', subject: 'Ref: ' + preview?.letterNumber, bodyNote: '' }) }}>Send</Button>
          <div style={{ flex: 1 }} />
          <Button variant="ghost" onClick={() => setPreview(null)}>Close</Button>
        </div>}>
        {preview && (
          <div style={{ background: '#fff', borderRadius: 8, padding: '28px 32px', border: '1.5px solid ' + T.border, fontFamily: 'Arial, sans-serif', fontSize: 12, color: '#111', lineHeight: 1.7 }}>
            <div style={{ borderBottom: '3px solid #2563eb', paddingBottom: 8, marginBottom: 18 }}>
              <div style={{ fontSize: 18, fontWeight: 'bold', color: '#2563eb' }}>Khilari Infrastructure Pvt. Ltd.</div>
              <div style={{ fontSize: 11, color: '#555' }}>Srinagar, Jammu & Kashmir</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14, fontSize: 11 }}>
              <div><b>Ref No.:</b> {preview.letterNumber}</div>
              <div><b>Date:</b> {preview.date}</div>
            </div>
            <div style={{ marginBottom: 14 }}><b>To,</b><br />{preview.toName}<br />{preview.toOrganization}</div>
            <div style={{ fontWeight: 'bold', marginBottom: 10 }}><u>Sub:</u> {preview.subject}</div>
            <hr style={{ border: 'none', borderTop: '1px solid #ddd', margin: '10px 0' }} />
            <div style={{ marginBottom: 10 }}>Respected Sir/Madam,</div>
            <div style={{ lineHeight: 1.9, whiteSpace: 'pre-wrap' }}>{preview.body}</div>
            <div style={{ marginTop: 40 }}>Yours faithfully,<br /><br /><br />
              <b>{preview.signedBy?.name ?? user?.name}</b><br />
              <span style={{ color: '#555' }}>Authorised Signatory, Khilari Infrastructure Pvt. Ltd.</span>
            </div>
          </div>
        )}
      </Modal>

      {/* Send Modal */}
      <Modal open={!!sendM} onClose={() => setSendM(null)} title="Send Letter via Gmail" width={480}
        footer={<><Button variant="ghost" onClick={() => setSendM(null)}>Cancel</Button><Button variant="primary" loading={sendM2.isPending} icon={<PaperPlaneTilt size={13} />} onClick={() => sendM2.mutate({ id: sendM?.id, d: sendF })} disabled={!sendF.toEmail}>Send Email</Button></>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {!gStatus?.configured && (
            <div style={{ padding: '10px 14px', background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 8, fontSize: 12, color: '#b45309' }}>
              Gmail not connected. Visit /api/v1/gmail/auth to authorise.
            </div>
          )}
          <div style={{ padding: '10px 14px', background: T.cardBg2, border: '1.5px solid ' + T.border, borderRadius: 8, fontSize: 13, color: T.text2 }}>
            <b>Letter:</b> {sendM?.letterNumber} — {sendM?.subject}
          </div>
          <Input label="Recipient Email" type="email" value={sendF.toEmail} onChange={e => setSendF(f => ({ ...f, toEmail: e.target.value }))} placeholder="officer@jkgov.in" />
          <Input label="Email Subject" value={sendF.subject} onChange={e => setSendF(f => ({ ...f, subject: e.target.value }))} />
          <Textarea label="Covering Note (optional)" rows={3} value={sendF.bodyNote} onChange={e => setSendF(f => ({ ...f, bodyNote: e.target.value }))} placeholder="Brief note before the PDF attachment..." />
          <p style={{ fontSize: 11, color: T.text3 }}>The letter PDF will be generated and attached automatically.</p>
        </div>
      </Modal>
    </div>
  )
}
`)
ok('LettersPage — light theme, clean table, modal fits properly')

console.log('\n' + G + '\x1b[1m  All fixes applied!\x1b[0m' + NC)
console.log(B + '  Frontend will hot-reload automatically.\x1b[0m\n' + NC)
