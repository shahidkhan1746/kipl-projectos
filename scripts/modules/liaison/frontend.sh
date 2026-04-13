#!/usr/bin/env bash
# ================================================================
#  Module: Liaison — Frontend
#  Writes complete React pages:
#    - LiaisonPage (file list, stats, filters, approval actions)
#    - LettersPage (draft, preview, send via Gmail)
#    - API hooks for both pages
#  Usage: bash scripts/modules/liaison/frontend.sh
# ================================================================

set -euo pipefail

G='\033[0;32m'; Y='\033[1;33m'; B='\033[0;34m'; R='\033[0;31m'; BOLD='\033[1m'; NC='\033[0m'
ok()   { echo -e "${G}  ✓${NC} $1"; }
info() { echo -e "${B}  →${NC} $1"; }
err()  { echo -e "${R}  ✗ $1${NC}"; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
SRC="$ROOT/frontend/src"

[[ -d "$SRC" ]] || err "frontend/src not found — run setup.sh first"

echo -e "\n${BOLD}Building Liaison Module — Frontend${NC}\n"

mkdir -p "$SRC/pages/liaison"
mkdir -p "$SRC/components/ui"
mkdir -p "$SRC/api"
mkdir -p "$SRC/hooks"

# ================================================================
# SHARED UI COMPONENTS
# ================================================================
info "Writing shared UI components..."

cat > "$SRC/components/ui/Badge.tsx" << 'TSX'
import { clsx } from 'clsx'

const COLOURS: Record<string, string> = {
  draft:        'bg-[#1C2128] text-[#8B949E] border border-[#30363D]',
  submitted:    'bg-[#1F3352] text-[#388BFD] border border-[#388BFD]/30',
  under_review: 'bg-[#2F2208] text-[#D29922] border border-[#D29922]/30',
  approved:     'bg-[#1A3028] text-[#3FB950] border border-[#3FB950]/30',
  rejected:     'bg-[#3A1F1E] text-[#F85149] border border-[#F85149]/30',
  returned:     'bg-[#3A1F1E] text-[#F85149] border border-[#F85149]/30',
  closed:       'bg-[#1C2128] text-[#6E7681] border border-[#30363D]',
  low:          'bg-[#1C2128] text-[#6E7681] border border-[#30363D]',
  medium:       'bg-[#1F3352] text-[#388BFD] border border-[#388BFD]/30',
  high:         'bg-[#2F2208] text-[#D29922] border border-[#D29922]/30',
  urgent:       'bg-[#3A1F1E] text-[#F85149] border border-[#F85149]/30',
  noc:          'bg-[#1E1533] text-[#BC8CFF] border border-[#BC8CFF]/30',
  approval:     'bg-[#1F3352] text-[#388BFD] border border-[#388BFD]/30',
  drawing:      'bg-[#0D2B28] text-[#2DD4BF] border border-[#2DD4BF]/30',
  estimate:     'bg-[#2F2208] text-[#D29922] border border-[#D29922]/30',
  report:       'bg-[#1C2128] text-[#8B949E] border border-[#30363D]',
  letter:       'bg-[#1E1533] text-[#BC8CFF] border border-[#BC8CFF]/30',
  clearance:    'bg-[#3A1F1E] text-[#F85149] border border-[#F85149]/30',
  pending:      'bg-[#2F2208] text-[#D29922] border border-[#D29922]/30',
  dispatched:   'bg-[#1A3028] text-[#3FB950] border border-[#3FB950]/30',
  generated:    'bg-[#0D2B28] text-[#2DD4BF] border border-[#2DD4BF]/30',
}

export function Badge({ value }: { value: string }) {
  const key = value?.toLowerCase().replace(' ', '_') ?? ''
  return (
    <span className={clsx(
      'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide',
      COLOURS[key] ?? 'bg-[#1C2128] text-[#8B949E] border border-[#30363D]'
    )}>
      {value?.replace(/_/g, ' ')}
    </span>
  )
}
TSX

cat > "$SRC/components/ui/Modal.tsx" << 'TSX'
import { X } from '@phosphor-icons/react'

interface Props {
  open:     boolean
  onClose:  () => void
  title:    string
  children: React.ReactNode
  width?:   string
  footer?:  React.ReactNode
}

export function Modal({ open, onClose, title, children, width = 'max-w-lg', footer }: Props) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className={`card w-full ${width} flex flex-col max-h-[90vh] shadow-2xl`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#30363D] flex-shrink-0">
          <h3 className="text-sm font-semibold text-[#E6EDF3]">{title}</h3>
          <button onClick={onClose} className="text-[#6E7681] hover:text-[#E6EDF3] transition-colors">
            <X size={16} />
          </button>
        </div>
        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[#30363D] flex-shrink-0"
               style={{ background: 'var(--color-bg-subtle)' }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
TSX

cat > "$SRC/components/ui/Input.tsx" << 'TSX'
import { clsx } from 'clsx'

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string; error?: string; hint?: string
}

export function Input({ label, error, hint, className, ...props }: Props) {
  return (
    <div>
      {label && <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>{label}</label>}
      <input
        {...props}
        className={clsx(
          'w-full px-3 py-2 rounded-lg text-sm focus:outline-none transition-colors',
          error
            ? 'border border-[#F85149]/60 focus:border-[#F85149]'
            : 'border border-[#30363D] focus:border-[#388BFD]',
          className
        )}
        style={{
          background:  'var(--color-bg-subtle)',
          color:       'var(--color-text-base)',
        }}
      />
      {error && <p className="text-xs mt-1" style={{ color: 'var(--color-red)' }}>{error}</p>}
      {hint  && <p className="text-xs mt-1" style={{ color: 'var(--color-text-faint)' }}>{hint}</p>}
    </div>
  )
}
TSX

cat > "$SRC/components/ui/Select.tsx" << 'TSX'
interface Option { value: string; label: string }

interface Props extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string; error?: string
  options: Option[]; placeholder?: string
}

export function Select({ label, error, options, placeholder, ...props }: Props) {
  return (
    <div>
      {label && <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>{label}</label>}
      <select
        {...props}
        className="w-full px-3 py-2 rounded-lg text-sm border border-[#30363D] focus:outline-none focus:border-[#388BFD] transition-colors"
        style={{ background: 'var(--color-bg-subtle)', color: 'var(--color-text-base)' }}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {error && <p className="text-xs mt-1" style={{ color: 'var(--color-red)' }}>{error}</p>}
    </div>
  )
}
TSX

cat > "$SRC/components/ui/Textarea.tsx" << 'TSX'
interface Props extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string; error?: string
}

export function Textarea({ label, error, ...props }: Props) {
  return (
    <div>
      {label && <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>{label}</label>}
      <textarea
        {...props}
        className="w-full px-3 py-2 rounded-lg text-sm border border-[#30363D] focus:outline-none focus:border-[#388BFD] resize-none transition-colors"
        style={{ background: 'var(--color-bg-subtle)', color: 'var(--color-text-base)' }}
      />
      {error && <p className="text-xs mt-1" style={{ color: 'var(--color-red)' }}>{error}</p>}
    </div>
  )
}
TSX

cat > "$SRC/components/ui/Button.tsx" << 'TSX'
import { clsx } from 'clsx'
import { CircleNotch } from '@phosphor-icons/react'

type Variant = 'primary' | 'ghost' | 'danger' | 'success'

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:  Variant
  size?:     'sm' | 'md'
  loading?:  boolean
  icon?:     React.ReactNode
}

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-[#388BFD] text-white hover:bg-[#4d97fe]',
  ghost:   'border border-[#30363D] text-[#8B949E] hover:text-[#E6EDF3] hover:bg-[#1C2128]',
  danger:  'bg-[#3A1F1E] text-[#F85149] border border-[#F85149]/30 hover:bg-[#F85149]/20',
  success: 'bg-[#1A3028] text-[#3FB950] border border-[#3FB950]/30 hover:bg-[#3FB950]/20',
}

