// Run from project root: node scripts/modules/dashboard/build.js
const fs   = require('fs')
const path = require('path')

const SRC   = path.join('backend', 'src')
const FSRC  = path.join('frontend', 'src')

const G = '\x1b[32m', NC = '\x1b[0m'
const ok = s => console.log(G + '  ✓' + NC + ' ' + s)

console.log('\n\x1b[1mBuilding PM Dashboard + Super Admin + Company Settings\x1b[0m\n')

fs.mkdirSync(path.join(SRC, 'settings'), { recursive: true })
fs.mkdirSync(path.join(FSRC, 'pages', 'settings'), { recursive: true })
fs.mkdirSync(path.join(FSRC, 'pages', 'dashboard'), { recursive: true })
fs.mkdirSync(path.join(FSRC, 'components', 'layout'), { recursive: true })

// ── 1. Backend: Settings Entity ───────────────────────────────
fs.writeFileSync(path.join(SRC, 'settings', 'setting.entity.ts'), `import { Entity, Column } from 'typeorm'
import { BaseEntity } from '../shared/entities/base.entity'

@Entity('system_settings')
export class Setting extends BaseEntity {
  @Column({ unique: true }) key: string
  @Column({ type: 'text', nullable: true }) value: string
  @Column({ nullable: true }) label: string
  @Column({ nullable: true }) category: string
}
`)
ok('setting.entity.ts')

fs.writeFileSync(path.join(SRC, 'settings', 'settings.service.ts'), `import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Setting } from './setting.entity'

@Injectable()
export class SettingsService {
  constructor(@InjectRepository(Setting) private repo: Repository<Setting>) {}

  async get(key: string): Promise<string | null> {
    const s = await this.repo.findOne({ where: { key } })
    return s?.value ?? null
  }

  async set(key: string, value: string, label?: string, category?: string): Promise<Setting> {
    const existing = await this.repo.findOne({ where: { key } })
    if (existing) {
      await this.repo.update(existing.id, { value, label, category })
      return this.repo.findOne({ where: { key } }) as Promise<Setting>
    }
    return this.repo.save(this.repo.create({ key, value, label: label ?? key, category: category ?? 'general' }))
  }

  async getAll(category?: string): Promise<Setting[]> {
    if (category) return this.repo.find({ where: { category } })
    return this.repo.find()
  }

  async setBulk(settings: Array<{ key: string; value: string; label?: string; category?: string }>): Promise<void> {
    for (const s of settings) await this.set(s.key, s.value, s.label, s.category)
  }
}
`)
ok('settings.service.ts')

fs.writeFileSync(path.join(SRC, 'settings', 'settings.controller.ts'), `import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common'
import { SettingsService } from './settings.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private readonly svc: SettingsService) {}

  @Get()
  getAll(@Query('category') category?: string) { return this.svc.getAll(category) }

  @Get('key')
  get(@Query('key') key: string) { return this.svc.get(key).then(v => ({ key, value: v })) }

  @Post()
  set(@Body() body: { key: string; value: string; label?: string; category?: string }) {
    return this.svc.set(body.key, body.value, body.label, body.category)
  }

  @Post('bulk')
  setBulk(@Body() body: Array<{ key: string; value: string; label?: string; category?: string }>) {
    return this.svc.setBulk(body)
  }
}
`)
ok('settings.controller.ts')

fs.writeFileSync(path.join(SRC, 'settings', 'settings.module.ts'), `import { Module, Global } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Setting } from './setting.entity'
import { SettingsService } from './settings.service'
import { SettingsController } from './settings.controller'

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Setting])],
  providers: [SettingsService],
  controllers: [SettingsController],
  exports: [SettingsService],
})
export class SettingsModule {}
`)
ok('settings.module.ts')

// Register in app.module.ts
const appPath = path.join(SRC, 'app.module.ts')
let app = fs.readFileSync(appPath, 'utf8')
if (!app.includes("from './settings/settings.module'")) {
  app = app.replace(
    "import { PdfModule }",
    "import { SettingsModule } from './settings/settings.module'\nimport { PdfModule }"
  )
  app = app.replace('PdfModule,', 'PdfModule,\n    SettingsModule,')
  fs.writeFileSync(appPath, app)
  ok('SettingsModule registered in app.module.ts')
}

// ── 2. Add project_manager role ───────────────────────────────
const userEntityPath = path.join(SRC, 'users', 'user.entity.ts')
let userEntity = fs.readFileSync(userEntityPath, 'utf8')
if (!userEntity.includes('PROJECT_MANAGER')) {
  userEntity = userEntity.replace(
    "SUPER_ADMIN    = 'super_admin'",
    "SUPER_ADMIN      = 'super_admin',\n  PROJECT_MANAGER  = 'project_manager'"
  )
  fs.writeFileSync(userEntityPath, userEntity)
  ok('user.entity.ts — project_manager role added')
}

// Add to roles guard
const rolesGuardPath = path.join(SRC, 'auth', 'guards', 'roles.guard.ts')
let guard = fs.readFileSync(rolesGuardPath, 'utf8')
if (!guard.includes('PROJECT_MANAGER')) {
  guard = guard.replace(
    '[UserRole.SUPER_ADMIN]:     100,',
    '[UserRole.SUPER_ADMIN]:     100,\n  [UserRole.PROJECT_MANAGER]:  80,'
  )
  fs.writeFileSync(rolesGuardPath, guard)
  ok('roles.guard.ts — PROJECT_MANAGER level 80 added')
}

