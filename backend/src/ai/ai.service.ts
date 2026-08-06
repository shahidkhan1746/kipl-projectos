import { Injectable, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AiConfig } from './ai-config.entity'

const DEFAULT_MODEL: Record<string, string> = {
  gemini: 'gemini-2.0-flash',
  openai: 'gpt-4o-mini',
}

@Injectable()
export class AiService {
  constructor(@InjectRepository(AiConfig) private repo: Repository<AiConfig>) {}

  private async row(): Promise<AiConfig | null> {
    const rows = await this.repo.find({ take: 1, order: { createdAt: 'ASC' } })
    return rows[0] ?? null
  }

  // Masked view for the frontend — never exposes the key.
  async getMasked() {
    const c = await this.row()
    if (!c) return { enabled: false, provider: 'gemini', model: '', baseUrl: '', hasKey: false }
    return { enabled: c.enabled, provider: c.provider, model: c.model ?? '', baseUrl: c.baseUrl ?? '', hasKey: !!c.apiKey }
  }

  async save(body: any) {
    let c = await this.row()
    if (!c) c = this.repo.create()
    c.enabled = !!body.enabled
    c.provider = body.provider || 'gemini'
    c.model = body.model || ''
    c.baseUrl = body.baseUrl || ''
    // Only overwrite the key when a new one is supplied (blank keeps the stored key).
    if (body.apiKey && body.apiKey.trim() && !body.apiKey.includes('•')) c.apiKey = body.apiKey.trim()
    await this.repo.save(c)
    return { ok: true }
  }

  // ── Provider-agnostic completion ──────────────────────────────────────────
  async generate(prompt: string, system?: string): Promise<string> {
    const c = await this.row()
    if (!c || !c.enabled) throw new BadRequestException('AI is not enabled. Configure it in Settings → AI.')
    if (!c.apiKey) throw new BadRequestException('No API key set for the AI provider.')
    const model = c.model || DEFAULT_MODEL[c.provider] || 'gemini-2.0-flash'
    const f: any = (globalThis as any).fetch

    if (c.provider === 'gemini') {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${c.apiKey}`
      const bodyReq: any = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 1400 },
      }
      if (system) bodyReq.systemInstruction = { parts: [{ text: system }] }
      const r = await f(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(bodyReq) })
      const data = await r.json()
      if (!r.ok) throw new BadRequestException('Gemini: ' + (data?.error?.message ?? r.status))
      return (data?.candidates?.[0]?.content?.parts ?? []).map((p: any) => p.text).join('').trim() || '(empty response)'
    }

    // OpenAI-compatible (OpenAI / Groq / OpenRouter)
    const base = (c.baseUrl || 'https://api.openai.com/v1').replace(/\/$/, '')
    const messages = [system ? { role: 'system', content: system } : null, { role: 'user', content: prompt }].filter(Boolean)
    const r = await f(`${base}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${c.apiKey}` },
      body: JSON.stringify({ model, messages, temperature: 0.4, max_tokens: 1400 }),
    })
    const data = await r.json()
    if (!r.ok) throw new BadRequestException('AI: ' + (data?.error?.message ?? r.status))
    return (data?.choices?.[0]?.message?.content ?? '').trim() || '(empty response)'
  }

  async test(): Promise<{ ok: boolean; message: string }> {
    try {
      const t = await this.generate('Reply with the single word: OK')
      return { ok: true, message: 'Connected. Model replied: ' + t.slice(0, 40) }
    } catch (e: any) {
      return { ok: false, message: e?.message ?? 'Failed' }
    }
  }
}
