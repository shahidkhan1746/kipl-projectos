import { ShieldCheck, Trophy, ImagesSquare, HardDrives, X } from '@phosphor-icons/react'
import { useQuery } from '@tanstack/react-query'
import { NavLink, useNavigate } from 'react-router-dom'
import { settingsApi } from '@/api/settings.api'
import {
  SquaresFour, FileText, Envelope, Users, MapPin, Truck,
  Buildings, SignOut, CheckSquare, BookOpen,
  GitBranch, Kanban, Package, CurrencyInr,
  ClipboardText, UserCircle, ChartBar, FilePdf, Gear, Drop, Sparkle,
} from '@phosphor-icons/react'
import { useAuthStore } from '@/store/auth.store'
import { authApi } from '@/api/auth.api'

export const ALL_LINKS = [
  { section:'OVERVIEW',  label:'Dashboard',    path:'/dashboard',          icon:SquaresFour,  roles:['super_admin','admin','project_manager','liaison_officer','hr_officer','engineer','accounts','accountant','qa_engineer','supervisor','field_staff','viewer'] },
  { section:'OVERVIEW',  label:'AI Chatbot',   path:'/ai',                 icon:Sparkle,      roles:['super_admin','project_manager'] },
  { section:'LIAISON',   label:'Files',         path:'/liaison',            icon:FileText,     roles:['super_admin','admin','project_manager','liaison_officer'] },
  { section:'LIAISON',   label:'Letters',       path:'/liaison/letters',    icon:Envelope,     roles:['super_admin','admin','project_manager','liaison_officer'] },
  { section:'PLANNING',  label:'WBS & Gantt',   path:'/wbs',                icon:GitBranch,    roles:['super_admin','admin','project_manager','liaison_officer','engineer'] },
  { section:'PLANNING',  label:'Task Board',    path:'/tasks',              icon:Kanban,       roles:['super_admin','admin','project_manager','liaison_officer','hr_officer','engineer','accounts','accountant','qa_engineer','supervisor'] },
  { section:'PLANNING',  label:'Meetings',      path:'/meetings',           icon:Users,        roles:['super_admin','admin','project_manager','liaison_officer','engineer'] },
  { section:'SITE',      label:'Site Diary',    path:'/diary',              icon:BookOpen,     roles:['super_admin','admin','project_manager','engineer','supervisor','liaison_officer'] },
  { section:'SITE',      label:'Quality (QA)',  path:'/qa',                 icon:CheckSquare,  roles:['super_admin','admin','project_manager','engineer','qa_engineer'] },
  { section:'SITE',      label:'JHA Compliance', path:'/jha',               icon:Trophy,       roles:['super_admin','admin','project_manager','engineer','qa_engineer'] },
  { section:'SITE',      label:'Fleet & Plant Log', path:'/fleet', icon:Truck, roles:['super_admin','admin','project_manager','engineer','supervisor'] },
  { section:'SITE',      label:'O&M (STP)',         path:'/om',    icon:Drop,  roles:['super_admin','admin','project_manager','engineer','qa_engineer'] },
  { section:'SITE',      label:'Cement & Steel',    path:'/material-register', icon:Package, roles:['super_admin','admin','project_manager','engineer','supervisor'] },
  { section:'SITE',      label:'Site Order Book',   path:'/site-orders',       icon:ClipboardText, roles:['super_admin','admin','project_manager','liaison_officer','engineer'] },
  { section:'SITE',      label:'Contract Compliance', path:'/compliance',     icon:ShieldCheck,  roles:['super_admin','admin','project_manager','liaison_officer'] },
  { section:'EPC',       label:'BOQ & Costs',   path:'/epc',                icon:Package,      roles:['super_admin','admin','project_manager','liaison_officer','engineer'] },
  { section:'HR',        label:'Timesheets',    path:'/hr/timesheets',      icon:ClipboardText,roles:['super_admin','admin','project_manager','hr_officer','engineer','supervisor','liaison_officer','qa_engineer','accounts','accountant'] },
  { section:'HR',        label:'Leave',         path:'/hr/leave',           icon:ClipboardText,roles:['super_admin','admin','project_manager','hr_officer','engineer','supervisor','liaison_officer','qa_engineer','accounts','accountant','field_staff'] },
  { section:'HR',        label:'Attendance',    path:'/hr/attendance',      icon:MapPin,       roles:['super_admin','admin','project_manager','hr_officer','supervisor'] },
  { section:'HR',        label:'Employees',     path:'/hr/employees',       icon:Users,        roles:['super_admin','admin','project_manager','hr_officer'] },
  { section:'HR',        label:'Salary',        path:'/hr/salary',          icon:CurrencyInr,  roles:['super_admin','admin','project_manager','hr_officer','accountant'] },
  { section:'FINANCE',   label:'Accounting',    path:'/accounting',         icon:ChartBar,     roles:['super_admin','admin','project_manager','accounts','accountant'] },
  { section:'FINANCE',   label:'Invoices',      path:'/accounting/invoices', icon:CurrencyInr,  roles:['super_admin','admin','project_manager','accounts','accountant'] },
  { section:'REPORTS',   label:'PDF Reports',   path:'/reports',            icon:FilePdf,      roles:['super_admin','admin','project_manager','hr_officer','liaison_officer','accounts','accountant'] },
  { section:'PUBLIC SITE', label:'Project Updates', path:'/updates',         icon:ImagesSquare, roles:['super_admin','admin','project_manager','engineer','liaison_officer','supervisor','qa_engineer'] },
  { section:'SETTINGS', label:'Integrations & Settings', path:'/settings', icon:Gear, roles:['super_admin','admin'] },
]

