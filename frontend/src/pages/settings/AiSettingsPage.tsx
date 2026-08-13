import { useState, useEffect } from 'react'
import { Sparkle, CheckCircle, XCircle, Plus, Trash, Lightning } from '@phosphor-icons/react'
import { aiApi } from '@/api/ai.api'
import { toast, confirmAsk } from '@/lib/notify'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'

const C = { card:'#fff', card2:'#f8fafc', border:'#e2e8f0', text1:'#0f172a', text2:'#475569', text3:'#94a3b8', blue:'#2563eb', green:'#059669', red:'#dc2626' }

const PROVIDERS = [
  { value:'gemini',     label:'Google Gemini (free)' },
  { value:'nvidia',     label:'NVIDIA NIM (free)' },
  { value:'groq',       label:'Groq (free)' },
  { value:'openrouter', label:'OpenRouter (free models)' },
  { value:'openai',     label:'OpenAI (paid)' },
]

const HINTS: Record<string, { model: string; base: string; keyUrl: string; note: string }> = {
  gemini:     { model:'gemini-2.0-flash',                        base:'',                                    keyUrl:'aistudio.google.com', note:'Free key from Google AI Studio — no card needed.' },
  nvidia:     { model:'meta/llama-3.1-8b-instruct',             base:'https://integrate.api.nvidia.com/v1', keyUrl:'build.nvidia.com',    note:'Free: build.nvidia.com → open any model → “Get API Key”. Try model nvidia/llama-3.1-nemotron-70b-instruct too.' },
  groq:       { model:'llama-3.3-70b-versatile',               base:'https://api.groq.com/openai/v1',      keyUrl:'console.groq.com',    note:'Free and very fast. Key from console.groq.com.' },
  openrouter: { model:'meta-llama/llama-3.1-8b-instruct:free', base:'https://openrouter.ai/api/v1',        keyUrl:'openrouter.ai',       note:'Pick any model ending in “:free”. Key from openrouter.ai → Keys.' },
  openai:     { model:'gpt-4o-mini',                            base:'https://api.openai.com/v1',           keyUrl:'platform.openai.com', note:'Paid. Key from platform.openai.com.' },
}

type Key = {
  id?: string; label: string; provider: string; model: string; baseUrl: string
  enabled: boolean; priority: number; hasKey: boolean
  _apiKey: string; _testing?: boolean; _saving?: boolean; _testRes?: { ok: boolean; message: string } | null
}