// ── 3. Frontend API ───────────────────────────────────────────
fs.writeFileSync(path.join(FSRC, 'api', 'settings.api.ts'), `import api from './client'

export const settingsApi = {
  getAll:    (category?: string) => api.get('/api/v1/settings', { params: { category } }),
  get:       (key: string) => api.get('/api/v1/settings/key', { params: { key } }),
  set:       (key: string, value: string, label?: string, category?: string) =>
    api.post('/api/v1/settings', { key, value, label, category }),
  setBulk:   (settings: any[]) => api.post('/api/v1/settings/bulk', settings),
  weather:   (city: string, apiKey: string) =>
    fetch('https://api.openweathermap.org/data/2.5/weather?q=' + city + '&appid=' + apiKey + '&units=metric')
      .then(r => r.json()),
}
`)
ok('settings.api.ts')

// ── 4. AppHeader component ────────────────────────────────────
fs.writeFileSync(path.join(FSRC, 'components', 'layout', 'AppHeader.tsx'), `import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, User, Gear, SignOut, CaretDown, Camera } from '@phosphor-icons/react'
import { useAuthStore } from '@/store/auth.store'
import { useQuery } from '@tanstack/react-query'
import { tasksApi } from '@/api/tasks.api'
import { meetingsApi } from '@/api/meetings.api'

const C = {
  navy:'#1a2540', blue:'#2563eb', border:'#e2e8f0',
  text1:'#0f172a', text2:'#475569', text3:'#94a3b8',
}

const ROLE_LABELS: Record<string,string> = {
  super_admin:     'Super Admin',
  project_manager: 'Project Manager',
  liaison_officer: 'Liaison Officer',
  hr_officer:      'HR Officer',
  engineer:        'Site Engineer',
  accounts:        'Accounts Officer',
  qa_engineer:     'QA Engineer',
  supervisor:      'Site Supervisor',
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function AppHeader() {
  const { user, logout } = useAuthStore()
  const nav = useNavigate()
  const [showProfile, setShowProfile] = useState(false)
  const [showNotifs,  setShowNotifs]  = useState(false)
  const [avatar, setAvatar] = useState<string | null>(
    () => localStorage.getItem('avatar_' + (user?.id ?? ''))
  )
  const profileRef = useRef<HTMLDivElement>(null)
  const notifRef   = useRef<HTMLDivElement>(null)
  const fileRef    = useRef<HTMLInputElement>(null)

  const { data: tasks } = useQuery({
    queryKey: ['notif-tasks'],
    queryFn:  () => tasksApi.list({ assignedTo: user?.id }).then(r => r.data),
    enabled:  !!user?.id,
    refetchInterval: 60000,
  })

  const { data: meetings } = useQuery({
    queryKey: ['notif-meetings'],
    queryFn:  () => meetingsApi.dashboard(user?.id ?? '').then(r => r.data),
    enabled:  !!user?.id,
    refetchInterval: 60000,
  })

  const today = new Date().toISOString().split('T')[0]
  const overdueTasks = (tasks ?? []).filter((t: any) =>
    t.dueDate && t.dueDate < today && t.status !== 'done'
  )
  const overdueActions = meetings?.overdueActions ?? 0
  const totalNotifs = overdueTasks.length + overdueActions

  // Close dropdowns on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfile(false)
      if (notifRef.current   && !notifRef.current.contains(e.target as Node))   setShowNotifs(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const b64 = ev.target?.result as string
      localStorage.setItem('avatar_' + (user?.id ?? ''), b64)
      setAvatar(b64)
    }
    reader.readAsDataURL(file)
  }

  const firstName = user?.name?.split(' ')[0] ?? 'User'
  const initials  = user?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) ?? 'U'

  return (
    <div style={{ height:64, background:'#fff', borderBottom:'1.5px solid '+C.border, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 28px', flexShrink:0, zIndex:100 }}>

      {/* Left: Greeting */}
      <div>
        <p style={{ fontSize:18, fontWeight:800, color:C.text1, margin:0, letterSpacing:'-0.02em' }}>
          {getGreeting()}, {firstName} 👋
        </p>
        <p style={{ fontSize:12, color:C.text3, margin:0 }}>
          {new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
          {' · '}{ROLE_LABELS[user?.role ?? ''] ?? user?.role}
        </p>
      </div>

      {/* Right: Notifications + Profile */}
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>

        {/* Notification bell */}
        <div ref={notifRef} style={{ position:'relative' }}>
          <button onClick={() => setShowNotifs(s => !s)}
            style={{ width:40, height:40, borderRadius:10, background:'#f8f9fc', border:'1.5px solid '+C.border, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', position:'relative' }}>
            <Bell size={18} color={totalNotifs > 0 ? '#dc2626' : C.text2} weight={totalNotifs > 0 ? 'fill' : 'regular'} />
            {totalNotifs > 0 && (
              <div style={{ position:'absolute', top:-4, right:-4, width:18, height:18, borderRadius:'50%', background:'#dc2626', color:'#fff', fontSize:10, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center' }}>
                {totalNotifs > 9 ? '9+' : totalNotifs}
              </div>
            )}
          </button>

          {showNotifs && (
            <div style={{ position:'absolute', top:48, right:0, width:320, background:'#fff', borderRadius:14, border:'1.5px solid '+C.border, boxShadow:'0 8px 32px rgba(0,0,0,0.12)', zIndex:200, overflow:'hidden' }}>
              <div style={{ padding:'14px 16px', borderBottom:'1.5px solid '+C.border, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:14, fontWeight:700, color:C.text1 }}>Notifications</span>
                {totalNotifs > 0 && <span style={{ fontSize:11, padding:'2px 8px', background:'#fef2f2', color:'#dc2626', borderRadius:999, fontWeight:700 }}>{totalNotifs} unread</span>}
              </div>
              <div style={{ maxHeight:300, overflowY:'auto' }}>
                {overdueTasks.length === 0 && overdueActions === 0 ? (
                  <div style={{ padding:'32px 16px', textAlign:'center' }}>
                    <p style={{ fontSize:13, color:C.text3, margin:0 }}>✓ All caught up!</p>
                  </div>
                ) : (
                  <>
                    {overdueTasks.slice(0, 5).map((t: any) => (
                      <div key={t.id} onClick={() => { nav('/tasks'); setShowNotifs(false) }}
                        style={{ padding:'12px 16px', borderBottom:'1px solid #f1f5f9', cursor:'pointer', display:'flex', gap:10, alignItems:'flex-start' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#f8faff')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <div style={{ width:8, height:8, borderRadius:'50%', background:'#dc2626', flexShrink:0, marginTop:4 }} />
                        <div>
                          <p style={{ fontSize:13, fontWeight:600, color:C.text1, margin:0 }}>Overdue Task</p>
                          <p style={{ fontSize:12, color:C.text2, margin:'2px 0 0' }}>{t.title}</p>
                          <p style={{ fontSize:11, color:'#dc2626', margin:'2px 0 0' }}>Due: {t.dueDate}</p>
                        </div>
                      </div>
                    ))}
                    {overdueActions > 0 && (
                      <div onClick={() => { nav('/meetings'); setShowNotifs(false) }}
                        style={{ padding:'12px 16px', cursor:'pointer', display:'flex', gap:10, alignItems:'flex-start' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#f8faff')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <div style={{ width:8, height:8, borderRadius:'50%', background:'#d97706', flexShrink:0, marginTop:4 }} />
                        <div>
                          <p style={{ fontSize:13, fontWeight:600, color:C.text1, margin:0 }}>Meeting Actions Overdue</p>
                          <p style={{ fontSize:12, color:C.text2, margin:'2px 0 0' }}>{overdueActions} action items past due date</p>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile dropdown */}
        <div ref={profileRef} style={{ position:'relative' }}>
          <button onClick={() => setShowProfile(s => !s)}
            style={{ display:'flex', alignItems:'center', gap:10, padding:'6px 12px 6px 6px', background:'#f8f9fc', border:'1.5px solid '+C.border, borderRadius:999, cursor:'pointer' }}>
            {/* Avatar */}
            <div style={{ width:32, height:32, borderRadius:'50%', overflow:'hidden', background:'#2563eb', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              {avatar
                ? <img src={avatar} alt="avatar" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                : <span style={{ fontSize:13, fontWeight:700, color:'#fff' }}>{initials}</span>}
            </div>
            <div style={{ textAlign:'left' }}>
              <p style={{ fontSize:12, fontWeight:700, color:C.text1, margin:0, lineHeight:1.2 }}>{user?.name}</p>
              <p style={{ fontSize:10, color:C.text3, margin:0 }}>{ROLE_LABELS[user?.role ?? ''] ?? user?.role}</p>
            </div>
            <CaretDown size={12} color={C.text3} style={{ marginLeft:2 }} />
          </button>

          {showProfile && (
            <div style={{ position:'absolute', top:52, right:0, width:240, background:'#fff', borderRadius:14, border:'1.5px solid '+C.border, boxShadow:'0 8px 32px rgba(0,0,0,0.12)', zIndex:200, overflow:'hidden' }}>
              {/* User info */}
              <div style={{ padding:'16px', borderBottom:'1.5px solid '+C.border, display:'flex', gap:12, alignItems:'center' }}>
                <div style={{ position:'relative' }}>
                  <div style={{ width:44, height:44, borderRadius:'50%', overflow:'hidden', background:'#2563eb', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}
                    onClick={() => fileRef.current?.click()}>
                    {avatar
                      ? <img src={avatar} alt="avatar" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                      : <span style={{ fontSize:16, fontWeight:700, color:'#fff' }}>{initials}</span>}
                  </div>
                  <div onClick={() => fileRef.current?.click()}
                    style={{ position:'absolute', bottom:0, right:0, width:16, height:16, borderRadius:'50%', background:'#2563eb', border:'2px solid #fff', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
                    <Camera size={8} color="#fff" weight="fill" />
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleAvatarUpload} />
                </div>
                <div>
                  <p style={{ fontSize:13, fontWeight:700, color:C.text1, margin:0 }}>{user?.name}</p>
                  <p style={{ fontSize:11, color:C.text3, margin:'2px 0 0' }}>{user?.email}</p>
                  <p style={{ fontSize:10, color:'#2563eb', margin:'2px 0 0', fontWeight:600 }}>{ROLE_LABELS[user?.role ?? '']}</p>
                </div>
              </div>

              {/* Menu items */}
              {[
                { icon:'👤', label:'My Profile',    action: () => {} },
                { icon:'🔒', label:'Change Password', action: () => {} },
                ...(user?.role === 'super_admin' ? [
                  { icon:'⚙️', label:'System Settings', action: () => nav('/settings/system') },
                  { icon:'📧', label:'Email Setup',      action: () => nav('/settings/email') },
                ] : []),
              ].map(item => (
                <button key={item.label} onClick={() => { item.action(); setShowProfile(false) }}
                  style={{ width:'100%', padding:'11px 16px', background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:10, fontSize:13, color:C.text1, textAlign:'left' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f8faff')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                  <span>{item.icon}</span>{item.label}
                </button>
              ))}

              <div style={{ borderTop:'1.5px solid '+C.border }}>
                <button onClick={() => { logout(); nav('/login') }}
                  style={{ width:'100%', padding:'11px 16px', background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:10, fontSize:13, color:'#dc2626', textAlign:'left' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#fef2f2')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                  <SignOut size={14} color="#dc2626" /> Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
`)
ok('AppHeader.tsx — greeting, notifications, profile photo upload, dropdown')