const ROLE_LABELS: Record<string,string> = {
  super_admin:     'Super Admin',
  admin:           'Admin',
  project_manager: 'Project Manager',
  liaison_officer: 'Liaison Officer',
  hr_officer:      'HR Officer',
  engineer:        'Site Engineer',
  accounts:        'Accounts',
  qa_engineer:     'QA Engineer',
  supervisor:      'Site Supervisor',
  accountant:      'Accountant',
  field_staff:     'Field Staff',
  viewer:          'Viewer',
}

const ROLE_COLORS: Record<string,string> = {
  super_admin:     '#f59e0b',
  admin:           '#f59e0b',
  project_manager: '#f59e0b',
  liaison_officer: '#3b82f6',
  hr_officer:      '#8b5cf6',
  engineer:        '#10b981',
  accounts:        '#f97316',
  qa_engineer:     '#ec4899',
  supervisor:      '#06b6d4',
  accountant:      '#f97316',
  field_staff:     '#64748b',
  viewer:          '#94a3b8',
}

interface SidebarProps {
  mobileOpen?: boolean
  onClose?: () => void
}

export default function Sidebar({ mobileOpen = false, onClose }: SidebarProps) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const role = user?.role ?? 'engineer'
  // Company logo lives in the settings DB so it shows on every machine
  const { data: logo } = useQuery({
    queryKey: ['company-logo'],
    queryFn: () => settingsApi.get('company_logo').then(r => r.data?.value ?? null),
  })

  const visibleLinks = ALL_LINKS.filter(l => l.roles.includes(role))
  const sections: Record<string, typeof ALL_LINKS> = {}
  visibleLinks.forEach(l => {
    if (!sections[l.section]) sections[l.section] = []
    sections[l.section].push(l)
  })

  async function handleLogout() {
    onClose?.()
    const rt = useAuthStore.getState().refreshToken
    try { if (rt) await authApi.logout(rt) } catch { /* still sign out locally */ }
    logout()
    navigate('/login')
  }

  function handleLinkClick() {
    onClose?.()
  }

  return (
    <>
      <style>{`
        .sidebar-container {
          width: 260px;
          max-width: 86vw;
          flex-shrink: 0;
          background: #1a2540;
          display: flex;
          flex-direction: column;
          height: 100vh;
          overflow: hidden;
          z-index: 1000;
          transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @supports (height: 100dvh) {
          .sidebar-container { height: 100dvh; }
        }
        @media (max-width: 1023px) {
          .sidebar-container {
            position: fixed;
            top: 0;
            left: 0;
            bottom: 0;
            box-shadow: 0 0 40px rgba(0,0,0,0.5);
            transform: translateX(${mobileOpen ? '0%' : '-100%'});
          }
          .sidebar-backdrop {
            position: fixed;
            inset: 0;
            background: rgba(15, 23, 42, 0.6);
            -webkit-backdrop-filter: blur(4px);
            backdrop-filter: blur(4px);
            z-index: 999;
            opacity: ${mobileOpen ? 1 : 0};
            pointer-events: ${mobileOpen ? 'auto' : 'none'};
            transition: opacity 0.25s ease;
          }
        }
        @media (min-width: 1024px) {
          .sidebar-container {
            position: relative;
            transform: none !important;
          }
          .sidebar-backdrop {
            display: none !important;
          }
        }
      `}</style>

      {/* Backdrop for mobile drawer */}
      <div className="sidebar-backdrop" onClick={onClose} aria-hidden="true" />

      {/* Sidebar Panel */}
      <aside className="sidebar-container" aria-label="Main Navigation">
        {/* Logo & Header */}
        <div style={{ padding:'18px 18px 16px', borderBottom:'1px solid rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:'#2563eb', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', flexShrink:0 }}>
              {logo
                ? <img src={logo} alt="logo" style={{ width:'100%', height:'100%', objectFit:'contain', borderRadius:8 }} />
                : <Buildings size={20} color="#fff" weight="bold" />}
            </div>
            <div>
              <p style={{ fontSize:14, fontWeight:800, color:'#fff', margin:0, letterSpacing:'-0.02em' }}>ProjectOS</p>
              <p style={{ fontSize:10, color:'rgba(255,255,255,0.35)', margin:0 }}>Khilari Infrastructure</p>
            </div>
          </div>

          {/* Close button on mobile */}
          <button
            onClick={onClose}
            className="mobile-only"
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: 'none',
              borderRadius: 8,
              padding: 6,
              color: '#94a3b8',
              cursor: 'pointer',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav links */}
        <div style={{ flex:1, overflowY:'auto', padding:'12px 10px', WebkitOverflowScrolling:'touch' }}>
          {Object.entries(sections).map(([section, links]) => (
            <div key={section} style={{ marginBottom:16 }}>
              <p style={{ fontSize:9, fontWeight:700, color:'rgba(255,255,255,0.25)', textTransform:'uppercase', letterSpacing:'0.1em', margin:'0 0 6px 10px' }}>{section}</p>
              {links.map(link => (
                <NavLink key={link.path} to={link.path}
                  onClick={handleLinkClick}
                  end={link.path !== '/liaison' && !link.path.includes('letters')}
                  style={({ isActive }) => ({
                    display:'flex', alignItems:'center', gap:10,
                    padding:'9px 12px', borderRadius:8, marginBottom:2,
                    textDecoration:'none', fontSize:13, fontWeight:500,
                    background: isActive ? 'rgba(37,99,235,0.25)' : 'transparent',
                    color: isActive ? '#93c5fd' : 'rgba(255,255,255,0.55)',
                    borderLeft: isActive ? '3px solid #3b82f6' : '3px solid transparent',
                    transition:'all 0.15s',
                  })}>
                  {({ isActive }) => (
                    <>
                      <link.icon size={16} weight={isActive ? 'fill' : 'regular'} />
                      <span>{link.label}</span>
                      {isActive && <div style={{ width:6, height:6, borderRadius:'50%', background:'#3b82f6', marginLeft:'auto' }} />}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </div>

        {/* User profile */}
        <div style={{ padding:'12px 14px', borderTop:'1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:34, height:34, borderRadius:'50%', background:(ROLE_COLORS[role]??'#3b82f6')+'33', border:'2px solid '+((ROLE_COLORS[role]??'#3b82f6')+'66'), display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <span style={{ fontSize:13, fontWeight:700, color:ROLE_COLORS[role]??'#3b82f6' }}>{user?.name?.charAt(0) ?? 'U'}</span>
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <p style={{ fontSize:12, fontWeight:700, color:'#fff', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.name ?? 'User'}</p>
              <p style={{ fontSize:10, color:ROLE_COLORS[role]??'#3b82f6', margin:0, fontWeight:600 }}>{ROLE_LABELS[role] ?? role}</p>
            </div>
            <button onClick={handleLogout} title="Logout"
              style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.3)', padding:4, borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}>
              <SignOut size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}

