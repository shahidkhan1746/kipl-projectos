// Run from project root: node scripts/modules/gmail/smtp-build.js
const fs   = require('fs')
const path = require('path')

const SRC   = path.join('backend', 'src')
const FSRC  = path.join('frontend', 'src')
const SMTP  = path.join(SRC, 'mailer')

const G = '\x1b[32m', NC = '\x1b[0m'
const ok = s => console.log(G + '  ✓' + NC + ' ' + s)

console.log('\n\x1b[1mBuilding SMTP Mailer Module\x1b[0m\n')

fs.mkdirSync(SMTP, { recursive: true })
fs.mkdirSync(path.join(FSRC, 'pages', 'settings'), { recursive: true })

// ── Install nodemailer ────────────────────────────────────────
const pkgPath = path.join('backend', 'package.json')
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
if (!pkg.dependencies['nodemailer']) {
  pkg.dependencies['nodemailer'] = '^6.9.0'
  pkg.dependencies['@types/nodemailer'] = '^6.4.0'
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2))
  console.log('  → Added nodemailer to package.json — run: cd backend && npm install')
} else { ok('nodemailer already in package.json') }

// ── Email Config Entity (stores SMTP settings in DB) ─────────
fs.writeFileSync(path.join(SMTP, 'email-config.entity.ts'), `import { Entity, Column } from 'typeorm'
import { BaseEntity } from '../shared/entities/base.entity'

@Entity('email_configs')
export class EmailConfig extends BaseEntity {
  @Column({ name: 'smtp_host',  default: 'smtp.gmail.com' }) smtpHost: string
  @Column({ name: 'smtp_port',  default: 587 }) smtpPort: number
  @Column({ name: 'smtp_secure', default: false }) smtpSecure: boolean
  @Column({ name: 'smtp_user'  }) smtpUser: string
  @Column({ name: 'smtp_pass',  type: 'text' }) smtpPass: string
  @Column({ name: 'from_name',  default: 'KIPL ProjectOS' }) fromName: string
  @Column({ name: 'from_email' }) fromEmail: string
  @Column({ name: 'is_active',  default: true }) isActive: boolean
  @Column({ name: 'is_verified', default: false }) isVerified: boolean
  @Column({ name: 'last_tested_at', nullable: true }) lastTestedAt: Date
}
`)
ok('email-config.entity.ts')

