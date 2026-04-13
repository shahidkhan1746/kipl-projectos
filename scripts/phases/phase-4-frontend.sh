#!/usr/bin/env bash
# ================================================================
#  Phase 4 — React + Vite Frontend Scaffold
#  Matches Kashmir B2B stack exactly:
#  React + Vite + Tailwind v4 + Phosphor Icons + ECharts + Zustand
# ================================================================

set -euo pipefail

G='\033[0;32m'; R='\033[0;31m'; Y='\033[1;33m'; B='\033[0;34m'; NC='\033[0m'; BOLD='\033[1m'
ok()   { echo -e "${G}  ✓${NC} $1"; }
warn() { echo -e "${Y}  ⚠${NC} $1"; }
err()  { echo -e "${R}  ✗ $1${NC}"; exit 1; }
info() { echo -e "${B}  →${NC} $1"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FRONTEND="$ROOT/frontend"

# ── Create Vite project ───────────────────────────────────────────
if [[ -f "$FRONTEND/package.json" ]]; then
  warn "frontend/ already exists — skipping Vite create"
else
  info "Creating React + Vite project..."
  cd "$ROOT"
  npm create vite@latest frontend -- --template react-ts
  ok "Vite project created"
fi

cd "$FRONTEND"

# ── Install all dependencies ──────────────────────────────────────
info "Installing frontend dependencies..."

npm install --save \
  @phosphor-icons/react \
  echarts echarts-for-react \
  leaflet react-leaflet \
  @types/leaflet \
  zustand \
  axios \
  react-router-dom \
  react-hook-form \
  zod @hookform/resolvers \
  date-fns \
  clsx \
  --silent

  
  npm install --save-dev \
  tailwindcss \
  @tailwindcss/vite \
  --silent

ok "Dependencies installed"

# ── vite.config.ts — Tailwind v4 via plugin ───────────────────────
cat > "$FRONTEND/vite.config.ts" << 'TYPESCRIPT'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),   // Tailwind v4 — no tailwind.config.js needed
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Proxy API calls to NestJS backend during development
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
TYPESCRIPT

ok "vite.config.ts written"

# ── tsconfig — add path alias ─────────────────────────────────────
cat > "$FRONTEND/tsconfig.json" << 'JSON'
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
JSON

ok "tsconfig.json written"

# ── index.css — Tailwind v4 config lives here ─────────────────────
# This matches the Kashmir B2B approach exactly
cat > "$FRONTEND/src/index.css" << 'CSS'
/* ================================================================
   KIPL ProjectOS — Design System
   Tailwind v4: all config lives here as CSS variables
   Same approach as Kashmir B2B platform
   ================================================================ */

@import "tailwindcss";

/* ── Google Fonts — same as Kashmir B2B ────────────────────────── */
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&family=DM+Mono:wght@400;500&display=swap');

/* ── Design tokens ──────────────────────────────────────────────── */
@theme {
  /* Fonts */
  --font-sans:  'DM Sans', system-ui, sans-serif;
  --font-mono:  'DM Mono', monospace;

  /* Backgrounds */
  --color-bg-page:    #0D1117;
  --color-bg-card:    #161B22;
  --color-bg-subtle:  #1C2128;

  /* Borders */
  --color-border-dim: #30363D;

  /* Text */
  --color-text-base:  #E6EDF3;
  --color-text-muted: #8B949E;
  --color-text-faint: #6E7681;

  /* Brand */
  --color-accent:     #388BFD;
  --color-accent-bg:  #1F3352;

  /* Status */
  --color-green:      #3FB950;
  --color-green-bg:   #1A3028;
  --color-amber:      #D29922;
  --color-amber-bg:   #2F2208;
  --color-red:        #F85149;
  --color-red-bg:     #3A1F1E;
  --color-teal:       #2DD4BF;
  --color-teal-bg:    #0D2B28;
  --color-purple:     #BC8CFF;
  --color-purple-bg:  #1E1533;

  /* Border radius */
  --radius-sm:  6px;
  --radius-md:  8px;
  --radius-lg:  12px;
  --radius-xl:  16px;
}

/* ── Base styles ─────────────────────────────────────────────────── */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: var(--font-sans);
  background-color: var(--color-bg-page);
  color: var(--color-text-base);
  font-size: 14px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

