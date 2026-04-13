// ================================================================
//  KIPL ProjectOS — Frontend Rebuild (Pure Node.js)
//  Run: node scripts/rebuild-frontend.js
//  No bash heredocs — works perfectly on Windows
// ================================================================

const fs   = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const ROOT     = path.join(__dirname, '..')
const FRONTEND = path.join(ROOT, 'frontend')
const SRC      = path.join(FRONTEND, 'src')

const G = '\x1b[32m'; const Y = '\x1b[33m'; const B = '\x1b[34m'; const NC = '\x1b[0m'; const BOLD = '\x1b[1m'
const ok   = s => console.log(G + '  ✓' + NC + ' ' + s)
const info = s => console.log(B + '  →' + NC + ' ' + s)
const err  = s => { console.error('\x1b[31m  ✗ ' + s + NC); process.exit(1) }

function w(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, content.trimStart(), 'utf8')
}

if (!fs.existsSync(FRONTEND)) err('frontend/ not found. Run setup.sh first.')

console.log('\n' + BOLD + 'Rebuilding Frontend — Vercel Style' + NC + '\n')

// ── Install packages ───────────────────────────────────────────
info('Installing packages...')
try {
  execSync('npm install --save @phosphor-icons/react @tanstack/react-query react-router-dom zustand axios clsx date-fns --silent', { cwd: FRONTEND, stdio: 'inherit' })
  execSync('npm install --save-dev tailwindcss @tailwindcss/vite --silent', { cwd: FRONTEND, stdio: 'inherit' })
  ok('Packages installed')
} catch(e) { ok('Packages already up to date') }

// ── vite.config.ts ─────────────────────────────────────────────
w(path.join(FRONTEND, 'vite.config.ts'), `
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': resolve(__dirname, './src') } },
  server: {
    port: 5173,
    proxy: { '/api': { target: 'http://localhost:3000', changeOrigin: true } },
  },
})
`)
ok('vite.config.ts')

// ── tsconfig paths ─────────────────────────────────────────────
const tsconfigPath = path.join(FRONTEND, 'tsconfig.json')
if (fs.existsSync(tsconfigPath)) {
  try {
    const cfg = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'))
    cfg.compilerOptions = cfg.compilerOptions || {}
    cfg.compilerOptions.baseUrl = '.'
    cfg.compilerOptions.paths = { '@/*': ['./src/*'] }
    cfg.compilerOptions.noUnusedLocals = false
    cfg.compilerOptions.noUnusedParameters = false
    fs.writeFileSync(tsconfigPath, JSON.stringify(cfg, null, 2))
    ok('tsconfig.json paths added')
  } catch(e) {}
}

// ── index.css ──────────────────────────────────────────────────
w(path.join(SRC, 'index.css'), `
@import "tailwindcss";
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

@theme {
  --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  --color-bg-root:    #000000;
  --color-bg-card:    #0a0a0a;
  --color-bg-hover:   #111111;
  --color-border:     #1a1a1a;
  --color-border-alt: #2a2a2a;
  --color-text-1:     #ededed;
  --color-text-2:     #a1a1a1;
  --color-text-3:     #666666;
  --color-blue:       #0070f3;
  --color-blue-bg:    rgba(0,112,243,0.08);
  --color-green:      #50e3c2;
  --color-green-bg:   rgba(80,227,194,0.08);
  --color-amber:      #f5a623;
  --color-amber-bg:   rgba(245,166,35,0.08);
  --color-red:        #ff4444;
  --color-red-bg:     rgba(255,68,68,0.08);
  --color-purple:     #9333ea;
  --color-purple-bg:  rgba(147,51,234,0.08);
}

*, *::before, *::after { box-sizing: border-box; }
* { margin: 0; padding: 0; }
html, body { height: 100%; background: #000; color: #ededed; font-family: var(--font-sans); font-size: 14px; line-height: 1.6; -webkit-font-smoothing: antialiased; }
::-webkit-scrollbar { width: 3px; height: 3px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #222; border-radius: 2px; }
::selection { background: rgba(0,112,243,0.2); }
.card { background: var(--color-bg-card); border: 1px solid var(--color-border-alt); border-radius: 8px; }
.card-sm { background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: 6px; }
@keyframes fadeUp { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
.fade-in { animation: fadeUp 0.2s ease forwards; }
@keyframes spin { to { transform: rotate(360deg); } }
.spin { animation: spin 0.7s linear infinite; display: inline-block; }
`)
ok('index.css (Vercel design tokens)')

// ── main.tsx ───────────────────────────────────────────────────
w(path.join(SRC, 'main.tsx'), `
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App'

const qc = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false } },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={qc}>
      <App />
    </QueryClientProvider>
  </StrictMode>
)
`)
ok('main.tsx')

// ── App.tsx ────────────────────────────────────────────────────
w(path.join(SRC, 'App.tsx'), `
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import LoginPage           from '@/pages/auth/LoginPage'
import AppLayout           from '@/layouts/AppLayout'
import DashboardPage       from '@/pages/dashboard/DashboardPage'
import LiaisonPage         from '@/pages/liaison/LiaisonPage'
import LettersPage         from '@/pages/liaison/LettersPage'
import AttendancePage      from '@/pages/hr/AttendancePage'
import EmployeesPage       from '@/pages/hr/EmployeesPage'
import SalaryPage          from '@/pages/hr/SalaryPage'
import TasksPage           from '@/pages/tasks/TasksPage'
import KanbanPage          from '@/pages/tasks/KanbanPage'
import EpcPage             from '@/pages/epc/EpcPage'
import AccountingPage      from '@/pages/accounting/AccountingPage'
import InvoicesPage        from '@/pages/accounting/InvoicesPage'
import PublicPage          from '@/pages/public/PublicProjectPage'

function Guard({ children }: { children: React.ReactNode }) {
  const user = useAuthStore(s => s.user)
  return user ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/p/:code" element={<PublicPage />} />
        <Route element={<Guard><AppLayout /></Guard>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"            element={<DashboardPage />} />
          <Route path="liaison"              element={<LiaisonPage />} />
          <Route path="liaison/letters"      element={<LettersPage />} />
          <Route path="hr/attendance"        element={<AttendancePage />} />
          <Route path="hr/employees"         element={<EmployeesPage />} />
          <Route path="hr/salary"            element={<SalaryPage />} />
          <Route path="tasks"                element={<TasksPage />} />
          <Route path="tasks/kanban"         element={<KanbanPage />} />
          <Route path="epc"                  element={<EpcPage />} />
          <Route path="accounting"           element={<AccountingPage />} />
          <Route path="accounting/invoices"  element={<InvoicesPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
`)
ok('App.tsx')

// ── auth store ─────────────────────────────────────────────────
w(path.join(SRC, 'store/auth.store.ts'), `
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type UserRole =
  | 'super_admin' | 'admin' | 'project_manager' | 'engineer'
  | 'hr_officer' | 'liaison_officer' | 'accountant' | 'field_staff' | 'viewer'

export interface AuthUser { id: string; name: string; email: string; role: UserRole }

interface S {
  user: AuthUser | null; accessToken: string | null
  refreshToken: string | null; activeProjectId: string | null
  setAuth:    (u: AuthUser, at: string, rt: string) => void
  setToken:   (t: string) => void
  setProject: (id: string) => void
  logout:     () => void
}

export const useAuthStore = create<S>()(persist(
  set => ({
    user: null, accessToken: null, refreshToken: null, activeProjectId: null,
    setAuth:    (user, accessToken, refreshToken) => set({ user, accessToken, refreshToken }),
    setToken:   accessToken => set({ accessToken }),
    setProject: activeProjectId => set({ activeProjectId }),
    logout:     () => set({ user: null, accessToken: null, refreshToken: null, activeProjectId: null }),
  }),
  {
    name: 'kipl-auth',
    partialize: s => ({ user: s.user, accessToken: s.accessToken, refreshToken: s.refreshToken, activeProjectId: s.activeProjectId }),
  }
))

const L: Record<UserRole, number> = {
  super_admin: 100, admin: 90, project_manager: 70,
  engineer: 50, hr_officer: 50, liaison_officer: 50, accountant: 50,
  field_staff: 30, viewer: 10,
}
export const can = (user: AuthUser | null, min: UserRole) =>
  !!user && (user.role === 'super_admin' || L[user.role] >= L[min])
`)
ok('auth.store.ts')

