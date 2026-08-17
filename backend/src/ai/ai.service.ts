import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AiConfig } from './ai-config.entity'
import { AiKey } from './ai-key.entity'
import { AiChatSession } from './ai-chat-session.entity'
import { AiChatMessage } from './ai-chat-message.entity'
import { AiDocumentChunk } from './ai-document-chunk.entity'

// Provider presets. `kind` picks the wire format; base/model are defaults the
// per-key values override. NVIDIA NIM, Groq and OpenRouter all speak the
// OpenAI chat-completions format, so they reuse the same adapter.
type Preset = { kind: 'gemini' | 'openai'; base: string; model: string; embeddingModel: string }
const PRESETS: Record<string, Preset> = {
  gemini:     { kind: 'gemini', base: '',                                     model: 'gemini-2.5-flash',                 embeddingModel: 'gemini-embedding-001' },
  openai:     { kind: 'openai', base: 'https://api.openai.com/v1',            model: 'gpt-4o-mini',                      embeddingModel: 'text-embedding-3-small' },
  nvidia:     { kind: 'openai', base: 'https://integrate.api.nvidia.com/v1',  model: 'meta/llama-3.1-8b-instruct',       embeddingModel: 'nvidia/nv-embed-v1' },
  groq:       { kind: 'openai', base: 'https://api.groq.com/openai/v1',       model: 'llama-3.3-70b-versatile',          embeddingModel: '' },
  openrouter: { kind: 'openai', base: 'https://openrouter.ai/api/v1',         model: 'meta-llama/llama-3.1-8b-instruct:free', embeddingModel: '' },
}
const presetOf = (p: string): Preset => PRESETS[p] ?? PRESETS.gemini

@Injectable()
export class AiService {
  constructor(
    @InjectRepository(AiConfig) private cfgRepo: Repository<AiConfig>,
    @InjectRepository(AiKey) private keyRepo: Repository<AiKey>,
    @InjectRepository(AiChatSession) private sessionRepo: Repository<AiChatSession>,
    @InjectRepository(AiChatMessage) private msgRepo: Repository<AiChatMessage>,
    @InjectRepository(AiDocumentChunk) private chunkRepo: Repository<AiDocumentChunk>,
  ) {}

  private async configRow(): Promise<AiConfig | null> {
    const rows = await this.cfgRepo.find({ take: 1, order: { createdAt: 'ASC' } })
    return rows[0] ?? null
  }

  // ── Master config (enable toggle) + masked key list for the frontend ──────
  async getMasked() {
    const c = await this.configRow()
    const keys = await this.keyRepo.find({ order: { priority: 'ASC', createdAt: 'ASC' } })
    return {
      enabled: !!c?.enabled,
      keys: keys.map(k => ({
        id: k.id, label: k.label, provider: k.provider,
        model: k.model ?? '', baseUrl: k.baseUrl ?? '',
        enabled: k.enabled, priority: k.priority, hasKey: !!k.apiKey,
      })),
    }
  }

  async saveConfig(body: any) {
    let c = await this.configRow()
    if (!c) c = this.cfgRepo.create()
    c.enabled = !!body.enabled
    await this.cfgRepo.save(c)
    return { ok: true }
  }

  // ── Key pool CRUD ─────────────────────────────────────────────────────────
  private hasMask(s?: string) { return !!s && s.includes('•') }

  async createKey(body: any) {
    const k = this.keyRepo.create({
      label: (body.label || '').trim() || (body.provider || 'nvidia'),
      provider: body.provider || 'nvidia',
      apiKey: !this.hasMask(body.apiKey) ? (body.apiKey || '').trim() : '',
      model: (body.model || '').trim(),
      baseUrl: (body.baseUrl || '').trim(),
      enabled: body.enabled !== false,
      priority: Number.isFinite(+body.priority) ? +body.priority : 100,
    })
    await this.keyRepo.save(k)
    return { ok: true, id: k.id }
  }

  async updateKey(id: string, body: any) {
    const k = await this.keyRepo.findOne({ where: { id } })
    if (!k) throw new NotFoundException('Key not found')
    if (body.label !== undefined)    k.label = (body.label || '').trim() || k.provider
    if (body.provider !== undefined) k.provider = body.provider || k.provider
    if (body.model !== undefined)    k.model = (body.model || '').trim()
    if (body.baseUrl !== undefined)  k.baseUrl = (body.baseUrl || '').trim()
    if (body.enabled !== undefined)  k.enabled = !!body.enabled
    if (body.priority !== undefined && Number.isFinite(+body.priority)) k.priority = +body.priority
    // Only overwrite the key when a fresh, non-masked value is supplied.
    if (body.apiKey && body.apiKey.trim() && !this.hasMask(body.apiKey)) k.apiKey = body.apiKey.trim()
    await this.keyRepo.save(k)
    return { ok: true }
  }

