import { Outlet, NavLink } from 'react-router-dom'
import { Gear, Sparkle, Envelope, HardDrives } from '@phosphor-icons/react'

export default function SettingsLayout() {
  const TABS = [
    { to: '/settings/system', label: 'System', icon: Gear },
    { to: '/settings/ai', label: 'AI Integrations', icon: Sparkle },
    { to: '/settings/email', label: 'Email', icon: Envelope },
    { to: '/settings/storage', label: 'Storage', icon: HardDrives },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header Tabs */}
      <div style={{ borderBottom: '1px solid #e2e8f0', display: 'flex', gap: 32, paddingBottom: 0 }}>
        {TABS.map(t => (
          <NavLink
            key={t.to}
            to={t.to}
            className={({ isActive }) => 
              `settings-tab ${isActive ? 'active' : ''}`
            }
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 8, padding: '12px 0',
              borderBottom: isActive ? '2px solid #2563eb' : '2px solid transparent',
              color: isActive ? '#2563eb' : '#64748b',
              fontWeight: isActive ? 600 : 500,
              fontSize: 14, textDecoration: 'none', transition: 'all 0.2s', marginBottom: -1
            })}
          >
            <t.icon size={18} weight={location.pathname.startsWith(t.to) ? 'fill' : 'regular'} />
            {t.label}
          </NavLink>
        ))}
      </div>

      {/* Page Content */}
      <div>
        <Outlet />
      </div>
    </div>
  )
}