// ── 5. Update AppLayout to include header ─────────────────────
const appLayoutPath = path.join(FSRC, 'layouts', 'AppLayout.tsx')
if (fs.existsSync(appLayoutPath)) {
  let layout = fs.readFileSync(appLayoutPath, 'utf8')
  if (!layout.includes('AppHeader')) {
    layout = "import AppHeader from '@/components/layout/AppHeader'\n" + layout
    // Add header inside main content area
    layout = layout.replace(
      '<main ',
      '<div style={{ display:"flex", flexDirection:"column", flex:1, overflow:"hidden" }}>\n        <AppHeader />\n        <main '
    )
    layout = layout.replace(
      '</main>',
      '</main>\n      </div>'
    )
    fs.writeFileSync(appLayoutPath, layout)
    ok('AppLayout.tsx — AppHeader added')
  } else {
    ok('AppHeader already in AppLayout')
  }
}

// ── 6. PM Dashboard ───────────────────────────────────────────
fs.writeFileSync(path.join(FSRC, 'pages', 'dashboard', 'PmDashboard.tsx'), `import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import { tasksApi } from '@/api/tasks.api'
import { diaryApi } from '@/api/diary.api'
import { qaApi } from '@/api/qa.api'
import { wbsApi } from '@/api/wbs.api'
import { hrApi } from '@/api/hr.api'
import { accountingApi } from '@/api/accounting.api'
import { meetingsApi } from '@/api/meetings.api'
import { settingsApi } from '@/api/settings.api'
import { useState, useEffect } from 'react'

const C = {
  card:'#fff', border:'#e2e8f0', text1:'#0f172a', text2:'#475569', text3:'#94a3b8',
  blue:'#2563eb', green:'#059669', amber:'#d97706', red:'#dc2626', navy:'#1a2540',
}

function KpiCard({ label, value, sub, color, onClick }: any) {
  return (
    <div onClick={onClick} style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:12, padding:'16px 18px', boxShadow:'0 1px 4px rgba(0,0,0,0.05)', cursor:onClick?'pointer':'default', transition:'all 0.15s' }}
      onMouseEnter={e => onClick && (e.currentTarget.style.borderColor = color ?? C.blue)}
      onMouseLeave={e => onClick && (e.currentTarget.style.borderColor = C.border)}>
      <div style={{ fontSize:10, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:6 }}>{label}</div>
      <div style={{ fontSize:22, fontWeight:800, color:color ?? C.text1, fontVariantNumeric:'tabular-nums' }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:C.text3, marginTop:4 }}>{sub}</div>}
    </div>
  )
}

function WeatherWidget({ apiKey, city }: { apiKey: string; city: string }) {
  const [weather, setWeather] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!apiKey) { setLoading(false); return }
    fetch('https://api.openweathermap.org/data/2.5/weather?q=' + city + '&appid=' + apiKey + '&units=metric')
      .then(r => r.json())
      .then(d => { setWeather(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [apiKey, city])

  const icons: Record<string,string> = {
    Clear:'☀️', Clouds:'⛅', Rain:'🌧️', Drizzle:'🌦️',
    Thunderstorm:'⛈️', Snow:'❄️', Fog:'🌫️', Mist:'🌫️', Haze:'🌫️',
  }

  if (!apiKey) return (
    <div style={{ background:'linear-gradient(135deg, #1a2540, #2563eb)', borderRadius:16, padding:'20px 24px', color:'#fff' }}>
      <p style={{ fontSize:12, color:'rgba(255,255,255,0.5)', margin:'0 0 4px' }}>SITE WEATHER — NISHAT, SRINAGAR</p>
      <p style={{ fontSize:13, color:'rgba(255,255,255,0.7)', margin:0 }}>⚙️ Add OpenWeatherMap API key in Super Admin → System Settings</p>
    </div>
  )

  if (loading) return (
    <div style={{ background:'linear-gradient(135deg, #1a2540, #2563eb)', borderRadius:16, padding:'20px 24px', color:'#fff' }}>
      <p style={{ fontSize:13, color:'rgba(255,255,255,0.7)', margin:0 }}>Loading weather...</p>
    </div>
  )

  if (!weather || weather.cod !== 200) return (
    <div style={{ background:'linear-gradient(135deg, #1a2540, #2563eb)', borderRadius:16, padding:'20px 24px', color:'#fff' }}>
      <p style={{ fontSize:12, color:'rgba(255,255,255,0.5)', margin:'0 0 4px' }}>SITE WEATHER — NISHAT, SRINAGAR</p>
      <p style={{ fontSize:13, color:'rgba(255,255,255,0.7)', margin:0 }}>Unable to fetch weather. Check API key.</p>
    </div>
  )

  const icon = icons[weather.weather?.[0]?.main] ?? '🌤️'
  const desc = weather.weather?.[0]?.description ?? ''
  const temp = Math.round(weather.main?.temp)
  const feels = Math.round(weather.main?.feels_like)
  const humidity = weather.main?.humidity
  const wind = Math.round(weather.wind?.speed * 3.6)

  return (
    <div style={{ background:'linear-gradient(135deg, #1a2540, #2563eb)', borderRadius:16, padding:'20px 24px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
      <div>
        <p style={{ fontSize:10, color:'rgba(255,255,255,0.4)', margin:'0 0 4px', textTransform:'uppercase', letterSpacing:'0.1em' }}>Site Weather — Nishat, Srinagar</p>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ fontSize:40 }}>{icon}</span>
          <div>
            <p style={{ fontSize:36, fontWeight:900, color:'#fff', margin:0, lineHeight:1 }}>{temp}°C</p>
            <p style={{ fontSize:13, color:'rgba(255,255,255,0.65)', margin:'4px 0 0', textTransform:'capitalize' }}>{desc}</p>
          </div>
        </div>
      </div>
      <div style={{ display:'flex', gap:20 }}>
        {[
          ['Feels like', feels + '°C'],
          ['Humidity', humidity + '%'],
          ['Wind', wind + ' km/h'],
        ].map(([l, v]) => (
          <div key={l} style={{ textAlign:'center' }}>
            <p style={{ fontSize:10, color:'rgba(255,255,255,0.4)', margin:'0 0 4px', textTransform:'uppercase', letterSpacing:'0.06em' }}>{l}</p>
            <p style={{ fontSize:16, fontWeight:700, color:'#fff', margin:0 }}>{v}</p>
          </div>
        ))}
      </div>
      <p style={{ fontSize:10, color:'rgba(255,255,255,0.3)', margin:0, alignSelf:'flex-end' }}>
        {new Date().toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })}
      </p>
    </div>
  )
}

export default function PmDashboard() {
  const { activeProjectId } = useAuthStore()
  const nav = useNavigate()
  const today = new Date().toISOString().split('T')[0]

  const { data: weatherKey } = useQuery({
    queryKey: ['setting-weather'],
    queryFn:  () => settingsApi.get('weather_api_key').then(r => r.data?.value ?? ''),
  })

  const { data: taskDash } = useQuery({
    queryKey: ['task-dash', activeProjectId],
    queryFn:  () => tasksApi.dashboard(activeProjectId!).then(r => r.data),
    enabled: !!activeProjectId,
  })

  const { data: diaryDash } = useQuery({
    queryKey: ['diary-dash', activeProjectId],
    queryFn:  () => diaryApi.dashboard(activeProjectId!).then(r => r.data),
    enabled: !!activeProjectId,
  })

  const { data: qaDash } = useQuery({
    queryKey: ['qa-dash', activeProjectId],
    queryFn:  () => qaApi.dashboard(activeProjectId!).then(r => r.data),
    enabled: !!activeProjectId,
  })

  const { data: wbsDash } = useQuery({
    queryKey: ['wbs-dash', activeProjectId],
    queryFn:  () => wbsApi.dashboard(activeProjectId!).then(r => r.data),
    enabled: !!activeProjectId,
  })

  const { data: hrDash } = useQuery({
    queryKey: ['hr-dash', activeProjectId],
    queryFn:  () => hrApi.dashboard(activeProjectId ?? undefined).then(r => r.data),
  })

  const { data: accDash } = useQuery({
    queryKey: ['acc-dash', activeProjectId],
    queryFn:  () => accountingApi.dashboard(activeProjectId!).then(r => r.data),
    enabled: !!activeProjectId,
  })

  const { data: meetDash } = useQuery({
    queryKey: ['meet-dash', activeProjectId],
    queryFn:  () => meetingsApi.dashboard(activeProjectId!).then(r => r.data),
    enabled: !!activeProjectId,
  })

  const fmtL = (n: number) => n ? '₹' + (n/100000).toFixed(1) + 'L' : '₹0'
  const fmtCr = (n: number) => n ? '₹' + (n/10000000).toFixed(2) + ' Cr' : '₹0'

  return (
    <div className="fade-in" style={{ display:'flex', flexDirection:'column', gap:20 }}>

      {/* Weather */}
      <WeatherWidget apiKey={weatherKey ?? ''} city="Nishat,Srinagar,IN" />

      {/* Contract progress */}
      {wbsDash && (
        <div style={{ background:C.navy, borderRadius:16, padding:'18px 24px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
            <div>
              <p style={{ fontSize:10, color:'rgba(255,255,255,0.35)', margin:'0 0 2px', textTransform:'uppercase', letterSpacing:'0.1em' }}>Dal Lake EPC — Contract Progress</p>
              <p style={{ fontSize:12, color:'rgba(255,255,255,0.55)', margin:0 }}>Allotment: CE/UEED/PS/01 OF 2025-26 · 07 Nov 2025 → 06 Nov 2027</p>
            </div>
            <div style={{ textAlign:'right' }}>
              <p style={{ fontSize:28, fontWeight:900, color:'#93c5fd', margin:0 }}>{wbsDash.contractPct}%</p>
              <p style={{ fontSize:11, color:'rgba(255,255,255,0.35)', margin:0 }}>time elapsed · {wbsDash.daysRemaining}d remaining</p>
            </div>
          </div>
          <div style={{ height:6, background:'rgba(255,255,255,0.1)', borderRadius:999 }}>
            <div style={{ height:'100%', width:wbsDash.contractPct+'%', background:'linear-gradient(90deg,#3b82f6,#06b6d4)', borderRadius:999 }} />
          </div>
        </div>
      )}

      {/* Site Activity Today */}
      <div>
        <h2 style={{ fontSize:12, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.08em', margin:'0 0 10px' }}>📍 Site Activity — Today</h2>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
          <KpiCard label="Labour on Site" value={diaryDash?.avgLabourThisMonth ?? 0} sub="Avg this month" color={C.blue} onClick={() => nav('/diary')} />
          <KpiCard label="Diary Entries" value={diaryDash?.thisMonthEntries ?? 0} sub="This month" color={C.navy} onClick={() => nav('/diary')} />
          <KpiCard label="EOT Claim Days" value={diaryDash?.eotClaimDays ?? 0} sub="Weather delays" color={(diaryDash?.eotClaimDays ?? 0) > 0 ? C.red : C.green} onClick={() => nav('/diary')} />
          <KpiCard label="Hours Lost" value={diaryDash?.hoursLostWeather ?? 0} sub="To weather" color={(diaryDash?.hoursLostWeather ?? 0) > 0 ? C.amber : C.green} onClick={() => nav('/diary')} />
        </div>
      </div>

      {/* Schedule */}
      <div>
        <h2 style={{ fontSize:12, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.08em', margin:'0 0 10px' }}>📅 Schedule</h2>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
          <KpiCard label="Overall Progress" value={(wbsDash?.overallProgress ?? 0)+'%'} color={C.blue} onClick={() => nav('/wbs')} />
          <KpiCard label="Completed Tasks" value={(wbsDash?.completed ?? 0)+'/'+(wbsDash?.totalTasks ?? 0)} color={C.green} onClick={() => nav('/wbs')} />
          <KpiCard label="Delayed Tasks" value={wbsDash?.delayed ?? 0} color={(wbsDash?.delayed ?? 0) > 0 ? C.red : C.green} onClick={() => nav('/wbs')} />
          <KpiCard label="Milestones Hit" value={(wbsDash?.milestonesHit ?? 0)+'/'+(wbsDash?.milestones ?? 0)} color={C.amber} onClick={() => nav('/wbs')} />
        </div>
      </div>

      {/* Quality */}
      <div>
        <h2 style={{ fontSize:12, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.08em', margin:'0 0 10px' }}>✅ Quality & Compliance</h2>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
          <KpiCard label="QA Pass Rate" value={(qaDash?.passRate ?? '0')+'%'} color={C.green} onClick={() => nav('/qa')} />
          <KpiCard label="Inspections" value={qaDash?.totalInspections ?? 0} color={C.blue} onClick={() => nav('/qa')} />
          <KpiCard label="Open NCRs" value={qaDash?.openNcrs ?? 0} color={(qaDash?.openNcrs ?? 0) > 0 ? C.red : C.green} onClick={() => nav('/qa')} />
          <KpiCard label="Overdue Actions" value={meetDash?.overdueActions ?? 0} color={(meetDash?.overdueActions ?? 0) > 0 ? C.red : C.green} onClick={() => nav('/meetings')} />
        </div>
      </div>

      {/* HR */}
      <div>
        <h2 style={{ fontSize:12, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.08em', margin:'0 0 10px' }}>👷 Human Resources</h2>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
          <KpiCard label="Total Employees" value={hrDash?.totalEmployees ?? 0} color={C.blue} onClick={() => nav('/hr/employees')} />
          <KpiCard label="Present Today" value={hrDash?.presentToday ?? 0} color={C.green} onClick={() => nav('/hr/attendance')} />
          <KpiCard label="Absent Today" value={hrDash?.absentToday ?? 0} color={(hrDash?.absentToday ?? 0) > 0 ? C.amber : C.green} onClick={() => nav('/hr/attendance')} />
          <KpiCard label="Pending Salary" value={hrDash?.pendingSalary ?? 0} color={(hrDash?.pendingSalary ?? 0) > 0 ? C.amber : C.green} onClick={() => nav('/hr/salary')} />
        </div>
      </div>

      {/* Financial */}
      <div>
        <h2 style={{ fontSize:12, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.08em', margin:'0 0 10px' }}>💰 Financial</h2>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
          <KpiCard label="Total Expenses" value={fmtL(accDash?.totalExpenses ?? 0)} color={C.text1} onClick={() => nav('/accounting')} />
          <KpiCard label="Pending Payment" value={fmtL(accDash?.totalPending ?? 0)} color={(accDash?.totalPending ?? 0) > 0 ? C.amber : C.green} onClick={() => nav('/accounting')} />
          <KpiCard label="TDS Liability" value={fmtL(accDash?.tdsLiability ?? 0)} color={(accDash?.tdsLiability ?? 0) > 0 ? C.red : C.green} onClick={() => nav('/accounting')} />
          <KpiCard label="Open Tasks" value={taskDash?.inProgress ?? 0} sub="In progress" color={C.blue} onClick={() => nav('/tasks')} />
        </div>
      </div>

      {/* Tasks overdue */}
      {(taskDash?.overdue ?? 0) > 0 && (
        <div style={{ background:'#fef2f2', border:'1.5px solid #fecaca', borderRadius:14, padding:'16px 20px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <p style={{ fontSize:14, fontWeight:700, color:'#b91c1c', margin:'0 0 2px' }}>⚠ {taskDash?.overdue} Overdue Tasks</p>
            <p style={{ fontSize:12, color:'#dc2626', margin:0 }}>Tasks past due date — requires immediate attention</p>
          </div>
          <button onClick={() => nav('/tasks')}
            style={{ padding:'8px 16px', background:'#dc2626', color:'#fff', border:'none', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer' }}>
            View Tasks →
          </button>
        </div>
      )}
    </div>
  )
}
`)
ok('PmDashboard.tsx — full operational command center')