  async deleteKey(id: string) {
    await this.keyRepo.delete(id)
    return { ok: true }
  }

  // ── Provider-agnostic completion with failover ────────────────────────────
  private async callProvider(k: AiKey, prompt: string, system?: string): Promise<string> {
    const preset = presetOf(k.provider)
    const model = (k.model || '').trim() || preset.model
    const f: any = (globalThis as any).fetch

    if (preset.kind === 'gemini') {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${k.apiKey}`
      const bodyReq: any = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 1400 },
      }
      if (system) bodyReq.systemInstruction = { parts: [{ text: system }] }
      const r = await f(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(bodyReq) })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(data?.error?.message ?? ('HTTP ' + r.status))
      return (data?.candidates?.[0]?.content?.parts ?? []).map((p: any) => p.text).join('').trim() || '(empty response)'
    }

    // OpenAI-compatible (OpenAI / NVIDIA NIM / Groq / OpenRouter)
    const base = ((k.baseUrl || '').trim() || preset.base).replace(/\/$/, '')
    const messages = [system ? { role: 'system', content: system } : null, { role: 'user', content: prompt }].filter(Boolean)
    const r = await f(`${base}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${k.apiKey}` },
      body: JSON.stringify({ model, messages, temperature: 0.4, max_tokens: 1400 }),
    })
    const data = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(data?.error?.message ?? ('HTTP ' + r.status))
    return (data?.choices?.[0]?.message?.content ?? '').trim() || '(empty response)'
  }

  async generate(prompt: string, system?: string): Promise<string> {
    const c = await this.configRow()
    if (!c || !c.enabled) throw new BadRequestException('AI is not enabled. Configure it in Settings → AI.')
    const keys = (await this.keyRepo.find({ order: { priority: 'ASC', createdAt: 'ASC' } }))
      .filter(k => k.enabled && k.apiKey)
    if (!keys.length) throw new BadRequestException('No enabled AI keys with a key set. Add one in Settings → AI.')

    const errors: string[] = []
    for (const k of keys) {
      try {
        return await this.callProvider(k, prompt, system)
      } catch (e: any) {
        errors.push(`${k.label || k.provider}: ${e?.message ?? e}`)
      }
    }
    throw new BadRequestException('All AI keys failed. ' + errors.join(' | '))
  }

  // Test a single saved key by id.
  async testKey(id: string): Promise<{ ok: boolean; message: string }> {
    const k = await this.keyRepo.findOne({ where: { id } })
    if (!k) return { ok: false, message: 'Key not found — save it first.' }
    if (!k.apiKey) return { ok: false, message: 'No key saved for this entry.' }
    try {
      const t = await this.callProvider(k, 'Reply with the single word: OK')
      return { ok: true, message: 'Connected. Model replied: ' + t.slice(0, 40) }
    } catch (e: any) {
      return { ok: false, message: e?.message ?? 'Failed' }
    }
  }
  async getEmbedding(text: string): Promise<number[] | null> {
    const keys = (await this.keyRepo.find({ order: { priority: 'ASC', createdAt: 'ASC' } })).filter(k => k.enabled && k.apiKey)
    if (!keys.length) return null
    const f: any = (globalThis as any).fetch

    for (const k of keys) {
      try {
        const preset = presetOf(k.provider)
        const embModel = preset.embeddingModel
        if (!embModel) continue // provider doesn't support embedding preset yet

        if (preset.kind === 'gemini') {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${embModel}:embedContent?key=${k.apiKey}`
          const r = await f(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ model: `models/${embModel}`, content: { parts: [{ text }] } }) })
          const data = await r.json()
          if (data?.embedding?.values) return data.embedding.values
        } else if (preset.kind === 'openai') {
          const base = ((k.baseUrl || '').trim() || preset.base).replace(/\/$/, '')
          const r = await f(`${base}/embeddings`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${k.apiKey}` }, body: JSON.stringify({ model: embModel, input: text }) })
          const data = await r.json()
          if (data?.data?.[0]?.embedding) return data.data[0].embedding
        }
      } catch (e) {}
    }
    return null
  }

  async chat(sessionId: string, query: string, userId: string, projectId: string): Promise<string> {
    // 1. Get or Create Session
    let session = await this.sessionRepo.findOne({ where: { id: sessionId } })
    if (!session) {
      session = this.sessionRepo.create({
        id: sessionId,
        title: query.substring(0, 50),
        userId,
        projectId: projectId || undefined,
      })
      await this.sessionRepo.save(session)
    }

    // 2. Save User Message
    await this.msgRepo.save(this.msgRepo.create({ sessionId: session.id, role: 'user', content: query }))

    // 3. Embed Query and Retrieve Context
    let contextText = ''
    try {
      const emb = await this.getEmbedding(query)
      if (emb) {
        const vectorStr = `[${emb.join(',')}]`
        let querySql = `SELECT text, "sourceName", 1 - (embedding <=> $1::vector) AS similarity FROM ai_document_chunks`
        const params: any[] = [vectorStr]
        if (projectId) {
          querySql += ` WHERE "projectId" = $2 OR "projectId" IS NULL`
          params.push(projectId)
        }
        querySql += ` ORDER BY embedding <=> $1::vector LIMIT 5`

        const chunks = await this.chunkRepo.query(querySql, params)
        if (chunks && chunks.length > 0) {
          contextText = chunks.map((c: any) => `Source: ${c.sourceName || 'Document'}\nContent: ${c.text}`).join('\n\n')
        }
      }
    } catch (ragErr) {
      console.warn('RAG embedding/similarity query failed:', ragErr)
    }

    // 4. Build Conversation History
    const history = await this.msgRepo.find({ where: { sessionId: session.id }, order: { createdAt: 'ASC' } })
    let prompt = ''
    if (contextText) {
      prompt += `[CONTEXT INFORMATION]\n${contextText}\n\n`
    }
    prompt += `[CONVERSATION HISTORY]\n`
    history.forEach(m => {
      prompt += `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}\n\n`
    })
    prompt += `Assistant: `

    const systemInstruction = `You are ProjectOS Intelligence, the specialized AI engineer and project operations advisor for Khilari Infrastructure Pvt. Ltd. (KIPL) on the Srinagar STP & Sewerage Network project.

YOUR KNOWLEDGE DOMAIN:
1. CONTRACTS & MILESTONES: Agreement execution dates, commencement dates, project duration, defects liability period, liquidated damages, milestone deliverables, and approved material brands (Ultratech/ACC/Ambuja cement, TATA Tiscon/SAIL/JSW steel, Kirloskar pumps, etc.).
2. LETTERS & COMMUNICATION: Official incoming and outgoing correspondence with UEED, LCMA, Chief Engineer, PMC consultants, and contractors.
3. MINUTES OF MEETING (MOM): Key discussions, decisions, assigned action items, responsible officers, and due dates.
4. LIAISON & CLEARANCES: Status of forest, traffic, highway, and municipal clearances, EOT (Extension of Time) delay grounds, and remarks.
5. SITE DIARIES & PROGRESS: Daily activities, labor counts, machinery deployment, and site obstacles.

ANSWERING GUIDELINES:
- Structure responses with clean Markdown (bold headings, concise bullet points, tables for comparisons/dates).
- Always reference the source document, letter number, or meeting title when citing facts from the context.
- PROACTIVE ENGAGEMENT: If a user asks for specific legal clauses, full contract schedules, or letters that are missing from the current context, provide the best available answer and proactively invite the user to upload the PDF or letter in the Liaison/Files section so you can immediately index every clause into memory.`

    // 5. Generate Reply
    const reply = await this.generate(prompt, systemInstruction)

    // 6. Save Model Message
    await this.msgRepo.save(this.msgRepo.create({ sessionId: session.id, role: 'model', content: reply }))

    return reply
  }

  async getSessions(userId: string, projectId?: string) {
    const where: any = { userId }
    if (projectId) where.projectId = projectId
    
    return this.sessionRepo.find({
      where,
      order: { updatedAt: 'DESC' }
    })
  }

  async getSessionHistory(sessionId: string) {
    const session = await this.sessionRepo.findOne({ where: { id: sessionId } })
    if (!session) throw new NotFoundException('Session not found')
    const messages = await this.msgRepo.find({
      where: { sessionId },
      order: { createdAt: 'ASC' }
    })
    return { session, messages }
  }

  async deleteSession(sessionId: string, userId: string) {
    const session = await this.sessionRepo.findOne({ where: { id: sessionId, userId } })
    if (!session) throw new NotFoundException('Session not found')
    await this.msgRepo.delete({ sessionId })
    await this.sessionRepo.delete({ id: sessionId })
    return { success: true }
  }
}