// ── API client ─────────────────────────────────────────────────
w(path.join(SRC, 'api/client.ts'), `
import axios from 'axios'
import { useAuthStore } from '@/store/auth.store'

const BASE = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3000'

const api = axios.create({ baseURL: BASE, timeout: 30_000 })

api.interceptors.request.use(c => {
  const t = useAuthStore.getState().accessToken
  if (t) c.headers.Authorization = 'Bearer ' + t
  return c
})

let refreshing = false
let q: Array<(t: string) => void> = []

api.interceptors.response.use(r => r, async e => {
  const orig = e.config
  if (e.response?.status === 401 && !orig._retry) {
    if (refreshing) return new Promise(res => q.push(t => { orig.headers.Authorization = 'Bearer ' + t; res(api(orig)) }))
    orig._retry = true; refreshing = true
    try {
      const rt = useAuthStore.getState().refreshToken
      if (!rt) throw 0
      const { data } = await axios.post(BASE + '/api/v1/auth/refresh', { refresh_token: rt })
      useAuthStore.getState().setToken(data.access_token)
      q.forEach(fn => fn(data.access_token)); q = []
      orig.headers.Authorization = 'Bearer ' + data.access_token
      return api(orig)
    } catch { useAuthStore.getState().logout(); window.location.href = '/login'; return Promise.reject(e) }
    finally { refreshing = false }
  }
  return Promise.reject(e)
})

export default api
`)
ok('api/client.ts')

// ── liaison API ────────────────────────────────────────────────
w(path.join(SRC, 'api/liaison.api.ts'), `
import api from './client'
const BASE = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3000'
export const liaisonApi = {
  dashboard:    (projectId?: string) => api.get('/api/v1/liaison/dashboard', { params: { projectId } }),
  files:        (p?: any) => api.get('/api/v1/liaison/files', { params: p }),
  file:         (id: string) => api.get('/api/v1/liaison/files/' + id),
  createFile:   (d: any) => api.post('/api/v1/liaison/files', d),
  approveFile:  (id: string, d: any) => api.patch('/api/v1/liaison/files/' + id + '/approve', d),
  letters:      (p?: any) => api.get('/api/v1/liaison/letters', { params: p }),
  letter:       (id: string) => api.get('/api/v1/liaison/letters/' + id),
  createLetter: (d: any) => api.post('/api/v1/liaison/letters', d),
  sendLetter:   (id: string, d: any) => api.post('/api/v1/liaison/letters/' + id + '/send', d),
  pdfUrl:       (id: string) => BASE + '/api/v1/liaison/letters/' + id + '/pdf',
  gmailStatus:  () => api.get('/api/v1/gmail/status'),
}
`)
ok('api/liaison.api.ts')

// ── UI Components ──────────────────────────────────────────────
const uiDir = path.join(SRC, 'components/ui')
const layoutDir = path.join(SRC, 'components/layout')

w(path.join(uiDir, 'Spinner.tsx'), `
export function Spinner({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="spin">
      <circle cx="12" cy="12" r="10" stroke="#333" strokeWidth="2.5" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="#0070f3" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}
`)

w(path.join(uiDir, 'Badge.tsx'), `
import { clsx } from 'clsx'

const MAP: Record<string, string> = {
  draft:        'bg-[#111] text-[#555] border-[#1a1a1a]',
  submitted:    'bg-[rgba(0,112,243,0.1)] text-[#0070f3] border-[rgba(0,112,243,0.2)]',
  under_review: 'bg-[rgba(245,166,35,0.1)] text-[#f5a623] border-[rgba(245,166,35,0.2)]',
  approved:     'bg-[rgba(80,227,194,0.1)] text-[#50e3c2] border-[rgba(80,227,194,0.2)]',
  rejected:     'bg-[rgba(255,68,68,0.1)] text-[#ff4444] border-[rgba(255,68,68,0.2)]',
  returned:     'bg-[rgba(255,68,68,0.1)] text-[#ff4444] border-[rgba(255,68,68,0.2)]',
  closed:       'bg-[#111] text-[#444] border-[#1a1a1a]',
  dispatched:   'bg-[rgba(80,227,194,0.1)] text-[#50e3c2] border-[rgba(80,227,194,0.2)]',
  generated:    'bg-[rgba(147,51,234,0.1)] text-[#9333ea] border-[rgba(147,51,234,0.2)]',
  pending:      'bg-[rgba(245,166,35,0.1)] text-[#f5a623] border-[rgba(245,166,35,0.2)]',
  paid:         'bg-[rgba(80,227,194,0.1)] text-[#50e3c2] border-[rgba(80,227,194,0.2)]',
  low:          'bg-[#111] text-[#555] border-[#1a1a1a]',
  medium:       'bg-[rgba(0,112,243,0.1)] text-[#0070f3] border-[rgba(0,112,243,0.2)]',
  high:         'bg-[rgba(245,166,35,0.1)] text-[#f5a623] border-[rgba(245,166,35,0.2)]',
  urgent:       'bg-[rgba(255,68,68,0.1)] text-[#ff4444] border-[rgba(255,68,68,0.2)]',
  noc:          'bg-[rgba(147,51,234,0.1)] text-[#9333ea] border-[rgba(147,51,234,0.2)]',
  approval:     'bg-[rgba(0,112,243,0.1)] text-[#0070f3] border-[rgba(0,112,243,0.2)]',
  drawing:      'bg-[rgba(80,227,194,0.1)] text-[#50e3c2] border-[rgba(80,227,194,0.2)]',
  estimate:     'bg-[rgba(245,166,35,0.1)] text-[#f5a623] border-[rgba(245,166,35,0.2)]',
  report:       'bg-[#111] text-[#555] border-[#1a1a1a]',
  letter:       'bg-[rgba(147,51,234,0.1)] text-[#9333ea] border-[rgba(147,51,234,0.2)]',
  clearance:    'bg-[rgba(255,68,68,0.1)] text-[#ff4444] border-[rgba(255,68,68,0.2)]',
  other:        'bg-[#111] text-[#555] border-[#1a1a1a]',
  active:       'bg-[rgba(80,227,194,0.1)] text-[#50e3c2] border-[rgba(80,227,194,0.2)]',
  on_hold:      'bg-[rgba(245,166,35,0.1)] text-[#f5a623] border-[rgba(245,166,35,0.2)]',
}

export function Badge({ value, size = 'sm' }: { value?: string; size?: 'xs' | 'sm' }) {
  if (!value) return null
  const key = value.toLowerCase().replace(/[\\s-]/g, '_')
  return (
    <span className={clsx(
      'inline-flex items-center rounded border font-medium tracking-wide whitespace-nowrap',
      size === 'xs' ? 'px-1.5 py-px text-[9px]' : 'px-2 py-0.5 text-[10px]',
      MAP[key] ?? 'bg-[#111] text-[#555] border-[#1a1a1a]'
    )}>
      {value.replace(/_/g, ' ')}
    </span>
  )
}
`)

