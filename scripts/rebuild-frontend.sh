#!/usr/bin/env bash
# ================================================================
#  KIPL ProjectOS — Complete Frontend Rebuild
#  Vercel-inspired design, working pages, no heredoc issues
#  Uses Node.js fs to write all files — 100% Windows compatible
#  Usage: bash scripts/rebuild-frontend.sh
# ================================================================

set -euo pipefail

G='\033[0;32m'; Y='\033[1;33m'; B='\033[0;34m'; R='\033[0;31m'; BOLD='\033[1m'; NC='\033[0m'
ok()   { echo -e "${G}  ✓${NC} $1"; }
info() { echo -e "${B}  →${NC} $1"; }
err()  { echo -e "${R}  ✗ $1${NC}"; exit 1; }

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND="$ROOT/frontend"
SRC="$FRONTEND/src"

[[ -d "$FRONTEND" ]] || err "frontend/ not found — run setup.sh first"

echo -e "\n${BOLD}Rebuilding Frontend — Vercel Style${NC}\n"

# ── Install packages ───────────────────────────────────────────────
info "Installing packages..."
cd "$FRONTEND"
npm install --save \
  @phosphor-icons/react \
  @tanstack/react-query \
  react-router-dom \
  zustand \
  axios \
  clsx \
  date-fns \
  --silent 2>/dev/null || true

npm install --save-dev \
  tailwindcss \
  @tailwindcss/vite \
  --silent 2>/dev/null || true
ok "Packages ready"

# ── Create all directories ─────────────────────────────────────────
info "Creating directories..."
node -e "
const fs = require('fs');
const dirs = [
  '$SRC/store',
  '$SRC/api',
  '$SRC/hooks',
  '$SRC/components/ui',
  '$SRC/components/layout',
  '$SRC/pages/auth',
  '$SRC/pages/dashboard',
  '$SRC/pages/liaison',
  '$SRC/pages/hr',
  '$SRC/pages/tasks',
  '$SRC/pages/epc',
  '$SRC/pages/accounting',
  '$SRC/pages/public',
  '$SRC/layouts',
];
dirs.forEach(d => fs.mkdirSync(d, { recursive: true }));
console.log('  Directories created');
"
ok "Directories created"

# ── Write all files via Node.js ────────────────────────────────────
info "Writing all source files..."

node << 'NODEEOF'
const fs = require('fs');
const path = require('path');

const SRC = process.env.SRC_PATH;

function write(filePath, content) {
  fs.writeFileSync(filePath, content, 'utf8');
}

const src = SRC || path.join(__dirname, 'frontend', 'src');

// ================================================================
// vite.config.ts
// ================================================================
write(path.join(src, '..', 'vite.config.ts'), `
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': resolve(__dirname, './src') } },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true }
    }
  }
})
`.trim());

// ================================================================
// index.css — Vercel-inspired design tokens
// ================================================================
write(path.join(src, 'index.css'), `
@import "tailwindcss";
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

@theme {
  --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  /* Vercel palette */
  --color-bg-root:    #000000;
  --color-bg-card:    #0a0a0a;
  --color-bg-hover:   #111111;
  --color-bg-active:  #161616;
  --color-border:     #1a1a1a;
  --color-border-alt: #2a2a2a;

  /* Text */
  --color-text-1:    #ededed;
  --color-text-2:    #a1a1a1;
  --color-text-3:    #666666;

  /* Brand */
  --color-blue:      #0070f3;
  --color-blue-dark: #0060df;
  --color-blue-bg:   #0070f315;

  /* Status */
  --color-green:     #50e3c2;
  --color-green-bg:  #0d2e28;
  --color-amber:     #f5a623;
  --color-amber-bg:  #2a1f00;
  --color-red:       #e00;
  --color-red-bg:    #2c0000;
  --color-purple:    #7928ca;
  --color-purple-bg: #1a0030;
}

*, *::before, *::after { box-sizing: border-box; }
* { margin: 0; padding: 0; }

html, body {
  height: 100%;
  background: var(--color-bg-root);
  color: var(--color-text-1);
  font-family: var(--font-sans);
  font-size: 14px;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Scrollbar */
::-webkit-scrollbar { width: 3px; height: 3px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #333; border-radius: 2px; }

/* Selection */
::selection { background: #0070f330; color: var(--color-blue); }

/* Focus */
:focus-visible { outline: 2px solid var(--color-blue); outline-offset: 2px; }

/* Utility classes */
.card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border-alt);
  border-radius: 8px;
}

.card-hover {
  transition: border-color 0.15s ease;
}
.card-hover:hover {
  border-color: #444;
}

.font-mono { font-family: var(--font-mono); }

/* Animations */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}
.animate-in {
  animation: fadeIn 0.2s ease forwards;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
.animate-spin {
  animation: spin 0.8s linear infinite;
}
`.trim());

// ================================================================
// main.tsx
// ================================================================
write(path.join(src, 'main.tsx'), `
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
)
`.trim());

// ================================================================
// App.tsx
// ================================================================
write(path.join(src, 'App.tsx'), `
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import LoginPage from '@/pages/auth/LoginPage'
import AppLayout from '@/layouts/AppLayout'
import DashboardPage from '@/pages/dashboard/DashboardPage'
import LiaisonPage from '@/pages/liaison/LiaisonPage'
import LettersPage from '@/pages/liaison/LettersPage'
import AttendancePage from '@/pages/hr/AttendancePage'
import EmployeesPage from '@/pages/hr/EmployeesPage'
import SalaryPage from '@/pages/hr/SalaryPage'
import TasksPage from '@/pages/tasks/TasksPage'
import KanbanPage from '@/pages/tasks/KanbanPage'
import EpcPage from '@/pages/epc/EpcPage'
import AccountingPage from '@/pages/accounting/AccountingPage'
import InvoicesPage from '@/pages/accounting/InvoicesPage'
import PublicProjectPage from '@/pages/public/PublicProjectPage'

function Guard({ children }: { children: React.ReactNode }) {
  const user = useAuthStore(s => s.user)
  return user ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/p/:code" element={<PublicProjectPage />} />
        <Route element={<Guard><AppLayout /></Guard>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"           element={<DashboardPage />} />
          <Route path="liaison"             element={<LiaisonPage />} />
          <Route path="liaison/letters"     element={<LettersPage />} />
          <Route path="hr/attendance"       element={<AttendancePage />} />
          <Route path="hr/employees"        element={<EmployeesPage />} />
          <Route path="hr/salary"           element={<SalaryPage />} />
          <Route path="tasks"               element={<TasksPage />} />
          <Route path="tasks/kanban"        element={<KanbanPage />} />
          <Route path="epc"                 element={<EpcPage />} />
          <Route path="accounting"          element={<AccountingPage />} />
          <Route path="accounting/invoices" element={<InvoicesPage />} />
          <Route path="*"                   element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
`.trim());

// ================================================================
// store/auth.store.ts
// ================================================================
write(path.join(src, 'store/auth.store.ts'), `
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type UserRole =
  | 'super_admin' | 'admin' | 'project_manager' | 'engineer'
  | 'hr_officer' | 'liaison_officer' | 'accountant'
  | 'field_staff' | 'viewer'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: UserRole
}

interface AuthState {
  user:            AuthUser | null
  accessToken:     string | null
  refreshToken:    string | null
  activeProjectId: string | null
  setAuth:    (u: AuthUser, at: string, rt: string) => void
  setToken:   (at: string) => void
  setProject: (id: string) => void
  logout:     () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    set => ({
      user: null, accessToken: null, refreshToken: null, activeProjectId: null,
      setAuth:    (user, accessToken, refreshToken) => set({ user, accessToken, refreshToken }),
      setToken:   accessToken => set({ accessToken }),
      setProject: activeProjectId => set({ activeProjectId }),
      logout:     () => set({ user: null, accessToken: null, refreshToken: null, activeProjectId: null }),
    }),
    {
      name: 'kipl-auth',
      partialize: s => ({
        user: s.user,
        accessToken: s.accessToken,
        refreshToken: s.refreshToken,
        activeProjectId: s.activeProjectId,
      }),
    }
  )
)

const LEVELS: Record<UserRole, number> = {
  super_admin: 100, admin: 90, project_manager: 70,
  engineer: 50, hr_officer: 50, liaison_officer: 50, accountant: 50,
  field_staff: 30, viewer: 10,
}

export function can(user: AuthUser | null, min: UserRole) {
  if (!user) return false
  if (user.role === 'super_admin') return true
  return LEVELS[user.role] >= LEVELS[min]
}
`.trim());