// ── Mailer Service ────────────────────────────────────────────
fs.writeFileSync(path.join(SMTP, 'mailer.service.ts'), `import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { EmailConfig } from './email-config.entity'
import * as nodemailer from 'nodemailer'

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name)

  constructor(
    @InjectRepository(EmailConfig) private configRepo: Repository<EmailConfig>,
  ) {}

  async getConfig(): Promise<EmailConfig | null> {
    return this.configRepo.findOne({ where: { isActive: true } })
  }

  async saveConfig(data: {
    smtpHost?: string
    smtpPort?: number
    smtpUser: string
    smtpPass: string
    fromName?: string
    fromEmail: string
  }): Promise<EmailConfig> {
    // Deactivate old config
    await this.configRepo.update({}, { isActive: false })

    const config = this.configRepo.create({
      smtpHost:   data.smtpHost   ?? 'smtp.gmail.com',
      smtpPort:   data.smtpPort   ?? 587,
      smtpSecure: (data.smtpPort === 465),
      smtpUser:   data.smtpUser,
      smtpPass:   data.smtpPass,
      fromName:   data.fromName   ?? 'KIPL ProjectOS',
      fromEmail:  data.fromEmail,
      isActive:   true,
      isVerified: false,
    })
    return this.configRepo.save(config)
  }

  private async createTransporter(config: EmailConfig) {
    return nodemailer.createTransport({
      host:   config.smtpHost,
      port:   config.smtpPort,
      secure: config.smtpSecure,
      auth: {
        user: config.smtpUser,
        pass: config.smtpPass,
      },
    })
  }

  async testConnection(to: string): Promise<{ success: boolean; message: string }> {
    const config = await this.getConfig()
    if (!config) return { success: false, message: 'No email configuration found. Please save settings first.' }

    try {
      const transporter = await this.createTransporter(config)
      await transporter.verify()

      await transporter.sendMail({
        from:    config.fromName + ' <' + config.fromEmail + '>',
        to,
        subject: 'Test Email — KIPL ProjectOS',
        html: \`
          <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto">
            <div style="background:#1a2540;padding:20px;border-radius:8px 8px 0 0">
              <h2 style="color:#fff;margin:0">KIPL ProjectOS</h2>
              <p style="color:rgba(255,255,255,0.5);margin:4px 0 0;font-size:13px">Dal Lake Sewerage Scheme</p>
            </div>
            <div style="padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px">
              <h3 style="color:#0f172a;margin:0 0 12px">✓ Email Configuration Working</h3>
              <p style="color:#475569">This is a test email from KIPL ProjectOS to verify your SMTP settings are configured correctly.</p>
              <p style="color:#475569">Sending from: <strong>\${config.fromEmail}</strong></p>
              <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0">
              <p style="color:#94a3b8;font-size:12px">Allotment No: CE/UEED/PS/01 OF 2025-26</p>
            </div>
          </div>
        \`,
      })

      await this.configRepo.update(config.id, { isVerified: true, lastTestedAt: new Date() })
      return { success: true, message: 'Test email sent successfully to ' + to }
    } catch (err: any) {
      this.logger.error('SMTP test failed: ' + err.message)
      return { success: false, message: err.message ?? 'Connection failed' }
    }
  }

  async sendEmail(p: {
    to: string | string[]
    subject: string
    html: string
    cc?: string[]
    replyTo?: string
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const config = await this.getConfig()
    if (!config) return { success: false, error: 'Email not configured. Go to Settings → Email.' }

    try {
      const transporter = await this.createTransporter(config)
      const info = await transporter.sendMail({
        from:    config.fromName + ' <' + config.fromEmail + '>',
        to:      Array.isArray(p.to) ? p.to.join(', ') : p.to,
        cc:      p.cc?.join(', '),
        replyTo: p.replyTo,
        subject: p.subject,
        html:    p.html,
      })
      return { success: true, messageId: info.messageId }
    } catch (err: any) {
      this.logger.error('Send email failed: ' + err.message)
      return { success: false, error: err.message }
    }
  }

  async isConfigured(): Promise<{ configured: boolean; verified: boolean; email?: string; fromName?: string }> {
    const config = await this.getConfig()
    if (!config) return { configured: false, verified: false }
    return {
      configured: true,
      verified: config.isVerified,
      email: config.fromEmail,
      fromName: config.fromName,
    }
  }
}
`)
ok('mailer.service.ts')

// ── Mailer Controller ─────────────────────────────────────────
fs.writeFileSync(path.join(SMTP, 'mailer.controller.ts'), `import { Controller, Get, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common'
import { MailerService } from './mailer.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'

@Controller('mailer')
@UseGuards(JwtAuthGuard)
export class MailerController {
  constructor(private readonly svc: MailerService) {}

  @Get('status')
  status() { return this.svc.isConfigured() }

  @Get('config')
  async getConfig() {
    const c = await this.svc.getConfig()
    if (!c) return null
    // Never return the password
    return {
      smtpHost:   c.smtpHost,
      smtpPort:   c.smtpPort,
      smtpUser:   c.smtpUser,
      fromName:   c.fromName,
      fromEmail:  c.fromEmail,
      isVerified: c.isVerified,
      lastTestedAt: c.lastTestedAt,
    }
  }

  @Post('config') @HttpCode(HttpStatus.CREATED)
  saveConfig(@Body() body: any) { return this.svc.saveConfig(body) }

  @Post('test') @HttpCode(HttpStatus.OK)
  test(@Body('to') to: string) { return this.svc.testConnection(to) }

  @Post('send') @HttpCode(HttpStatus.OK)
  send(@Body() body: any) { return this.svc.sendEmail(body) }
}
`)
ok('mailer.controller.ts')