// ── 7. Super Admin Dashboard ──────────────────────────────────
fs.writeFileSync(path.join(FSRC, 'pages', 'settings', 'SystemSettingsPage.tsx'), `import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { settingsApi } from '@/api/settings.api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

const C = {
  card:'#fff', border:'#e2e8f0', text1:'#0f172a', text2:'#475569', text3:'#94a3b8',
  blue:'#2563eb', green:'#059669', amber:'#d97706', red:'#dc2626', navy:'#1a2540',
}

export default function SystemSettingsPage() {
  const qc = useQueryClient()
  const [logo, setLogo] = useState<string | null>(() => localStorage.getItem('company_logo'))
  const [saved, setSaved] = useState<Record<string,boolean>>({})

  const [form, setForm] = useState({
    weather_api_key:  '',
    company_name:     'Khilari Infrastructure Pvt. Ltd.',
    company_tagline:  'Infrastructure · Excellence · Integrity',
    project_name:     'Dal Lake Sewerage Scheme',
    client_name:      'J&K UEED',
    contract_value:   '27999',
    allotment_no:     'CE/UEED/PS/01 OF 2025-26',
  })

  const { data: settings } = useQuery({
    queryKey: ['all-settings'],
    queryFn:  () => settingsApi.getAll().then(r => r.data),
  })

  useEffect(() => {
    if (settings) {
      const map: Record<string,string> = {}
      settings.forEach((s: any) => { map[s.key] = s.value })
      setForm(f => ({
        weather_api_key: map.weather_api_key ?? f.weather_api_key,
        company_name:    map.company_name    ?? f.company_name,
        company_tagline: map.company_tagline ?? f.company_tagline,
        project_name:    map.project_name    ?? f.project_name,
        client_name:     map.client_name     ?? f.client_name,
        contract_value:  map.contract_value  ?? f.contract_value,
        allotment_no:    map.allotment_no    ?? f.allotment_no,
      }))
    }
  }, [settings])

  const saveM = useMutation({
    mutationFn: (key: string) => settingsApi.set(key, (form as any)[key], key, 'system'),
    onSuccess: (_, key) => { setSaved(s => ({ ...s, [key]: true })); setTimeout(() => setSaved(s => ({ ...s, [key]: false })), 2000); qc.invalidateQueries({ queryKey: ['all-settings'] }) },
  })

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const b64 = ev.target?.result as string
      localStorage.setItem('company_logo', b64)
      setLogo(b64)
      window.dispatchEvent(new Event('logo-updated'))
    }
    reader.readAsDataURL(file)
  }

  const SETTINGS_GROUPS = [
    {
      title: '🌤️ Weather Widget',
      desc: 'Get a free API key from openweathermap.org → Sign up → API Keys',
      fields: [{ key:'weather_api_key', label:'OpenWeatherMap API Key', placeholder:'Paste your free API key here...' }],
    },
    {
      title: '🏢 Company Identity',
      desc: 'Shown in sidebar, PDF headers, and reports',
      fields: [
        { key:'company_name',    label:'Company Name',    placeholder:'Khilari Infrastructure Pvt. Ltd.' },
        { key:'company_tagline', label:'Company Tagline', placeholder:'Infrastructure · Excellence · Integrity' },
      ],
    },
    {
      title: '📋 Project Details',
      desc: 'Shown across all modules and PDFs',
      fields: [
        { key:'project_name',   label:'Project Name',    placeholder:'Dal Lake Sewerage Scheme' },
        { key:'client_name',    label:'Client',          placeholder:'J&K UEED' },
        { key:'allotment_no',   label:'Allotment No.',   placeholder:'CE/UEED/PS/01 OF 2025-26' },
        { key:'contract_value', label:'Contract Value (₹ Lakhs)', placeholder:'27999' },
      ],
    },
  ]

  return (
    <div className="fade-in" style={{ display:'flex', flexDirection:'column', gap:24, maxWidth:760 }}>
      <div>
        <h1 style={{ fontSize:24, fontWeight:800, color:C.text1, margin:0, letterSpacing:'-0.02em' }}>System Settings</h1>
        <p style={{ fontSize:14, color:C.text3, marginTop:4 }}>Super Admin only — configure system-wide settings</p>
      </div>

      {/* Company Logo */}
      <div style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:16, padding:'24px', boxShadow:'0 1px 6px rgba(0,0,0,0.05)' }}>
        <h3 style={{ fontSize:15, fontWeight:700, color:C.text1, margin:'0 0 6px' }}>🖼️ Company Logo</h3>
        <p style={{ fontSize:13, color:C.text3, margin:'0 0 16px' }}>Shown in sidebar top-left and PDF document headers</p>
        <div style={{ display:'flex', alignItems:'center', gap:20 }}>
          <div style={{ width:80, height:80, borderRadius:12, border:'2px dashed '+C.border, display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', background:'#f8f9fc' }}>
            {logo
              ? <img src={logo} alt="logo" style={{ width:'100%', height:'100%', objectFit:'contain' }} />
              : <span style={{ fontSize:28 }}>🏢</span>}
          </div>
          <div>
            <label style={{ display:'inline-block', padding:'9px 18px', background:C.blue, color:'#fff', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer' }}>
              Upload Logo
              <input type="file" accept="image/*" style={{ display:'none' }} onChange={handleLogoUpload} />
            </label>
            <p style={{ fontSize:11, color:C.text3, margin:'8px 0 0' }}>PNG or SVG recommended · Max 2MB · Will appear in sidebar</p>
          </div>
        </div>
      </div>

      {/* Settings groups */}
      {SETTINGS_GROUPS.map(group => (
        <div key={group.title} style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:16, padding:'24px', boxShadow:'0 1px 6px rgba(0,0,0,0.05)' }}>
          <h3 style={{ fontSize:15, fontWeight:700, color:C.text1, margin:'0 0 4px' }}>{group.title}</h3>
          <p style={{ fontSize:13, color:C.text3, margin:'0 0 18px' }}>{group.desc}</p>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            {group.fields.map(f => (
              <div key={f.key} style={{ display:'flex', gap:10, alignItems:'flex-end' }}>
                <div style={{ flex:1 }}>
                  <Input label={f.label} value={(form as any)[f.key]} placeholder={f.placeholder}
                    onChange={e => setForm(fm => ({ ...fm, [f.key]: e.target.value }))} />
                </div>
                <button onClick={() => saveM.mutate(f.key)}
                  style={{ padding:'10px 16px', background:saved[f.key]?C.green:C.blue, color:'#fff', border:'none', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap', height:42 }}>
                  {saved[f.key] ? '✓ Saved' : 'Save'}
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
`)
ok('SystemSettingsPage.tsx — weather key, logo upload, company/project settings')