// ================================================================
// api/client.ts
// ================================================================
write(path.join(src, 'api/client.ts'), `
import axios from 'axios'
import { useAuthStore } from '@/store/auth.store'

const api = axios.create({
  baseURL: (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3000',
  timeout: 30_000,
})

api.interceptors.request.use(cfg => {
  const token = useAuthStore.getState().accessToken
  if (token) cfg.headers.Authorization = 'Bearer ' + token
  return cfg
})

let refreshing = false
let queue: Array<(t: string) => void> = []

api.interceptors.response.use(
  r => r,
  async err => {
    const orig = err.config
    if (err.response?.status === 401 && !orig._retry) {
      if (refreshing) {
        return new Promise(res => { queue.push(t => { orig.headers.Authorization = 'Bearer ' + t; res(api(orig)) }) })
      }
      orig._retry = true; refreshing = true
      try {
        const rt = useAuthStore.getState().refreshToken
        if (!rt) throw new Error('no rt')
        const { data } = await axios.post(
          ((import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3000') + '/api/v1/auth/refresh',
          { refresh_token: rt }
        )
        useAuthStore.getState().setToken(data.access_token)
        queue.forEach(fn => fn(data.access_token)); queue = []
        orig.headers.Authorization = 'Bearer ' + data.access_token
        return api(orig)
      } catch {
        useAuthStore.getState().logout()
        window.location.href = '/login'
        return Promise.reject(err)
      } finally { refreshing = false }
    }
    return Promise.reject(err)
  }
)

export default api
`.trim());

// ================================================================
// api/liaison.api.ts
// ================================================================
write(path.join(src, 'api/liaison.api.ts'), `
import api from './client'

export const liaisonApi = {
  dashboard:     (projectId?: string) => api.get('/api/v1/liaison/dashboard', { params: { projectId } }),
  files:         (p?: any) => api.get('/api/v1/liaison/files', { params: p }),
  file:          (id: string) => api.get('/api/v1/liaison/files/' + id),
  createFile:    (d: any) => api.post('/api/v1/liaison/files', d),
  approveFile:   (id: string, d: any) => api.patch('/api/v1/liaison/files/' + id + '/approve', d),
  uploadDoc:     (id: string, d: any) => api.post('/api/v1/liaison/files/' + id + '/documents', d),
  letters:       (p?: any) => api.get('/api/v1/liaison/letters', { params: p }),
  letter:        (id: string) => api.get('/api/v1/liaison/letters/' + id),
  createLetter:  (d: any) => api.post('/api/v1/liaison/letters', d),
  sendLetter:    (id: string, d: any) => api.post('/api/v1/liaison/letters/' + id + '/send', d),
  pdfUrl:        (id: string) => (((import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3000')) + '/api/v1/liaison/letters/' + id + '/pdf',
  gmailStatus:   () => api.get('/api/v1/gmail/status'),
}
`.trim());

// ================================================================
// components/ui/index.ts — barrel export
// ================================================================

// Badge component
write(path.join(src, 'components/ui/Badge.tsx'), `
import { clsx } from 'clsx'

const MAP: Record<string, string> = {
  // Status
  draft:        'bg-[#111] text-[#666] border-[#222]',
  submitted:    'bg-[#0070f315] text-[#0070f3] border-[#0070f330]',
  under_review: 'bg-[#f5a62315] text-[#f5a623] border-[#f5a62330]',
  approved:     'bg-[#50e3c215] text-[#50e3c2] border-[#50e3c230]',
  rejected:     'bg-[#e0000015] text-[#e00] border-[#e0000030]',
  returned:     'bg-[#e0000015] text-[#e00] border-[#e0000030]',
  closed:       'bg-[#111] text-[#555] border-[#222]',
  dispatched:   'bg-[#50e3c215] text-[#50e3c2] border-[#50e3c230]',
  generated:    'bg-[#7928ca15] text-[#7928ca] border-[#7928ca30]',
  pending:      'bg-[#f5a62315] text-[#f5a623] border-[#f5a62330]',
  // Priority
  low:          'bg-[#111] text-[#666] border-[#222]',
  medium:       'bg-[#0070f315] text-[#0070f3] border-[#0070f330]',
  high:         'bg-[#f5a62315] text-[#f5a623] border-[#f5a62330]',
  urgent:       'bg-[#e0000015] text-[#e00] border-[#e0000030]',
  // File types
  noc:          'bg-[#7928ca15] text-[#7928ca] border-[#7928ca30]',
  approval:     'bg-[#0070f315] text-[#0070f3] border-[#0070f330]',
  drawing:      'bg-[#50e3c215] text-[#50e3c2] border-[#50e3c230]',
  estimate:     'bg-[#f5a62315] text-[#f5a623] border-[#f5a62330]',
  report:       'bg-[#111] text-[#666] border-[#222]',
  letter:       'bg-[#7928ca15] text-[#7928ca] border-[#7928ca30]',
  clearance:    'bg-[#e0000015] text-[#e00] border-[#e0000030]',
  other:        'bg-[#111] text-[#666] border-[#222]',
}

export function Badge({ value, size = 'sm' }: { value?: string; size?: 'xs' | 'sm' }) {
  if (!value) return null
  const key = value.toLowerCase().replace(/[^a-z_]/g, '_')
  return (
    <span className={clsx(
      'inline-flex items-center rounded border font-medium uppercase tracking-wide',
      size === 'xs' ? 'px-1.5 py-0 text-[9px]' : 'px-2 py-0.5 text-[10px]',
      MAP[key] ?? 'bg-[#111] text-[#666] border-[#222]'
    )}>
      {value.replace(/_/g, ' ')}
    </span>
  )
}
`.trim());

// Spinner
write(path.join(src, 'components/ui/Spinner.tsx'), `
export function Spinner({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      className="animate-spin" style={{ color: '#0070f3' }}
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.2" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}
`.trim());

// Button
write(path.join(src, 'components/ui/Button.tsx'), `
import { clsx } from 'clsx'
import { Spinner } from './Spinner'

type V = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: V
  size?: 'xs' | 'sm' | 'md'
  loading?: boolean
  icon?: React.ReactNode
}

const V_STYLES: Record<V, string> = {
  primary:   'bg-[#0070f3] text-white hover:bg-[#0060df] border-transparent',
  secondary: 'bg-[#111] text-[#ededed] hover:bg-[#1a1a1a] border-[#2a2a2a]',
  ghost:     'bg-transparent text-[#a1a1a1] hover:text-[#ededed] hover:bg-[#111] border-transparent',
  danger:    'bg-[#e0000010] text-[#e00] hover:bg-[#e0000020] border-[#e0000030]',
  success:   'bg-[#50e3c210] text-[#50e3c2] hover:bg-[#50e3c220] border-[#50e3c230]',
}

const S_STYLES = {
  xs: 'px-2 py-1 text-[11px] gap-1 rounded-md',
  sm: 'px-3 py-1.5 text-xs gap-1.5 rounded-lg',
  md: 'px-4 py-2 text-sm gap-2 rounded-lg',
}

export function Button({ variant = 'secondary', size = 'sm', loading, icon, children, className, disabled, ...p }: Props) {
  return (
    <button
      {...p}
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center font-medium border transition-all duration-150',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        V_STYLES[variant], S_STYLES[size], className
      )}
    >
      {loading ? <Spinner size={12} /> : icon}
      {children}
    </button>
  )
}
`.trim());