// ── Mailer Module ─────────────────────────────────────────────
fs.writeFileSync(path.join(SMTP, 'mailer.module.ts'), `import { Module, Global } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { EmailConfig } from './email-config.entity'
import { MailerService } from './mailer.service'
import { MailerController } from './mailer.controller'

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([EmailConfig])],
  providers: [MailerService],
  controllers: [MailerController],
  exports: [MailerService],
})
export class MailerModule {}
`)
ok('mailer.module.ts — @Global so all modules can inject MailerService')

// Register in app.module.ts
const appPath = path.join(SRC, 'app.module.ts')
let app = fs.readFileSync(appPath, 'utf8')
if (!app.includes("from './mailer/mailer.module'")) {
  app = app.replace(
    "import { TaskModule }",
    "import { MailerModule } from './mailer/mailer.module'\nimport { TaskModule }"
  )
  app = app.replace('TaskModule,', 'TaskModule,\n    MailerModule,')
  fs.writeFileSync(appPath, app)
  ok('MailerModule registered in app.module.ts')
} else { ok('Already registered') }

// ── Frontend API ──────────────────────────────────────────────
fs.writeFileSync(path.join(FSRC, 'api', 'mailer.api.ts'), `import api from './client'
export const mailerApi = {
  status:     () => api.get('/api/v1/mailer/status'),
  getConfig:  () => api.get('/api/v1/mailer/config'),
  saveConfig: (d: any) => api.post('/api/v1/mailer/config', d),
  test:       (to: string) => api.post('/api/v1/mailer/test', { to }),
  send:       (d: any) => api.post('/api/v1/mailer/send', d),
}
`)
ok('mailer.api.ts')

