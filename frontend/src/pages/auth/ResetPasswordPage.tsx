import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { authApi } from '@/api/auth.api'

export default function ResetPasswordPage() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const nav = useNavigate()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [ok, setOk] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await authApi.resetPassword(token, password)
      setOk(true)
      setTimeout(() => nav('/login'), 1500)
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Reset failed')
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f2f5' }}>
      <form onSubmit={submit} style={{ background: '#fff', padding: 32, borderRadius: 12, width: 380, boxShadow: '0 8px 30px rgba(0,0,0,0.08)' }}>
        <h1 style={{ margin: '0 0 8px', fontSize: 22 }}>Set a new password</h1>
        <p style={{ color: '#64748b', fontSize: 13, marginTop: 0 }}>Choose a password of at least 8 characters.</p>
        {error && <p style={{ color: '#b91c1c', fontSize: 13 }}>{error}</p>}
        {ok && <p style={{ color: '#047857', fontSize: 13 }}>Password updated. Redirecting to sign in…</p>}
        <input type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)}
          placeholder="New password" style={{ width: '100%', padding: 12, borderRadius: 8, border: '1.5px solid #e2e8f0', marginBottom: 12 }} />
        <button type="submit" style={{ width: '100%', padding: 12, borderRadius: 8, border: 'none', background: '#2563eb', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
          Update password
        </button>
      </form>
    </div>
  )
}
