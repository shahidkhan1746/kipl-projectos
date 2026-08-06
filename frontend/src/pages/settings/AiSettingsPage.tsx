import { useState, useEffect } from 'react'
import { Sparkle, CheckCircle, XCircle } from '@phosphor-icons/react'
import { aiApi } from '@/api/ai.api'
import { toast } from '@/lib/notify'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'

const C = { card:'#fff', border:'#e2e8f0', text1:'#0f172a', text2:'#475569', text3:'#94a3b8', blue:'#2563eb', green:'#059669', red:'#dc2626' }

const PROVIDERS = [
  { value:'gemini', label:'Google Gemini (free tier)' },
  { value:'openai', label:'OpenAI-compatible (OpenAI / Groq / OpenRouter)' },
]
const HINTS: Record<string, { model: string; base?: string; key: string; note: string }> = {
  gemini: { model:'gemini-2.0-flash', key:'aistudio.google.com', note:'Free key from Google AI Studio — no card needed. Model e.g. gemini-2.0-flash.' },
  openai: { model:'llama-3.3-70b-versatile', base:'https://api.groq.com/openai/v1', key:'console.groq.com', note:'For Groq (free): base URL https://api.groq.com/openai/v1, model llama-3.3-70b-versatile. For OpenAI use https://api.openai.com/v1.' },
}

export default function AiSettingsPage() {
  const [cfg, setCfg] = useState<any>({ enabled:false, provider:'gemini', model:'', baseUrl:'', hasKey:false })
  const [apiKey, setApiKey] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testRes, setTestRes] = useState<{ ok:boolean; message:string } | null>(null)

  useEffect(() => { aiApi.getConfig().then(r => setCfg(r.data)).catch(() => {}).finally(() => setLoading(false)) }, [])
  const set = (k: string, v: any) => setCfg((c: any) => ({ ...c, [k]: v }))
  const hint = HINTS[cfg.provider] ?? HINTS.gemini

  async function save() {
    setSaving(true)
    try {
      await aiApi.saveConfig({ ...cfg, apiKey: apiKey || undefined })
      setApiKey(''); const r = await aiApi.getConfig(); setCfg(r.data)
      toast.success('AI settings saved')
    } catch (e: any) { toast.error('Save failed: ' + (e?.response?.data?.message ?? e?.message)) }
    finally { setSaving(false) }
  }
  async function test() {
    setTesting(true); setTestRes(null)
    try { const r = await aiApi.test(); setTestRes(r.data) }
    catch (e: any) { setTestRes({ ok:false, message: e?.response?.data?.message ?? e?.message }) }
    finally { setTesting(false) }
  }

  if (loading) return <div style={{ display:'flex', justifyContent:'center', padding:60 }}><Spinner /></div>

  return (
    <div className="fade-in" style={{ maxWidth:640, display:'flex', flexDirection:'column', gap:20 }}>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <Sparkle size={22} color={C.blue} weight="fill" />
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, color:C.text1, margin:0 }}>AI Assistant</h1>
          <p style={{ fontSize:13, color:C.text3, margin:'2px 0 0' }}>Bring your own key. It stays on the server and is never sent to the browser.</p>
        </div>
      </div>

      <div style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:14, padding:'22px', display:'flex', flexDirection:'column', gap:16 }}>
        <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer' }}>
          <input type="checkbox" checked={!!cfg.enabled} onChange={e => set('enabled', e.target.checked)} style={{ width:16, height:16 }} />
          <span style={{ fontSize:13, fontWeight:600, color:C.text1 }}>Enable AI features</span>
        </label>

        <Select label="Provider" value={cfg.provider} onChange={e => { set('provider', e.target.value); setTestRes(null) }} options={PROVIDERS} />

        <div>
          <Input label="API Key" type="password" value={apiKey} onChange={e => setApiKey(e.target.value)}
            placeholder={cfg.hasKey ? '•••••••• (saved — leave blank to keep)' : 'Paste your key'} />
          <p style={{ fontSize:11, color:C.text3, margin:'6px 0 0' }}>Get a free key at <b>{hint.key}</b>. {hint.note}</p>
        </div>

        <div style={{ display:'grid', gridTemplateColumns: cfg.provider === 'openai' ? '1fr 1fr' : '1fr', gap:12 }}>
          <Input label="Model" value={cfg.model} onChange={e => set('model', e.target.value)} placeholder={hint.model} />
          {cfg.provider === 'openai' && <Input label="Base URL" value={cfg.baseUrl} onChange={e => set('baseUrl', e.target.value)} placeholder={hint.base} />}
        </div>

        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <Button variant="primary" loading={saving} onClick={save}>Save</Button>
          <Button variant="secondary" loading={testing} onClick={test} disabled={!cfg.enabled}>Test connection</Button>
          {testRes && (
            <span style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:12, fontWeight:600, color: testRes.ok ? C.green : C.red }}>
              {testRes.ok ? <CheckCircle size={15} weight="fill" /> : <XCircle size={15} weight="fill" />}{testRes.message}
            </span>
          )}
        </div>
      </div>

      <div style={{ background:'#eff6ff', border:'1.5px solid #bfdbfe', borderRadius:12, padding:'14px 18px', fontSize:12.5, color:'#1d4ed8', lineHeight:1.6 }}>
        Privacy: text you send for drafting/summarising goes to your chosen provider. Don't include Aadhaar, bank or other sensitive personal data. AI only <b>drafts</b> — you review and approve before anything is saved or sent.
      </div>
    </div>
  )
}