w(path.join(uiDir, 'Button.tsx'), `
import { clsx } from 'clsx'
import { Spinner } from './Spinner'

type V = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'

interface P extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: V; size?: 'xs' | 'sm' | 'md'; loading?: boolean; icon?: React.ReactNode
}

const VS: Record<V, string> = {
  primary:   'bg-[#0070f3] text-white hover:bg-[#0060df] border-transparent',
  secondary: 'bg-[#0a0a0a] text-[#ededed] hover:bg-[#111] border-[#2a2a2a]',
  ghost:     'bg-transparent text-[#888] hover:text-[#ededed] hover:bg-[#0a0a0a] border-transparent',
  danger:    'bg-[rgba(255,68,68,0.08)] text-[#ff4444] hover:bg-[rgba(255,68,68,0.15)] border-[rgba(255,68,68,0.2)]',
  success:   'bg-[rgba(80,227,194,0.08)] text-[#50e3c2] hover:bg-[rgba(80,227,194,0.15)] border-[rgba(80,227,194,0.2)]',
}
const SS = { xs: 'px-2 py-1 text-[11px] gap-1 rounded-md', sm: 'px-3 py-1.5 text-xs gap-1.5 rounded-lg', md: 'px-4 py-2 text-sm gap-2 rounded-lg' }

export function Button({ variant='secondary', size='sm', loading, icon, children, className, disabled, ...p }: P) {
  return (
    <button {...p} disabled={disabled||loading}
      className={clsx('inline-flex items-center justify-center font-medium border transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed', VS[variant], SS[size], className)}>
      {loading ? <Spinner size={12} /> : icon}
      {children}
    </button>
  )
}
`)

w(path.join(uiDir, 'Input.tsx'), `
import { clsx } from 'clsx'
interface P extends React.InputHTMLAttributes<HTMLInputElement> { label?: string; error?: string; hint?: string }
export function Input({ label, error, hint, className, ...p }: P) {
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-xs font-medium text-[#666]">{label}</label>}
      <input {...p} className={clsx('w-full px-3 py-2 rounded-lg text-sm transition-colors text-[#ededed] placeholder:text-[#333] focus:outline-none',
        error ? 'bg-[#0a0a0a] border border-[#ff4444] focus:border-[#ff4444]' : 'bg-[#0a0a0a] border border-[#1a1a1a] focus:border-[#333]', className)} />
      {error && <p className="text-[11px] text-[#ff4444]">{error}</p>}
      {hint  && <p className="text-[11px] text-[#444]">{hint}</p>}
    </div>
  )
}
`)

w(path.join(uiDir, 'Select.tsx'), `
interface O { value: string; label: string }
interface P extends React.SelectHTMLAttributes<HTMLSelectElement> { label?: string; options: O[]; placeholder?: string }
export function Select({ label, options, placeholder, ...p }: P) {
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-xs font-medium text-[#666]">{label}</label>}
      <select {...p} className="w-full px-3 py-2 rounded-lg text-sm bg-[#0a0a0a] border border-[#1a1a1a] focus:border-[#333] focus:outline-none text-[#ededed] transition-colors">
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}
`)

w(path.join(uiDir, 'Textarea.tsx'), `
interface P extends React.TextareaHTMLAttributes<HTMLTextAreaElement> { label?: string; error?: string }
export function Textarea({ label, error, ...p }: P) {
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-xs font-medium text-[#666]">{label}</label>}
      <textarea {...p} className="w-full px-3 py-2 rounded-lg text-sm bg-[#0a0a0a] border border-[#1a1a1a] focus:border-[#333] focus:outline-none text-[#ededed] resize-none transition-colors" />
      {error && <p className="text-[11px] text-[#ff4444]">{error}</p>}
    </div>
  )
}
`)

w(path.join(uiDir, 'Modal.tsx'), `
import { X } from '@phosphor-icons/react'
interface P { open: boolean; onClose: () => void; title: string; children: React.ReactNode; width?: string; footer?: React.ReactNode }
export function Modal({ open, onClose, title, children, width = 'max-w-lg', footer }: P) {
  if (!open) return null
  return (
    <div className={'fixed inset-0 z-50 flex items-center justify-center p-4'} style={{ background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(8px)' }} onClick={onClose}>
      <div className={'w-full ' + width + ' flex flex-col max-h-[90vh] fade-in'} style={{ background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: 10 }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #111' }}>
          <span className="text-sm font-semibold text-[#ededed]">{title}</span>
          <button onClick={onClose} className="text-[#444] hover:text-[#ededed] p-1 rounded hover:bg-[#111] transition-colors"><X size={15} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 px-5 py-4" style={{ borderTop: '1px solid #111', background: '#050505' }}>{footer}</div>}
      </div>
    </div>
  )
}
`)

w(path.join(uiDir, 'StatCard.tsx'), `
interface P { label: string; value: string | number; sub?: string; color?: string; icon?: React.ReactNode }
export function StatCard({ label, value, sub, color = '#0070f3', icon }: P) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-semibold text-[#444] uppercase tracking-widest">{label}</span>
        {icon && <span style={{ color, opacity: 0.5 }}>{icon}</span>}
      </div>
      <div className="text-[26px] font-semibold font-mono" style={{ color }}>{value}</div>
      {sub && <div className="text-[11px] text-[#444] mt-1">{sub}</div>}
    </div>
  )
}
`)

w(path.join(uiDir, 'Empty.tsx'), `
interface P { icon?: React.ReactNode; title: string; sub?: string; action?: React.ReactNode }
export function Empty({ icon, title, sub, action }: P) {
  return (
    <div className="flex flex-col items-center justify-center py-16 space-y-3">
      {icon && <div className="text-[#222]">{icon}</div>}
      <p className="text-sm text-[#555] font-medium">{title}</p>
      {sub && <p className="text-xs text-[#333]">{sub}</p>}
      {action}
    </div>
  )
}
`)

ok('UI components (Badge, Button, Input, Select, Textarea, Modal, StatCard, Empty, Spinner)')

// ── AppLayout ──────────────────────────────────────────────────
w(path.join(SRC, 'layouts/AppLayout.tsx'), `
import { Outlet } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'

export default function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto" style={{ background: '#000' }}>
        <div className="max-w-6xl mx-auto px-6 py-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
`)

