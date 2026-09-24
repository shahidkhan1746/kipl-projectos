import { useState, useEffect, useRef } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  FileText,
  Envelope,
  Users,
  Calculator,
  Eye,
  EyeSlash,
  ChartLine,
  Copy,
  X,
  CheckCircle,
  WarningCircle,
} from '@phosphor-icons/react'
import { useAuthStore } from '@/store/auth.store'
import api from '@/api/client'
import { authApi } from '@/api/auth.api'
import { loginErrorMessage } from './loginFailure'
import { getDevicePayload } from '@/lib/deviceIdentity'
import { getLocalClientLogs, getClientDiagnostics, type ClientLogEntry } from '@/lib/clientLog'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPass]     = useState('')
  const [showPass, setShowPass] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [error, setError]       = useState('')
  const [loading, setLoad]      = useState(false)
  const [wakingNotice, setWakingNotice] = useState(false)
  const [forgotMsg, setForgot]  = useState('')
  const [showDiag, setShowDiag] = useState(false)
  const [diagRunning, setDiagRunning] = useState(false)
  const [diagResult, setDiagResult] = useState<{
    serverOk: boolean
    latencyMs?: number
    error?: string
    clientLogs: ClientLogEntry[]
    online: boolean
    userAgent: string
  } | null>(null)
  const [copiedDiag, setCopiedDiag] = useState(false)

  async function runLoginDiag() {
    setDiagRunning(true)
    const start = Date.now()
    let serverOk = false
    let latencyMs: number | undefined
    let error: string | undefined

    try {
      await api.get('/api/v1/health')
      latencyMs = Date.now() - start
      serverOk = true
    } catch (e: any) {
      error = e?.message || 'Server connection timed out'
    }

    setDiagResult({
      serverOk,
      latencyMs,
      error,
      clientLogs: getLocalClientLogs().slice(0, 10),
      online: navigator.onLine,
      userAgent: navigator.userAgent,
    })
    setDiagRunning(false)
  }

  const { setAuth, setProject, user, accessToken } = useAuthStore()
  const nav = useNavigate()
  const prewarmRef = useRef<Promise<any> | null>(null)

  useEffect(() => {
    let t: any
    if (loading) {
      t = setTimeout(() => setWakingNotice(true), 1500)
    } else {
      setWakingNotice(false)
    }
    return () => clearTimeout(t)
  }, [loading])

  useEffect(() => {
    // Silently pre-warm backend on page load so Render starts waking up
    // while the user is typing their credentials or viewing the screen.
    prewarmRef.current = api.get('/api/v1/health').catch(() => {})
  }, [])

  if (user && accessToken) return <Navigate to="/dashboard" replace />

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoad(true)
    try {
      const normalizedEmail = email.trim().toLowerCase()

      // If a pre-warm check is already running from page load, await it first
      if (prewarmRef.current) {
        try {
          await prewarmRef.current
        } catch (_) {}
      }

      // Wake Render with a side-effect-free request first. The health GET can
      // safely be retried; the credential-bearing login POST must be sent once.
      await api.get('/api/v1/health')
      const deviceMeta = await getDevicePayload().catch(() => undefined)
      const { data } = await authApi.login(normalizedEmail, password, deviceMeta, rememberMe)

      setAuth(data.user, data.access_token, data.refresh_token)
      try {
        const res = await api.get('/api/v1/projects')
        const list = Array.isArray(res.data) ? res.data : (res.data?.data ?? [])
        const defaultProj = list.find((p: any) => p.code === 'DAL-STP-2025')
          || list.find((p: any) => p.status === 'active')
          || list[0]
        if (defaultProj?.id) setProject(defaultProj.id)
      } catch (_) {}
      nav('/dashboard')
    } catch (err: unknown) {
      setError(loginErrorMessage(err))
    } finally {
      setLoad(false)
    }
  }

  const field: React.CSSProperties = {
    width: '100%', padding: '13px 14px',
    background: '#ffffff',
    border: '1.5px solid #e2e8f0',
    borderRadius: 8, fontSize: 16,   // 16px avoids iOS auto-zoom on focus
    color: '#0f172a', outline: 'none',
    fontFamily: 'inherit',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  }

  return (
    <div className="lp-root">
      <style>{LP_CSS}</style>

      {/* Left navy panel — desktop only */}
      <div className="lp-side">
        <div style={{ width: 72, height: 72, borderRadius: 18, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.28)', marginBottom: 24, padding: 9 }}>
          <img src="/assets/kipl-logo.png" alt="KIPL" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#fff', textAlign: 'center', margin: '0 0 10px' }}>KIPL ProjectOS</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', textAlign: 'center', lineHeight: 1.7, margin: 0 }}>
          Enterprise project management<br />for infrastructure and EPC
        </p>
        <div style={{ marginTop: 40, width: '100%' }}>
          {[
            { Icon: FileText, text: 'Liaison file tracking' },
            { Icon: Envelope, text: 'Official letter management' },
            { Icon: Users, text: 'HR and attendance' },
            { Icon: Calculator, text: 'BOQ and accounting' },
          ].map(({ Icon, text }) => (
            <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <Icon size={17} color="rgba(255,255,255,0.55)" />
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right form panel */}
      <div className="lp-main">
        <div className="lp-form">
          {/* Compact brand — mobile only */}
          <div className="lp-mini">
            <div className="lp-mini-badge"><img src="/assets/kipl-logo.png" alt="KIPL" style={{ width:'100%', height:'100%', objectFit:'contain', padding:6 }} /></div>
            <span className="lp-mini-name">KIPL ProjectOS</span>
          </div>

          <h2 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.02em' }}>Sign in</h2>
          <p style={{ fontSize: 14, color: '#94a3b8', marginBottom: 32 }}>Access your project dashboard</p>

          {wakingNotice && (
            <div style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: 8, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#1e40af', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid #2563eb', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} />
              <span>Waking up server from idle sleep (Render free tier). Please hold on...</span>
            </div>
          )}

          {error && (
            <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: 8, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#b91c1c' }}>
              <div>{error}</div>
              <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowDiag(true)
                    runLoginDiag()
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#b91c1c',
                    textDecoration: 'underline',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  Troubleshoot connection issues →
                </button>
              </div>
            </div>
          )}

          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Email address</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                required autoFocus placeholder="Enter your email" style={field} autoComplete="email"
                onFocus={e => { e.target.style.borderColor = '#2563eb'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)' }}
                onBlur={e  => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'} value={password} onChange={e => setPass(e.target.value)}
                  required placeholder="Enter your password" style={{ ...field, paddingRight: 42 }} autoComplete="current-password"
                  onFocus={e => { e.target.style.borderColor = '#2563eb'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)' }}
                  onBlur={e  => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(s => !s)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8',
                    display: 'flex', alignItems: 'center', padding: 4,
                  }}
                >
                  {showPass ? <EyeSlash size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {forgotMsg && <p style={{ fontSize: 13, color: '#047857', margin: 0 }}>{forgotMsg}</p>}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2, marginBottom: 4 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#475569', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  style={{ width: 16, height: 16, borderRadius: 4, cursor: 'pointer', accentColor: '#2563eb' }}
                />
                <span>Remember this device</span>
              </label>
              <button
                type="button"
                onClick={async () => {
                  if (!email) { setError('Enter your email first'); return }
                  try {
                    await authApi.forgotPassword(email.trim().toLowerCase())
                    setForgot('If that account exists, a reset link has been sent.')
                  } catch {
                    setError('Could not send a reset email right now.')
                  }
                }}
                style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0 }}
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit" disabled={loading}
              style={{ padding: '14px', background: '#2563eb', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700, color: '#fff', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: loading ? 0.7 : 1, transition: 'opacity 0.15s' }}
            >
              {loading ? 'Signing in...' : (
                <>
                  <span>Sign in to ProjectOS</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <button
              type="button"
              onClick={() => {
                setShowDiag(true)
                runLoginDiag()
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#64748b',
                fontSize: 12,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                textDecoration: 'none',
              }}
            >
              <ChartLine size={14} />
              Connection Diagnostics &amp; Troubleshooting
            </button>
          </div>

          <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 24, textAlign: 'center' }}>
            Khilari Infrastructure Pvt. Ltd. &middot; Internal Platform Only
          </p>
        </div>
      </div>

      {/* Connection Diagnostics Modal */}
      {showDiag && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 20,
          }}
          onClick={() => setShowDiag(false)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              width: '100%',
              maxWidth: 520,
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              padding: 24,
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ChartLine size={20} color="#2563eb" weight="bold" />
                <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: '#0f172a' }}>Connection Diagnostics</h3>
              </div>
              <button
                onClick={() => setShowDiag(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
              >
                <X size={18} color="#64748b" />
              </button>
            </div>

            <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 16px', lineHeight: 1.5 }}>
              Check your connection to KIPL ProjectOS servers and inspect recent browser network error logs.
            </p>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 14, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 13, color: '#475569' }}>Internet Status:</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: diagResult?.online ? '#16a34a' : '#dc2626', display: 'flex', alignItems: 'center', gap: 4 }}>
                  {diagResult?.online ? <CheckCircle size={15} /> : <WarningCircle size={15} />}
                  {diagResult?.online ? 'Online' : 'Offline (No internet)'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: '#475569' }}>Project Server (Render):</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: diagResult?.serverOk ? '#16a34a' : '#dc2626', display: 'flex', alignItems: 'center', gap: 4 }}>
                  {diagRunning ? (
                    <span style={{ color: '#2563eb' }}>Pinging...</span>
                  ) : diagResult?.serverOk ? (
                    <>
                      <CheckCircle size={15} />
                      Connected ({diagResult.latencyMs}ms)
                    </>
                  ) : (
                    <>
                      <WarningCircle size={15} />
                      Waking / Unreachable
                    </>
                  )}
                </span>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginBottom: 8 }}>
                Recent Error Logs (Local Storage):
              </div>
              {!diagResult?.clientLogs?.length ? (
                <div style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>
                  No recent errors recorded in this browser session.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflowY: 'auto' }}>
                  {diagResult.clientLogs.map(l => (
                    <div key={l.id} style={{ background: '#f1f5f9', borderRadius: 6, padding: '8px 10px', fontSize: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: 11 }}>
                        <strong>{l.statusCode ? `HTTP ${l.statusCode}` : l.errorName || 'Error'}</strong>
                        <span>{new Date(l.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <div style={{ color: '#0f172a', marginTop: 2, wordBreak: 'break-all' }}>{l.message}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
              <button
                type="button"
                onClick={() => {
                  const text = JSON.stringify(diagResult, null, 2)
                  navigator.clipboard.writeText(text)
                  setCopiedDiag(true)
                  setTimeout(() => setCopiedDiag(false), 2000)
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  borderRadius: 6,
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  color: '#334155',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                <Copy size={15} />
                {copiedDiag ? 'Copied Report' : 'Copy Report'}
              </button>

              <button
                type="button"
                onClick={runLoginDiag}
                disabled={diagRunning}
                style={{
                  padding: '8px 16px',
                  borderRadius: 6,
                  background: '#2563eb',
                  border: 'none',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {diagRunning ? 'Testing...' : 'Test Connection Again'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const LP_CSS = `
.lp-root{min-height:100vh;min-height:100dvh;display:flex;background:#f0f2f5;font-family:inherit}
.lp-side{width:420px;flex-shrink:0;background:#1a2540;display:flex;flex-direction:column;
  align-items:center;justify-content:center;padding:48px}
.lp-main{flex:1;display:flex;align-items:center;justify-content:center;padding:48px}
.lp-form{width:100%;max-width:400px}
.lp-mini{display:none}
.lp-mini-badge{width:48px;height:48px;border-radius:12px;flex-shrink:0;background:#fff;
  display:flex;align-items:center;justify-content:center;box-shadow:0 8px 24px rgba(0,0,0,.16)}
.lp-mini-name{font-size:19px;font-weight:800;color:#0f172a}
@media(max-width:768px){
  .lp-side{display:none}
  .lp-main{padding:56px 22px;align-items:flex-start}
  .lp-mini{display:flex;align-items:center;gap:12px;margin-bottom:30px}
}
`