// Input
write(path.join(src, 'components/ui/Input.tsx'), `
import { clsx } from 'clsx'

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string; error?: string; hint?: string
}

export function Input({ label, error, hint, className, ...p }: Props) {
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-xs font-medium text-[#a1a1a1]">{label}</label>}
      <input
        {...p}
        className={clsx(
          'w-full px-3 py-2 rounded-lg text-sm bg-[#0a0a0a] transition-colors duration-150',
          'placeholder:text-[#555] focus:outline-none',
          error
            ? 'border border-[#e00] focus:border-[#e00]'
            : 'border border-[#2a2a2a] focus:border-[#444]',
          className
        )}
        style={{ color: '#ededed' }}
      />
      {error && <p className="text-[11px] text-[#e00]">{error}</p>}
      {hint  && <p className="text-[11px] text-[#666]">{hint}</p>}
    </div>
  )
}
`.trim());

// Select
write(path.join(src, 'components/ui/Select.tsx'), `
interface Option { value: string; label: string }
interface Props extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string; options: Option[]; placeholder?: string; error?: string
}

export function Select({ label, options, placeholder, error, ...p }: Props) {
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-xs font-medium text-[#a1a1a1]">{label}</label>}
      <select
        {...p}
        className="w-full px-3 py-2 rounded-lg text-sm bg-[#0a0a0a] border border-[#2a2a2a] focus:border-[#444] focus:outline-none transition-colors"
        style={{ color: '#ededed' }}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {error && <p className="text-[11px] text-[#e00]">{error}</p>}
    </div>
  )
}
`.trim());

// Textarea
write(path.join(src, 'components/ui/Textarea.tsx'), `
interface Props extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string; error?: string
}

export function Textarea({ label, error, ...p }: Props) {
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-xs font-medium text-[#a1a1a1]">{label}</label>}
      <textarea
        {...p}
        className="w-full px-3 py-2 rounded-lg text-sm bg-[#0a0a0a] border border-[#2a2a2a] focus:border-[#444] focus:outline-none resize-none transition-colors"
        style={{ color: '#ededed' }}
      />
      {error && <p className="text-[11px] text-[#e00]">{error}</p>}
    </div>
  )
}
`.trim());

// Modal
write(path.join(src, 'components/ui/Modal.tsx'), `
import { X } from '@phosphor-icons/react'

interface Props {
  open: boolean; onClose: () => void; title: string
  children: React.ReactNode; width?: string; footer?: React.ReactNode
}

export function Modal({ open, onClose, title, children, width = 'max-w-lg', footer }: Props) {
  if (!open) return null
  return (
    <div
      className={'fixed inset-0 z-50 flex items-center justify-center p-4'}
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className={'w-full ' + width + ' flex flex-col max-h-[90vh] shadow-2xl animate-in'}
        style={{ background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: 12 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
             style={{ borderBottom: '1px solid #1a1a1a' }}>
          <span className="text-sm font-semibold text-[#ededed]">{title}</span>
          <button onClick={onClose} className="text-[#555] hover:text-[#ededed] transition-colors p-1 rounded-md hover:bg-[#111]">
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 px-5 py-4 flex-shrink-0"
               style={{ borderTop: '1px solid #1a1a1a', background: '#050505' }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
`.trim());

// StatCard
write(path.join(src, 'components/ui/StatCard.tsx'), `
interface Props {
  label: string; value: string | number
  sub?: string; color?: string; icon?: React.ReactNode
  trend?: 'up' | 'down' | 'flat'
}

export function StatCard({ label, value, sub, color = '#0070f3', icon }: Props) {
  return (
    <div className="card card-hover p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[#666] uppercase tracking-wider">{label}</span>
        {icon && <span style={{ color }} className="opacity-60">{icon}</span>}
      </div>
      <div>
        <div className="text-2xl font-semibold font-mono" style={{ color }}>{value}</div>
        {sub && <div className="text-xs text-[#555] mt-1">{sub}</div>}
      </div>
    </div>
  )
}
`.trim());

// Empty state
write(path.join(src, 'components/ui/Empty.tsx'), `
interface Props { icon?: React.ReactNode; title: string; sub?: string; action?: React.ReactNode }

export function Empty({ icon, title, sub, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 space-y-3">
      {icon && <div className="text-[#333] mb-1">{icon}</div>}
      <p className="text-sm font-medium text-[#a1a1a1]">{title}</p>
      {sub && <p className="text-xs text-[#555]">{sub}</p>}
      {action}
    </div>
  )
}
`.trim());

// ================================================================
// layouts/AppLayout.tsx — main app shell
// ================================================================
write(path.join(src, 'layouts/AppLayout.tsx'), `
import { Outlet } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'

export default function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--color-bg-root)' }}>
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
`.trim());

// ================================================================
// components/layout/Sidebar.tsx
// ================================================================
write(path.join(src, 'components/layout/Sidebar.tsx'), `
import { NavLink, useNavigate } from 'react-router-dom'
import {
  SquaresFour, FileText, Envelope, Users, MapPin,
  ChartBar, Package, Receipt, GitBranch,
  Kanban, Buildings, SignOut, UserCircle,
} from '@phosphor-icons/react'
import { useAuthStore } from '@/store/auth.store'

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard',    path: '/dashboard',           icon: SquaresFour, end: true },
    ]
  },
  {
    label: 'Liaison',
    items: [
      { label: 'Files',        path: '/liaison',             icon: FileText,    end: true },
      { label: 'Letters',      path: '/liaison/letters',     icon: Envelope,    end: false },
    ]
  },
  {
    label: 'Planning',
    items: [
      { label: 'WBS & Gantt',  path: '/tasks',               icon: GitBranch,   end: true },
      { label: 'Task Board',   path: '/tasks/kanban',        icon: Kanban,      end: false },
    ]
  },
  {
    label: 'EPC',
    items: [
      { label: 'BOQ & Costs',  path: '/epc',                 icon: Package,     end: true },
    ]
  },
  {
    label: 'HR',
    items: [
      { label: 'Attendance',   path: '/hr/attendance',       icon: MapPin,      end: true },
      { label: 'Employees',    path: '/hr/employees',        icon: Users,       end: false },
      { label: 'Salary',       path: '/hr/salary',           icon: Receipt,     end: false },
    ]
  },
  {
    label: 'Finance',
    items: [
      { label: 'Transactions', path: '/accounting',          icon: ChartBar,    end: true },
      { label: 'Invoices',     path: '/accounting/invoices', icon: Receipt,     end: false },
    ]
  },
]

export function Sidebar() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const initials = user?.name
    ?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) ?? 'U'

  return (
    <aside
      className="w-56 flex-shrink-0 flex flex-col h-full overflow-y-auto"
      style={{ background: '#050505', borderRight: '1px solid #1a1a1a' }}
    >
      {/* Logo */}
      <div className="px-4 py-4 flex items-center gap-3" style={{ borderBottom: '1px solid #111' }}>
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: '#0070f3' }}
        >
          <Buildings size={14} weight="bold" color="white" />
        </div>
        <div>
          <div className="text-[13px] font-semibold text-[#ededed]">ProjectOS</div>
          <div className="text-[10px] text-[#444]">KIPL</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3">
        {NAV_GROUPS.map(group => (
          <div key={group.label} className="mb-4">
            <div className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-widest text-[#333]">
              {group.label}
            </div>
            {group.items.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={({ isActive }) =>
                  'flex items-center gap-2.5 px-2 py-1.5 rounded-md text-[13px] transition-all duration-100 mb-0.5 ' +
                  (isActive
                    ? 'bg-[#111] text-[#ededed]'
                    : 'text-[#555] hover:text-[#a1a1a1] hover:bg-[#0a0a0a]')
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon
                      size={15}
                      weight={isActive ? 'fill' : 'regular'}
                      color={isActive ? '#0070f3' : 'currentColor'}
                    />
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="px-3 py-3" style={{ borderTop: '1px solid #111' }}>
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold flex-shrink-0"
            style={{ background: '#0070f320', color: '#0070f3' }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-medium text-[#ededed] truncate">{user?.name}</div>
            <div className="text-[10px] text-[#444] capitalize truncate">
              {user?.role?.replace(/_/g, ' ')}
            </div>
          </div>
          <button
            onClick={() => { logout(); navigate('/login') }}
            className="text-[#333] hover:text-[#666] transition-colors p-1 rounded"
            title="Sign out"
          >
            <SignOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  )
}
`.trim());