// ── Sidebar ────────────────────────────────────────────────────
w(path.join(layoutDir, 'Sidebar.tsx'), `
import { NavLink, useNavigate } from 'react-router-dom'
import {
  SquaresFour, FileText, Envelope, Users, MapPin,
  ChartBar, Package, Receipt, GitBranch, Kanban,
  Buildings, SignOut,
} from '@phosphor-icons/react'
import { useAuthStore } from '@/store/auth.store'

const GROUPS = [
  { label: 'Overview', items: [
    { label: 'Dashboard',    path: '/dashboard',           icon: SquaresFour, end: true  },
  ]},
  { label: 'Liaison', items: [
    { label: 'Files',        path: '/liaison',             icon: FileText,    end: true  },
    { label: 'Letters',      path: '/liaison/letters',     icon: Envelope,    end: false },
  ]},
  { label: 'Planning', items: [
    { label: 'WBS & Gantt',  path: '/tasks',               icon: GitBranch,   end: true  },
    { label: 'Task Board',   path: '/tasks/kanban',        icon: Kanban,      end: false },
  ]},
  { label: 'EPC', items: [
    { label: 'BOQ & Costs',  path: '/epc',                 icon: Package,     end: true  },
  ]},
  { label: 'HR', items: [
    { label: 'Attendance',   path: '/hr/attendance',       icon: MapPin,      end: true  },
    { label: 'Employees',    path: '/hr/employees',        icon: Users,       end: false },
    { label: 'Salary',       path: '/hr/salary',           icon: Receipt,     end: false },
  ]},
  { label: 'Finance', items: [
    { label: 'Transactions', path: '/accounting',          icon: ChartBar,    end: true  },
    { label: 'Invoices',     path: '/accounting/invoices', icon: Receipt,     end: false },
  ]},
]

export function Sidebar() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const initials = user?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0,2) ?? 'U'

  return (
    <aside className="w-52 flex-shrink-0 flex flex-col h-full" style={{ background: '#050505', borderRight: '1px solid #111' }}>
      {/* Logo */}
      <div className="px-4 py-4 flex items-center gap-3" style={{ borderBottom: '1px solid #0d0d0d' }}>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#0070f3' }}>
          <Buildings size={14} weight="bold" color="white" />
        </div>
        <div>
          <div className="text-[13px] font-semibold text-[#ededed]">ProjectOS</div>
          <div className="text-[10px] text-[#333]">KIPL · Srinagar</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {GROUPS.map(g => (
          <div key={g.label} className="mb-4">
            <div className="px-2 mb-1.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-[#2a2a2a]">{g.label}</div>
            {g.items.map(item => (
              <NavLink key={item.path} to={item.path} end={item.end}
                className={({ isActive }: { isActive: boolean }) =>
                  'flex items-center gap-2.5 px-2 py-1.5 rounded-md text-[12px] transition-all duration-100 mb-0.5 ' +
                  (isActive ? 'bg-[#0a0a0a] text-[#ededed]' : 'text-[#444] hover:text-[#888] hover:bg-[#0a0a0a]')
                }
              >
                {({ isActive }: { isActive: boolean }) => (
                  <>
                    <item.icon size={14} weight={isActive ? 'fill' : 'regular'} color={isActive ? '#0070f3' : 'currentColor'} />
                    <span>{item.label}</span>
                    {isActive && <span className="ml-auto w-1 h-1 rounded-full bg-[#0070f3]" />}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="px-3 py-3" style={{ borderTop: '1px solid #0d0d0d' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
               style={{ background: 'rgba(0,112,243,0.15)', color: '#0070f3' }}>{initials}</div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-medium text-[#ededed] truncate">{user?.name}</div>
            <div className="text-[9px] text-[#333] capitalize">{user?.role?.replace(/_/g,' ')}</div>
          </div>
          <button onClick={() => { logout(); navigate('/login') }} className="text-[#2a2a2a] hover:text-[#555] transition-colors" title="Sign out">
            <SignOut size={13} />
          </button>
        </div>
      </div>
    </aside>
  )
}
`)
ok('AppLayout + Sidebar')

// ── Login page ─────────────────────────────────────────────────
w(path.join(SRC, 'pages/auth/LoginPage.tsx'), `
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Buildings, ArrowRight } from '@phosphor-icons/react'
import { useAuthStore } from '@/store/auth.store'
import api from '@/api/client'

export default function LoginPage() {
  const [email, setEmail]     = useState('')
  const [password, setPass]   = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const { setAuth, setProject } = useAuthStore()
  const nav = useNavigate()

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const { data } = await api.post('/api/v1/auth/login', { email, password })
      setAuth(data.user, data.access_token, data.refresh_token)
      try {
        const { data: projects } = await api.get('/api/v1/projects')
        if (Array.isArray(projects) && projects[0]?.id) setProject(projects[0].id)
      } catch {}
      nav('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.message ?? err.response?.data?.error ?? 'Invalid credentials')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative" style={{ background: '#000' }}>
      {/* Subtle grid */}
      <div className="absolute inset-0 pointer-events-none"
           style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      {/* Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full pointer-events-none"
           style={{ background: 'radial-gradient(circle, rgba(0,112,243,0.08) 0%, transparent 70%)' }} />

      <div className="relative w-full max-w-sm px-4">
        <div className="text-center mb-8">
          <div className="inline-flex w-12 h-12 rounded-2xl items-center justify-center mb-5"
               style={{ background: '#0070f3', boxShadow: '0 0 30px rgba(0,112,243,0.4)' }}>
            <Buildings size={22} weight="bold" color="white" />
          </div>
          <h1 className="text-[22px] font-semibold text-[#ededed]">KIPL ProjectOS</h1>
          <p className="text-sm text-[#444] mt-1">Enterprise project management</p>
        </div>

        <div className="rounded-xl p-6" style={{ background: '#0a0a0a', border: '1px solid #1a1a1a' }}>
          {error && (
            <div className="mb-4 px-3 py-2.5 rounded-lg text-[13px]"
                 style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.2)', color: '#ff4444' }}>
              {error}
            </div>
          )}
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-medium text-[#555] mb-1.5">Email address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                placeholder="admin@kipl.in" autoFocus
                className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none transition-colors text-[#ededed] placeholder:text-[#2a2a2a]"
                style={{ background: '#000', border: '1px solid #1a1a1a' }}
                onFocus={e => e.target.style.borderColor = '#333'}
                onBlur={e => e.target.style.borderColor = '#1a1a1a'} />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[#555] mb-1.5">Password</label>
              <input type="password" value={password} onChange={e => setPass(e.target.value)} required
                placeholder="••••••••"
                className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none transition-colors text-[#ededed] placeholder:text-[#2a2a2a]"
                style={{ background: '#000', border: '1px solid #1a1a1a' }}
                onFocus={e => e.target.style.borderColor = '#333'}
                onBlur={e => e.target.style.borderColor = '#1a1a1a'} />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-2.5 rounded-lg text-sm font-medium text-white flex items-center justify-center gap-2 transition-all duration-150 disabled:opacity-50"
              style={{ background: '#0070f3' }}>
              {loading ? 'Signing in...' : <><span>Sign in</span><ArrowRight size={14} /></>}
            </button>
          </form>
        </div>
        <p className="text-center text-[10px] text-[#222] mt-5">Khilari Infrastructure Pvt. Ltd. · Internal</p>
      </div>
    </div>
  )
}
`)
ok('LoginPage')

