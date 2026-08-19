import React, { Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import AppLayout from '@/layouts/AppLayout'
import ErrorBoundary from '@/components/ErrorBoundary'

// Lazy loaded pages
const FleetPage = React.lazy(() => import('@/pages/fleet/FleetPage'))
const CompliancePage = React.lazy(() => import('@/pages/compliance/CompliancePage'))
const JHAPage = React.lazy(() => import('@/pages/jha/JHAPage'))
const LoginPage = React.lazy(() => import('@/pages/auth/LoginPage'))
const DashboardPage = React.lazy(() => import('@/pages/dashboard/DashboardPage'))
const LiaisonPage = React.lazy(() => import('@/pages/liaison/LiaisonPage'))
const LettersPage = React.lazy(() => import('@/pages/liaison/LettersPage'))
const AttendancePage = React.lazy(() => import('@/pages/hr/AttendancePage'))
const EmployeesPage = React.lazy(() => import('@/pages/hr/EmployeesPage'))
const EmployeeDetailPage = React.lazy(() => import('@/pages/hr/EmployeeDetailPage'))
const TimesheetPage = React.lazy(() => import('@/pages/hr/TimesheetPage'))
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

const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
  </div>
)

function Guard({ children }: { children: React.ReactNode }) {
  const user = useAuthStore(s => s.user)
  return user ? <>{children}</> : <Navigate to='/login' replace />
}

// AI features are limited to Super Admin and Project Manager.
function AiGuard({ children }: { children: React.ReactNode }) {
  const role = useAuthStore(s => s.user?.role)
  return role === 'super_admin' || role === 'project_manager'
    ? <>{children}</>
    : <Navigate to='/dashboard' replace />
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public marketing site — no auth. Root lands here. */}
            <Route path="/" element={<PublicSitePage />} />
            <Route path="/site" element={<PublicSitePage />} />
            <Route path="/site/technology" element={<TechnologyPage />} />
            <Route path="/site/timeline" element={<TimelinePage />} />
            <Route path="/site/team" element={<TeamPage />} />
            <Route path="/site/gallery" element={<GalleryPage />} />
            <Route path='/login' element={<LoginPage />} />
            <Route path='/p/:code' element={<PublicPage />} />
            <Route element={<Guard><AppLayout /></Guard>}>
              <Route path='dashboard'           element={<DashboardPage />} />
              <Route path='liaison'             element={<LiaisonPage />} />
              <Route path='liaison/letters'     element={<LettersPage />} />
              <Route path='hr/attendance'       element={<AttendancePage />} />
              <Route path='hr/employees'        element={<EmployeesPage />} />
              <Route path='hr/employees/:id'    element={<EmployeeDetailPage />} />
              <Route path='hr/timesheets'       element={<TimesheetPage />} />
              <Route path='hr/salary'           element={<SalaryPage />} />
              <Route path='tasks'               element={<TasksPage />} />
              <Route path='epc'                 element={<EpcPage />} />
              <Route path='wbs'                 element={<WbsPage />} />
              <Route path='meetings'            element={<MeetingsPage />} />
              <Route path='diary'               element={<DiaryPage />} />
              <Route path='om'                  element={<OmPage />} />
              <Route path='material-register'   element={<MaterialRegisterPage />} />
              <Route path='site-orders'         element={<SiteOrderPage />} />
              <Route path='qa'                  element={<QaPage />} />
              <Route path='jha'                 element={<JHAPage />} />
              <Route path='fleet'                element={<FleetPage />} />
              <Route path='compliance'          element={<CompliancePage />} />
              <Route path='accounting'          element={<AccountingPage />} />
              <Route path='reports' element={<ReportsPage />} />
              <Route path='ai' element={<AiGuard><AiChatPage /></AiGuard>} />
              <Route path='settings/users/:id'  element={<UserDetailPage />} />
              <Route path='settings/system' element={<SystemSettingsPage />} />
              <Route path='settings/ai' element={<AiGuard><AiSettingsPage /></AiGuard>} />
              <Route path='settings/email' element={<EmailSettingsPage />} />
              <Route path='settings/storage' element={<StorageSettingsPage />} />
              <Route path='updates' element={<UpdatesAdminPage />} />
              <Route path='accounting/invoices' element={<InvoicesPage />} />
              <Route path='*' element={<Navigate to='/dashboard' replace />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  )
}