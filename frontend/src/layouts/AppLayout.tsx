import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import AppHeader from '@/components/layout/AppHeader'
import Sidebar from '@/components/layout/Sidebar'
import { DataCompletenessModal } from '@/components/ui/DataCompletenessModal'
import { Notifier } from '@/lib/notify'

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  // Automatically close mobile sidebar on route change
  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  return (
    <div className="app-shell">
      {/* Internal-app only — never mounts on the public site */}
      <DataCompletenessModal />
      <Notifier />

      {/* Sidebar: permanent on desktop (>=1024px), sliding drawer on mobile (<1024px) */}
      <Sidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="app-shell-column" style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
        <AppHeader onToggleSidebar={() => setSidebarOpen(s => !s)} />
        <main className="app-main-scroll" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', background: '#f0f2f5', WebkitOverflowScrolling: 'touch' }}>
          <div className="app-content-container" style={{ maxWidth: 1440, margin: '0 auto' }}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