// ================================================================
// pages/auth/LoginPage.tsx
// ================================================================
write(path.join(src, 'pages/auth/LoginPage.tsx'), `
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import { Buildings } from '@phosphor-icons/react'
import api from '@/api/client'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const { setAuth, setProject } = useAuthStore()
  const navigate = useNavigate()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const { data } = await api.post('/api/v1/auth/login', { email, password })
      setAuth(data.user, data.access_token, data.refresh_token)
      // Auto-select first available project
      try {
        const { data: projects } = await api.get('/api/v1/projects')
        if (Array.isArray(projects) && projects[0]?.id) setProject(projects[0].id)
      } catch {}
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.message ?? err.response?.data?.error ?? 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: '#000' }}
    >
      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative w-full max-w-[360px] px-4">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: '#0070f3', boxShadow: '0 0 40px #0070f360' }}
          >
            <Buildings size={24} weight="bold" color="white" />
          </div>
          <h1 className="text-xl font-semibold text-[#ededed]">KIPL ProjectOS</h1>
          <p className="text-sm text-[#555] mt-1">Sign in to your account</p>
        </div>

        {/* Form */}
        <div
          className="rounded-xl p-6 space-y-4"
          style={{ background: '#0a0a0a', border: '1px solid #1a1a1a' }}
        >
          {error && (
            <div
              className="px-3 py-2.5 rounded-lg text-sm text-[#e00]"
              style={{ background: '#e0000010', border: '1px solid #e0000030' }}
            >
              {error}
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#666]">Email</label>
              <input
                type="email" value={email} required autoFocus
                onChange={e => setEmail(e.target.value)}
                placeholder="you@kipl.in"
                className="w-full px-3 py-2.5 rounded-lg text-sm bg-[#000] border border-[#1a1a1a] focus:border-[#0070f3] focus:outline-none transition-colors text-[#ededed] placeholder:text-[#333]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#666]">Password</label>
              <input
                type="password" value={password} required
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2.5 rounded-lg text-sm bg-[#000] border border-[#1a1a1a] focus:border-[#0070f3] focus:outline-none transition-colors text-[#ededed] placeholder:text-[#333]"
              />
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full py-2.5 rounded-lg text-sm font-medium text-white transition-all duration-150 disabled:opacity-50"
              style={{ background: loading ? '#0060df' : '#0070f3' }}
            >
              {loading ? 'Signing in...' : 'Sign in →'}
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] text-[#333] mt-6">
          Khilari Infrastructure Pvt. Ltd. · Internal Platform
        </p>
      </div>
    </div>
  )
}
`.trim());

// ================================================================
// pages/dashboard/DashboardPage.tsx
// ================================================================
write(path.join(src, 'pages/dashboard/DashboardPage.tsx'), `
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth.store'
import { StatCard } from '@/components/ui/StatCard'
import { Spinner } from '@/components/ui/Spinner'
import { Badge } from '@/components/ui/Badge'
import api from '@/api/client'
import {
  FileText, Users, Warning, CheckCircle,
  CloudSun, Buildings,
} from '@phosphor-icons/react'

export default function DashboardPage() {
  const { user, activeProjectId } = useAuthStore()

  const { data: project } = useQuery({
    queryKey: ['project', activeProjectId],
    queryFn:  () => api.get('/api/v1/projects/' + activeProjectId).then(r => r.data),
    enabled:  !!activeProjectId,
  })

  const { data: liaisonDash } = useQuery({
    queryKey: ['liaison-dash', activeProjectId],
    queryFn:  () => api.get('/api/v1/liaison/dashboard', { params: { projectId: activeProjectId } }).then(r => r.data),
    enabled:  !!activeProjectId,
  })

  const { data: files } = useQuery({
    queryKey: ['liaison-files-recent', activeProjectId],
    queryFn:  () => api.get('/api/v1/liaison/files', { params: { projectId: activeProjectId, limit: 5 } }).then(r => r.data),
    enabled:  !!activeProjectId,
  })

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#ededed]">
            {greeting}, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-sm text-[#555] mt-1">
            {project?.name ?? 'Loading project...'} · {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        {project && (
          <div
            className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2"
            style={{ background: '#0070f315', color: '#0070f3', border: '1px solid #0070f330' }}
          >
            <Buildings size={12} />
            {project.code}
          </div>
        )}
      </div>

      {/* Project progress bar */}
      {project && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-medium text-[#ededed]">{project.name}</p>
              <p className="text-xs text-[#555] mt-0.5">{project.location}</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-mono font-semibold text-[#0070f3]">{project.progressPct ?? 0}%</div>
              <p className="text-[11px] text-[#555]">complete</p>
            </div>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#111' }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: (project.progressPct ?? 0) + '%', background: 'linear-gradient(90deg, #0070f3, #50e3c2)' }}
            />
          </div>
          <div className="flex justify-between mt-2 text-[10px] text-[#444]">
            <span>{project.startDate}</span>
            <span>₹{((project.contractValue ?? 0) / 1e7).toFixed(2)} Cr contract</span>
            <span>{project.endDate}</span>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Files"
          value={liaisonDash?.total ?? '—'}
          icon={<FileText size={16} />}
          color="#0070f3"
        />
        <StatCard
          label="Under Review"
          value={liaisonDash?.by_status?.under_review ?? '—'}
          icon={<CloudSun size={16} />}
          color="#f5a623"
        />
        <StatCard
          label="Approved"
          value={liaisonDash?.by_status?.approved ?? '—'}
          icon={<CheckCircle size={16} />}
          color="#50e3c2"
        />
        <StatCard
          label="Overdue"
          value={liaisonDash?.overdue ?? '—'}
          sub="Need attention"
          icon={<Warning size={16} />}
          color={liaisonDash?.overdue > 0 ? '#e00' : '#50e3c2'}
        />
      </div>

      {/* Recent Files */}
      <div className="card">
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #111' }}>
          <h2 className="text-sm font-semibold text-[#ededed]">Recent Liaison Files</h2>
          <a href="/liaison" className="text-xs text-[#0070f3] hover:underline">View all →</a>
        </div>
        {!files ? (
          <div className="flex items-center justify-center py-12"><Spinner /></div>
        ) : files.files?.length === 0 ? (
          <div className="py-12 text-center text-sm text-[#444]">No liaison files yet</div>
        ) : (
          <div>
            {files.files?.slice(0, 5).map((f: any) => (
              <div key={f.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-[#0a0a0a] transition-colors cursor-pointer" style={{ borderBottom: '1px solid #0d0d0d' }}>
                <FileText size={16} className="text-[#333] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#ededed] truncate">{f.subject}</p>
                  <p className="text-[11px] text-[#444] mt-0.5">{f.fileNumber ?? 'Draft'} · {f.department}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge value={f.priority} size="xs" />
                  <Badge value={f.currentStatus} size="xs" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
`.trim());

