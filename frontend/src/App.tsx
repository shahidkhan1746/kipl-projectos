import React, { Suspense, useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import { authApi } from '@/api/auth.api'
import { ALL_LINKS } from '@/components/layout/Sidebar'
import AppLayout from '@/layouts/AppLayout'
import ErrorBoundary from '@/components/ErrorBoundary'

const SettingsLayout = React.lazy(() => import('@/layouts/SettingsLayout'))

// Lazy loaded pages
const FleetPage = React.lazy(() => import('@/pages/fleet/FleetPage'))
const CompliancePage = React.lazy(() => import('@/pages/compliance/CompliancePage'))
const JHAPage = React.lazy(() => import('@/pages/jha/JHAPage'))
const LoginPage = React.lazy(() => import('@/pages/auth/LoginPage'))
const ResetPasswordPage = React.lazy(() => import('@/pages/auth/ResetPasswordPage'))
const PrivacyPage = React.lazy(() => import('@/pages/public/PrivacyPage'))
const DashboardPage = React.lazy(() => import('@/pages/dashboard/DashboardPage'))
const LiaisonPage = React.lazy(() => import('@/pages/liaison/LiaisonPage'))
const LettersPage = React.lazy(() => import('@/pages/liaison/LettersPage'))
const AttendancePage = React.lazy(() => import('@/pages/hr/AttendancePage'))
const EmployeesPage = React.lazy(() => import('@/pages/hr/EmployeesPage'))
const EmployeeDetailPage = React.lazy(() => import('@/pages/hr/EmployeeDetailPage'))
const TimesheetPage = React.lazy(() => import('@/pages/hr/TimesheetPage'))
const LeavePage = React.lazy(() => import('@/pages/hr/LeavePage'))
const SalaryPage = React.lazy(() => import('@/pages/hr/SalaryPage'))
const TasksPage = React.lazy(() => import('@/pages/tasks/TasksPage'))
const EpcPage = React.lazy(() => import('@/pages/epc/EpcPage'))
const ReportsPage = React.lazy(() => import('@/pages/reports/ReportsPage'))
const UserDetailPage = React.lazy(() => import('@/pages/settings/UserDetailPage'))
const SystemSettingsPage = React.lazy(() => import('@/pages/settings/SystemSettingsPage'))
const AiSettingsPage = React.lazy(() => import('@/pages/settings/AiSettingsPage'))
const EmailSettingsPage = React.lazy(() => import('@/pages/settings/EmailSettingsPage'))
const StorageSettingsPage = React.lazy(() => import('@/pages/settings/StorageSettingsPage'))
const UpdatesAdminPage = React.lazy(() => import('@/pages/updates/UpdatesAdminPage'))
const WbsPage = React.lazy(() => import('@/pages/wbs/WbsPage'))
const MeetingsPage = React.lazy(() => import('@/pages/meetings/MeetingsPage'))
const DiaryPage = React.lazy(() => import('@/pages/diary/DiaryPage'))
const OmPage = React.lazy(() => import('@/pages/om/OmPage'))
const MaterialRegisterPage = React.lazy(() => import('@/pages/registers/MaterialRegisterPage'))
const SiteOrderPage = React.lazy(() => import('@/pages/registers/SiteOrderPage'))
const QaPage = React.lazy(() => import('@/pages/qa/QaPage'))
const AccountingPage = React.lazy(() => import('@/pages/accounting/AccountingPage'))
const InvoicesPage = React.lazy(() => import('@/pages/accounting/InvoicesPage'))
const PublicPage = React.lazy(() => import('@/pages/public/PublicProjectPage'))
const PublicSitePage = React.lazy(() => import('@/pages/public/PublicSitePage'))
const TimelinePage = React.lazy(() => import('@/pages/public/TimelinePage'))
const TechnologyPage = React.lazy(() => import('@/pages/public/TechnologyPage'))
const TeamPage = React.lazy(() => import('@/pages/public/TeamPage'))
const GalleryPage = React.lazy(() => import('@/pages/public/GalleryPage'))
const AiChatPage = React.lazy(() => import('@/pages/ai/AiChatPage'))
const MyProfilePage = React.lazy(() => import('@/pages/profile/MyProfilePage'))

const PageLoader = () => {
  const [slowNotice, setSlowNotice] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setSlowNotice(true), 2500)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
      {slowNotice && (
        <p className="text-xs text-slate-500 animate-pulse">Connecting to project server...</p>
      )}
    </div>
  )
}