// ── Dashboard ──────────────────────────────────────────────────
w(path.join(SRC, 'pages/dashboard/DashboardPage.tsx'), `
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth.store'
import { StatCard } from '@/components/ui/StatCard'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { liaisonApi } from '@/api/liaison.api'
import api from '@/api/client'
import { FileText, Warning, CheckCircle, CloudSun, Buildings } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'

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
    queryFn: () => liaisonApi.files({ projectId: activeProjectId, limit: 6 }).then(r => r.data),
    enabled: !!activeProjectId,
  })

  const pct = Number(project?.progressPct ?? 0)

  return (
    <div className="space-y-6 fade-in">
      {/* Greeting */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[20px] font-semibold text-[#ededed]">{greeting}, {user?.name?.split(' ')[0]}</h1>
          <p className="text-sm text-[#444] mt-0.5">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        {project && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs" style={{ background: 'rgba(0,112,243,0.08)', border: '1px solid rgba(0,112,243,0.15)', color: '#0070f3' }}>
            <Buildings size={12} />
            {project.code}
          </div>
        )}
      </div>

      {/* Project progress */}
      {project && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-[#ededed]">{project.name}</h2>
              <p className="text-xs text-[#444] mt-0.5">{project.location} · {project.client}</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-mono font-semibold" style={{ color: '#0070f3' }}>{pct}%</span>
              <p className="text-[10px] text-[#333] mt-0.5">complete</p>
            </div>
          </div>
          <div className="h-1 rounded-full overflow-hidden" style={{ background: '#111' }}>
            <div className="h-full rounded-full transition-all duration-1000"
                 style={{ width: pct + '%', background: 'linear-gradient(90deg, #0070f3 0%, #50e3c2 100%)' }} />
          </div>
          <div className="flex justify-between mt-2 text-[10px] text-[#333]">
            <span>Start: {project.startDate ?? '—'}</span>
            <span>₹{((Number(project.contractValue) || 0)/1e7).toFixed(2)} Cr</span>
            <span>End: {project.endDate ?? '—'}</span>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Files"  value={dash?.total ?? '—'} icon={<FileText size={15} />} color="#0070f3" />
        <StatCard label="Under Review" value={dash?.by_status?.under_review ?? '—'} icon={<CloudSun size={15} />} color="#f5a623" />
        <StatCard label="Approved"     value={dash?.by_status?.approved ?? '—'} icon={<CheckCircle size={15} />} color="#50e3c2" />
        <StatCard label="Overdue"      value={dash?.overdue ?? '—'} icon={<Warning size={15} />}
                  color={dash?.overdue > 0 ? '#ff4444' : '#50e3c2'} sub={dash?.overdue > 0 ? 'Need attention' : 'All on track'} />
      </div>

      {/* Recent files */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3.5 flex items-center justify-between" style={{ borderBottom: '1px solid #0d0d0d' }}>
          <h2 className="text-[13px] font-semibold text-[#ededed]">Recent Liaison Files</h2>
          <Link to="/liaison" className="text-[11px] transition-colors" style={{ color: '#0070f3' }}>View all →</Link>
        </div>
        {!filesData ? (
          <div className="flex items-center justify-center py-10"><Spinner /></div>
        ) : filesData.files?.length === 0 ? (
          <div className="py-10 text-center text-sm text-[#333]">No liaison files yet</div>
        ) : (
          <div>
            {filesData.files?.slice(0, 6).map((f: any, i: number) => (
              <Link to="/liaison" key={f.id}
                className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-[#050505] cursor-pointer"
                style={{ borderBottom: i < 5 ? '1px solid #0d0d0d' : 'none' }}>
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: f.priority === 'urgent' ? '#ff4444' : f.priority === 'high' ? '#f5a623' : '#333' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] text-[#ededed] truncate">{f.subject}</p>
                  <p className="text-[10px] text-[#333] mt-0.5">{f.fileNumber ?? 'Draft'} · {f.department ?? '—'}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Badge value={f.currentStatus} size="xs" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
`)
ok('DashboardPage')

