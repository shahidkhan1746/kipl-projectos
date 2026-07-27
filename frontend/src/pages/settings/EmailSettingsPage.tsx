import { useState, useEffect } from 'react'
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
    onSuccess: (r: any) => {
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
