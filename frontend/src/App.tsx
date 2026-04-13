import FleetPage from '@/pages/fleet/FleetPage'
import CompliancePage from '@/pages/compliance/CompliancePage'
import JHAPage from '@/pages/jha/JHAPage'
import { DataCompletenessModal } from '@/components/ui/DataCompletenessModal'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import LoginPage           from '@/pages/auth/LoginPage'
import AppLayout           from '@/layouts/AppLayout'
import DashboardPage       from '@/pages/dashboard/DashboardPage'
import LiaisonPage         from '@/pages/liaison/LiaisonPage'
import LettersPage         from '@/pages/liaison/LettersPage'
import AttendancePage      from '@/pages/hr/AttendancePage'
import EmployeesPage       from '@/pages/hr/EmployeesPage'
import EmployeeDetailPage  from '@/pages/hr/EmployeeDetailPage'
import TimesheetPage       from '@/pages/hr/TimesheetPage'
import SalaryPage          from '@/pages/hr/SalaryPage'
import TasksPage           from '@/pages/tasks/TasksPage'
import EpcPage             from '@/pages/epc/EpcPage'
import ReportsPage from '@/pages/reports/ReportsPage'
import UserDetailPage      from '@/pages/settings/UserDetailPage'
import SystemSettingsPage from '@/pages/settings/SystemSettingsPage'
import EmailSettingsPage from '@/pages/settings/EmailSettingsPage'
import WbsPage             from '@/pages/wbs/WbsPage'
import MeetingsPage        from '@/pages/meetings/MeetingsPage'
import DiaryPage           from '@/pages/diary/DiaryPage'
import QaPage              from '@/pages/qa/QaPage'
import AccountingPage      from '@/pages/accounting/AccountingPage'
import InvoicesPage        from '@/pages/accounting/InvoicesPage'
import PublicPage          from '@/pages/public/PublicProjectPage'

function Guard({ children }: { children: React.ReactNode }) {
  const user = useAuthStore(s => s.user)
  return user ? <>{children}</> : <Navigate to='/login' replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <DataCompletenessModal />
      <Routes>
        <Route path='/login' element={<LoginPage />} />
        <Route path='/p/:code' element={<PublicPage />} />
        <Route element={<Guard><AppLayout /></Guard>}>
          <Route index element={<Navigate to='/dashboard' replace />} />
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
          <Route path='qa'                  element={<QaPage />} />
          <Route path='jha'                 element={<JHAPage />} />
          <Route path='fleet'                element={<FleetPage />} />
          <Route path='compliance'          element={<CompliancePage />} />
          <Route path='accounting'          element={<AccountingPage />} />
          <Route path='reports' element={<ReportsPage />} />
          <Route path='settings/users/:id'  element={<UserDetailPage />} />
          <Route path='settings/system' element={<SystemSettingsPage />} />
          <Route path='settings/email' element={<EmailSettingsPage />} />
          <Route path='accounting/invoices' element={<InvoicesPage />} />
          <Route path='*' element={<Navigate to='/dashboard' replace />} />
        </Route>
        </Routes>
    </BrowserRouter>
  )
}