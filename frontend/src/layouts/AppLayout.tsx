import AppHeader from '@/components/layout/AppHeader'
import { Outlet } from 'react-router-dom'
import Sidebar from '@/components/layout/Sidebar'
import { DataCompletenessModal } from '@/components/ui/DataCompletenessModal'
import { Notifier } from '@/lib/notify'
export default function AppLayout() {
  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden' }}>
      {/* Internal-app only — never mounts on the public site */}
      <DataCompletenessModal />
      <Notifier />
      <Sidebar />
      <div style={{ display:"flex", flexDirection:"column", flex:1, overflow:"hidden" }}>
        <AppHeader />
        <main style={{ flex:1, overflowY:'auto', background:'#f0f2f5' }}>
        <div style={{ maxWidth:1440, margin:'0 auto', padding:'32px 36px' }}>
          <Outlet />
        </div>
      </main>
      </div>
    </div>
  )
}