function rolesFor(path: string): string[] | undefined {
  const matches = ALL_LINKS.filter(l => path === l.path || path.startsWith(l.path + '/'))
  matches.sort((a, b) => b.path.length - a.path.length)
  return matches[0]?.roles
}

function Guard({ children }: { children: React.ReactNode }) {
  const user = useAuthStore(s => s.user)
  return user ? <>{children}</> : <Navigate to='/login' replace />
}

function RoleGuard({ path, children }: { path: string; children: React.ReactNode }) {
  const role = useAuthStore(s => s.user?.role)
  if (!role) return <Navigate to='/login' replace />
  const roles = rolesFor(path)
  if (!roles || roles.length === 0) return <>{children}</>
  if (role === 'super_admin' || role === 'admin') return <>{children}</>
  if (roles.includes(role)) return <>{children}</>
  return <Navigate to='/dashboard' replace />
}

function SessionHydrator({ children }: { children: React.ReactNode }) {
  const accessToken = useAuthStore(s => s.accessToken)
  const user = useAuthStore(s => s.user)
  const hydrateUser = useAuthStore(s => s.hydrateUser)
  const setAuth = useAuthStore(s => s.setAuth)
  const logout = useAuthStore(s => s.logout)
  const refreshToken = useAuthStore(s => s.refreshToken)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    const boot = async () => {
      // If there is no authenticated user stored, unblock immediately (Guard will redirect)
      if (!user) {
        if (!cancelled) setReady(true)
        return
      }

      // If we already have the in-memory access token, unblock immediately
      if (accessToken) {
        if (!cancelled) setReady(true)
        return
      }

      try {
        const refreshed = await authApi.refresh(refreshToken ?? undefined)
        if (refreshed.data?.access_token) {
          setAuth(refreshed.data.user ?? user, refreshed.data.access_token, refreshed.data.refresh_token)
          if (!cancelled && refreshed.data.user) hydrateUser(refreshed.data.user)
        } else {
          if (!cancelled) logout()
        }
      } catch {
        if (!cancelled) logout()
      } finally {
        if (!cancelled) setReady(true)
      }
    }
    boot()
    return () => { cancelled = true }
  }, [user, accessToken])

  if (!ready) return <PageLoader />
  return <>{children}</>
}

// AI features are restricted to Super Admin and Project Managers.
function AiGuard({ children }: { children: React.ReactNode }) {
  const role = useAuthStore(s => s.user?.role)
  if (!role) return <Navigate to='/login' replace />
  if (role !== 'super_admin' && role !== 'project_manager') return <Navigate to='/dashboard' replace />
  return <>{children}</>
}