// ── 8. Update DashboardPage to include PM role ────────────────
const dashPath = path.join(FSRC, 'pages', 'dashboard', 'DashboardPage.tsx')
let dash = fs.readFileSync(dashPath, 'utf8')
if (!dash.includes('PmDashboard')) {
  dash = dash.replace(
    "import EngineerDashboard",
    "import PmDashboard         from '@/pages/dashboard/PmDashboard'\nimport EngineerDashboard"
  )
  dash = dash.replace(
    "if (role === 'engineer')",
    "if (role === 'project_manager') return <PmDashboard />\n  if (role === 'engineer')"
  )
  fs.writeFileSync(dashPath, dash)
  ok('DashboardPage.tsx — PmDashboard wired for project_manager role')
}

// ── 9. Add system settings route ─────────────────────────────
const appTsxPath = path.join(FSRC, 'App.tsx')
let appTsx = fs.readFileSync(appTsxPath, 'utf8')
if (!appTsx.includes('SystemSettingsPage')) {
  appTsx = appTsx.replace(
    "import EmailSettingsPage",
    "import SystemSettingsPage from '@/pages/settings/SystemSettingsPage'\nimport EmailSettingsPage"
  )
  appTsx = appTsx.replace(
    "path='settings/email'",
    "path='settings/system' element={<SystemSettingsPage />} />\n          <Route path='settings/email'"
  )
  fs.writeFileSync(appTsxPath, appTsx)
  ok('App.tsx — /settings/system route added')
}