/* ── Scrollbar ───────────────────────────────────────────────────── */
::-webkit-scrollbar       { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--color-border-dim); border-radius: 3px; }

/* ── Utility classes ─────────────────────────────────────────────── */
.card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border-dim);
  border-radius: var(--radius-lg);
}

.font-mono {
  font-family: var(--font-mono);
}

/* Status badge colours */
.badge-green  { background: var(--color-green-bg);  color: var(--color-green);  }
.badge-red    { background: var(--color-red-bg);    color: var(--color-red);    }
.badge-amber  { background: var(--color-amber-bg);  color: var(--color-amber);  }
.badge-blue   { background: var(--color-accent-bg); color: var(--color-accent); }
.badge-teal   { background: var(--color-teal-bg);   color: var(--color-teal);   }
.badge-purple { background: var(--color-purple-bg); color: var(--color-purple); }
CSS

ok "index.css written (Tailwind v4 config)"

# ── main.tsx ──────────────────────────────────────────────────────
cat > "$FRONTEND/src/main.tsx" << 'TYPESCRIPT'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
TYPESCRIPT

# ── App.tsx — router setup ─────────────────────────────────────────
cat > "$FRONTEND/src/App.tsx" << 'TYPESCRIPT'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import LoginPage from '@/pages/auth/LoginPage'
import DashboardLayout from '@/layouts/DashboardLayout'
import DashboardPage from '@/pages/dashboard/DashboardPage'
import LiaisonPage from '@/pages/liaison/LiaisonPage'
import AttendancePage from '@/pages/hr/AttendancePage'
import EmployeesPage from '@/pages/hr/EmployeesPage'
import TasksPage from '@/pages/tasks/TasksPage'
import KanbanPage from '@/pages/tasks/KanbanPage'
import EpcPage from '@/pages/epc/EpcPage'
import InvoicesPage from '@/pages/accounting/InvoicesPage'
import AccountingPage from '@/pages/accounting/AccountingPage'
import SalaryPage from '@/pages/hr/SalaryPage'
import LettersPage from '@/pages/liaison/LettersPage'
import PublicProjectPage from '@/pages/public/PublicProjectPage'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore(s => s.user)
  return user ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/public/:projectCode" element={<PublicProjectPage />} />

        {/* Protected — dashboard */}
        <Route path="/" element={<PrivateRoute><DashboardLayout /></PrivateRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"           element={<DashboardPage />} />
          <Route path="liaison"             element={<LiaisonPage />} />
          <Route path="liaison/letters"     element={<LettersPage />} />
          <Route path="tasks"               element={<TasksPage />} />
          <Route path="tasks/kanban"        element={<KanbanPage />} />
          <Route path="hr/attendance"       element={<AttendancePage />} />
          <Route path="hr/employees"        element={<EmployeesPage />} />
          <Route path="hr/salary"           element={<SalaryPage />} />
          <Route path="epc"                 element={<EpcPage />} />
          <Route path="accounting"          element={<AccountingPage />} />
          <Route path="accounting/invoices" element={<InvoicesPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
TYPESCRIPT

ok "App.tsx with router written"

# ── Zustand auth store ────────────────────────────────────────────
mkdir -p "$FRONTEND/src/store"
cat > "$FRONTEND/src/store/auth.store.ts" << 'TYPESCRIPT'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type UserRole =
  | 'super_admin' | 'admin' | 'project_manager' | 'engineer'
  | 'hr_officer' | 'liaison_officer' | 'accountant' | 'field_staff' | 'viewer'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: UserRole
}

interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  refreshToken: string | null
  activeProjectId: string | null
  setAuth: (user: AuthUser, accessToken: string, refreshToken: string) => void
  setAccessToken: (token: string) => void
  setProject: (projectId: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user:            null,
      accessToken:     null,
      refreshToken:    null,
      activeProjectId: null,

      setAuth: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken }),

      setAccessToken: (accessToken) =>
        set({ accessToken }),

      setProject: (activeProjectId) =>
        set({ activeProjectId }),

      logout: () =>
        set({ user: null, accessToken: null, refreshToken: null, activeProjectId: null }),
    }),
    {
      name: 'kipl-auth',
      partialize: (s) => ({
        user:            s.user,
        accessToken:     s.accessToken,
        refreshToken:    s.refreshToken,
        activeProjectId: s.activeProjectId,
      }),
    }
  )
)