// AI Settings / Key management is restricted to Super Admin.
function SuperAdminGuard({ children }: { children: React.ReactNode }) {
  const role = useAuthStore(s => s.user?.role)
  return role === 'super_admin' ? <>{children}</> : <Navigate to='/dashboard' replace />
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public marketing site — no auth. Root lands here immediately without cold-start delay. */}
            <Route path="/" element={<PublicSitePage />} />
            <Route path="/site" element={<PublicSitePage />} />
            <Route path="/site/technology" element={<TechnologyPage />} />
            <Route path="/site/timeline" element={<TimelinePage />} />
            <Route path="/site/team" element={<TeamPage />} />
            <Route path="/site/gallery" element={<GalleryPage />} />
            <Route path='/login' element={<LoginPage />} />
            <Route path='/reset-password' element={<ResetPasswordPage />} />
            <Route path='/privacy' element={<PrivacyPage />} />
            <Route path='/p/:code' element={<PublicPage />} />
            <Route element={<SessionHydrator><Guard><AppLayout /></Guard></SessionHydrator>}>
              <Route path='dashboard'           element={<RoleGuard path="/dashboard"><DashboardPage /></RoleGuard>} />
              <Route path='liaison'             element={<RoleGuard path="/liaison"><LiaisonPage /></RoleGuard>} />
              <Route path='liaison/letters'     element={<RoleGuard path="/liaison/letters"><LettersPage /></RoleGuard>} />
              <Route path='hr/attendance'       element={<RoleGuard path="/hr/attendance"><AttendancePage /></RoleGuard>} />
              <Route path='hr/employees'        element={<RoleGuard path="/hr/employees"><EmployeesPage /></RoleGuard>} />
              <Route path='hr/employees/:id'    element={<RoleGuard path="/hr/employees"><EmployeeDetailPage /></RoleGuard>} />
              <Route path='hr/timesheets'       element={<RoleGuard path="/hr/timesheets"><TimesheetPage /></RoleGuard>} />
              <Route path='hr/leave'            element={<RoleGuard path="/hr/leave"><LeavePage /></RoleGuard>} />
              <Route path='hr/salary'           element={<RoleGuard path="/hr/salary"><SalaryPage /></RoleGuard>} />
              <Route path='tasks'               element={<RoleGuard path="/tasks"><TasksPage /></RoleGuard>} />
              <Route path='epc'                 element={<RoleGuard path="/epc"><EpcPage /></RoleGuard>} />
              <Route path='wbs'                 element={<RoleGuard path="/wbs"><WbsPage /></RoleGuard>} />
              <Route path='meetings'            element={<RoleGuard path="/meetings"><MeetingsPage /></RoleGuard>} />
              <Route path='diary'               element={<RoleGuard path="/diary"><DiaryPage /></RoleGuard>} />
              <Route path='om'                  element={<RoleGuard path="/om"><OmPage /></RoleGuard>} />
              <Route path='material-register'   element={<RoleGuard path="/material-register"><MaterialRegisterPage /></RoleGuard>} />
              <Route path='site-orders'         element={<RoleGuard path="/site-orders"><SiteOrderPage /></RoleGuard>} />
              <Route path='qa'                  element={<RoleGuard path="/qa"><QaPage /></RoleGuard>} />
              <Route path='jha'                 element={<RoleGuard path="/jha"><JHAPage /></RoleGuard>} />
              <Route path='fleet'                element={<RoleGuard path="/fleet"><FleetPage /></RoleGuard>} />
              <Route path='compliance'          element={<RoleGuard path="/compliance"><CompliancePage /></RoleGuard>} />
              <Route path='accounting'          element={<RoleGuard path="/accounting"><AccountingPage /></RoleGuard>} />
              <Route path='reports'             element={<RoleGuard path="/reports"><ReportsPage /></RoleGuard>} />
              <Route path='ai' element={<AiGuard><AiChatPage /></AiGuard>} />
              <Route path='profile' element={<MyProfilePage />} />
              <Route path='settings/users/:id'  element={<UserDetailPage />} />
              <Route path='settings' element={<RoleGuard path="/settings"><SettingsLayout /></RoleGuard>}>
                <Route path='system' element={<SystemSettingsPage />} />
                <Route path='ai' element={<SuperAdminGuard><AiSettingsPage /></SuperAdminGuard>} />
                <Route path='email' element={<EmailSettingsPage />} />
                <Route path='storage' element={<StorageSettingsPage />} />
                <Route index element={<Navigate to="system" replace />} />
              </Route>
              <Route path='updates' element={<RoleGuard path="/updates"><UpdatesAdminPage /></RoleGuard>} />
              <Route path='accounting/invoices' element={<RoleGuard path="/accounting/invoices"><InvoicesPage /></RoleGuard>} />
              <Route path='*' element={<Navigate to='/dashboard' replace />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  )
}