// ── Email Settings Page ───────────────────────────────────────
fs.writeFileSync(path.join(FSRC, 'pages', 'settings', 'EmailSettingsPage.tsx'), `import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { mailerApi } from '@/api/mailer.api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

const C = {
  card:'#fff', border:'#e2e8f0', text1:'#0f172a', text2:'#475569', text3:'#94a3b8',
  blue:'#2563eb', green:'#059669', amber:'#d97706', red:'#dc2626', navy:'#1a2540',
}

const PRESETS = [
  { label:'Gmail',         host:'smtp.gmail.com',      port:587, hint:'Use Gmail App Password' },
  { label:'Outlook/Office',host:'smtp.office365.com',  port:587, hint:'Use your Office 365 password' },
  { label:'Yahoo Mail',    host:'smtp.mail.yahoo.com', port:587, hint:'Use Yahoo App Password' },
  { label:'Custom SMTP',   host:'',                    port:587, hint:'Enter your SMTP server details' },
]

export default function EmailSettingsPage() {
  const qc = useQueryClient()
  const [testTo, setTestTo]   = useState('')
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [showPass, setShowPass] = useState(false)
  const [preset, setPreset]   = useState(0)

  const [form, setForm] = useState({
    smtpHost:  'smtp.gmail.com',
    smtpPort:  587,
    smtpUser:  '',
    smtpPass:  '',
    fromName:  'KIPL Infrastructure',
    fromEmail: '',
  })

  const { data: status } = useQuery({
    queryKey: ['mailer-status'],
    queryFn:  () => mailerApi.status().then(r => r.data),
  })

  const { data: config } = useQuery({
    queryKey: ['mailer-config'],
    queryFn:  () => mailerApi.getConfig().then(r => r.data),
  })

  // Pre-fill form from saved config (never shows password)
  useEffect(() => {
    if (config) {
      setForm(f => ({
        ...f,
        smtpHost:  config.smtpHost  ?? f.smtpHost,
        smtpPort:  config.smtpPort  ?? f.smtpPort,
        smtpUser:  config.smtpUser  ?? f.smtpUser,
        fromName:  config.fromName  ?? f.fromName,
        fromEmail: config.fromEmail ?? f.fromEmail,
      }))
    }
  }, [config])

  const saveM = useMutation({
    mutationFn: () => mailerApi.saveConfig(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mailer-status'] })
      qc.invalidateQueries({ queryKey: ['mailer-config'] })
    },
  })

  const testM = useMutation({
    mutationFn: () => mailerApi.test(testTo),
    onSuccess: (r) => {
      setTestResult(r.data)
      qc.invalidateQueries({ queryKey: ['mailer-status'] })
      qc.invalidateQueries({ queryKey: ['mailer-config'] })
    },
  })

  const setF = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  function applyPreset(i: number) {
    setPreset(i)
    const p = PRESETS[i]
    setF('smtpHost', p.host)
    setF('smtpPort', p.port)
  }

  const isConfigured = status?.configured
  const isVerified   = status?.verified

  return (
    <div className="fade-in" style={{ display:'flex', flexDirection:'column', gap:24, maxWidth:700 }}>

      {/* Header */}
      <div>
        <h1 style={{ fontSize:24, fontWeight:800, color:C.text1, margin:0, letterSpacing:'-0.02em' }}>Email Settings</h1>
        <p style={{ fontSize:14, color:C.text3, marginTop:4 }}>Configure SMTP to send liaison letters, notifications and reports by email</p>
      </div>

      {/* Status banner */}
      <div style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 18px', background:isVerified?'#ecfdf5':isConfigured?'#fffbeb':'#f8fafc', border:'1.5px solid '+(isVerified?'#a7f3d0':isConfigured?'#fde68a':'#e2e8f0'), borderRadius:12 }}>
        <div style={{ width:12, height:12, borderRadius:'50%', background:isVerified?C.green:isConfigured?C.amber:'#94a3b8', flexShrink:0 }} />
        <div>
          <p style={{ fontSize:13, fontWeight:700, color:isVerified?C.green:isConfigured?C.amber:C.text3, margin:0 }}>
            {isVerified ? '✓ Email configured and verified' : isConfigured ? '⚠ Settings saved but not tested yet' : 'Email not configured'}
          </p>
          {isVerified && <p style={{ fontSize:12, color:C.text3, margin:'2px 0 0' }}>Sending from: <strong>{status?.email}</strong> · Name: {status?.fromName}</p>}
        </div>
      </div>

      {/* Gmail App Password guide */}
      <div style={{ background:'#eff6ff', border:'1.5px solid #bfdbfe', borderRadius:12, padding:'16px 20px' }}>
        <p style={{ fontSize:13, fontWeight:700, color:C.blue, margin:'0 0 8px' }}>📱 Using Gmail? Get an App Password in 2 minutes:</p>
        <ol style={{ margin:0, paddingLeft:20, fontSize:12, color:'#1d4ed8', lineHeight:2 }}>
          <li>Go to <strong>myaccount.google.com</strong> → Security</li>
          <li>Turn on <strong>2-Step Verification</strong> (if not already on)</li>
          <li>Go to Security → <strong>App Passwords</strong></li>
          <li>Select app: <strong>Mail</strong> → Generate</li>
          <li>Copy the 16-character password → paste it below as SMTP Password</li>
        </ol>
      </div>

      {/* SMTP Settings Form */}
      <div style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:16, padding:'24px', boxShadow:'0 1px 6px rgba(0,0,0,0.05)' }}>
        <h3 style={{ fontSize:15, fontWeight:700, color:C.text1, margin:'0 0 18px' }}>SMTP Configuration</h3>

        {/* Provider presets */}
        <div style={{ marginBottom:18 }}>
          <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:8 }}>Email Provider</label>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {PRESETS.map((p, i) => (
              <button key={i} onClick={() => applyPreset(i)}
                style={{ padding:'7px 16px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', border:'1.5px solid '+(preset===i?C.blue:C.border), background:preset===i?C.blue:'#fff', color:preset===i?'#fff':C.text2, transition:'all 0.15s' }}>
                {p.label}
              </button>
            ))}
          </div>
          <p style={{ fontSize:11, color:C.text3, margin:'6px 0 0' }}>{PRESETS[preset].hint}</p>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {/* From info */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Input label="From Name" value={form.fromName} onChange={e => setF('fromName', e.target.value)} placeholder="KIPL Infrastructure" />
            <Input label="From Email *" value={form.fromEmail} onChange={e => setF('fromEmail', e.target.value)} placeholder="kipl@gmail.com" />
          </div>

          {/* SMTP */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 100px', gap:12 }}>
            <Input label="SMTP Host" value={form.smtpHost} onChange={e => setF('smtpHost', e.target.value)} placeholder="smtp.gmail.com" />
            <Input label="Port" type="number" value={String(form.smtpPort)} onChange={e => setF('smtpPort', parseInt(e.target.value)||587)} />
          </div>

          {/* Auth */}
          <Input label="SMTP Username (your email)" value={form.smtpUser} onChange={e => setF('smtpUser', e.target.value)} placeholder="kipl@gmail.com" />

          <div style={{ position:'relative' }}>
            <Input label="SMTP Password / App Password *" type={showPass?'text':'password'} value={form.smtpPass} onChange={e => setF('smtpPass', e.target.value)} placeholder="Paste Gmail App Password here (16 chars)" />
            <button onClick={() => setShowPass(s => !s)}
              style={{ position:'absolute', right:12, top:32, background:'none', border:'none', cursor:'pointer', fontSize:12, color:C.text3, fontWeight:600 }}>
              {showPass ? 'Hide' : 'Show'}
            </button>
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', background:'#f8f9fc', borderRadius:8, border:'1px solid '+C.border }}>
            <span style={{ fontSize:12, color:C.text3 }}>🔒</span>
            <p style={{ fontSize:12, color:C.text3, margin:0 }}>Password is stored securely in your local database. Never leaves your server.</p>
          </div>

          <Button variant="primary" loading={saveM.isPending} onClick={() => saveM.mutate()} disabled={!form.smtpUser || !form.smtpPass || !form.fromEmail}>
            Save Email Settings
          </Button>

          {saveM.isSuccess && (
            <div style={{ padding:'10px 14px', background:'#ecfdf5', border:'1.5px solid #a7f3d0', borderRadius:8, fontSize:13, color:C.green, fontWeight:600 }}>
              ✓ Settings saved! Now send a test email to verify.
            </div>
          )}
        </div>
      </div>

      {/* Test Email */}
      <div style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:16, padding:'24px', boxShadow:'0 1px 6px rgba(0,0,0,0.05)' }}>
        <h3 style={{ fontSize:15, fontWeight:700, color:C.text1, margin:'0 0 6px' }}>Send Test Email</h3>
        <p style={{ fontSize:13, color:C.text3, margin:'0 0 16px' }}>Verify your settings work by sending a test email.</p>

        {testResult && (
          <div style={{ padding:'12px 16px', background:testResult.success?'#ecfdf5':'#fef2f2', border:'1.5px solid '+(testResult.success?'#a7f3d0':'#fecaca'), borderRadius:8, fontSize:13, color:testResult.success?C.green:C.red, marginBottom:14, fontWeight:500 }}>
            {testResult.success ? '✓ ' : '✗ '}{testResult.message}
          </div>
        )}

        <div style={{ display:'flex', gap:10, alignItems:'flex-end' }}>
          <div style={{ flex:1 }}>
            <Input label="Send test to" value={testTo} onChange={e => setTestTo(e.target.value)} placeholder="your-email@example.com" />
          </div>
          <Button variant="secondary" loading={testM.isPending} onClick={() => testM.mutate()} disabled={!testTo || !isConfigured}>
            Send Test
          </Button>
        </div>
      </div>

      {/* How it's used */}
      <div style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:16, padding:'24px', boxShadow:'0 1px 6px rgba(0,0,0,0.05)' }}>
        <h3 style={{ fontSize:15, fontWeight:700, color:C.text1, margin:'0 0 14px' }}>Where email is used in ProjectOS</h3>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          {[
            { module:'Liaison Letters', desc:'Send official letters to LCMA, UEED, SMC' },
            { module:'Meeting Minutes', desc:'Circulate MOM to all attendees' },
            { module:'Salary Slips',    desc:'Email salary slips to employees' },
            { module:'RA Bills',        desc:'Submit RA bills to client via email' },
            { module:'QA Reports',      desc:'Email inspection reports to EIC' },
            { module:'Task Alerts',     desc:'Notify staff of new task assignments' },
          ].map(u => (
            <div key={u.module} style={{ display:'flex', gap:10, padding:'10px 12px', background:'#f8f9fc', borderRadius:8, border:'1px solid '+C.border }}>
              <span style={{ color:isVerified?C.green:C.text3, flexShrink:0 }}>{isVerified?'✓':'○'}</span>
              <div>
                <p style={{ fontSize:13, fontWeight:600, color:C.text1, margin:0 }}>{u.module}</p>
                <p style={{ fontSize:11, color:C.text3, margin:'2px 0 0' }}>{u.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
`)
ok('EmailSettingsPage.tsx — full admin UI with presets, show/hide password, test')

