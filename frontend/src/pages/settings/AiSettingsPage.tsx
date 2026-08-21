import { useState, useEffect } from 'react'
import { Sparkle, Cube, Lightning, HardDrives, Desktop, Wind, Hexagon, TreeStructure, Server, Smiley, Eye, EyeSlash } from '@phosphor-icons/react'
import { aiApi } from '@/api/ai.api'
import { toast } from '@/lib/notify'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'

const PROVIDERS = [
  { id: 'gemini',     name: 'Google Gemini',  subtitle: 'Gemini 2.5 Flash — generous free tier',      icon: Cube,       color: '#3b82f6', limits: '15 RPM free', url: 'aistudio.google.com' },
  { id: 'groq',       name: 'Groq',           subtitle: 'Llama 3.3 70B — ultra-fast inference',       icon: Lightning,  color: '#f97316', limits: '30 RPM free', url: 'console.groq.com' },
  { id: 'ollama',     name: 'Ollama',         subtitle: 'Self-hosted — runs on your own server',      icon: HardDrives, color: '#334155', limits: 'Unlimited',   url: 'http://localhost:11434' },
  { id: 'nvidia',     name: 'NVIDIA NIM',     subtitle: 'Llama 3.3 70B — NVIDIA cloud inference',     icon: Desktop,    color: '#22c55e', limits: '1000 free/mo',url: 'build.nvidia.com' },
  { id: 'mistral',    name: 'Mistral AI',     subtitle: 'Mistral Small — fast European AI',           icon: Wind,       color: '#ea580c', limits: 'Free tier',   url: 'console.mistral.ai' },
  { id: 'openrouter', name: 'OpenRouter',     subtitle: 'Meta Llama 3.3 70B — free model aggregator', icon: Cube,       color: '#8b5cf6', limits: 'Free models', url: 'openrouter.ai/keys' },
  { id: 'cerebras',   name: 'Cerebras',       subtitle: 'Llama 3.1 8B — fastest inference on earth',  icon: HardDrives, color: '#ef4444', limits: 'Free tier',   url: 'cloud.cerebras.ai' },
  { id: 'cohere',     name: 'Cohere',         subtitle: 'Command R — strong multilingual model',      icon: Hexagon,    color: '#7c3aed', limits: '20 RPM free', url: 'dashboard.cohere.com' },
  { id: 'together',   name: 'Together AI',    subtitle: 'Llama 3.1 8B Turbo — free model available',  icon: TreeStructure,color: '#10b981', limits: 'Free tier', url: 'api.together.ai' },
  { id: 'sambanova',  name: 'SambaNova',      subtitle: 'Llama 3.1 8B — enterprise-grade free tier',  icon: Server,     color: '#0d9488', limits: 'Free tier',   url: 'cloud.sambanova.ai' },
  { id: 'huggingface',name: 'Hugging Face',   subtitle: 'Llama 3 8B — open-source model hub',         icon: Smiley,     color: '#eab308', limits: 'Free tier',   url: 'huggingface.co/settings/tokens' },
]

