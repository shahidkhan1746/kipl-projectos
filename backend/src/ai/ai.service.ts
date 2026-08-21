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
  gemini:     { kind: 'gemini', base: '',                                     model: 'gemini-2.5-flash',                 embeddingModel: 'gemini-embedding-2' },
  openai:     { kind: 'openai', base: 'https://api.openai.com/v1',            model: 'gpt-4o-mini',                      embeddingModel: 'text-embedding-3-small' },
  nvidia:     { kind: 'openai', base: 'https://integrate.api.nvidia.com/v1',  model: 'meta/llama-3.1-8b-instruct',       embeddingModel: 'nvidia/nv-embed-v1' },
  groq:       { kind: 'openai', base: 'https://api.groq.com/openai/v1',       model: 'llama-3.3-70b-versatile',          embeddingModel: '' },
  openrouter: { kind: 'openai', base: 'https://openrouter.ai/api/v1',         model: 'meta-llama/llama-3.1-8b-instruct:free', embeddingModel: '' },
  mistral:    { kind: 'openai', base: 'https://api.mistral.ai/v1',            model: 'mistral-small-latest',             embeddingModel: 'mistral-embed' },
  cerebras:   { kind: 'openai', base: 'https://api.cerebras.ai/v1',           model: 'llama3.1-8b',                      embeddingModel: '' },
  together:   { kind: 'openai', base: 'https://api.together.xyz/v1',          model: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo', embeddingModel: 'togethercomputer/m2-bert-80M-8k-retrieval' },
  ollama:     { kind: 'openai', base: 'http://localhost:11434/v1',            model: 'llama3.1',                         embeddingModel: 'nomic-embed-text' },
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
  // Embeddings MUST come from a single, stable provider — different providers
  // return different vector dimensions (Gemini 3072, NVIDIA 4096, OpenAI 1536),
  // and mixing dimensions in ai_document_chunks breaks the similarity query.
  // So we pick one embedding provider by a FIXED order (independent of the chat
  // failover priority) and never silently fall over to a different-dimension one.
  // NOTE: changing which provider wins here requires a full re-sync of the vault.
  private readonly EMBED_ORDER = ['gemini', 'openai', 'nvidia']

  private async embeddingKey(): Promise<AiKey | null> {
    const keys = (await this.keyRepo.find()).filter(k => k.enabled && k.apiKey && presetOf(k.provider).embeddingModel)
    for (const prov of this.EMBED_ORDER) {
      const k = keys.find(x => x.provider === prov)
      if (k) return k
    }
    return keys[0] ?? null
  }

  /** Whether at least one enabled key can produce embeddings (RAG available). */
  async embeddingAvailable(): Promise<boolean> {
    return !!(await this.embeddingKey())
  }

  async getEmbedding(text: string): Promise<number[] | null> {
    const k = await this.embeddingKey()
    if (!k) {
      console.error('getEmbedding failed: No active embedding key found')
      return null
    }
    const preset = presetOf(k.provider)
    // Fix: Fallback to correct model if using the old deprecated model names
    const embModel = (preset.embeddingModel === 'gemini-embedding-001' || preset.embeddingModel === 'text-embedding-004') ? 'gemini-embedding-2' : preset.embeddingModel
    const f: any = (globalThis as any).fetch
    try {
      if (preset.kind === 'gemini') {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${embModel}:embedContent?key=${k.apiKey}`
        const r = await f(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ model: `models/${embModel}`, content: { parts: [{ text }] } }) })
        const data = await r.json()
        if (data?.embedding?.values) {
          return data.embedding.values
        } else {
          console.error(`Gemini embedding failed. Status: ${r.status}, Data:`, JSON.stringify(data))
        }
      } else {
        const base = ((k.baseUrl || '').trim() || preset.base).replace(/\/$/, '')
        const r = await f(`${base}/embeddings`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${k.apiKey}` }, body: JSON.stringify({ model: embModel, input: text }) })
        const data = await r.json()
        if (data?.data?.[0]?.embedding) {
          return data.data[0].embedding
        } else {
          console.error(`OpenAI/Custom embedding failed. Status: ${r.status}, Data:`, JSON.stringify(data))
        }
      }
    } catch (e: any) {
      console.error(`getEmbedding threw an exception: ${e.message}`)
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

    // 3. Embed Query and Retrieve Context — HYBRID SEARCH (Vector + Keyword)
    //    We use Reciprocal Rank Fusion (RRF) to combine semantic and exact matches,
    //    ensuring highly relevant document chunks outrank terse exact-match DB stubs.
    let contextText = ''
    try {
      const emb = await this.getEmbedding(query)
      if (emb) {
        const vectorStr = `[${emb.join(',')}]`
        const params: any[] = [vectorStr, query]
        let projCondition = projectId ? `("projectId" = $3 OR "projectId" IS NULL)` : `1=1`
        if (projectId) params.push(projectId)

        // Query A: Semantic Search (Vector Similarity)
        const semanticSql = `
          SELECT id, text, "sourceName", "sourceType", 1 - (embedding <=> $1::vector) AS similarity
          FROM ai_document_chunks
          WHERE ${projCondition}
          ORDER BY embedding <=> $1::vector LIMIT 30
        `
        const semanticChunks = await this.chunkRepo.query(semanticSql, params)

        // Query B: Exact Keyword Search (PostgreSQL Full Text Search)
        const keywordSql = `
          SELECT id, text, "sourceName", "sourceType", 
                 ts_rank(to_tsvector('english', text), plainto_tsquery('english', $2)) AS keyword_score
          FROM ai_document_chunks
          WHERE ${projCondition} AND to_tsvector('english', text) @@ plainto_tsquery('english', $2)
          ORDER BY keyword_score DESC LIMIT 30
        `
        const keywordChunks = await this.chunkRepo.query(keywordSql, params).catch(() => [])

        // ── Reciprocal Rank Fusion (RRF) to merge both result sets
        const rrfMap = new Map<string, any>()
        const RRF_K = 60

        semanticChunks.forEach((c: any, index: number) => {
          // Keep a minimum similarity threshold for purely semantic hits
          if (parseFloat(c.similarity) >= 0.35) {
            rrfMap.set(c.id, { ...c, rrfScore: 1 / (RRF_K + index + 1) })
          }
        })

        keywordChunks.forEach((c: any, index: number) => {
          const score = 1 / (RRF_K + index + 1)
          if (rrfMap.has(c.id)) {
            rrfMap.get(c.id).rrfScore += score
          } else {
            // Keyword match chunks are always included, even if low semantic similarity
            rrfMap.set(c.id, { ...c, similarity: 0.35, rrfScore: score }) 
          }
        })

        const fusedChunks = Array.from(rrfMap.values())

        if (fusedChunks.length > 0) {
          // ── Source-type boost: rich documents get a scoring advantage over
          //    terse operational records that often share keywords but lack depth.
          const SOURCE_BOOST: Record<string, number> = {
            knowledge_vault:  0.030,
            liaison_document: 0.020,
            letter:           0.010,
            meeting:          0.010,
            site_diary:       0.005,
            qa_inspection:    0.005,
            site_order:       0.005,
            material_register:0.005,
            timesheet:        0.000,
            project:          0.000,
            wbs_task:        -0.005,
            settings:        -0.005,
            vendor:          -0.010,
            employee:        -0.010,
            user:            -0.010,
            attendance:      -0.020,
          }

          // Score, sort by boosted RRF
          const scored = fusedChunks
            .map((c: any) => ({
              ...c,
              boosted: c.rrfScore + (SOURCE_BOOST[c.sourceType] ?? 0),
            }))
            .sort((a: any, b: any) => b.boosted - a.boosted)

          // ── Per-type cap: prevent any single source type from flooding context.
          const MAX_PER_TYPE: Record<string, number> = {
            knowledge_vault:  5,
            liaison_document: 3,
            letter:           2,
            meeting:          2,
            site_diary:       2,
            site_order:       2,
            qa_inspection:    2,
          }
          const DEFAULT_TYPE_CAP = 1
          const MAX_TOTAL = 8 // final context window budget

          const typeCounts: Record<string, number> = {}
          const selected: any[] = []
          for (const c of scored) {
            if (selected.length >= MAX_TOTAL) break
            const t = c.sourceType || 'unknown'
            const cap = MAX_PER_TYPE[t] ?? DEFAULT_TYPE_CAP
            typeCounts[t] = (typeCounts[t] || 0) + 1
            if (typeCounts[t] <= cap) selected.push(c)
          }

          contextText = selected
            .map((c: any) => `[Type: ${c.sourceType || 'unknown'}] Source: ${c.sourceName || 'Document'}\nContent: ${c.text}`)
            .join('\n\n')
        }
      }
    } catch (ragErr) {
      console.warn('RAG embedding/similarity query failed:', ragErr)
    }

    // 4. Build Conversation History (Pruned to last 4 turns to prevent poisoned threads)
    const historyRaw = await this.msgRepo.find({ 
      where: { sessionId: session.id }, 
      order: { createdAt: 'DESC' },
      take: 8 
    })
    const history = historyRaw.reverse()
    let prompt = ''
    if (contextText) {
      prompt += `[CONTEXT INFORMATION]\n${contextText}\n\n`
    }
    prompt += `[CONVERSATION HISTORY]\n`
    history.forEach(m => {
      prompt += `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}\n\n`
    })
    prompt += `Assistant: `

    const systemInstruction = `You are ProjectOS Intelligence, the specialized AI engineer and project operations advisor for Khilari Infrastructure Pvt. Ltd. (KIPL) on the Srinagar STP & Sewerage Network project (Dal Lake Sewerage Scheme).

YOUR COMPREHENSIVE KNOWLEDGE DOMAIN:
1. CONTRACTS & MILESTONES: Agreement execution dates, commencement dates, project duration, defects liability period, liquidated damages, milestone deliverables, WBS tasks, and approved material brands (Ultratech/ACC/Ambuja cement, TATA Tiscon/SAIL/JSW steel, Kirloskar pumps, etc.).
2. SUBCONTRACTORS, SPECIALIST AGENCIES & VENDORS:
   - Specialized engineering subcontractors, civil subcontractors, and trade agencies registered in the project vendor list.
   - Material suppliers (aggregates, sand, cement, steel, RMC, piping).
   - Equipment hire and labour contractors.
   - NOTE: When asked "Who is [Name]", project entities can be Subcontractors, Specialist Agencies, Material Suppliers, Clients (J&K UEED), Statutory Authorities (LCMA, SMC, Forest Dept, Traffic Police), Academic Consultants (NIT Srinagar, IIT Jammu, DIQC, IRMA), or KIPL Employees / Site Staff.
3. EMPLOYEES & SITE WORKFORCE: Site managers, project managers, quality engineers, site engineers, supervisors, machine operators, surveyors, and labour force.
4. SITE ORDERS BOOK & INSTRUCTIONS: Official instructions issued during site inspections by the Engineer-in-Charge (EIC / UEED / XEN), compliance status, and acknowledgement logs.
5. MATERIAL CONSUMPTION REGISTER: Daily inward receipts, consumption, and balance-in-hand for cement and steel (Clause 55), signed by Contractor and UEED representatives.
6. QUALITY ASSURANCE & NCRs: QA checklists, inspections, pass/fail results, and Non-Conformance Reports.
7. LETTERS & FORMAL COMMUNICATION: Official incoming and outgoing correspondence with UEED, LCMA, Chief Engineer, PMC consultants, and contractors.
8. MINUTES OF MEETING (MOM): Key discussions, decisions, assigned action items, responsible officers, and due dates.
9. LIAISON & CLEARANCES: Status of forest, traffic, highway, and municipal clearances, EOT (Extension of Time) delay grounds, and remarks.
10. SITE DIARIES & DAILY LOGS: Daily activities, labor counts, machinery deployment, and site obstacles.

ANSWERING GUIDELINES & STRICT SCOPE RELEVANCE:

CONTEXT CHUNK TYPES — Each chunk in [CONTEXT INFORMATION] is tagged with [Type: ...]. The types are:
  knowledge_vault / liaison_document = Uploaded documents (PDFs, spreadsheets, reports) — RICHEST source of truth.
  letter / meeting / site_diary / site_order / qa_inspection / material_register / timesheet = Operational records.
  wbs_task = WBS schedule stubs (often just a title + status with NO descriptive detail).
  vendor / employee / user / attendance / settings / project = Background entity records.

RULE 1 — PRIORITISE DOCUMENTS: When [Type: knowledge_vault] or [Type: liaison_document] chunks are present in the context, they are the PRIMARY source of truth. Prefer their content over terse WBS stubs or entity records.

RULE 2 — STRICT TOPICAL ISOLATION: When the user asks about a specific facility, component, task, or topic (e.g., "IPS 1", "STP 30 MLD", "Sewer Line", "Pipe Jacking"):
  • ONLY include information from context chunks that EXPLICITLY mention or describe that specific topic.
  • If a context chunk is about a DIFFERENT topic (e.g., a vendor record for ground improvement when the question is about a pumping station), COMPLETELY IGNORE that chunk — do NOT mention it, reference it, or try to connect it to the question.
  • Do NOT create an "Associated Entities", "Related Vendors", or "Related Personnel" section by pulling in random vendor/employee records that happen to appear in the context but are NOT explicitly linked to the asked topic.

RULE 3 — NO HALLUCINATED CONNECTIONS: Do NOT infer or fabricate relationships. For example:
  • If the user asks "Tell me about IPS 1" and the context contains a vendor record for "Keller Ground Engineering" (vibro stone columns), do NOT mention Keller unless the context EXPLICITLY says Keller is working on IPS 1.
  • If an employee record for a machine operator appears in the context, do NOT speculate they "may be involved" in the asked task unless the context EXPLICITLY assigns them.

RULE 4 — GROUND EVERY FACT: Only state facts that appear verbatim in the [CONTEXT INFORMATION] block or directly relevant earlier messages. NEVER invent people, roles, dates, quantities, amounts, letter/file numbers, or vendor details. If a detail is not in the context, say "This information is not available in the current records."

RULE 5 — CITE SOURCES: When stating a fact from context, cite its source (the "Source:" line, letter number, document name, or meeting title).

RULE 6 — NO HYPOTHETICAL/SAMPLE DATA: If the user asks you to "create", "generate", or "list" something (e.g., a roster, a schedule, a list of employees), you MUST ONLY use exact data from the context. If the context does not contain enough data to fulfill the request, clearly state: "I cannot generate this because I do not have the required data in my current context." Do NOT generate hypothetical, sample, or dummy data (like "John Doe" or hallucinated names) under any circumstances.

RULE 7 — FORMATTING: Structure responses with clean Markdown (bold headings, concise bullets, tables for comparisons/dates). Keep answers focused and concise.`

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