// ── 10. Update Sidebar for PM and logo support ────────────────
const sidebarPath = path.join(FSRC, 'components', 'layout', 'Sidebar.tsx')
let sidebar = fs.readFileSync(sidebarPath, 'utf8')

// Add project_manager to visible roles across all relevant links
sidebar = sidebar.replace(
  "'super_admin','liaison_officer','hr_officer','engineer','accounts','qa_engineer','supervisor'",
  "'super_admin','project_manager','liaison_officer','hr_officer','engineer','accounts','qa_engineer','supervisor'"
)

// Add system settings link for super_admin
if (!sidebar.includes("settings/system")) {
  sidebar = sidebar.replace(
    "{ section:'SETTINGS', label:'Email Setup'",
    "{ section:'SETTINGS', label:'System Settings', path:'/settings/system', icon:Gear, roles:['super_admin'] },\n  { section:'SETTINGS', label:'Email Setup'"
  )
}

// Add project_manager to role labels and colors
sidebar = sidebar.replace(
  "liaison_officer: 'Liaison Officer'",
  "project_manager: 'Project Manager',\n  liaison_officer: 'Liaison Officer'"
)
sidebar = sidebar.replace(
  "liaison_officer: '#3b82f6'",
  "project_manager: '#f59e0b',\n  liaison_officer: '#3b82f6'"
)