// Role level helper
const ROLE_LEVEL: Record<UserRole, number> = {
  super_admin: 100, admin: 90, project_manager: 70,
  engineer: 50, hr_officer: 50, liaison_officer: 50, accountant: 50,
  field_staff: 30, viewer: 10,
}

export function can(user: AuthUser | null, minRole: UserRole): boolean {
  if (!user) return false
  if (user.role === 'super_admin') return true
  return ROLE_LEVEL[user.role] >= ROLE_LEVEL[minRole]
}
TYPESCRIPT

ok "Zustand auth store written"

# ── Axios API client ──────────────────────────────────────────────
mkdir -p "$FRONTEND/src/api"
cat > "$FRONTEND/src/api/client.ts" << 'TYPESCRIPT'
import axios from 'axios'
import { useAuthStore } from '@/store/auth.store'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
  timeout: 30_000,
})

// Attach JWT on every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Auto-refresh on 401
let isRefreshing = false
let queue: Array<(token: string) => void> = []

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config

    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve) => {
          queue.push((token) => {
            original.headers.Authorization = `Bearer ${token}`
            resolve(api(original))
          })
        })
      }

      original._retry = true
      isRefreshing = true

      try {
        const refreshToken = useAuthStore.getState().refreshToken
        if (!refreshToken) throw new Error('No refresh token')

        const { data } = await axios.post(
          `${import.meta.env.VITE_API_URL ?? 'http://localhost:3000'}/api/v1/auth/refresh`,
          { refresh_token: refreshToken }
        )

        useAuthStore.getState().setAccessToken(data.access_token)
        queue.forEach(cb => cb(data.access_token))
        queue = []

        original.headers.Authorization = `Bearer ${data.access_token}`
        return api(original)
      } catch {
        useAuthStore.getState().logout()
        window.location.href = '/login'
        return Promise.reject(error)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export default api
TYPESCRIPT

# ── API modules ────────────────────────────────────────────────────
cat > "$FRONTEND/src/api/index.ts" << 'TYPESCRIPT'
// Central API export — all calls go through here
// Same pattern as Kashmir B2B: src/api/ folder

export { default as api } from './client'
export * from './auth.api'
export * from './projects.api'
export * from './liaison.api'
export * from './hr.api'
export * from './tasks.api'
export * from './epc.api'
export * from './accounting.api'
TYPESCRIPT

# Auth API
cat > "$FRONTEND/src/api/auth.api.ts" << 'TYPESCRIPT'
import api from './client'

export const authApi = {
  login:   (email: string, password: string) =>
    api.post('/api/v1/auth/login', { email, password }),
  refresh: (refresh_token: string) =>
    api.post('/api/v1/auth/refresh', { refresh_token }),
  logout:  (refresh_token: string) =>
    api.post('/api/v1/auth/logout', { refresh_token }),
  me:      () => api.get('/api/v1/auth/me'),
}
TYPESCRIPT

# Projects API
cat > "$FRONTEND/src/api/projects.api.ts" << 'TYPESCRIPT'
import api from './client'

export const projectsApi = {
  list:     ()                       => api.get('/api/v1/projects'),
  get:      (id: string)             => api.get(`/api/v1/projects/${id}`),
  create:   (data: any)              => api.post('/api/v1/projects', data),
  update:   (id: string, data: any)  => api.patch(`/api/v1/projects/${id}`, data),
  public:   (code: string)           => api.get(`/api/v1/projects/public/${code}`),
}
TYPESCRIPT

# Liaison API
cat > "$FRONTEND/src/api/liaison.api.ts" << 'TYPESCRIPT'
import api from './client'

export const liaisonApi = {
  files:          (params?: any)              => api.get('/api/v1/liaison/files', { params }),
  file:           (id: string)                => api.get(`/api/v1/liaison/files/${id}`),
  createFile:     (data: any)                 => api.post('/api/v1/liaison/files', data),
  updateFile:     (id: string, data: any)     => api.patch(`/api/v1/liaison/files/${id}`, data),
  approveFile:    (id: string, data: any)     => api.post(`/api/v1/liaison/files/${id}/approve`, data),
  uploadDocument: (id: string, form: FormData)=>
    api.post(`/api/v1/liaison/files/${id}/documents`, form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  letters:        (params?: any)              => api.get('/api/v1/liaison/letters', { params }),
  createLetter:   (data: any)                 => api.post('/api/v1/liaison/letters', data),
  dashboard:      (params?: any)              => api.get('/api/v1/liaison/dashboard', { params }),
}
TYPESCRIPT

# HR, Tasks, EPC, Accounting API stubs
for module in hr tasks epc accounting; do
  cat > "$FRONTEND/src/api/${module}.api.ts" << TYPESCRIPT_STUB
import api from './client'

// ${module} API — endpoints added as modules are built
export const ${module}Api = {
  dashboard: (params?: any) => api.get('/api/v1/${module}/dashboard', { params }),
}
TYPESCRIPT_STUB
done

ok "API layer written"

# ── Create all page placeholders ──────────────────────────────────
mkdir -p \
  "$FRONTEND/src/pages/auth" \
  "$FRONTEND/src/pages/dashboard" \
  "$FRONTEND/src/pages/liaison" \
  "$FRONTEND/src/pages/hr" \
  "$FRONTEND/src/pages/tasks" \
  "$FRONTEND/src/pages/epc" \
  "$FRONTEND/src/pages/accounting" \
  "$FRONTEND/src/pages/public" \
  "$FRONTEND/src/layouts" \
  "$FRONTEND/src/components/ui"

# Login page
cat > "$FRONTEND/src/pages/auth/LoginPage.tsx" << 'TYPESCRIPT'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import { authApi } from '@/api'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const { data } = await authApi.login(email, password)
      setAuth(data.user, data.access_token, data.refresh_token)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center"
         style={{ background: 'var(--color-bg-page)' }}>
      <div className="card p-8 w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-2xl font-semibold mb-1"
               style={{ color: 'var(--color-text-base)' }}>
            KIPL ProjectOS
          </div>
          <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Sign in to your account
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5"
                   style={{ color: 'var(--color-text-muted)' }}>Email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@kipl.in" required
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{
                background: 'var(--color-bg-subtle)',
                border: '1px solid var(--color-border-dim)',
                color: 'var(--color-text-base)',
                outline: 'none',
              }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5"
                   style={{ color: 'var(--color-text-muted)' }}>Password</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" required
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{
                background: 'var(--color-bg-subtle)',
                border: '1px solid var(--color-border-dim)',
                color: 'var(--color-text-base)',
                outline: 'none',
              }}
            />
          </div>
          {error && (
            <div className="text-sm px-3 py-2 rounded-lg"
                 style={{ background: 'var(--color-red-bg)', color: 'var(--color-red)' }}>
              {error}
            </div>
          )}
          <button
            type="submit" disabled={loading}
            className="w-full py-2.5 rounded-lg text-sm font-medium text-white transition-opacity"
            style={{ background: 'var(--color-accent)', opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
TYPESCRIPT

# Dashboard layout
cat > "$FRONTEND/src/layouts/DashboardLayout.tsx" << 'TYPESCRIPT'
import { Outlet } from 'react-router-dom'
import Sidebar from '@/components/ui/Sidebar'

export default function DashboardLayout() {
  return (
    <div className="flex min-h-screen" style={{ background: 'var(--color-bg-page)' }}>
      <Sidebar />
      <main className="flex-1 ml-56 overflow-auto">
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
TYPESCRIPT

# Sidebar
cat > "$FRONTEND/src/components/ui/Sidebar.tsx" << 'TYPESCRIPT'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  SquaresFour, FileText, Envelope, Users, MapPin,
  ChartBar, Package, Receipt, GitBranch, Kanban,
  Buildings, SignOut,
} from '@phosphor-icons/react'
import { useAuthStore, can } from '@/store/auth.store'

const NAV = [
  { section: 'Overview',    label: 'Dashboard',    path: '/dashboard',            icon: SquaresFour },
  { section: 'Liaison',     label: 'Files',        path: '/liaison',              icon: FileText    },
  {                          label: 'Letters',      path: '/liaison/letters',      icon: Envelope    },
  { section: 'Planning',    label: 'WBS / Gantt',  path: '/tasks',                icon: GitBranch   },
  {                          label: 'Task Board',   path: '/tasks/kanban',         icon: Kanban      },
  { section: 'EPC',         label: 'BOQ & Costs',  path: '/epc',                  icon: Package     },
  { section: 'HR',          label: 'Attendance',   path: '/hr/attendance',        icon: MapPin      },
  {                          label: 'Employees',    path: '/hr/employees',         icon: Users       },
  {                          label: 'Salary',       path: '/hr/salary',            icon: Receipt     },
  { section: 'Accounting',  label: 'Transactions', path: '/accounting',           icon: ChartBar    },
  {                          label: 'Invoices',     path: '/accounting/invoices',  icon: Receipt     },
]

export default function Sidebar() {
  const { user, logout, activeProjectId } = useAuthStore()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const initials = user?.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2) ?? 'U'

  return (
    <aside className="fixed top-0 left-0 h-full w-56 flex flex-col z-50"
           style={{ background: 'var(--color-bg-card)', borderRight: '1px solid var(--color-border-dim)' }}>

      {/* Logo */}
      <div className="px-4 py-4" style={{ borderBottom: '1px solid var(--color-border-dim)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
               style={{ background: 'var(--color-accent)' }}>
            <Buildings size={16} weight="bold" color="white" />
          </div>
          <div>
            <div className="text-sm font-semibold" style={{ color: 'var(--color-text-base)' }}>
              ProjectOS
            </div>
            <div className="text-[10px]" style={{ color: 'var(--color-text-faint)' }}>KIPL</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {NAV.map((item, i) => (
          <div key={i}>
            {item.section && (
              <div className="px-2 pt-4 pb-1 text-[10px] font-semibold tracking-widest uppercase"
                   style={{ color: 'var(--color-text-faint)' }}>
                {item.section}
              </div>
            )}
            <NavLink
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-2 py-1.5 rounded-md text-[13px] transition-all ${
                  isActive ? 'font-medium' : ''
                }`
              }
              style={({ isActive }) => ({
                color: isActive ? 'var(--color-accent)' : 'var(--color-text-muted)',
                background: isActive ? 'var(--color-accent-bg)' : 'transparent',
              })}
            >
              <item.icon size={15} weight="regular" />
              <span>{item.label}</span>
            </NavLink>
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="px-3 py-3" style={{ borderTop: '1px solid var(--color-border-dim)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
               style={{ background: 'var(--color-accent-bg)', color: 'var(--color-accent)' }}>
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium truncate" style={{ color: 'var(--color-text-base)' }}>
              {user?.name}
            </div>
            <div className="text-[10px] capitalize" style={{ color: 'var(--color-text-faint)' }}>
              {user?.role?.replace('_', ' ')}
            </div>
          </div>
          <button onClick={handleLogout} title="Sign out"
                  style={{ color: 'var(--color-text-faint)' }}>
            <SignOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  )
}
TYPESCRIPT

# Page stubs for all routes
PAGES=(
  "dashboard/DashboardPage"
  "liaison/LiaisonPage"
  "liaison/LettersPage"
  "hr/AttendancePage"
  "hr/EmployeesPage"
  "hr/SalaryPage"
  "tasks/TasksPage"
  "tasks/KanbanPage"
  "epc/EpcPage"
  "accounting/AccountingPage"
  "accounting/InvoicesPage"
  "public/PublicProjectPage"
)

for page in "${PAGES[@]}"; do
  dir=$(dirname "$page")
  name=$(basename "$page")
  mkdir -p "$FRONTEND/src/pages/$dir"
  cat > "$FRONTEND/src/pages/${page}.tsx" << STUB_TSX
// ${name} — to be built
export default function ${name}() {
  return (
    <div style={{ color: 'var(--color-text-base)' }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>${name}</h1>
      <p style={{ color: 'var(--color-text-muted)' }}>This module will be built next.</p>
    </div>
  )
}
STUB_TSX
done

ok "All page stubs created"

# ── Final package.json check ──────────────────────────────────────
info "Verifying build..."
npm run build 2>&1 | tail -5 || warn "Build warnings present — check above"

ok "Phase 4 complete — React + Vite frontend scaffolded"
echo ""
echo -e "  Start frontend: ${Y}cd frontend && npm run dev${NC}"
echo -e "  Runs on:        http://localhost:5173"
echo ""