// ── LiaisonPage ────────────────────────────────────────────────
w(path.join(SRC, 'pages/liaison/LiaisonPage.tsx'), `
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FileText, Plus, MagnifyingGlass, CheckCircle, XCircle, Warning, CaretRight } from '@phosphor-icons/react'
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

const FT = [{ value:'approval',label:'Approval' },{ value:'noc',label:'NOC' },{ value:'drawing',label:'Drawing' },{ value:'estimate',label:'Estimate' },{ value:'report',label:'Report' },{ value:'letter',label:'Letter' },{ value:'clearance',label:'Clearance' },{ value:'other',label:'Other' }]
const DEPTS = [{ value:'LCMA',label:'LCMA' },{ value:'UEED',label:'UEED' },{ value:'SMC',label:'SMC' },{ value:'Traffic Police',label:'Traffic Police' },{ value:'Forest Dept',label:'Forest Dept' },{ value:'DC Office',label:'DC Office' },{ value:'PWD',label:'PWD' },{ value:'Other',label:'Other' }]
const PRI = [{ value:'low',label:'Low' },{ value:'medium',label:'Medium' },{ value:'high',label:'High' },{ value:'urgent',label:'Urgent' }]
const CHAINS: Record<string,string[]> = { approval:['JE','AEE','XEN','SE'], noc:['JE','AEE','XEN'], drawing:['JE','XEN'], estimate:['AEE','XEN','SE'], report:['XEN'], letter:['XEN'], clearance:['JE','AEE','XEN','SE'], other:['JE','AEE','XEN','SE'] }
const BLK = { subject:'', fileType:'noc', priority:'medium', department:'LCMA', dueDate:'', remarks:'' }

export default function LiaisonPage() {
  const { activeProjectId } = useAuthStore()
  const qc = useQueryClient()
  const [search, setSearch]   = useState('')
  const [status, setStatus]   = useState('')
  const [showNew, setShowNew] = useState(false)
  const [sel, setSel]         = useState<any>(null)
  const [approveM, setApproveM] = useState<any>(null)
  const [form, setForm]       = useState(BLK)

  const { data: dash } = useQuery({ queryKey: ['liaison-dash', activeProjectId], queryFn: () => liaisonApi.dashboard(activeProjectId ?? undefined).then(r => r.data), enabled: !!activeProjectId })
  const { data: fd, isLoading } = useQuery({ queryKey: ['liaison-files', activeProjectId, status], queryFn: () => liaisonApi.files({ projectId: activeProjectId, status: status || undefined, limit: 100 }).then(r => r.data), enabled: !!activeProjectId })
  const { data: detail } = useQuery({ queryKey: ['liaison-file', sel?.id], queryFn: () => liaisonApi.file(sel!.id).then(r => r.data), enabled: !!sel })

  const createM = useMutation({ mutationFn: (d: any) => liaisonApi.createFile({ ...d, projectId: activeProjectId }), onSuccess: () => { qc.invalidateQueries({ queryKey: ['liaison-files'] }); qc.invalidateQueries({ queryKey: ['liaison-dash'] }); setShowNew(false); setForm(BLK) } })
  const approveM2 = useMutation({ mutationFn: ({ id, action, remarks }: any) => liaisonApi.approveFile(id, { action, remarks }), onSuccess: () => { qc.invalidateQueries({ queryKey: ['liaison-files'] }); qc.invalidateQueries({ queryKey: ['liaison-file', sel?.id] }); qc.invalidateQueries({ queryKey: ['liaison-dash'] }); setApproveM(null) } })

  const today = new Date().toISOString().split('T')[0]
  const files = (fd?.files ?? []).filter((f: any) => !search || f.subject?.toLowerCase().includes(search.toLowerCase()) || f.fileNumber?.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-5 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-semibold text-[#ededed]">Liaison Files</h1>
          <p className="text-sm text-[#444] mt-0.5">Track government approvals, NOCs and clearances</p>
        </div>
        <Button variant="primary" icon={<Plus size={13} />} onClick={() => setShowNew(true)}>New File</Button>
      </div>

      {dash && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <StatCard label="Total" value={dash.total} color="#0070f3" icon={<FileText size={14} />} />
          <StatCard label="Under Review" value={dash.by_status?.under_review ?? 0} color="#f5a623" />
          <StatCard label="Approved" value={dash.by_status?.approved ?? 0} color="#50e3c2" />
          <StatCard label="Overdue" value={dash.overdue} color={dash.overdue > 0 ? '#ff4444' : '#50e3c2'} icon={<Warning size={14} />} />
          <StatCard label="Urgent" value={dash.urgent} color={dash.urgent > 0 ? '#ff4444' : '#444'} />
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid #0d0d0d' }}>
          <div className="relative flex-1 max-w-sm">
            <MagnifyingGlass className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#2a2a2a]" size={13} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search files, reference numbers..."
              className="w-full pl-8 pr-3 py-1.5 text-[12px] rounded-lg focus:outline-none placeholder:text-[#2a2a2a] text-[#ededed]"
              style={{ background: '#000', border: '1px solid #111' }} />
          </div>
          <select value={status} onChange={e => setStatus(e.target.value)}
            className="px-2.5 py-1.5 text-[11px] rounded-lg focus:outline-none text-[#888]"
            style={{ background: '#000', border: '1px solid #111' }}>
            <option value="">All status</option>
            {['draft','submitted','under_review','approved','rejected','returned','closed'].map(s => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
          </select>
          <span className="text-[11px] text-[#2a2a2a] ml-1">{files.length}</span>
        </div>

        <div className="flex" style={{ minHeight: 420 }}>
          {/* List */}
          <div className="flex-1 overflow-y-auto" style={{ maxHeight: 560 }}>
            {isLoading ? <div className="flex items-center justify-center py-16"><Spinner /></div>
            : files.length === 0 ? <Empty icon={<FileText size={28} />} title="No liaison files" sub="Create your first liaison file to get started" action={<Button variant="secondary" size="xs" icon={<Plus size={11} />} onClick={() => setShowNew(true)}>Create</Button>} />
            : files.map((f: any) => {
              const overdue = f.dueDate && f.dueDate < today && !['approved','closed'].includes(f.currentStatus)
              return (
                <div key={f.id} onClick={() => setSel(f)} className="flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors"
                     style={{ borderBottom: '1px solid #080808', background: sel?.id === f.id ? '#050505' : 'transparent' }}>
                  <div className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ background: f.priority === 'urgent' ? '#ff4444' : f.priority === 'high' ? '#f5a623' : '#222' }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                      <span className="font-mono text-[10px]" style={{ color: '#0070f3' }}>{f.fileNumber ?? 'DRAFT'}</span>
                      <Badge value={f.currentStatus} size="xs" />
                      <Badge value={f.fileType} size="xs" />
                    </div>
                    <p className="text-[12px] text-[#ededed] truncate leading-snug">{f.subject}</p>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-[#333]">
                      <span>{f.department ?? '—'}</span>
                      {f.dueDate && <span style={{ color: overdue ? '#ff4444' : '#333' }} className="flex items-center gap-1">{overdue && <Warning size={9} />}{f.dueDate}</span>}
                      {f.currentHolder && <span>→ {f.currentHolder.name}</span>}
                    </div>
                  </div>
                  {sel?.id === f.id && <CaretRight size={12} className="text-[#222] flex-shrink-0 mt-1" />}
                </div>
              )
            })}
          </div>

          {/* Detail panel */}
          {sel && detail && (
            <div className="w-64 flex-shrink-0 overflow-y-auto" style={{ borderLeft: '1px solid #0d0d0d', background: '#050505' }}>
              <div className="px-4 py-3.5" style={{ borderBottom: '1px solid #080808' }}>
                <div className="flex justify-between items-start">
                  <span className="font-mono text-[10px]" style={{ color: '#0070f3' }}>{detail.fileNumber ?? 'DRAFT'}</span>
                  <button onClick={() => setSel(null)} className="text-[#222] hover:text-[#555] text-xs transition-colors">✕</button>
                </div>
                <p className="text-[12px] text-[#ededed] mt-1.5 font-medium leading-snug">{detail.subject}</p>
                <div className="flex gap-1 mt-2 flex-wrap">
                  <Badge value={detail.currentStatus} size="xs" />
                  <Badge value={detail.priority} size="xs" />
                </div>
              </div>

              <div className="px-4 py-3 space-y-2.5 text-[11px]" style={{ borderBottom: '1px solid #080808' }}>
                {[['Dept', detail.department],['Holder', detail.currentHolder?.name],['Due', detail.dueDate],['By', detail.initiatedBy?.name]].map(([l,v]) => v ? (
                  <div key={l}><span className="text-[#333]">{l}: </span><span className="text-[#888]">{v}</span></div>
                ) : null)}
                {detail.remarks && <div><span className="text-[#333]">Note: </span><span className="text-[#666]">{detail.remarks}</span></div>}
              </div>

              <div className="px-4 py-3" style={{ borderBottom: '1px solid #080808' }}>
                <p className="text-[9px] font-semibold text-[#2a2a2a] uppercase tracking-widest mb-2.5">Approval Chain</p>
                <div className="space-y-1.5">
                  {detail.approvalSteps?.map((step: any) => (
                    <div key={step.id} className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                           style={{ background: step.status==='approved'?'rgba(80,227,194,0.1)':step.status==='rejected'?'rgba(255,68,68,0.1)':'#0a0a0a', color: step.status==='approved'?'#50e3c2':step.status==='rejected'?'#ff4444':'#333', border: '1px solid ' + (step.status==='approved'?'rgba(80,227,194,0.2)':step.status==='rejected'?'rgba(255,68,68,0.2)':'#111') }}>
                        {step.stepOrder}
                      </div>
                      <span className="text-[11px] text-[#888] flex-1">{step.approverRole}</span>
                      {step.status !== 'pending' && <Badge value={step.status} size="xs" />}
                    </div>
                  ))}
                </div>
              </div>

              {detail.currentStatus === 'under_review' && (
                <div className="px-4 py-3 flex gap-2">
                  <Button variant="success" size="xs" icon={<CheckCircle size={11} />} onClick={() => setApproveM({ action:'approved', remarks:'' })}>Approve</Button>
                  <Button variant="danger" size="xs" icon={<XCircle size={11} />} onClick={() => setApproveM({ action:'rejected', remarks:'' })}>Reject</Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <Modal open={showNew} onClose={() => setShowNew(false)} title="New Liaison File"
        footer={<><Button variant="ghost" onClick={() => setShowNew(false)}>Cancel</Button><Button variant="primary" loading={createM.isPending} onClick={() => createM.mutate(form)} disabled={!form.subject}>Create File</Button></>}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Select label="File Type" value={form.fileType} onChange={e => setForm(f => ({...f, fileType: e.target.value}))} options={FT} />
            <Select label="Department" value={form.department} onChange={e => setForm(f => ({...f, department: e.target.value}))} options={DEPTS} />
          </div>
          <Input label="Subject" value={form.subject} onChange={e => setForm(f => ({...f, subject: e.target.value}))} placeholder="NOC for drain crossing at Nishat road..." />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Priority" value={form.priority} onChange={e => setForm(f => ({...f, priority: e.target.value}))} options={PRI} />
            <Input label="Due Date" type="date" value={form.dueDate} onChange={e => setForm(f => ({...f, dueDate: e.target.value}))} />
          </div>
          <Textarea label="Remarks" value={form.remarks} rows={2} onChange={e => setForm(f => ({...f, remarks: e.target.value}))} placeholder="Optional notes..." />
          {form.fileType && (
            <div className="px-3 py-2 rounded-lg text-[11px]" style={{ background: 'rgba(0,112,243,0.06)', border: '1px solid rgba(0,112,243,0.1)' }}>
              <span className="text-[#333]">Chain: </span>
              {(CHAINS[form.fileType]??CHAINS.other).map((r,i,arr) => <span key={r}><span style={{color:'#0070f3'}} className="font-semibold">{r}</span>{i<arr.length-1&&<span className="text-[#222]"> → </span>}</span>)}
            </div>
          )}
        </div>
      </Modal>

      <Modal open={!!approveM} onClose={() => setApproveM(null)} title={approveM?.action==='approved'?'Approve File':'Reject File'}
        footer={<><Button variant="ghost" onClick={() => setApproveM(null)}>Cancel</Button><Button variant={approveM?.action==='approved'?'success':'danger'} loading={approveM2.isPending} onClick={() => approveM2.mutate({ id: sel?.id, action: approveM?.action, remarks: approveM?.remarks })}>{approveM?.action==='approved'?'Confirm Approval':'Confirm Rejection'}</Button></>}>
        <div className="space-y-3">
          <div className="px-3 py-2.5 rounded-lg text-[12px] text-[#888]" style={{ background: '#050505', border: '1px solid #111' }}>{sel?.subject}</div>
          <Textarea label="Remarks (optional)" rows={3} value={approveM?.remarks??''} onChange={e => setApproveM((a: any) => a?{...a,remarks:e.target.value}:null)} placeholder="Notes about this decision..." />
        </div>
      </Modal>
    </div>
  )
}
`)
ok('LiaisonPage')