// Add logo support
sidebar = sidebar.replace(
  "// Logo",
  "// Logo\n  const [logo, setLogo] = useState<string|null>(() => localStorage.getItem('company_logo'))\n  useEffect(() => {\n    const handler = () => setLogo(localStorage.getItem('company_logo'))\n    window.addEventListener('logo-updated', handler)\n    return () => window.removeEventListener('logo-updated', handler)\n  }, [])"
)

// Replace static ProjectOS text with dynamic logo
sidebar = sidebar.replace(
  "<Buildings size={20} color=\"#fff\" weight=\"bold\" />",
  "{logo ? <img src={logo} alt='logo' style={{ width:'100%', height:'100%', objectFit:'contain', borderRadius:8 }} /> : <Buildings size={20} color='#fff' weight='bold' />}"
)

// Fix import — add Gear and useState/useEffect if missing
if (!sidebar.includes('useState')) {
  sidebar = sidebar.replace(
    "import { NavLink",
    "import { useState, useEffect } from 'react'\nimport { NavLink"
  )
}
if (!sidebar.includes('Gear,')) {
  sidebar = sidebar.replace('ChartBar, FilePdf,', 'ChartBar, FilePdf, Gear,')
}

fs.writeFileSync(sidebarPath, sidebar)
ok('Sidebar.tsx — PM role, logo support, system settings link')