// ================================================================
// Stub pages for other routes
// ================================================================
const stubs = [
  ['hr/AttendancePage',       'Attendance',    'GPS check-in and attendance tracking'],
  ['hr/EmployeesPage',        'Employees',     'Employee management and records'],
  ['hr/SalaryPage',           'Salary',        'Monthly payroll generation'],
  ['tasks/TasksPage',         'WBS & Gantt',   'Work breakdown structure and critical path'],
  ['tasks/KanbanPage',        'Task Board',    'Kanban-style task management'],
  ['epc/EpcPage',             'BOQ & Costs',   'Bill of quantities and cost tracking'],
  ['accounting/AccountingPage','Transactions', 'General ledger and transactions'],
  ['accounting/InvoicesPage', 'Invoices',      'RA bills and invoice management'],
  ['public/PublicProjectPage','Public View',   'Public project progress page'],
]

stubs.forEach(([filePath, title, desc]) => {
  const name = filePath.split('/').pop()
  write(path.join(src, 'pages', filePath + '.tsx'), `
import { Wrench } from '@phosphor-icons/react'

export default function ${name}() {
  return (
    <div className="space-y-6 animate-in">
      <div>
        <h1 className="text-xl font-semibold text-[#ededed]">${title}</h1>
        <p className="text-sm text-[#555] mt-1">${desc}</p>
      </div>
      <div className="card flex flex-col items-center justify-center py-20 space-y-3">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: '#111' }}>
          <Wrench size={20} className="text-[#333]" />
        </div>
        <p className="text-sm font-medium text-[#a1a1a1]">Module coming soon</p>
        <p className="text-xs text-[#444]">Being built with .sh scripts, one module at a time</p>
      </div>
    </div>
  )
}
`.trim())
})

console.log('  All source files written successfully')
NODEEOF

# Pass SRC path to Node
export SRC_PATH="$SRC"
node << 'NODEEOF'
// This second pass writes the liaison pages which are longer
const fs   = require('fs')
const src  = process.env.SRC_PATH