// ── Add route to App.tsx ──────────────────────────────────────
const appTsxPath = path.join(FSRC, 'App.tsx')
let appTsx = fs.readFileSync(appTsxPath, 'utf8')
if (!appTsx.includes('EmailSettingsPage')) {
  appTsx = appTsx.replace(
    "import WbsPage",
    "import EmailSettingsPage from '@/pages/settings/EmailSettingsPage'\nimport WbsPage"
  )
  appTsx = appTsx.replace(
    "path='accounting/invoices'",
    "path='settings/email' element={<EmailSettingsPage />} />\n          <Route path='accounting/invoices'"
  )
  fs.writeFileSync(appTsxPath, appTsx)
  ok('App.tsx — /settings/email route added')
}

// ── Add to Sidebar ────────────────────────────────────────────
const sidebarPath = path.join(FSRC, 'components', 'layout', 'Sidebar.tsx')
let sidebar = fs.readFileSync(sidebarPath, 'utf8')
if (!sidebar.includes("settings/email")) {
  sidebar = sidebar.replace(
    "{ section:'FINANCE'",
    "{ section:'SETTINGS', label:'Email Setup', path:'/settings/email', icon:Envelope, roles:['super_admin'] },\n  { section:'FINANCE'"
  )
  fs.writeFileSync(sidebarPath, sidebar)
  ok('Sidebar — Email Setup added under SETTINGS section for super_admin')
}

console.log('\n\x1b[32m\x1b[1m  SMTP Mailer complete!\x1b[0m' + NC)
console.log('\n  URL: /settings/email  (super_admin only)')
console.log('\n  How to activate:')
console.log('  1. cd backend && npm install')
console.log('  2. Restart backend: npm run start:dev')
console.log('  3. Log in as admin → Settings → Email Setup')
console.log('  4. Select Gmail preset')
console.log('  5. Enter your Gmail address')
console.log('  6. Paste the 16-char App Password')
console.log('  7. Click Save → Send Test Email')
console.log('  8. Done — all modules can now send email\n')
console.log('  MailerService is @Global — inject it in any module:')
console.log('  constructor(private mailer: MailerService) {}')
console.log('  await this.mailer.sendEmail({ to, subject, html })\n')