export default function AiSettingsPage() {
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  
  // local UI state mapping providerId -> { apiKey, enabled, priority, showKey, testing, id }
  const [localState, setLocalState] = useState<Record<string, any>>({})

  async function load() {
    try {
      const r = await aiApi.getConfig()
      setEnabled(!!r.data.enabled)
      const dbKeys = r.data.keys ?? []
      
      const stateMap: Record<string, any> = {}
      PROVIDERS.forEach((p, idx) => {
        const dbK = dbKeys.find((k: any) => k.provider === p.id)
        stateMap[p.id] = {
          id: dbK?.id,
          apiKey: dbK?.hasKey ? '••••••••' : '',
          enabled: dbK ? dbK.enabled : false,
          priority: dbK ? dbK.priority : (idx + 1),
          showKey: false,
          testing: false
        }
      })
      setLocalState(stateMap)
    } catch (e: any) {
      toast.error('Could not load AI settings')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const updateLocal = (providerId: string, patch: any) => {
    setLocalState(s => ({ ...s, [providerId]: { ...s[providerId], ...patch } }))
  }

  async function saveMaster(next: boolean) {
    setEnabled(next)
    try { 
      await aiApi.saveConfig({ enabled: next }) 
    } catch (e: any) { 
      toast.error('Failed to update config')
      setEnabled(!next) 
    }
  }

  async function saveAll() {
    let saved = 0
    let failed = 0
    for (const p of PROVIDERS) {
      const st = localState[p.id]
      if (!st) continue
      const hasRealKey = st.apiKey && st.apiKey !== '••••••••'
      if (!st.id && !hasRealKey && !st.enabled) continue
      
      const body = {
        label: p.name,
        provider: p.id,
        enabled: st.enabled,
        priority: st.priority,
        apiKey: hasRealKey ? st.apiKey : undefined
      }
      try {
        if (st.id) await aiApi.updateKey(st.id, body)
        else {
          const res = await aiApi.createKey(body)
          st.id = res.data.id
        }
        saved++
      } catch (e: any) {
        failed++
      }
    }
    if (failed > 0) toast.error(`Failed to save ${failed} integrations`)
    else if (saved > 0) toast.success('Integrations saved successfully')
    await load()
  }

  async function testKey(providerId: string) {
    const st = localState[providerId]
    if (!st.id) { toast.error(`Save settings first before testing`); return }
    updateLocal(providerId, { testing: true })
    try { 
      const r = await aiApi.testKey(st.id)
      if (r.data.ok) toast.success(`${providerId} connection successful`)
      else toast.error(`${providerId} test failed: ${r.data.message}`)
    }
    catch (e: any) { toast.error(`Test failed: ` + (e?.response?.data?.message ?? e?.message)) }
    finally { updateLocal(providerId, { testing: false }) }
  }

  if (loading) return <div style={{ display:'flex', justifyContent:'center', padding:60 }}><Spinner /></div>

  return (
    <div className="fade-in" style={{ display:'flex', flexDirection:'column', gap:20, paddingBottom: 100, maxWidth: 1200 }}>
      {/* Header section */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f3e8ff', color: '#9333ea', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkle size={24} weight="fill" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>AI Integration</h2>
            <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>Free AI providers for writing notifications, announcements and more</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#475569' }}>Auto-failover</span>
          <label className="switch">
            <input type="checkbox" checked={enabled} onChange={e => saveMaster(e.target.checked)} />
            <span className="slider round"></span>
          </label>
        </div>
      </div>

      {enabled && (
        <div style={{ background: '#eff6ff', borderRadius: 8, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, border: '1px solid #bfdbfe' }}>
          <Lightning size={18} color="#2563eb" weight="fill" />
          <span style={{ fontSize: 13, color: '#1e3a8a' }}>
            <strong>Auto-failover enabled:</strong> When one provider's free limit is exhausted, the system automatically switches to the next available provider in priority order.
          </span>
        </div>
      )}

      {/* Grid of providers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
        {PROVIDERS.map(p => {
          const st = localState[p.id] || {}
          return (
            <div key={p.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              
              {/* Card Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: p.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <p.icon size={20} weight="fill" />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{p.name}</h3>
                    <p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>{p.subtitle}</p>
                  </div>
                </div>
                <label className="switch">
                  <input type="checkbox" checked={!!st.enabled} onChange={e => updateLocal(p.id, { enabled: e.target.checked })} />
                  <span className="slider round"></span>
                </label>
              </div>

              {/* Badges */}
              <div style={{ display: 'flex', gap: 8 }}>
                <span style={{ background: '#f1f5f9', color: '#475569', fontSize: 10, padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>{p.limits}</span>
                <span style={{ background: '#f1f5f9', color: '#475569', fontSize: 10, padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>Priority #{st.priority}</span>
              </div>

              {/* API Key */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>API Key</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type={st.showKey ? "text" : "password"} 
                    value={st.apiKey || ''} 
                    onChange={e => updateLocal(p.id, { apiKey: e.target.value })}
                    placeholder={`Enter ${p.name} API key`}
                    style={{ width: '100%', padding: '8px 36px 8px 12px', fontSize: 13, borderRadius: 6, border: '1px solid #cbd5e1', outline: 'none' }}
                  />
                  <button 
                    onClick={() => updateLocal(p.id, { showKey: !st.showKey })}
                    style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 }}
                  >
                    {st.showKey ? <EyeSlash size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Get key at {p.url}</div>
              </div>

              {/* Bottom Row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 'auto' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Priority</label>
                  <select 
                    value={st.priority || 1} 
                    onChange={e => updateLocal(p.id, { priority: parseInt(e.target.value) })}
                    style={{ width: '100%', padding: '6px 10px', fontSize: 13, borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff' }}
                  >
                    {[1,2,3,4,5,6,7,8,9,10,11].map(n => <option key={n} value={n}>#{n}</option>)}
                  </select>
                </div>
                <div style={{ width: 1, height: 32, background: '#e2e8f0', alignSelf: 'flex-end' }}></div>
                <button 
                  onClick={() => testKey(p.id)}
                  disabled={st.testing}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', fontSize: 13, fontWeight: 500, color: '#475569', background: 'none', border: '1px solid #cbd5e1', borderRadius: 6, cursor: 'pointer', alignSelf: 'flex-end' }}
                >
                  {st.testing ? <Spinner size="sm" /> : <Lightning size={14} />}
                  Test
                </button>
              </div>

            </div>
          )
        })}
      </div>

      {/* AI-Powered Features */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 20, display: 'flex', flexDirection: 'column', gap: 12, marginTop: 10 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', color: '#6b7280', fontWeight: 600, fontSize: 13, marginBottom: 4 }}>
          <Sparkle size={16} weight="fill" color="#9333ea" />
          AI-Powered Features
        </div>
        {[
          'Analyze heavy contract documents, BOQs, and specifications via the Knowledge Vault',
          'Draft professional Site Orders and Liaison letters automatically',
          'Extract actionable WBS task progress from unstructured daily reports',
          'Generate comprehensive QA & NCR inspection summaries',
          'Intelligent conversational chat about the entire Srinagar STP project context'
        ].map((feat, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 13, color: '#475569' }}>
            <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
            {feat}
          </div>
        ))}
      </div>

      {/* Floating Save Button */}
      <div style={{ position: 'fixed', bottom: 20, right: 32, zIndex: 100 }}>
        <Button variant="success" onClick={saveAll} size="md" style={{ borderRadius: 8, padding: '12px 24px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}>
          Save All Integrations
        </Button>
      </div>

      <style>{`
        .switch { position: relative; display: inline-block; width: 36px; height: 20px; }
        .switch input { opacity: 0; width: 0; height: 0; }
        .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #cbd5e1; transition: .3s; }
        .slider:before { position: absolute; content: ""; height: 16px; width: 16px; left: 2px; bottom: 2px; background-color: white; transition: .3s; }
        input:checked + .slider { background-color: #059669; }
        input:checked + .slider:before { transform: translateX(16px); }
        .slider.round { border-radius: 20px; }
        .slider.round:before { border-radius: 50%; }
      `}</style>
    </div>
  )
}