// ================================================================
// LiaisonPage
// ================================================================
fs.writeFileSync(src + '/pages/liaison/LiaisonPage.tsx', `
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  FileText, Plus, MagnifyingGlass, CheckCircle,
  XCircle, Eye, Warning, CaretRight, FileX,
} from '@phosphor-icons/react'
import { liaisonApi } from '@/api/liaison.api'
import { useAuthStore } from '@/store/auth.store'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { StatCard } from '@/components/ui/StatCard'
import { Spinner } from '@/components/ui/Spinner'
import { Empty } from '@/components/ui/Empty'

const FILE_TYPES = [
  { value:'approval', label:'Approval' },{ value:'noc', label:'NOC' },
  { value:'drawing', label:'Drawing Approval' },{ value:'estimate', label:'Estimate' },
  { value:'report', label:'Inspection Report' },{ value:'letter', label:'Letter' },
  { value:'clearance', label:'Clearance' },{ value:'other', label:'Other' },
]
const DEPTS = [
  { value:'LCMA', label:'LCMA' },{ value:'UEED', label:'UEED' },
  { value:'SMC', label:'SMC' },{ value:'Traffic Police', label:'Traffic Police' },
  { value:'Forest Dept', label:'Forest Dept' },{ value:'DC Office', label:'DC Office' },
  { value:'PWD', label:'PWD' },{ value:'Other', label:'Other' },
]
const PRIORITIES = [
  { value:'low', label:'Low' },{ value:'medium', label:'Medium' },
  { value:'high', label:'High' },{ value:'urgent', label:'Urgent' },
]
const CHAINS: Record<string, string[]> = {
  approval:['JE','AEE','XEN','SE'], noc:['JE','AEE','XEN'],
  drawing:['JE','XEN'], estimate:['AEE','XEN','SE'],
  report:['XEN'], letter:['XEN'], clearance:['JE','AEE','XEN','SE'], other:['JE','AEE','XEN','SE'],
}

const BLANK_FORM = { subject:'', fileType:'noc', priority:'medium', department:'LCMA', dueDate:'', remarks:'' }

export default function LiaisonPage() {
  const { activeProjectId } = useAuthStore()
  const qc = useQueryClient()
  const [search, setSearch]     = useState('')
  const [statusF, setStatusF]   = useState('')
  const [showNew, setShowNew]   = useState(false)
  const [selected, setSelected] = useState<any>(null)
  const [approveModal, setApproveModal] = useState<{ action: 'approved'|'rejected', remarks: string } | null>(null)
  const [form, setForm]         = useState(BLANK_FORM)

  const { data: dash } = useQuery({
    queryKey: ['liaison-dash', activeProjectId],
    queryFn:  () => liaisonApi.dashboard(activeProjectId ?? undefined).then(r => r.data),
    enabled:  !!activeProjectId,
  })

  const { data: filesData, isLoading } = useQuery({
    queryKey: ['liaison-files', activeProjectId, statusF],
    queryFn:  () => liaisonApi.files({ projectId: activeProjectId, status: statusF || undefined, limit: 50 }).then(r => r.data),
    enabled:  !!activeProjectId,
  })

  const { data: detail } = useQuery({
    queryKey: ['liaison-file', selected?.id],
    queryFn:  () => liaisonApi.file(selected!.id).then(r => r.data),
    enabled:  !!selected,
  })

  const createMut = useMutation({
    mutationFn: (d: any) => liaisonApi.createFile({ ...d, projectId: activeProjectId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['liaison-files'] })
      qc.invalidateQueries({ queryKey: ['liaison-dash'] })
      setShowNew(false); setForm(BLANK_FORM)
    },
  })

  const approveMut = useMutation({
    mutationFn: ({ id, action, remarks }: any) => liaisonApi.approveFile(id, { action, remarks }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['liaison-files'] })
      qc.invalidateQueries({ queryKey: ['liaison-file', selected?.id] })
      qc.invalidateQueries({ queryKey: ['liaison-dash'] })
      setApproveModal(null)
    },
  })

  const today = new Date().toISOString().split('T')[0]
  const files = (filesData?.files ?? []).filter((f: any) =>
    !search || f.subject?.toLowerCase().includes(search.toLowerCase()) || f.fileNumber?.toLowerCase().includes(search.toLowerCase())
  )

  const STAT_STATUS = ['under_review','approved','rejected','returned']

  return (
    <div className="space-y-5 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#ededed]">Liaison Files</h1>
          <p className="text-sm text-[#555] mt-0.5">Track government approvals, NOCs and clearances</p>
        </div>
        <Button variant="primary" icon={<Plus size={14} />} onClick={() => setShowNew(true)}>
          New File
        </Button>
      </div>

      {/* Stats */}
      {dash && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <StatCard label="Total" value={dash.total} color="#0070f3" icon={<FileText size={14} />} />
          <StatCard label="Under Review" value={dash.by_status?.under_review ?? 0} color="#f5a623" />
          <StatCard label="Approved" value={dash.by_status?.approved ?? 0} color="#50e3c2" />
          <StatCard label="Overdue" value={dash.overdue} color={dash.overdue > 0 ? '#e00' : '#50e3c2'} icon={<Warning size={14} />} />
          <StatCard label="Urgent" value={dash.urgent} color={dash.urgent > 0 ? '#e00' : '#666'} />
        </div>
      )}

      {/* Filters + table */}
      <div className="card">
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid #111' }}>
          <div className="relative flex-1 max-w-xs">
            <MagnifyingGlass className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#333]" size={14} />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search files..."
              className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg bg-[#050505] border border-[#1a1a1a] focus:outline-none focus:border-[#333] text-[#ededed] placeholder:text-[#333]"
            />
          </div>
          <select
            value={statusF} onChange={e => setStatusF(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-lg bg-[#050505] border border-[#1a1a1a] focus:outline-none text-[#a1a1a1]"
          >
            <option value="">All status</option>
            {['draft','submitted','under_review','approved','rejected','returned','closed'].map(s =>
              <option key={s} value={s}>{s.replace(/_/g,' ')}</option>
            )}
          </select>
          <div className="text-xs text-[#333]">{files.length} files</div>
        </div>

        {/* Layout: list + detail */}
        <div className="flex" style={{ minHeight: 400 }}>
          {/* File list */}
          <div className="flex-1 overflow-y-auto" style={{ maxHeight: 600 }}>
            {isLoading ? (
              <div className="flex items-center justify-center py-16"><Spinner /></div>
            ) : files.length === 0 ? (
              <Empty
                icon={<FileX size={32} />}
                title="No liaison files"
                sub={search ? 'No files match your search' : 'Create your first liaison file'}
                action={!search ? (
                  <Button variant="secondary" size="sm" icon={<Plus size={12} />} onClick={() => setShowNew(true)}>
                    Create file
                  </Button>
                ) : undefined}
              />
            ) : (
              files.map((f: any) => {
                const overdue = f.dueDate && f.dueDate < today && !['approved','closed'].includes(f.currentStatus)
                const isSelected = selected?.id === f.id
                return (
                  <div
                    key={f.id}
                    onClick={() => setSelected(f)}
                    className="flex items-start gap-3 px-4 py-3.5 cursor-pointer transition-colors"
                    style={{
                      borderBottom: '1px solid #0d0d0d',
                      background: isSelected ? '#0a0a0a' : 'transparent',
                    }}
                  >
                    <FileText size={15} className="flex-shrink-0 mt-0.5" style={{ color: '#333' }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[11px]" style={{ color: '#0070f3' }}>
                          {f.fileNumber ?? 'DRAFT'}
                        </span>
                        <Badge value={f.currentStatus} size="xs" />
                        <Badge value={f.priority} size="xs" />
                        <Badge value={f.fileType} size="xs" />
                      </div>
                      <p className="text-[13px] text-[#ededed] mt-0.5 truncate">{f.subject}</p>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-[#444]">
                        <span>{f.department ?? '—'}</span>
                        {f.dueDate && (
                          <span style={{ color: overdue ? '#e00' : '#444' }} className="flex items-center gap-1">
                            {overdue && <Warning size={10} />}
                            {f.dueDate}
                          </span>
                        )}
                        {f.currentHolder && <span>→ {f.currentHolder.name}</span>}
                      </div>
                    </div>
                    {isSelected && <CaretRight size={14} className="text-[#333] flex-shrink-0 mt-0.5" />}
                  </div>
                )
              })
            )}
          </div>

          {/* Detail panel */}
          {selected && detail && (
            <div
              className="w-72 flex-shrink-0 overflow-y-auto"
              style={{ borderLeft: '1px solid #111', background: '#050505' }}
            >
              {/* File header */}
              <div className="px-4 py-4" style={{ borderBottom: '1px solid #0d0d0d' }}>
                <div className="flex items-start justify-between">
                  <span className="font-mono text-[11px]" style={{ color: '#0070f3' }}>
                    {detail.fileNumber ?? 'DRAFT'}
                  </span>
                  <button onClick={() => setSelected(null)} className="text-[#333] hover:text-[#666] text-xs">✕</button>
                </div>
                <p className="text-[13px] text-[#ededed] mt-1.5 font-medium leading-snug">{detail.subject}</p>
                <div className="flex gap-1.5 mt-2.5 flex-wrap">
                  <Badge value={detail.currentStatus} size="xs" />
                  <Badge value={detail.priority} size="xs" />
                  <Badge value={detail.fileType} size="xs" />
                </div>
              </div>

              {/* Info */}
              <div className="px-4 py-3 space-y-3" style={{ borderBottom: '1px solid #0d0d0d' }}>
                {[
                  ['Department', detail.department],
                  ['Holder', detail.currentHolder?.name],
                  ['Due', detail.dueDate],
                  ['Created by', detail.initiatedBy?.name],
                ].map(([l, v]) => v ? (
                  <div key={l}>
                    <p className="text-[10px] text-[#444] uppercase tracking-wider">{l}</p>
                    <p className="text-[12px] text-[#a1a1a1] mt-0.5">{v}</p>
                  </div>
                ) : null)}
                {detail.remarks && (
                  <div>
                    <p className="text-[10px] text-[#444] uppercase tracking-wider">Remarks</p>
                    <p className="text-[12px] text-[#a1a1a1] mt-0.5 leading-relaxed">{detail.remarks}</p>
                  </div>
                )}
              </div>

              {/* Approval chain */}
              <div className="px-4 py-3" style={{ borderBottom: '1px solid #0d0d0d' }}>
                <p className="text-[10px] text-[#444] uppercase tracking-wider mb-3">Approval Chain</p>
                <div className="space-y-2">
                  {detail.approvalSteps?.map((step: any, i: number) => (
                    <div key={step.id} className="flex items-center gap-2.5">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                        style={{
                          background: step.status === 'approved' ? '#0d2e28' : step.status === 'rejected' ? '#2c0000' : '#0a0a0a',
                          color: step.status === 'approved' ? '#50e3c2' : step.status === 'rejected' ? '#e00' : '#333',
                          border: '1px solid ' + (step.status === 'approved' ? '#50e3c230' : step.status === 'rejected' ? '#e0000030' : '#1a1a1a'),
                        }}
                      >{step.stepOrder}</div>
                      <div className="flex-1">
                        <span className="text-[12px] text-[#ededed]">{step.approverRole}</span>
                        {step.approver && <span className="text-[11px] text-[#444]"> · {step.approver.name}</span>}
                      </div>
                      {step.status !== 'pending' && <Badge value={step.status} size="xs" />}
                    </div>
                  ))}
                </div>
              </div>

              {/* Documents */}
              {detail.documents?.length > 0 && (
                <div className="px-4 py-3" style={{ borderBottom: '1px solid #0d0d0d' }}>
                  <p className="text-[10px] text-[#444] uppercase tracking-wider mb-2">Documents</p>
                  {detail.documents.map((d: any) => (
                    <a key={d.id} href={d.cloudinaryUrl} target="_blank" rel="noreferrer"
                      className="flex items-center gap-2 text-[12px] py-1.5 hover:underline"
                      style={{ color: '#0070f3' }}>
                      <FileText size={12} />
                      {d.documentName ?? d.revision}
                      <span className="text-[#444]">({d.revision})</span>
                    </a>
                  ))}
                </div>
              )}

              {/* Actions */}
              {detail.currentStatus === 'under_review' && (
                <div className="px-4 py-3 flex gap-2">
                  <Button variant="success" size="xs" icon={<CheckCircle size={12} />}
                    onClick={() => setApproveModal({ action: 'approved', remarks: '' })}>
                    Approve
                  </Button>
                  <Button variant="danger" size="xs" icon={<XCircle size={12} />}
                    onClick={() => setApproveModal({ action: 'rejected', remarks: '' })}>
                    Reject
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* New File Modal */}
      <Modal open={showNew} onClose={() => setShowNew(false)} title="New Liaison File"
        footer={<>
          <Button variant="ghost" onClick={() => setShowNew(false)}>Cancel</Button>
          <Button variant="primary" loading={createMut.isPending}
            onClick={() => createMut.mutate(form)}
            disabled={!form.subject || !form.fileType}>
            Create File
          </Button>
        </>}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Select label="File Type" value={form.fileType}
              onChange={e => setForm(f => ({ ...f, fileType: e.target.value }))}
              options={FILE_TYPES} />
            <Select label="Department" value={form.department}
              onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
              options={DEPTS} />
          </div>
          <Input label="Subject" value={form.subject}
            onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
            placeholder="NOC for drain crossing at Nishat road..." />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Priority" value={form.priority}
              onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
              options={PRIORITIES} />
            <Input label="Due Date" type="date" value={form.dueDate}
              onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
          </div>
          <Textarea label="Remarks" value={form.remarks} rows={2}
            onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))}
            placeholder="Optional context..." />
          {form.fileType && (
            <div className="rounded-lg px-3 py-2.5 text-xs" style={{ background: '#0070f310', border: '1px solid #0070f320' }}>
              <span style={{ color: '#555' }}>Chain: </span>
              {(CHAINS[form.fileType] ?? CHAINS.other).map((role, i, arr) => (
                <span key={role}>
                  <span style={{ color: '#0070f3' }} className="font-semibold">{role}</span>
                  {i < arr.length - 1 && <span style={{ color: '#333' }}> → </span>}
                </span>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* Approve/Reject Modal */}
      <Modal open={!!approveModal} onClose={() => setApproveModal(null)}
        title={approveModal?.action === 'approved' ? 'Approve File' : 'Reject File'}
        footer={<>
          <Button variant="ghost" onClick={() => setApproveModal(null)}>Cancel</Button>
          <Button
            variant={approveModal?.action === 'approved' ? 'success' : 'danger'}
            loading={approveMut.isPending}
            onClick={() => approveMut.mutate({ id: selected?.id, action: approveModal?.action, remarks: approveModal?.remarks })}
          >
            Confirm {approveModal?.action === 'approved' ? 'Approval' : 'Rejection'}
          </Button>
        </>}
      >
        <div className="space-y-3">
          <div className="px-3 py-2.5 rounded-lg text-sm text-[#a1a1a1]" style={{ background: '#0a0a0a', border: '1px solid #1a1a1a' }}>
            {selected?.subject}
          </div>
          <Textarea label="Remarks (optional)" rows={3}
            value={approveModal?.remarks ?? ''}
            onChange={e => setApproveModal(a => a ? { ...a, remarks: e.target.value } : null)}
            placeholder="Notes about this decision..." />
        </div>
      </Modal>
    </div>
  )
}
`.trim())