export function Button({ variant = 'primary', size = 'md', loading, icon, children, className, disabled, ...props }: Props) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed',
        size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3.5 py-2 text-sm',
        VARIANTS[variant],
        className
      )}
    >
      {loading ? <CircleNotch size={14} className="animate-spin" /> : icon}
      {children}
    </button>
  )
}
TSX

ok "Shared UI components written"

# ================================================================
# LIAISON API
# ================================================================
info "Writing liaison API..."

cat > "$SRC/api/liaison.api.ts" << 'TS'
import api from './client'

export const liaisonApi = {
  // Files
  dashboard:     (projectId?: string) =>
    api.get('/api/v1/liaison/dashboard', { params: { projectId } }),
  files:         (params?: Record<string, any>) =>
    api.get('/api/v1/liaison/files', { params }),
  file:          (id: string) =>
    api.get(`/api/v1/liaison/files/${id}`),
  createFile:    (data: any) =>
    api.post('/api/v1/liaison/files', data),
  approveFile:   (id: string, data: { action: 'approved'|'rejected'; remarks?: string }) =>
    api.patch(`/api/v1/liaison/files/${id}/approve`, data),
  uploadDocument:(id: string, data: any) =>
    api.post(`/api/v1/liaison/files/${id}/documents`, data),
  closeFile:     (id: string) =>
    api.patch(`/api/v1/liaison/files/${id}/close`, {}),

  // Letters
  letters:       (params?: Record<string, any>) =>
    api.get('/api/v1/liaison/letters', { params }),
  letter:        (id: string) =>
    api.get(`/api/v1/liaison/letters/${id}`),
  createLetter:  (data: any) =>
    api.post('/api/v1/liaison/letters', data),
  letterPdfUrl:  (id: string) =>
    `${import.meta.env.VITE_API_URL ?? 'http://localhost:3000'}/api/v1/liaison/letters/${id}/pdf`,
  sendLetter:    (id: string, data: { toEmail: string; subject: string; bodyNote?: string }) =>
    api.post(`/api/v1/liaison/letters/${id}/send`, data),

  // Gmail status
  gmailStatus:   () => api.get('/api/v1/gmail/status'),
  gmailAuthUrl:  () => api.get('/api/v1/gmail/auth'),
}
TS

ok "Liaison API written"

# ================================================================
# LIAISON PAGE
# ================================================================
info "Writing LiaisonPage..."