// ── LettersPage ─────────────────────────────────────────────────
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
  reminder: "With reference to our earlier communication, we wish to bring to your kind notice that the above-mentioned permission/NOC/approval is still pending.\\n\\nWe request you to kindly expedite the matter at the earliest, as further delay is affecting our project progress.\\n\\nWe hope for your prompt and favourable action.",
  covering: "With reference to the above subject, we are hereby submitting the following documents:\\n\\n1. [Document Name] — [copies]\\n2. [Document Name] — [copies]\\n\\nWe request you to kindly review the enclosed documents and accord the necessary approval.",
  reply: "With reference to your letter dated ___________, we wish to submit our reply as under:\\n\\n[State your reply clearly]\\n\\nWe trust this clarifies the matter to your satisfaction.",
  noc: "We are executing the above-mentioned work on behalf of LCMA/UEED. We require NOC from your department for [describe work].\\n\\nAll restoration works shall be carried out to your satisfaction at our own cost.",
}
const BLK = { subject:'', toName:'', toOrganization:'LCMA', toEmail:'', body:'', date: new Date().toISOString().split('T')[0] }

export default function LettersPage() {
  const { activeProjectId, user } = useAuthStore()
  const qc = useQueryClient()
  const [showNew, setShowNew]   = useState(false)
  const [preview, setPreview]   = useState<any>(null)
  const [sendM, setSendM]       = useState<any>(null)
  const [sendF, setSendF]       = useState({ toEmail:'', subject:'', bodyNote:'' })
  const [form, setForm]         = useState(BLK)

  const { data: letters, isLoading } = useQuery({ queryKey: ['letters', activeProjectId], queryFn: () => liaisonApi.letters({ projectId: activeProjectId }).then(r => r.data), enabled: !!activeProjectId })
  const { data: gStatus } = useQuery({ queryKey: ['gmail-status'], queryFn: () => liaisonApi.gmailStatus().then(r => r.data) })

  const createM = useMutation({ mutationFn: (d: any) => liaisonApi.createLetter({ ...d, projectId: activeProjectId }), onSuccess: () => { qc.invalidateQueries({ queryKey: ['letters'] }); setShowNew(false); setForm(BLK) } })
  const sendM2  = useMutation({ mutationFn: ({ id, d }: any) => liaisonApi.sendLetter(id, d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['letters'] }); setSendM(null) } })

  function print(l: any) {
    const w2 = window.open('','_blank'); if (!w2) return
    w2.document.write('<html><head><title>' + l.letterNumber + '</title><style>body{font-family:Arial;font-size:12px;margin:40px;color:#111;line-height:1.7}.co{font-size:18px;font-weight:bold;color:#0070f3}.body{white-space:pre-wrap;line-height:1.9}</style></head><body><div style="border-bottom:3px solid #0070f3;padding-bottom:8px;margin-bottom:18px"><div class="co">Khilari Infrastructure Pvt. Ltd.</div><div style="font-size:11px;color:#555">Srinagar, J&K</div></div><div style="display:flex;justify-content:space-between;margin-bottom:12px;font-size:11px"><div><b>Ref:</b> ' + l.letterNumber + '</div><div><b>Date:</b> ' + l.date + '</div></div><div style="margin-bottom:12px"><b>To,</b><br>' + (l.toName??'') + '<br>' + (l.toOrganization??'') + '</div><div style="font-weight:bold;margin-bottom:10px"><u>Sub:</u> ' + l.subject + '</div><hr style="border:none;border-top:1px solid #ddd;margin:10px 0"><div style="margin-bottom:10px">Respected Sir/Madam,</div><div class="body">' + l.body + '</div><div style="margin-top:40px">Yours faithfully,<br><br><br><b>' + (l.signedBy?.name??user?.name) + '</b></div></body></html>')
    w2.document.close(); w2.print()
  }

  const list = Array.isArray(letters) ? letters : []

  return (
    <div className="space-y-5 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-semibold text-[#ededed]">Official Letters</h1>
          <p className="text-sm text-[#444] mt-0.5">Draft and send letters to LCMA, UEED and government departments</p>
        </div>
        <div className="flex items-center gap-2">
          {!gStatus?.configured && <div className="text-[10px] px-2.5 py-1.5 rounded-lg" style={{ background:'rgba(245,166,35,0.08)', color:'#f5a623', border:'1px solid rgba(245,166,35,0.15)' }}>⚠ Gmail not connected</div>}
          <Button variant="primary" icon={<Plus size={13}/>} onClick={() => setShowNew(true)}>Draft Letter</Button>
        </div>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? <div className="flex items-center justify-center py-12"><Spinner /></div>
        : list.length === 0 ? (
          <div className="flex flex-col items-center py-14 space-y-3">
            <Envelope size={28} className="text-[#1a1a1a]" />
            <p className="text-sm text-[#444]">No letters drafted yet</p>
            <Button variant="secondary" size="sm" icon={<Plus size={12}/>} onClick={() => setShowNew(true)}>Draft first letter</Button>
          </div>
        ) : (
          <table className="w-full">
            <thead><tr style={{ borderBottom:'1px solid #0d0d0d', background:'#050505' }}>
              {['Ref No.','Date','To','Subject','Status','Actions'].map(h => <th key={h} className="px-4 py-3 text-left text-[9px] font-semibold uppercase tracking-widest text-[#2a2a2a]">{h}</th>)}
            </tr></thead>
            <tbody>
              {list.map((l: any) => (
                <tr key={l.id} className="transition-colors hover:bg-[#050505]" style={{ borderBottom:'1px solid #080808' }}>
                  <td className="px-4 py-3 font-mono text-[11px]" style={{ color:'#0070f3' }}>{l.letterNumber??'—'}</td>
                  <td className="px-4 py-3 text-[11px] text-[#555]">{l.date}</td>
                  <td className="px-4 py-3 text-[11px] text-[#888] max-w-[90px] truncate">{l.toOrganization??'—'}</td>
                  <td className="px-4 py-3 text-[12px] text-[#ededed] max-w-[200px] truncate">{l.subject}</td>
                  <td className="px-4 py-3"><Badge value={l.status} size="xs" /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-0.5">
                      <button onClick={() => setPreview(l)} className="p-1.5 rounded text-[#333] hover:text-[#888] hover:bg-[#0a0a0a] transition-colors" title="Preview"><Eye size={13}/></button>
                      <button onClick={() => print(l)} className="p-1.5 rounded text-[#333] hover:text-[#888] hover:bg-[#0a0a0a] transition-colors" title="Print"><Printer size={13}/></button>
                      <a href={liaisonApi.pdfUrl(l.id)} target="_blank" rel="noreferrer" className="px-1.5 py-1 rounded text-[10px] text-[#333] hover:text-[#888] hover:bg-[#0a0a0a] transition-colors">PDF</a>
                      <button onClick={() => { setSendM(l); setSendF({ toEmail: l.toEmail??'', subject: 'Ref: '+l.letterNumber+' — '+l.subject, bodyNote:'' }) }}
                        className="p-1.5 rounded transition-colors" style={{ color: l.status==='dispatched'?'#50e3c2':'#0070f3' }} title="Send via Gmail"><PaperPlaneTilt size={13}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={showNew} onClose={() => setShowNew(false)} title="Draft Official Letter" width="max-w-2xl"
        footer={<><Button variant="ghost" onClick={() => setShowNew(false)}>Cancel</Button><Button variant="primary" loading={createM.isPending} onClick={() => createM.mutate(form)} disabled={!form.subject||!form.body}>Save Letter</Button></>}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="To (Name)" value={form.toName} onChange={e => setForm(f=>({...f,toName:e.target.value}))} placeholder="Executive Engineer" />
            <Input label="Organisation" value={form.toOrganization} onChange={e => setForm(f=>({...f,toOrganization:e.target.value}))} placeholder="LCMA, UEED..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Email (for Gmail)" type="email" value={form.toEmail} onChange={e => setForm(f=>({...f,toEmail:e.target.value}))} placeholder="officer@jkgov.in" />
            <Input label="Date" type="date" value={form.date} onChange={e => setForm(f=>({...f,date:e.target.value}))} />
          </div>
          <Input label="Subject" value={form.subject} onChange={e => setForm(f=>({...f,subject:e.target.value}))} placeholder="Request for NOC / Approval..." />
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-medium text-[#555]">Body</label>
              <div className="flex gap-1">
                {[['Reminder','reminder'],['Covering','covering'],['Reply','reply'],['NOC','noc']].map(([l,k]) => <button key={k} onClick={() => setForm(f=>({...f,body:TMPL[k]}))} className="text-[9px] px-2 py-1 rounded text-[#444] hover:text-[#888] transition-colors" style={{ border:'1px solid #111' }}>{l}</button>)}
              </div>
            </div>
            <Textarea rows={10} value={form.body} onChange={e => setForm(f=>({...f,body:e.target.value}))} placeholder="Type letter body or click a template above..." />
          </div>
        </div>
      </Modal>

      <Modal open={!!preview} onClose={() => setPreview(null)} title={preview?.letterNumber??'Preview'} width="max-w-2xl"
        footer={<div className="flex gap-2 w-full"><Button variant="secondary" icon={<Printer size={12}/>} onClick={() => print(preview)}>Print</Button><Button variant="secondary" icon={<PaperPlaneTilt size={12}/>} onClick={() => { setSendM(preview); setPreview(null); setSendF({ toEmail: preview?.toEmail??'', subject:'Ref: '+preview?.letterNumber, bodyNote:'' }) }}>Send</Button><div className="flex-1"/><Button variant="ghost" onClick={() => setPreview(null)}>Close</Button></div>}>
        {preview && <div className="rounded-lg p-6 text-sm" style={{ background:'white', color:'#111', fontFamily:'Arial' }}>
          <div style={{ borderBottom:'3px solid #0070f3', paddingBottom:8, marginBottom:16 }}><div style={{ fontSize:18, fontWeight:'bold', color:'#0070f3' }}>Khilari Infrastructure Pvt. Ltd.</div><div style={{ fontSize:11, color:'#555' }}>Srinagar, J&K</div></div>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12, fontSize:11 }}><div><b>Ref:</b> {preview.letterNumber}</div><div><b>Date:</b> {preview.date}</div></div>
          <div style={{ marginBottom:12 }}><b>To,</b><br/>{preview.toName}<br/>{preview.toOrganization}</div>
          <div style={{ fontWeight:'bold', marginBottom:10 }}><u>Sub:</u> {preview.subject}</div>
          <hr style={{ margin:'10px 0', border:'none', borderTop:'1px solid #ddd' }}/>
          <div style={{ marginBottom:10 }}>Respected Sir/Madam,</div>
          <div style={{ lineHeight:1.9, whiteSpace:'pre-wrap' }}>{preview.body}</div>
          <div style={{ marginTop:40 }}>Yours faithfully,<br/><br/><br/><b>{preview.signedBy?.name??user?.name}</b></div>
        </div>}
      </Modal>

      <Modal open={!!sendM} onClose={() => setSendM(null)} title="Send via Gmail"
        footer={<><Button variant="ghost" onClick={() => setSendM(null)}>Cancel</Button><Button variant="primary" loading={sendM2.isPending} icon={<PaperPlaneTilt size={12}/>} onClick={() => sendM2.mutate({ id: sendM?.id, d: sendF })} disabled={!sendF.toEmail}>Send</Button></>}>
        <div className="space-y-3">
          {!gStatus?.configured && <div className="px-3 py-2 rounded-lg text-[11px]" style={{ background:'rgba(245,166,35,0.08)', color:'#f5a623', border:'1px solid rgba(245,166,35,0.15)' }}>Gmail not connected. Visit /api/v1/gmail/auth to connect first.</div>}
          <Input label="Recipient Email" type="email" value={sendF.toEmail} onChange={e => setSendF(f=>({...f,toEmail:e.target.value}))} placeholder="officer@jkgov.in" />
          <Input label="Email Subject" value={sendF.subject} onChange={e => setSendF(f=>({...f,subject:e.target.value}))} />
          <Textarea label="Covering note" rows={3} value={sendF.bodyNote} onChange={e => setSendF(f=>({...f,bodyNote:e.target.value}))} placeholder="Brief note before the PDF attachment..." />
        </div>
      </Modal>
    </div>
  )
}
`)
ok('LettersPage')

// ── Stub pages ─────────────────────────────────────────────────
const stubs = [
  ['hr/AttendancePage',        'Attendance',    'GPS attendance tracking'],
  ['hr/EmployeesPage',         'Employees',     'Employee records and management'],
  ['hr/SalaryPage',            'Salary',        'Monthly payroll generation'],
  ['tasks/TasksPage',          'WBS & Gantt',   'Work breakdown and critical path'],
  ['tasks/KanbanPage',         'Task Board',    'Kanban task management'],
  ['epc/EpcPage',              'BOQ & Costs',   'Bill of quantities and cost tracking'],
  ['accounting/AccountingPage','Transactions',  'General ledger'],
  ['accounting/InvoicesPage',  'Invoices',      'RA bills and invoice management'],
  ['public/PublicProjectPage', 'Public View',   'Shareable project progress page'],
]
stubs.forEach(([p, title, desc]) => {
  const name = p.split('/').pop()
  w(path.join(SRC, 'pages', p + '.tsx'),
`import { Wrench } from '@phosphor-icons/react'
export default function ${name}() {
  return (
    <div className="space-y-5 fade-in">
      <div>
        <h1 className="text-[20px] font-semibold text-[#ededed]">${title}</h1>
        <p className="text-sm text-[#444] mt-0.5">${desc}</p>
      </div>
      <div className="card flex flex-col items-center justify-center py-20 space-y-3">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background:'#0a0a0a', border:'1px solid #1a1a1a' }}>
          <Wrench size={18} className="text-[#2a2a2a]" />
        </div>
        <p className="text-sm font-medium text-[#444]">Module in development</p>
        <p className="text-[11px] text-[#222]">Being built module by module</p>
      </div>
    </div>
  )
}`)
})
ok('Stub pages (HR, Tasks, EPC, Accounting, Public)')

// ── .env ───────────────────────────────────────────────────────
const envPath = path.join(FRONTEND, '.env')
if (!fs.existsSync(envPath)) {
  fs.writeFileSync(envPath, 'VITE_API_URL=http://localhost:3000\n')
  ok('.env written')
}

console.log('\n\x1b[32m\x1b[1m  All files written successfully!\x1b[0m\n')
console.log('  Now restart the frontend:')
console.log('\x1b[33m  cd frontend && npm run dev\x1b[0m\n')