// ================================================================
// LettersPage
// ================================================================
fs.writeFileSync(src + '/pages/liaison/LettersPage.tsx', `
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Envelope, Plus, PaperPlaneTilt, Printer, Eye, FileX } from '@phosphor-icons/react'
import { liaisonApi } from '@/api/liaison.api'
import { useAuthStore } from '@/store/auth.store'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Spinner } from '@/components/ui/Spinner'
import { Empty } from '@/components/ui/Empty'

const TEMPLATES: Record<string, string> = {
  reminder: \`With reference to our earlier communication, we wish to bring to your kind notice that the above-mentioned permission/NOC/approval is still pending with your office.

We request you to kindly expedite the matter at the earliest, as further delay is adversely affecting our project progress and causing financial implications.

We hope for your prompt and favourable action.\`,

  covering: \`With reference to the above subject, we are hereby submitting the following documents for your kind consideration and necessary action:

1. [Document Name] — [No. of copies]
2. [Document Name] — [No. of copies]

We request you to kindly review the enclosed documents and accord the necessary approval at the earliest.\`,

  reply: \`With reference to your letter/notice dated ___________ regarding the above subject, we wish to submit our reply as under:

[State your reply clearly]

We trust this clarifies the matter to your satisfaction. For any further information, please do not hesitate to contact the undersigned.\`,

  noc: \`We are executing the above-mentioned work on behalf of LCMA/UEED, Srinagar. In connection with this work, we are required to carry out [describe work] in your jurisdiction.

We therefore request you to kindly grant No Objection Certificate (NOC) for the same. All restoration works shall be carried out to your satisfaction at our own cost.\`,
}

const BLANK = { subject: '', toName: '', toOrganization: 'LCMA', toEmail: '', body: '', date: new Date().toISOString().split('T')[0] }

export default function LettersPage() {
  const { activeProjectId, user } = useAuthStore()
  const qc = useQueryClient()
  const [showNew, setShowNew]     = useState(false)
  const [preview, setPreview]     = useState<any>(null)
  const [sendModal, setSendModal] = useState<any>(null)
  const [sendForm, setSendForm]   = useState({ toEmail: '', subject: '', bodyNote: '' })
  const [form, setForm]           = useState(BLANK)

  const { data: letters, isLoading } = useQuery({
    queryKey: ['letters', activeProjectId],
    queryFn:  () => liaisonApi.letters({ projectId: activeProjectId }).then(r => r.data),
    enabled:  !!activeProjectId,
  })

  const { data: gmailOk } = useQuery({
    queryKey: ['gmail-status'],
    queryFn:  () => liaisonApi.gmailStatus().then(r => r.data),
  })

  const createMut = useMutation({
    mutationFn: (d: any) => liaisonApi.createLetter({ ...d, projectId: activeProjectId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['letters'] }); setShowNew(false); setForm(BLANK) },
  })

  const sendMut = useMutation({
    mutationFn: ({ id, d }: any) => liaisonApi.sendLetter(id, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['letters'] }); setSendModal(null) },
  })

  function printLetter(l: any) {
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(\`<html><head><title>\${l.letterNumber}</title>
    <style>body{font-family:Arial,sans-serif;font-size:12px;margin:40px;color:#111;line-height:1.7}
    .h{border-bottom:3px solid #0070f3;padding-bottom:8px;margin-bottom:20px}
    .co{font-size:18px;font-weight:bold;color:#0070f3}
    .body{white-space:pre-wrap;line-height:1.9}</style></head><body>
    <div class="h"><div class="co">Khilari Infrastructure Pvt. Ltd.</div><div style="font-size:11px;color:#555">Srinagar, J&K</div></div>
    <div style="display:flex;justify-content:space-between;margin-bottom:12px;font-size:11px">
      <div><b>Ref:</b> \${l.letterNumber}</div><div><b>Date:</b> \${l.date}</div>
    </div>
    <div style="margin-bottom:12px"><b>To,</b><br>\${l.toName ?? ''}<br>\${l.toOrganization ?? ''}</div>
    <div style="font-weight:bold;margin-bottom:10px"><u>Sub:</u> \${l.subject}</div>
    <hr style="border:none;border-top:1px solid #ddd;margin:10px 0">
    <div style="margin-bottom:10px">Respected Sir/Madam,</div>
    <div class="body">\${l.body}</div>
    <div style="margin-top:40px">Yours faithfully,<br><br><br><b>\${l.signedBy?.name ?? user?.name}</b></div>
    </body></html>\`)
    w.document.close(); w.print()
  }

  const list = Array.isArray(letters) ? letters : []

  return (
    <div className="space-y-5 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#ededed]">Official Letters</h1>
          <p className="text-sm text-[#555] mt-0.5">Draft, preview and send letters to government departments</p>
        </div>
        <div className="flex items-center gap-2">
          {!gmailOk?.configured && (
            <div className="text-[11px] px-2.5 py-1.5 rounded-lg" style={{ background: '#f5a62315', color: '#f5a623', border: '1px solid #f5a62330' }}>
              ⚠ Gmail not connected
            </div>
          )}
          <Button variant="primary" icon={<Plus size={14} />} onClick={() => setShowNew(true)}>
            Draft Letter
          </Button>
        </div>
      </div>

      <div className="card">
        {isLoading ? (
          <div className="flex items-center justify-center py-16"><Spinner /></div>
        ) : list.length === 0 ? (
          <Empty icon={<FileX size={28} />} title="No letters yet"
            sub="Draft official letters to LCMA, UEED and other departments"
            action={<Button variant="secondary" size="sm" icon={<Plus size={12} />} onClick={() => setShowNew(true)}>Draft first letter</Button>}
          />
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: '1px solid #111', background: '#050505' }}>
                {['Ref No.','Date','To','Subject','Status','Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[#444]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.map((l: any) => (
                <tr key={l.id} className="transition-colors hover:bg-[#050505]" style={{ borderBottom: '1px solid #0d0d0d' }}>
                  <td className="px-4 py-3 font-mono text-[#0070f3]">{l.letterNumber ?? '—'}</td>
                  <td className="px-4 py-3 text-[#666]">{l.date}</td>
                  <td className="px-4 py-3 text-[#a1a1a1] max-w-[100px] truncate">{l.toOrganization ?? '—'}</td>
                  <td className="px-4 py-3 text-[#ededed] max-w-[200px] truncate">{l.subject}</td>
                  <td className="px-4 py-3"><Badge value={l.status} size="xs" /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-0.5">
                      <button onClick={() => setPreview(l)} className="p-1.5 rounded hover:bg-[#111] text-[#444] hover:text-[#a1a1a1] transition-colors" title="Preview"><Eye size={13} /></button>
                      <button onClick={() => printLetter(l)} className="p-1.5 rounded hover:bg-[#111] text-[#444] hover:text-[#a1a1a1] transition-colors" title="Print"><Printer size={13} /></button>
                      <a href={liaisonApi.pdfUrl(l.id)} target="_blank" rel="noreferrer"
                        className="p-1.5 rounded hover:bg-[#111] text-[#444] hover:text-[#a1a1a1] transition-colors text-[11px]" title="Download PDF">PDF</a>
                      <button
                        onClick={() => { setSendModal(l); setSendForm({ toEmail: l.toEmail ?? '', subject: 'Ref: ' + l.letterNumber + ' — ' + l.subject, bodyNote: '' }) }}
                        className="p-1.5 rounded hover:bg-[#111] transition-colors"
                        style={{ color: l.status === 'dispatched' ? '#50e3c2' : '#0070f3' }} title="Send via Gmail"
                      ><PaperPlaneTilt size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* New Letter Modal */}
      <Modal open={showNew} onClose={() => setShowNew(false)} title="Draft Letter" width="max-w-2xl"
        footer={<>
          <Button variant="ghost" onClick={() => setShowNew(false)}>Cancel</Button>
          <Button variant="primary" loading={createMut.isPending}
            onClick={() => createMut.mutate(form)} disabled={!form.subject || !form.body}>
            Save Letter
          </Button>
        </>}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="To (Name)" value={form.toName} onChange={e => setForm(f => ({ ...f, toName: e.target.value }))} placeholder="Executive Engineer" />
            <Input label="Organisation" value={form.toOrganization} onChange={e => setForm(f => ({ ...f, toOrganization: e.target.value }))} placeholder="LCMA, UEED..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Email (for Gmail)" type="email" value={form.toEmail} onChange={e => setForm(f => ({ ...f, toEmail: e.target.value }))} placeholder="officer@jkgov.in" />
            <Input label="Date" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
          </div>
          <Input label="Subject" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="Request for NOC / Approval..." />
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-[#a1a1a1]">Body</label>
              <div className="flex gap-1">
                {[['Reminder','reminder'],['Covering','covering'],['Reply','reply'],['NOC','noc']].map(([l,k]) => (
                  <button key={k} onClick={() => setForm(f => ({ ...f, body: TEMPLATES[k] }))}
                    className="text-[10px] px-2 py-1 rounded border border-[#1a1a1a] hover:bg-[#111] text-[#555] hover:text-[#a1a1a1] transition-colors">
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <Textarea rows={10} value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} placeholder="Type letter body or click a template above..." />
          </div>
        </div>
      </Modal>

      {/* Preview Modal */}
      <Modal open={!!preview} onClose={() => setPreview(null)} title={preview?.letterNumber ?? 'Preview'} width="max-w-2xl"
        footer={<div className="flex gap-2 w-full">
          <Button variant="secondary" icon={<Printer size={13} />} onClick={() => printLetter(preview)}>Print</Button>
          <Button variant="secondary" icon={<PaperPlaneTilt size={13} />} onClick={() => { setSendModal(preview); setPreview(null); setSendForm({ toEmail: preview?.toEmail ?? '', subject: 'Ref: ' + preview?.letterNumber, bodyNote: '' }) }}>Send</Button>
          <div className="flex-1" />
          <Button variant="ghost" onClick={() => setPreview(null)}>Close</Button>
        </div>}
      >
        {preview && (
          <div className="rounded-lg p-6 text-sm" style={{ background: 'white', color: '#111', fontFamily: 'Arial, sans-serif' }}>
            <div style={{ borderBottom: '3px solid #0070f3', paddingBottom: 8, marginBottom: 16 }}>
              <div style={{ fontSize: 18, fontWeight: 'bold', color: '#0070f3' }}>Khilari Infrastructure Pvt. Ltd.</div>
              <div style={{ fontSize: 11, color: '#555' }}>Srinagar, J&K</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: 11 }}>
              <div><b>Ref:</b> {preview.letterNumber}</div>
              <div><b>Date:</b> {preview.date}</div>
            </div>
            <div style={{ marginBottom: 12 }}><b>To,</b><br />{preview.toName}<br />{preview.toOrganization}</div>
            <div style={{ fontWeight: 'bold', marginBottom: 10 }}><u>Sub:</u> {preview.subject}</div>
            <hr style={{ margin: '10px 0', border: 'none', borderTop: '1px solid #ddd' }} />
            <div style={{ marginBottom: 10 }}>Respected Sir/Madam,</div>
            <div style={{ lineHeight: 1.9, whiteSpace: 'pre-wrap' }}>{preview.body}</div>
            <div style={{ marginTop: 40 }}>Yours faithfully,<br /><br /><br />
              <b>{preview.signedBy?.name ?? user?.name}</b><br />
              <span style={{ color: '#555' }}>Authorised Signatory</span>
            </div>
          </div>
        )}
      </Modal>

      {/* Send Modal */}
      <Modal open={!!sendModal} onClose={() => setSendModal(null)} title="Send via Gmail"
        footer={<>
          <Button variant="ghost" onClick={() => setSendModal(null)}>Cancel</Button>
          <Button variant="primary" loading={sendMut.isPending} icon={<PaperPlaneTilt size={13} />}
            onClick={() => sendMut.mutate({ id: sendModal?.id, d: sendForm })} disabled={!sendForm.toEmail}>
            Send Email
          </Button>
        </>}
      >
        <div className="space-y-3">
          {!gmailOk?.configured && (
            <div className="px-3 py-2.5 rounded-lg text-xs" style={{ background: '#f5a62315', color: '#f5a623', border: '1px solid #f5a62330' }}>
              Gmail not connected. Visit /api/v1/gmail/auth to connect first.
            </div>
          )}
          <div className="px-3 py-2.5 rounded-lg text-xs text-[#a1a1a1]" style={{ background: '#050505', border: '1px solid #1a1a1a' }}>
            <b>Letter:</b> {sendModal?.letterNumber} — {sendModal?.subject}
          </div>
          <Input label="To Email" type="email" value={sendForm.toEmail} onChange={e => setSendForm(f => ({ ...f, toEmail: e.target.value }))} placeholder="officer@jkgov.in" />
          <Input label="Email Subject" value={sendForm.subject} onChange={e => setSendForm(f => ({ ...f, subject: e.target.value }))} />
          <Textarea label="Covering note (optional)" rows={3} value={sendForm.bodyNote} onChange={e => setSendForm(f => ({ ...f, bodyNote: e.target.value }))} placeholder="Brief note before the PDF attachment..." />
          <p className="text-[11px] text-[#444]">The letter PDF will be attached automatically.</p>
        </div>
      </Modal>
    </div>
  )
}
`.trim())

console.log('  Liaison pages written')
NODEEOF

ok "All source files written"

# ── Write .env if missing ──────────────────────────────────────────
if [[ ! -f "$FRONTEND/.env" ]]; then
  echo "VITE_API_URL=http://localhost:3000" > "$FRONTEND/.env"
  ok "frontend/.env written"
fi

# ── Kill + restart frontend ────────────────────────────────────────
info "Restarting frontend..."
PID=$(lsof -ti tcp:5173 2>/dev/null || true)
[[ -n "$PID" ]] && kill -9 "$PID" 2>/dev/null && sleep 0.5 || true

echo ""
echo -e "${G}${BOLD}Frontend rebuild complete!${NC}"
echo ""
echo -e "  Now run in a new terminal:"
echo -e "  ${Y}cd frontend && npm run dev${NC}"
echo ""
echo -e "  Then open: http://localhost:5173"
echo ""
SCRIPT
echo "Done"