export default function AiSettingsPage() {
  const [enabled, setEnabled] = useState(false)
  const [keys, setKeys] = useState<Key[]>([])
  const [loading, setLoading] = useState(true)
  const [savingMaster, setSavingMaster] = useState(false)

  async function load() {
    const r = await aiApi.getConfig()
    setEnabled(!!r.data.enabled)
    setKeys((r.data.keys ?? []).map((k: any) => ({ ...k, _apiKey: '', _testRes: null })))
  }
  useEffect(() => { load().catch(() => {}).finally(() => setLoading(false)) }, [])

  const patch = (i: number, p: Partial<Key>) => setKeys(ks => ks.map((k, idx) => idx === i ? { ...k, ...p } : k))

  async function saveMaster(next: boolean) {
    setEnabled(next); setSavingMaster(true)
    try { await aiApi.saveConfig({ enabled: next }) }
    catch (e: any) { toast.error('Failed: ' + (e?.response?.data?.message ?? e?.message)); setEnabled(!next) }
    finally { setSavingMaster(false) }
  }

  function addKey() {
    setKeys(ks => [...ks, {
      label:'', provider:'nvidia', model:'', baseUrl:'', enabled:true,
      priority: (ks.reduce((m, k) => Math.max(m, k.priority), 0) || 0) + 10,
      hasKey:false, _apiKey:'', _testRes:null,
    }])
  }

  async function saveKey(i: number) {
    const k = keys[i]
    if (!k.id && !k._apiKey.trim()) { toast.error('Paste an API key first'); return }
    patch(i, { _saving: true })
    try {
      const body = {
        label: k.label, provider: k.provider, model: k.model, baseUrl: k.baseUrl,
        enabled: k.enabled, priority: k.priority,
        apiKey: k._apiKey.trim() ? k._apiKey.trim() : undefined,
      }
      if (k.id) await aiApi.updateKey(k.id, body)
      else      await aiApi.createKey(body)
      await load()
      toast.success('Key saved')
    } catch (e: any) { toast.error('Save failed: ' + (e?.response?.data?.message ?? e?.message)); patch(i, { _saving: false }) }
  }

  async function testKey(i: number) {
    const k = keys[i]
    if (!k.id) { toast.error('Save the key first, then test'); return }
    patch(i, { _testing: true, _testRes: null })
    try { const r = await aiApi.testKey(k.id); patch(i, { _testRes: r.data }) }
    catch (e: any) { patch(i, { _testRes: { ok:false, message: e?.response?.data?.message ?? e?.message } }) }
    finally { patch(i, { _testing: false }) }
  }

  async function removeKey(i: number) {
    const k = keys[i]
    if (!k.id) { setKeys(ks => ks.filter((_, idx) => idx !== i)); return }
    if (!(await confirmAsk(`Delete key "${k.label || k.provider}"?`))) return
    try { await aiApi.deleteKey(k.id); await load(); toast.success('Key deleted') }
    catch (e: any) { toast.error('Delete failed: ' + (e?.response?.data?.message ?? e?.message)) }
  }

  if (loading) return <div style={{ display:'flex', justifyContent:'center', padding:60 }}><Spinner /></div>

  return (
    <div className="fade-in" style={{ maxWidth:760, display:'flex', flexDirection:'column', gap:20 }}>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <Sparkle size={22} color={C.blue} weight="fill" />
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, color:C.text1, margin:0 }}>AI Assistant</h1>
          <p style={{ fontSize:13, color:C.text3, margin:'2px 0 0' }}>Bring your own keys. They stay on the server and are never sent back to the browser.</p>
        </div>
      </div>

      {/* Master toggle */}
      <div style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:14, padding:'16px 20px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <div style={{ fontSize:14, fontWeight:700, color:C.text1 }}>Enable AI features</div>
          <div style={{ fontSize:12, color:C.text3, marginTop:2 }}>Master switch for drafting & summarising across the app.</div>
        </div>
        <label style={{ display:'inline-flex', alignItems:'center', gap:8, cursor:'pointer' }}>
          {savingMaster && <Spinner />}
          <input type="checkbox" checked={enabled} onChange={e => saveMaster(e.target.checked)} style={{ width:18, height:18 }} />
        </label>
      </div>

      {/* Failover explainer */}
      <div style={{ background:'#f5f3ff', border:'1.5px solid #ddd6fe', borderRadius:12, padding:'12px 16px', fontSize:12.5, color:'#5b21b6', lineHeight:1.6, display:'flex', gap:8 }}>
        <Lightning size={18} weight="fill" style={{ flexShrink:0, marginTop:1 }} />
        <span>Add several free keys below. On each request the app tries them in <b>priority order</b> (lower number first) and automatically falls back to the next when one is rate-limited or fails — so you can stack free tiers.</span>
      </div>

      {/* Key pool */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <h2 style={{ fontSize:15, fontWeight:700, color:C.text1, margin:0 }}>API keys ({keys.length})</h2>
        <Button variant="secondary" size="sm" icon={<Plus size={14} />} onClick={addKey}>Add key</Button>
      </div>

      {keys.length === 0 && (
        <div style={{ padding:'28px', textAlign:'center', border:'1.5px dashed '+C.border, borderRadius:12, color:C.text3, fontSize:13 }}>
          No keys yet. Click <b>Add key</b> to add a free NVIDIA NIM, Groq, Gemini or OpenRouter key.
        </div>
      )}

      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        {keys.map((k, i) => {
          const hint = HINTS[k.provider] ?? HINTS.nvidia
          return (
            <div key={k.id ?? 'new-'+i} style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:14, padding:'18px 20px', display:'flex', flexDirection:'column', gap:12, opacity: k.enabled ? 1 : 0.7 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1.4fr 90px', gap:12, alignItems:'end' }}>
                <Input label="Label" value={k.label} onChange={e => patch(i, { label: e.target.value })} placeholder={hint ? k.provider : 'e.g. NIM #1'} />
                <Select label="Provider" value={k.provider} onChange={e => patch(i, { provider: e.target.value, _testRes: null })} options={PROVIDERS} />
                <Input label="Priority" type="number" value={String(k.priority)} onChange={e => patch(i, { priority: parseInt(e.target.value) || 0 })} />
              </div>

              <div>
                <Input label="API Key" type="password" value={k._apiKey} onChange={e => patch(i, { _apiKey: e.target.value })}
                  placeholder={k.hasKey ? '•••••••• (saved — leave blank to keep)' : 'Paste your key'} />
                <p style={{ fontSize:11, color:C.text3, margin:'6px 0 0' }}>Free key at <b>{hint.keyUrl}</b>. {hint.note}</p>
              </div>

              <div style={{ display:'grid', gridTemplateColumns: k.provider === 'gemini' ? '1fr' : '1fr 1fr', gap:12 }}>
                <Input label="Model" value={k.model} onChange={e => patch(i, { model: e.target.value })} placeholder={hint.model} />
                {k.provider !== 'gemini' && <Input label="Base URL (optional override)" value={k.baseUrl} onChange={e => patch(i, { baseUrl: e.target.value })} placeholder={hint.base} />}
              </div>

              <div style={{ display:'flex', alignItems:'center', gap:14, flexWrap:'wrap' }}>
                <label style={{ display:'inline-flex', alignItems:'center', gap:7, cursor:'pointer', fontSize:12.5, fontWeight:600, color:C.text2 }}>
                  <input type="checkbox" checked={k.enabled} onChange={e => patch(i, { enabled: e.target.checked })} style={{ width:15, height:15 }} />
                  Enabled (in failover pool)
                </label>
                <div style={{ flex:1 }} />
                <Button variant="primary" size="sm" loading={k._saving} onClick={() => saveKey(i)}>Save</Button>
                <Button variant="secondary" size="sm" loading={k._testing} onClick={() => testKey(i)} disabled={!k.id}>Test</Button>
                <Button variant="ghost" size="sm" icon={<Trash size={14} />} onClick={() => removeKey(i)}>Delete</Button>
              </div>

              {k._testRes && (
                <div style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:12, fontWeight:600, color: k._testRes.ok ? C.green : C.red }}>
                  {k._testRes.ok ? <CheckCircle size={15} weight="fill" /> : <XCircle size={15} weight="fill" />}{k._testRes.message}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div style={{ background:'#eff6ff', border:'1.5px solid #bfdbfe', borderRadius:12, padding:'14px 18px', fontSize:12.5, color:'#1d4ed8', lineHeight:1.6 }}>
        Privacy: text you send for drafting/summarising goes to the provider of whichever key handles the request. Don't include Aadhaar, bank or other sensitive personal data. AI only <b>drafts</b> — you review and approve before anything is saved or sent.
      </div>
    </div>
  )
}