// ── 11. Seed Gowhar Shah ──────────────────────────────────────
const seedPath = path.join(SRC, 'seed', 'seed.ts')
if (fs.existsSync(seedPath)) {
  let seed = fs.readFileSync(seedPath, 'utf8')
  if (!seed.includes('gowhar') && !seed.includes('Gowhar')) {
    seed = seed.replace(
      /\{ name: 'KIPL Admin'/,
      "{ name: 'Gowhar Shah', email: 'gowhar@kipl.in', password: 'PM@KIPL#2024', role: 'project_manager', department: 'Management', designation: 'Project Manager' },\n    { name: 'KIPL Admin'"
    )
    fs.writeFileSync(seedPath, seed)
    ok('seed.ts — Gowhar Shah (project_manager) seeded')
  } else {
    ok('Gowhar Shah already in seed')
  }
}

console.log('\n\x1b[32m\x1b[1m  PM Dashboard + System Settings complete!\x1b[0m' + NC)
console.log('\n  Login credentials:')
console.log('  gowhar@kipl.in   PM@KIPL#2024   → Project Manager dashboard')
console.log('  admin@kipl.in    Admin@KIPL#2024 → Super Admin dashboard')
console.log('\n  Super Admin → Settings → System Settings:')
console.log('  - Upload company logo (appears in sidebar)')
console.log('  - Add OpenWeatherMap API key (free at openweathermap.org)')
console.log('  - Set company name, project details')
console.log('\n  PM Dashboard shows:')
console.log('  - Live weather widget (once API key set)')
console.log('  - Contract progress bar')
console.log('  - Site activity, schedule, quality, HR, financial KPIs')
console.log('  - Overdue task alerts')
console.log('\n  AppHeader (all roles):')
console.log('  - Greeting with first name')
console.log('  - Notification bell (overdue tasks + meeting actions)')
console.log('  - Profile dropdown with photo upload')
console.log('  - Sign out\n')