cat > "$SRC/pages/liaison/LiaisonPage.tsx" << 'TSX'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  FileText, Plus, MagnifyingGlass, CheckCircle,
  XCircle, Eye, Warning, Clock, Funnel,
} from '@phosphor-icons/react'
import { liaisonApi } from '@/api/liaison.api'
import { useAuthStore } from '@/store/auth.store'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'

const FILE_TYPES = [
  { value: 'approval',  label: 'Approval' },
  { value: 'noc',       label: 'NOC' },
  { value: 'drawing',   label: 'Drawing Approval' },
  { value: 'estimate',  label: 'Estimate' },
  { value: 'report',    label: 'Inspection Report' },
  { value: 'letter',    label: 'Letter' },
  { value: 'clearance', label: 'Clearance' },
  { value: 'other',     label: 'Other' },
]

const DEPTS = [
  { value: 'LCMA',          label: 'LCMA' },
  { value: 'UEED',          label: 'UEED' },
  { value: 'SMC',           label: 'SMC' },
  { value: 'Traffic Police',label: 'Traffic Police' },
  { value: 'Forest Dept',   label: 'Forest Dept' },
  { value: 'DC Office',     label: 'DC Office' },
  { value: 'Other',         label: 'Other' },
]

const PRIORITIES = [
  { value: 'low',    label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high',   label: 'High' },
  { value: 'urgent', label: 'Urgent' },
]

const CHAINS: Record<string, string[]> = {
  approval:  ['JE', 'AEE', 'XEN', 'SE'],
  noc:       ['JE', 'AEE', 'XEN'],
  drawing:   ['JE', 'XEN'],
  estimate:  ['AEE', 'XEN', 'SE'],
  report:    ['XEN'],
  letter:    ['XEN'],
  clearance: ['JE', 'AEE', 'XEN', 'SE'],
  other:     ['JE', 'AEE', 'XEN', 'SE'],
}

export default function LiaisonPage() {
  const { activeProjectId, user } = useAuthStore()
  const qc = useQueryClient()

  const [search,    setSearch]    = useState('')
  const [statusF,   setStatusF]   = useState('')
  const [priorityF, setPriorityF] = useState('')
  const [showNew,   setShowNew]   = useState(false)
  const [selected,  setSelected]  = useState<any>(null)
  const [approving, setApproving] = useState<{ action: 'approved'|'rejected', remarks: string } | null>(null)

  // Form state
  const [form, setForm] = useState({
    subject: '', fileType: 'noc', priority: 'medium',
    department: 'LCMA', dueDate: '', remarks: '',
  })

  // ── Data ─────────────────────────────────────────────────────
  const { data: dash } = useQuery({
    queryKey: ['liaison-dashboard', activeProjectId],
    queryFn:  () => liaisonApi.dashboard(activeProjectId ?? undefined).then(r => r.data),
    enabled:  !!activeProjectId,
  })

  const { data: filesData, isLoading } = useQuery({
    queryKey: ['liaison-files', activeProjectId, statusF, priorityF],
    queryFn:  () => liaisonApi.files({
      projectId: activeProjectId, status: statusF || undefined,
      priority: priorityF || undefined,
    }).then(r => r.data),
    enabled: !!activeProjectId,
  })

  const { data: fileDetail } = useQuery({
    queryKey: ['liaison-file', selected?.id],
    queryFn:  () => liaisonApi.file(selected!.id).then(r => r.data),
    enabled:  !!selected,
  })

  // ── Mutations ─────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (data: any) => liaisonApi.createFile({ ...data, projectId: activeProjectId }),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['liaison-files'] }); qc.invalidateQueries({ queryKey: ['liaison-dashboard'] }); setShowNew(false); setForm({ subject:'',fileType:'noc',priority:'medium',department:'LCMA',dueDate:'',remarks:'' }) },
  })

  const approveMutation = useMutation({
    mutationFn: ({ id, action, remarks }: any) => liaisonApi.approveFile(id, { action, remarks }),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['liaison-files'] }); qc.invalidateQueries({ queryKey: ['liaison-file', selected?.id] }); qc.invalidateQueries({ queryKey: ['liaison-dashboard'] }); setApproving(null) },
  })

  const files = (filesData?.files ?? []).filter((f: any) =>
    !search || f.subject?.toLowerCase().includes(search.toLowerCase()) ||
    f.fileNumber?.toLowerCase().includes(search.toLowerCase())
  )

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="space-y-5">

      {/* ── Stats bar ── */}
      {dash && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { label: 'Total Files',   value: dash.total,              color: '#388BFD' },
            { label: 'Under Review',  value: dash.by_status?.under_review ?? 0, color: '#D29922' },
            { label: 'Approved',      value: dash.by_status?.approved ?? 0,     color: '#3FB950' },
            { label: 'Overdue',       value: dash.overdue,            color: '#F85149' },
            { label: 'Urgent',        value: dash.urgent,             color: '#F85149' },
          ].map(s => (
            <div key={s.label} className="card p-4">
              <div className="text-2xl font-semibold font-mono" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <MagnifyingGlass className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6E7681]" size={14} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search files..."
            className="w-full pl-8 pr-3 py-2 rounded-lg text-sm border border-[#30363D] focus:outline-none focus:border-[#388BFD]"
            style={{ background: 'var(--color-bg-subtle)', color: 'var(--color-text-base)' }}
          />
        </div>
        <select value={statusF} onChange={e => setStatusF(e.target.value)}
          className="px-2.5 py-2 rounded-lg text-sm border border-[#30363D] focus:outline-none"
          style={{ background: 'var(--color-bg-subtle)', color: 'var(--color-text-base)' }}>
          <option value="">All Status</option>
          {['draft','submitted','under_review','approved','rejected','returned','closed'].map(s =>
            <option key={s} value={s}>{s.replace('_',' ')}</option>
          )}
        </select>
        <select value={priorityF} onChange={e => setPriorityF(e.target.value)}
          className="px-2.5 py-2 rounded-lg text-sm border border-[#30363D] focus:outline-none"
          style={{ background: 'var(--color-bg-subtle)', color: 'var(--color-text-base)' }}>
          <option value="">All Priority</option>
          {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        <div className="flex-1" />
        <Button icon={<Plus size={14} />} onClick={() => setShowNew(true)}>New File</Button>
      </div>

      {/* ── File list + detail panel ── */}
      <div className="flex gap-4" style={{ minHeight: 400 }}>

        {/* List */}
        <div className="card flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-48 text-sm" style={{ color: 'var(--color-text-faint)' }}>Loading...</div>
          ) : files.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48" style={{ color: 'var(--color-text-faint)' }}>
              <FileText size={32} className="mb-2 opacity-20" />
              <p className="text-sm">No liaison files yet</p>
              <button onClick={() => setShowNew(true)} className="mt-2 text-sm underline" style={{ color: 'var(--color-accent)' }}>
                Create your first file →
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[#30363D]">
              {files.map((f: any) => {
                const isOverdue = f.dueDate && f.dueDate < today && !['approved','closed'].includes(f.currentStatus)
                return (
                  <div
                    key={f.id}
                    onClick={() => setSelected(f)}
                    className="flex items-start gap-3 px-4 py-3.5 cursor-pointer transition-colors hover:bg-[#1C2128]"
                    style={{ background: selected?.id === f.id ? 'var(--color-bg-subtle)' : 'transparent' }}
                  >
                    <FileText size={16} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--color-text-faint)' }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs" style={{ color: 'var(--color-accent)' }}>
                          {f.fileNumber ?? 'DRAFT'}
                        </span>
                        <Badge value={f.currentStatus} />
                        <Badge value={f.priority} />
                        <Badge value={f.fileType} />
                      </div>
                      <p className="text-sm mt-0.5 truncate" style={{ color: 'var(--color-text-base)' }}>{f.subject}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: 'var(--color-text-faint)' }}>
                        <span>{f.department ?? '—'}</span>
                        {f.dueDate && (
                          <span className="flex items-center gap-1" style={{ color: isOverdue ? 'var(--color-red)' : 'inherit' }}>
                            {isOverdue && <Warning size={12} />}
                            Due {f.dueDate}
                          </span>
                        )}
                        <span>Holder: {f.currentHolder?.name ?? '—'}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selected && fileDetail && (
          <div className="card w-80 flex-shrink-0 overflow-y-auto">
            <div className="px-4 py-3.5 border-b border-[#30363D]">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs" style={{ color: 'var(--color-accent)' }}>
                  {fileDetail.fileNumber ?? 'DRAFT'}
                </span>
                <button onClick={() => setSelected(null)} className="text-xs" style={{ color: 'var(--color-text-faint)' }}>✕</button>
              </div>
              <p className="text-sm font-medium mt-1" style={{ color: 'var(--color-text-base)' }}>{fileDetail.subject}</p>
              <div className="flex gap-1.5 mt-2 flex-wrap">
                <Badge value={fileDetail.currentStatus} />
                <Badge value={fileDetail.priority} />
                <Badge value={fileDetail.fileType} />
              </div>
            </div>

            <div className="p-4 space-y-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
              <div><span style={{ color: 'var(--color-text-faint)' }}>Department</span><br /><span style={{ color: 'var(--color-text-base)' }}>{fileDetail.department ?? '—'}</span></div>
              <div><span style={{ color: 'var(--color-text-faint)' }}>Current Holder</span><br /><span style={{ color: 'var(--color-text-base)' }}>{fileDetail.currentHolder?.name ?? '—'}</span></div>
              <div><span style={{ color: 'var(--color-text-faint)' }}>Due Date</span><br /><span style={{ color: fileDetail.dueDate < today ? 'var(--color-red)' : 'var(--color-text-base)' }}>{fileDetail.dueDate ?? '—'}</span></div>
              {fileDetail.remarks && <div><span style={{ color: 'var(--color-text-faint)' }}>Remarks</span><br /><span style={{ color: 'var(--color-text-base)' }}>{fileDetail.remarks}</span></div>}
            </div>

            {/* Approval chain */}
            <div className="px-4 pb-2">
              <p className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'var(--color-text-faint)' }}>Approval Chain</p>
              <div className="space-y-1.5">
                {fileDetail.approvalSteps?.map((step: any) => (
                  <div key={step.id} className="flex items-center gap-2">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                      step.status === 'approved' ? 'bg-[#1A3028] text-[#3FB950]' :
                      step.status === 'rejected' ? 'bg-[#3A1F1E] text-[#F85149]' :
                      'bg-[#1C2128] text-[#6E7681]'
                    }`}>{step.stepOrder}</div>
                    <div className="flex-1">
                      <span className="text-xs font-medium" style={{ color: 'var(--color-text-base)' }}>{step.approverRole}</span>
                      {step.approver && <span className="text-xs ml-1" style={{ color: 'var(--color-text-faint)' }}>— {step.approver.name}</span>}
                    </div>
                    <Badge value={step.status} />
                  </div>
                ))}
              </div>
            </div>

            {/* Documents */}
            {fileDetail.documents?.length > 0 && (
              <div className="px-4 pb-3">
                <p className="text-xs font-semibold mb-2 mt-2 uppercase tracking-wider" style={{ color: 'var(--color-text-faint)' }}>Documents</p>
                {fileDetail.documents.map((doc: any) => (
                  <a key={doc.id} href={doc.cloudinaryUrl} target="_blank" rel="noreferrer"
                    className="flex items-center gap-2 text-xs py-1.5 hover:underline"
                    style={{ color: 'var(--color-accent)' }}>
                    <FileText size={12} />
                    {doc.documentName ?? doc.revision}
                    <span style={{ color: 'var(--color-text-faint)' }}>({doc.revision})</span>
                  </a>
                ))}
              </div>
            )}

            {/* Actions */}
            {fileDetail.currentStatus === 'under_review' && (
              <div className="px-4 pb-4 flex gap-2">
                <Button
                  variant="success" size="sm"
                  icon={<CheckCircle size={13} />}
                  onClick={() => setApproving({ action: 'approved', remarks: '' })}
                >Approve</Button>
                <Button
                  variant="danger" size="sm"
                  icon={<XCircle size={13} />}
                  onClick={() => setApproving({ action: 'rejected', remarks: '' })}
                >Reject</Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── NEW FILE MODAL ── */}
      <Modal
        open={showNew}
        onClose={() => setShowNew(false)}
        title="New Liaison File"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowNew(false)}>Cancel</Button>
            <Button
              loading={createMutation.isPending}
              onClick={() => createMutation.mutate(form)}
              disabled={!form.subject || !form.fileType}
            >Create File</Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Select label="File Type *" value={form.fileType}
              onChange={e => setForm(f => ({ ...f, fileType: e.target.value }))}
              options={FILE_TYPES} />
            <Select label="Department *" value={form.department}
              onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
              options={DEPTS} />
          </div>
          <Input label="Subject *" value={form.subject}
            onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
            placeholder="NOC for drain crossing at Nishat road..." />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Priority" value={form.priority}
              onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
              options={PRIORITIES} />
            <Input label="Due Date" type="date" value={form.dueDate}
              onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
          </div>
          <Textarea label="Remarks" value={form.remarks} rows={3}
            onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))}
            placeholder="Any additional context..." />

          {/* Show approval chain preview */}
          {form.fileType && (
            <div className="rounded-lg p-3 text-xs" style={{ background: 'var(--color-bg-subtle)', border: '1px solid #30363D' }}>
              <span style={{ color: 'var(--color-text-faint)' }}>Approval chain: </span>
              {(CHAINS[form.fileType] ?? CHAINS.other).map((role, i) => (
                <span key={role}>
                  <span className="font-semibold" style={{ color: 'var(--color-accent)' }}>{role}</span>
                  {i < (CHAINS[form.fileType] ?? CHAINS.other).length - 1 && <span style={{ color: 'var(--color-text-faint)' }}> → </span>}
                </span>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* ── APPROVE/REJECT MODAL ── */}
      <Modal
        open={!!approving}
        onClose={() => setApproving(null)}
        title={approving?.action === 'approved' ? 'Approve File' : 'Reject File'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setApproving(null)}>Cancel</Button>
            <Button
              variant={approving?.action === 'approved' ? 'success' : 'danger'}
              loading={approveMutation.isPending}
              onClick={() => approveMutation.mutate({
                id: selected?.id,
                action: approving?.action,
                remarks: approving?.remarks,
              })}
            >
              {approving?.action === 'approved' ? 'Confirm Approval' : 'Confirm Rejection'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="text-sm p-3 rounded-lg" style={{ background: 'var(--color-bg-subtle)', color: 'var(--color-text-muted)' }}>
            {selected?.subject}
          </div>
          <Textarea
            label="Remarks (optional)"
            rows={3}
            value={approving?.remarks ?? ''}
            onChange={e => setApproving(a => a ? { ...a, remarks: e.target.value } : null)}
            placeholder="Add notes about this decision..."
          />
        </div>
      </Modal>

    </div>
  )
}
TSX

ok "LiaisonPage written"

# ================================================================
# LETTERS PAGE
# ================================================================
info "Writing LettersPage..."

cat > "$SRC/pages/liaison/LettersPage.tsx" << 'TSX'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Envelope, Plus, Printer, PaperPlaneTilt,
  Eye, CheckCircle,
} from '@phosphor-icons/react'
import { liaisonApi } from '@/api/liaison.api'
import { useAuthStore } from '@/store/auth.store'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'

const LETTER_TEMPLATES: Record<string, string> = {
  reminder: `With reference to our earlier communication dated ___________, we wish to bring to your kind notice that the above-mentioned permission/NOC/approval is still pending with your office.

We request you to kindly expedite the matter at the earliest, as further delay is adversely affecting our project progress and causing financial implications to the contractor.

We hope for your prompt and favourable action in this regard.`,

  covering: `With reference to the subject mentioned above, we are hereby submitting the following documents for your kind consideration and necessary action:

1. [Document Name] — [No. of copies]
2. [Document Name] — [No. of copies]

We request you to kindly review the enclosed documents and accord the necessary approval/permission at the earliest convenience.`,

  reply: `With reference to your letter/notice dated ___________ regarding the above subject, we wish to submit our reply as under:

[State your reply clearly and point-wise]

We trust this clarifies the matter to your satisfaction. For any further information, please feel free to contact the undersigned.`,

  noc_request: `We are executing the above-mentioned work on behalf of LCMA/UEED, Srinagar. In connection with the execution of the work, we are required to carry out [describe work] in your jurisdiction.

We therefore request you to kindly grant No Objection Certificate (NOC) for the same, enabling us to proceed with the work without any hindrance.

All restoration works shall be carried out to your satisfaction and at our own cost.`,
}

export default function LettersPage() {
  const { activeProjectId, user } = useAuthStore()
  const qc = useQueryClient()

  const [showNew,   setShowNew]   = useState(false)
  const [preview,   setPreview]   = useState<any>(null)
  const [sendModal, setSendModal] = useState<any>(null)
  const [sendForm,  setSendForm]  = useState({ toEmail: '', subject: '', bodyNote: '' })

  const [form, setForm] = useState({
    subject: '', toName: '', toOrganization: 'LCMA',
    toEmail: '', body: '', date: new Date().toISOString().split('T')[0],
  })

  // ── Data ─────────────────────────────────────────────────────
  const { data: lettersData, isLoading } = useQuery({
    queryKey: ['letters', activeProjectId],
    queryFn:  () => liaisonApi.letters({ projectId: activeProjectId }).then(r => r.data),
    enabled:  !!activeProjectId,
  })

  const { data: gmailStatus } = useQuery({
    queryKey: ['gmail-status'],
    queryFn:  () => liaisonApi.gmailStatus().then(r => r.data),
  })

  // ── Mutations ─────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (data: any) => liaisonApi.createLetter({ ...data, projectId: activeProjectId }),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['letters'] }); setShowNew(false); setForm({ subject:'',toName:'',toOrganization:'LCMA',toEmail:'',body:'',date:new Date().toISOString().split('T')[0] }) },
  })

  const sendMutation = useMutation({
    mutationFn: ({ id, data }: any) => liaisonApi.sendLetter(id, data),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['letters'] }); setSendModal(null) },
  })

  const letters = lettersData ?? []

  function insertTemplate(key: string) {
    setForm(f => ({ ...f, body: LETTER_TEMPLATES[key] ?? '' }))
  }

  function printPreview(letter: any) {
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`<html><head><title>${letter.letterNumber}</title>
      <style>body{font-family:Arial,sans-serif;font-size:12px;margin:40px;color:#111}
      .header{border-bottom:3px solid #185FA5;padding-bottom:10px;margin-bottom:20px}
      .company{font-size:18px;font-weight:bold;color:#185FA5}
      .body{line-height:1.9;white-space:pre-wrap}</style></head><body>
      <div class="header"><div class="company">Khilari Infrastructure Pvt. Ltd.</div></div>
      <div style="display:flex;justify-content:space-between;margin-bottom:12px">
        <div><b>Ref:</b> ${letter.letterNumber}</div>
        <div><b>Date:</b> ${letter.date}</div>
      </div>
      <div style="margin-bottom:12px"><b>To,</b><br>${letter.toName ?? ''}<br>${letter.toOrganization ?? ''}</div>
      <div style="font-weight:bold;margin-bottom:10px"><u>Sub:</u> ${letter.subject}</div>
      <hr>
      <div style="margin-bottom:10px">Respected Sir/Madam,</div>
      <div class="body">${letter.body}</div>
      <div style="margin-top:40px">Yours faithfully,<br><br><br><b>${letter.signedBy?.name ?? user?.name}</b></div>
      </body></html>`)
    win.document.close()
    win.print()
  }

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Envelope size={18} style={{ color: 'var(--color-text-muted)' }} />
          <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-base)' }}>Official Letters</h2>
          <span className="text-xs px-2 py-0.5 rounded-full border border-[#30363D]"
                style={{ color: 'var(--color-text-faint)' }}>
            {letters.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {!gmailStatus?.configured && (
            <span className="text-xs px-2.5 py-1 rounded-lg border border-[#D29922]/30"
                  style={{ background: 'var(--color-amber-bg)', color: 'var(--color-amber)' }}>
              ⚠ Gmail not connected
            </span>
          )}
          <Button icon={<Plus size={14} />} onClick={() => setShowNew(true)}>
            Draft Letter
          </Button>
        </div>
      </div>

      {/* ── Letters table ── */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-sm" style={{ color: 'var(--color-text-faint)' }}>Loading...</div>
        ) : letters.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14" style={{ color: 'var(--color-text-faint)' }}>
            <Envelope size={32} className="mb-2 opacity-20" />
            <p className="text-sm">No letters drafted yet</p>
            <button onClick={() => setShowNew(true)} className="mt-2 text-sm underline" style={{ color: 'var(--color-accent)' }}>
              Draft your first letter →
            </button>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#30363D]" style={{ background: 'var(--color-bg-subtle)' }}>
                {['Ref No.','Date','To','Subject','Status','Actions'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--color-text-faint)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {letters.map((l: any) => (
                <tr key={l.id} className="border-b border-[#30363D] last:border-0 hover:bg-[#1C2128] transition-colors">
                  <td className="px-3 py-3 font-mono" style={{ color: 'var(--color-accent)' }}>{l.letterNumber ?? '—'}</td>
                  <td className="px-3 py-3" style={{ color: 'var(--color-text-muted)' }}>{l.date}</td>
                  <td className="px-3 py-3 max-w-[120px] truncate" style={{ color: 'var(--color-text-base)' }}>{l.toOrganization ?? '—'}</td>
                  <td className="px-3 py-3 max-w-[200px] truncate" style={{ color: 'var(--color-text-base)' }}>{l.subject}</td>
                  <td className="px-3 py-3"><Badge value={l.status} /></td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setPreview(l)} className="p-1 rounded hover:bg-[#30363D] transition-colors"
                              style={{ color: 'var(--color-text-faint)' }} title="Preview">
                        <Eye size={14} />
                      </button>
                      <button onClick={() => printPreview(l)} className="p-1 rounded hover:bg-[#30363D] transition-colors"
                              style={{ color: 'var(--color-text-faint)' }} title="Print">
                        <Printer size={14} />
                      </button>
                      <a href={liaisonApi.letterPdfUrl(l.id)} target="_blank" rel="noreferrer"
                         className="p-1 rounded hover:bg-[#30363D] transition-colors"
                         style={{ color: 'var(--color-text-faint)' }} title="Download PDF">
                        ↓
                      </a>
                      <button
                        onClick={() => { setSendModal(l); setSendForm({ toEmail: l.toEmail ?? '', subject: `Letter Ref: ${l.letterNumber} — ${l.subject}`, bodyNote: '' }) }}
                        className="p-1 rounded hover:bg-[#30363D] transition-colors"
                        style={{ color: l.status === 'dispatched' ? 'var(--color-green)' : 'var(--color-accent)' }}
                        title="Send via Gmail"
                      >
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

      {/* ── NEW LETTER MODAL ── */}
      <Modal open={showNew} onClose={() => setShowNew(false)} title="Draft Letter" width="max-w-3xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowNew(false)}>Cancel</Button>
            <Button loading={createMutation.isPending}
              onClick={() => createMutation.mutate(form)}
              disabled={!form.subject || !form.body}>
              Save Letter
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input label="To (Name)" value={form.toName}
              onChange={e => setForm(f => ({ ...f, toName: e.target.value }))}
              placeholder="Executive Engineer" />
            <Input label="Organisation *" value={form.toOrganization}
              onChange={e => setForm(f => ({ ...f, toOrganization: e.target.value }))}
              placeholder="LCMA, UEED, etc." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Recipient Email (for Gmail)" type="email" value={form.toEmail}
              onChange={e => setForm(f => ({ ...f, toEmail: e.target.value }))}
              placeholder="officer@jkgov.in" />
            <Input label="Date" type="date" value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
          </div>
          <Input label="Subject *" value={form.subject}
            onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
            placeholder="Request for NOC / Approval / Reply regarding..." />

          {/* Template buttons */}
          <div>
            <p className="text-xs mb-1.5" style={{ color: 'var(--color-text-faint)' }}>Insert template:</p>
            <div className="flex gap-1.5 flex-wrap">
              {[
                { key: 'reminder',    label: 'Reminder' },
                { key: 'covering',    label: 'Covering Letter' },
                { key: 'reply',       label: 'Reply' },
                { key: 'noc_request', label: 'NOC Request' },
              ].map(t => (
                <button key={t.key} onClick={() => insertTemplate(t.key)}
                  className="text-xs px-2.5 py-1 rounded-lg border border-[#30363D] hover:bg-[#1C2128] transition-colors"
                  style={{ color: 'var(--color-text-muted)' }}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <Textarea label="Letter Body *" rows={12} value={form.body}
            onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
            placeholder="Type letter body here or click a template above..." />
        </div>
      </Modal>

      {/* ── PREVIEW MODAL ── */}
      <Modal open={!!preview} onClose={() => setPreview(null)} title={preview?.letterNumber ?? 'Preview'} width="max-w-2xl"
        footer={
          <div className="flex gap-2 w-full">
            <Button variant="ghost" icon={<Printer size={14} />} onClick={() => printPreview(preview)}>Print</Button>
            <Button variant="ghost" onClick={() => { setSendModal(preview); setPreview(null); setSendForm({ toEmail: preview?.toEmail ?? '', subject: `Letter Ref: ${preview?.letterNumber} — ${preview?.subject}`, bodyNote: '' }) }}>
              <PaperPlaneTilt size={14} className="mr-1" />Send
            </Button>
            <div className="flex-1" />
            <Button variant="ghost" onClick={() => setPreview(null)}>Close</Button>
          </div>
        }
      >
        {preview && (
          <div className="rounded-lg p-6 text-sm" style={{ background: 'white', color: '#222' }}>
            <div style={{ borderBottom: '3px solid #185FA5', paddingBottom: 8, marginBottom: 16 }}>
              <div style={{ fontSize: 18, fontWeight: 'bold', color: '#185FA5' }}>Khilari Infrastructure Pvt. Ltd.</div>
              <div style={{ fontSize: 11, color: '#555' }}>Srinagar, J&K</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: 11 }}>
              <div><b>Ref:</b> {preview.letterNumber}</div>
              <div><b>Date:</b> {preview.date}</div>
            </div>
            <div style={{ marginBottom: 10 }}><b>To,</b><br />{preview.toName}<br />{preview.toOrganization}</div>
            <div style={{ fontWeight: 'bold', marginBottom: 10 }}><u>Sub:</u> {preview.subject}</div>
            <hr style={{ margin: '10px 0', border: 'none', borderTop: '1px solid #ddd' }} />
            <div style={{ marginBottom: 10 }}>Respected Sir/Madam,</div>
            <div style={{ lineHeight: 1.9, whiteSpace: 'pre-wrap' }}>{preview.body}</div>
            <div style={{ marginTop: 40 }}>Yours faithfully,<br /><br /><br />
              <b>{preview.signedBy?.name ?? user?.name}</b><br />
              <span style={{ color: '#555' }}>Authorised Signatory<br />Khilari Infrastructure Pvt. Ltd.</span>
            </div>
          </div>
        )}
      </Modal>

      {/* ── SEND VIA GMAIL MODAL ── */}
      <Modal open={!!sendModal} onClose={() => setSendModal(null)} title="Send Letter via Gmail"
        footer={
          <>
            <Button variant="ghost" onClick={() => setSendModal(null)}>Cancel</Button>
            <Button
              loading={sendMutation.isPending}
              icon={<PaperPlaneTilt size={14} />}
              onClick={() => sendMutation.mutate({ id: sendModal?.id, data: sendForm })}
              disabled={!sendForm.toEmail}
            >Send Email</Button>
          </>
        }
      >
        <div className="space-y-3">
          {!gmailStatus?.configured && (
            <div className="p-3 rounded-lg text-xs" style={{ background: 'var(--color-amber-bg)', color: 'var(--color-amber)', border: '1px solid #D29922' }}>
              Gmail is not connected. Visit <code>/api/v1/gmail/auth</code> to connect your Gmail account first.
            </div>
          )}
          <div className="p-3 rounded-lg text-xs" style={{ background: 'var(--color-bg-subtle)', color: 'var(--color-text-muted)' }}>
            <b>Letter:</b> {sendModal?.letterNumber} — {sendModal?.subject}
          </div>
          <Input label="Recipient Email *" type="email" value={sendForm.toEmail}
            onChange={e => setSendForm(f => ({ ...f, toEmail: e.target.value }))}
            placeholder="officer@jkgov.in" />
          <Input label="Email Subject" value={sendForm.subject}
            onChange={e => setSendForm(f => ({ ...f, subject: e.target.value }))} />
          <Textarea label="Covering Note (optional)" rows={3} value={sendForm.bodyNote}
            onChange={e => setSendForm(f => ({ ...f, bodyNote: e.target.value }))}
            placeholder="Brief note in the email body before the PDF attachment..." />
          <p className="text-xs" style={{ color: 'var(--color-text-faint)' }}>
            The letter PDF will be generated and attached automatically. A copy will remain in your Gmail Sent folder.
          </p>
        </div>
      </Modal>

    </div>
  )
}
TSX

ok "LettersPage written"

# ================================================================
# ADD TanStack Query provider
# ================================================================
info "Checking TanStack Query..."
cd "$ROOT/frontend"

if ! grep -q '@tanstack/react-query' package.json; then
  npm install @tanstack/react-query --silent
  ok "TanStack Query installed"
else
  ok "TanStack Query already installed"
fi

# Add provider to main.tsx if not already there
if ! grep -q 'QueryClient' "$SRC/main.tsx"; then
  cat > "$SRC/main.tsx" << 'TSX'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry:              1,
      staleTime:          30_000,
      refetchOnWindowFocus: false,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
TSX
  ok "QueryClientProvider added to main.tsx"
fi

# ================================================================
# DONE
# ================================================================
echo ""
echo -e "${G}${BOLD}Liaison frontend complete!${NC}"
echo ""
echo -e "  ${BOLD}Pages:${NC}"
echo -e "  /liaison         → File tracker with approval chain"
echo -e "  /liaison/letters → Letter composer with Gmail send"
echo ""
echo -e "  ${Y}Start the frontend: cd frontend && npm run dev${NC}"
echo -e "  ${Y}Open: http://localhost:5173/liaison${NC}"
echo ""
