import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { DataSource } from 'typeorm'
import { generateText } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createOpenAI } from '@ai-sdk/openai'
import { createEmployeeTools } from './tools/employee.tool'
import { createWbsTools } from './tools/wbs.tool'
import { createVendorTools } from './tools/vendor.tool'
import { createVaultTools, RequestVaultState } from './tools/vault.tool'
import { createEntityResolutionTools } from './tools/entity-resolution.tool'
import { createSiteDiaryTools } from './tools/site-diary.tool'

import { AiConfig } from './ai-config.entity'
import { AiKey } from './ai-key.entity'
import { AiChatSession } from './ai-chat-session.entity'
import { AiChatMessage } from './ai-chat-message.entity'
import { AiDocumentChunk } from './ai-document-chunk.entity'
import { EmbeddingProfileService } from './services/embedding-profile.service'
import { VectorCorpusService, RetrievalDiagnosticResult } from './services/vector-corpus.service'
import { EntityResolutionService } from './services/entity-resolution.service'
import { AiTelemetryService, AiTraceCollector } from './observability/ai-telemetry.service'
import { AiErrorCategory } from './observability/ai-trace.interface'

// Provider presets for LLM Chat generation.
interface Preset {
  kind: 'openai' | 'gemini'
  base: string
  model: string
  embeddingModel: string
}

const PRESETS: Record<string, Preset> = {
  gemini:     { kind: 'gemini', base: 'https://generativelanguage.googleapis.com/v1beta', model: 'gemini-2.5-flash',           embeddingModel: 'text-embedding-004' },
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
  private readonly logger = new Logger(AiService.name)

  constructor(
    @InjectRepository(AiConfig) private cfgRepo: Repository<AiConfig>,
    @InjectRepository(AiKey) private keyRepo: Repository<AiKey>,
    @InjectRepository(AiChatSession) private sessionRepo: Repository<AiChatSession>,
    @InjectRepository(AiChatMessage) private msgRepo: Repository<AiChatMessage>,
    @InjectRepository(AiDocumentChunk) private chunkRepo: Repository<AiDocumentChunk>,
    private dataSource: DataSource,
    private profileService: EmbeddingProfileService,
    private vectorCorpusService: VectorCorpusService,
    private entityResolutionService: EntityResolutionService,
    private telemetryService: AiTelemetryService,
  ) {}

  private async configRow(): Promise<AiConfig | null> {
    const rows = await this.cfgRepo.find({ take: 1, order: { createdAt: 'ASC' } })
    return rows[0] ?? null
  }

  private async ensureAiEnabled(): Promise<void> {
    const c = await this.configRow()
    if (!c?.enabled) {
      throw new BadRequestException('AI is not enabled. Configure it in Settings → AI.')
    }
  }

  // ── Master config (enable toggle) + masked key list for frontend ──────────
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
    if (body.apiKey && body.apiKey.trim() && !this.hasMask(body.apiKey)) k.apiKey = body.apiKey.trim()
    await this.keyRepo.save(k)
    return { ok: true }
  }

  async deleteKey(id: string) {
    await this.keyRepo.delete(id)
    return { ok: true }
  }

  // ── Provider-agnostic LLM completion with failover ────────────────────────
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
    await this.ensureAiEnabled()
    const traceCollector = this.telemetryService.createTrace('generate-direct', 'system')
    const keys = (await this.keyRepo.find({ order: { priority: 'ASC', createdAt: 'ASC' } }))
      .filter(k => k.enabled && k.apiKey)
    if (!keys.length) {
      traceCollector.finish('FAILED', 'PROVIDER_FAILURE')
      throw new BadRequestException('No enabled AI keys configured.')
    }

    const errors: string[] = []
    for (const k of keys) {
      const providerStart = Date.now()
      const preset = presetOf(k.provider)
      const modelName = (k.model || '').trim() || preset.model
      try {
        const text = await this.callProvider(k, prompt, system)
        traceCollector.recordProviderAttempt(k.provider, modelName, 'success', Date.now() - providerStart)
        traceCollector.finish('SUCCESS')
        return text
      } catch (e: any) {
        const duration = Date.now() - providerStart
        traceCollector.recordProviderAttempt(k.provider, modelName, 'failed', duration, undefined, e)
        errors.push(`${k.label || k.provider}: ${e?.message ?? e}`)
      }
    }
    traceCollector.finish('FAILED', 'FAILOVER_FAILURE')
    throw new BadRequestException('All AI keys failed. ' + errors.join(' | '))
  }

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

  // ── Vector Search & Knowledge Vault Abstraction ───────────────────────────
  async embeddingAvailable(): Promise<boolean> {
    try {
      const active = await this.profileService.getActiveProfile()
      const creds = await this.profileService.resolveCredentials(active)
      return !!creds.apiKey
    } catch {
      return false
    }
  }

  async getEmbedding(text: string): Promise<number[] | null> {
    try {
      return await this.profileService.generateEmbedding(text, 'passage')
    } catch (e: any) {
      this.logger.error(`getEmbedding failed: ${e.message}`)
      return null
    }
  }

  async searchVectorDb(query: string, projectId?: string): Promise<string> {
    return await this.vectorCorpusService.search(query, projectId)
  }

  async searchVectorDbWithDiagnostics(query: string, projectId?: string): Promise<RetrievalDiagnosticResult> {
    return await this.vectorCorpusService.searchWithDiagnostics(query, projectId)
  }

  private wrapToolsWithTelemetry(tools: Record<string, any>, traceCollector: AiTraceCollector) {
    const wrapped: Record<string, any> = {}
    for (const [name, t] of Object.entries(tools)) {
      if (!t || typeof (t as any).execute !== 'function') {
        wrapped[name] = t
        continue
      }
      const origExecute = (t as any).execute.bind(t)
      wrapped[name] = {
        ...t,
        execute: async (args: any, options: any) => {
          const start = Date.now()
          let res: any
          let success = true
          let errorCategory: AiErrorCategory | undefined
          try {
            res = await origExecute(args, options)
            return res
          } catch (err: any) {
            success = false
            errorCategory = 'TOOL_FAILURE'
            throw err
          } finally {
            const durationMs = Date.now() - start
            traceCollector.recordToolInvocation(name, durationMs, success, args, res, errorCategory)
          }
        },
      }
    }
    return wrapped
  }

  async chatKey(): Promise<AiKey | null> {
    const keys = await this.keyRepo.find({ order: { priority: 'ASC' } })
    return keys.find(k => k.enabled && k.apiKey) || null
  }

  async getEnabledChatKeys(): Promise<AiKey[]> {
    const keys = await this.keyRepo.find({ order: { priority: 'ASC' } })
    return keys.filter(k => k.enabled && k.apiKey)
  }

  // ── Interactive Chat with Structured Tools & Multi-Provider Failover ───────
  async chat(sessionId: string, query: string, userId: string, projectId: string): Promise<string> {
    await this.ensureAiEnabled()
    const traceCollector = this.telemetryService.createTrace(sessionId, userId, projectId)

    let session = await this.sessionRepo.findOne({ where: { id: sessionId } })
    if (!session) {
      session = this.sessionRepo.create({
        id: sessionId,
        title: query.substring(0, 50),
        userId,
        projectId: projectId || undefined,
      })
      await this.sessionRepo.save(session)
    } else if (session.userId !== userId) {
      // Session IDs are client-generated, so treat them as untrusted input.
      // Never let a caller attach to another user's conversation.
      traceCollector.finish('FAILED', 'AUTHORIZATION_FAILURE')
      throw new NotFoundException('Session not found')
    }

    if (projectId) {
      const projRepo = this.dataSource.getRepository('Project')
      const project = await projRepo.findOne({ where: { id: projectId } })
      if (project && (project as any).managerId && (project as any).managerId !== userId) {
        const userRepo = this.dataSource.getRepository('User')
        const user = await userRepo.findOne({ where: { id: userId } })
        if (user && (user as any).role !== 'super_admin') {
          traceCollector.finish('FAILED', 'AUTHORIZATION_FAILURE')
          throw new Error('Unauthorized: You do not have access to this project.')
        }
      }
    }

    const historyRaw = await this.msgRepo.find({ 
      where: { sessionId: session.id }, 
      order: { createdAt: 'DESC' },
      take: 12,
    })
    const history = historyRaw.reverse()

    const messages: any[] = history.map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content,
    }))
    messages.push({ role: 'user', content: query })

    const activeProjectYear = new Date().getFullYear()
    const currentDateStr = new Date().toISOString().split('T')[0]

    const systemInstruction = `You are ProjectOS Intelligence, the specialized AI engineer and project operations advisor for Khilari Infrastructure Pvt. Ltd. (KIPL) on the Srinagar STP & Sewerage Network project (Dal Lake Sewerage Scheme).
Active Project Operational Year: ${activeProjectYear} (Current Date: ${currentDateStr}).

CORE EPISTEMOLOGY & ANSWERING STANDARDS:

1. PROJECT FACTS VS. GENERAL KNOWLEDGE VS. INFERENCE:
   • PROJECT FACTS (Authoritative & Ground Truth): Information regarding this specific project, its employees, vendors, tasks, contracts, site events, and drawings MUST come from ProjectOS tools (resolve_project_entity, validate_project_relationship, search_employees, get_employee, search_vendors, get_vendor, search_wbs_tasks, get_wbs_task, search_site_diaries, search_knowledge_vault). Pretrained LLM memory must NEVER override or contradict authoritative ProjectOS records.
   • GENERAL KNOWLEDGE (Enriching & Contextual): Explain industry engineering concepts (e.g. Vibro Stone Columns, Poclain excavators, SBR wastewater treatment) and corporate background naturally without robotic disclaimers.
   • INFERENCE (Strictly Regulated): You must NEVER convert general knowledge, designation, or equipment co-presence into an asserted project fact.
     - VALID: "Keller Ground Engineering Pvt Ltd is recorded in ProjectOS as an active subcontractor for ground improvement. Generally, Keller is an international geotechnical specialist."
     - INVALID: "Keller performed the IPS-1 ground improvement work." (unless ProjectOS evidence explicitly establishes that relationship).

2. ENTITY RESOLUTION & SOURCE HIERARCHY:
   • When an entity name, person, vendor, or WBS task is mentioned (e.g. "Who is Keller?", "Who is Rinku?", "Tell me about IPS 1", "What is the status of IPS 1?"):
     - Use resolve_project_entity or the specialized search tools to locate the entity across ProjectOS master records.
     - If the resolver returns multiple ambiguous candidates (e.g. for "Shah"), present the choices clearly and ask the user for clarification.
     - If a single candidate is resolved, the candidate already includes master record fields (id, name, code, status, responsible) and attached technical vaultEvidence. Only call get_employee, get_vendor, or get_wbs_task if additional unpopulated fields are explicitly needed.
   • SOURCE HIERARCHY & DATA SEPARATION:
     - STRUCTURED PROJECT DATA (wbs_tasks, employees, vendors) = identity, status, responsible team, timeline.
     - KNOWLEDGE VAULT (contract documents, BOQ estimates, engineering specifications) = technical specifications, pump house dimensions, material requirements, BOQ rates/quantities, rising mains.
     - SITE DIARY (daily site records) = actual field operations, daily progress, equipment usage hours, materials received, labour counts, site visitors.
     - NEVER conflate these sources (e.g. do not claim a tender specification is site progress, or that a WBS status is an engineering specification).

3. EXPLICIT RELATIONSHIP VALIDATION:
   • When asked if Entity A is working on, assigned to, or involved with Entity B (e.g. "Is Rinku working on IPS-1?", "Is Keller involved with IPS-1?"):
     - Use validate_project_relationship to verify whether an authoritative link exists.
     - If no explicit record links them, state clearly: "Rinku is an active Poclain Operator in the ProjectOS employee records, but I don't currently have evidence linking him specifically to IPS-1."
     - NEVER invent an assignment based on equipment or job title.

4. MULTI-TURN INDEPENDENCE & ANTI-CONTAMINATION:
   • Evaluate follow-up questions independently using fresh tool lookups. Never inherit unverified entity associations or echo previous negative claims without verifying fresh records.
   • When citing ProjectOS facts, cite the source clearly (e.g. Employee Roster, Vendor Register, WBS Schedule, or Knowledge Vault Document).

5. NUMERICAL GROUNDING & MULTI-ITEM SOURCE ATTRIBUTION:
   • Every numerical claim, rate, cost, and quantity MUST be explicitly attributed to the exact source document and specific section from which it was retrieved.
   • When answering multi-item questions (e.g. SBR tanks, Compound Wall, Approach Road):
     - Attribute figures for SBR tanks only from the dedicated SBR documents (e.g. 16. SBR TANKS.xlsx).
     - Attribute figures for Approach Road only from the dedicated Approach Road documents (e.g. 15. Approach road.xlsx).
     - Attribute figures for Boundary/Compound Wall only from the dedicated Boundary Wall documents (e.g. 14. Boundary wall.xlsx).
     - NEVER attribute sub-totals from one structure (such as SBR Civil Works or SBR E&M Works) to another structure (such as Compound Wall or Road) merely because all items are mentioned in the query.
     - If evidence for any requested item is not present in the retrieved chunks, explicitly declare that no specific figures were found for that item. NEVER substitute a number from another item.

6. OPERATIONAL TEMPORAL GROUNDING & SITE DIARIES:
   • For daily site activities, labour counts, materials received, equipment usage, site visitors, and daily progress logs, use search_site_diaries.
   • When a user mentions a date or month/day without specifying an explicit year (e.g. "7th August", "1 to 7 August"), ALWAYS resolve the date using the active project operational year (${activeProjectYear}) (e.g. "${activeProjectYear}-08-07"). NEVER guess historical years from tender documents (e.g. 2022) or model training cutoffs (e.g. 2023, 2024).
   • When a user explicitly specifies a historical or specific year (e.g. "7 August 2025"), preserve that explicit year.

7. INTENT ROUTING & ANSWERING STANDARDS BY QUERY TYPE:
   • OPEN / BROAD INFRASTRUCTURE QUERIES (e.g. "Tell me about IPS 1", "Explain IPS 1", "Give me details about IPS 1", "Describe IPS 1"):
     - Use resolve_project_entity first. For infrastructure entities (e.g. IPS-1), the candidate's metadata already contains structured WBS status and attached P1.2b vaultEvidence (pump house design dimensions 4.57m × 4.27m, civil estimates, BOQ items, rising mains).
     - Do NOT call get_wbs_task (all WBS fields are already provided in the candidate).
     - Synthesize the comprehensive engineering intelligence response DIRECTLY from the candidate's metadata.vaultEvidence in the very next turn. Do NOT execute a redundant search_knowledge_vault call for the same entity when vaultEvidence is already attached.
     - Extract and state the actual engineering facts found in the evidence: what the facility is (Intermediate Pumping Station at Node 102 in the Dal Lake Sewerage Scheme), its pump house design dimensions (e.g. 4.57m × 4.27m), civil/structural estimate, BOQ scope, and associated rising main information.
     - Mention WBS project-management status (e.g. WBS 3.1, Civil Team, Not Started) concisely as supporting secondary context.
     - ONLY execute an additional search_knowledge_vault call if the user explicitly asks for specific technical parameters that are absent from the attached vaultEvidence, or if the candidate metadata lacks vaultEvidence.
   • STATUS / MANAGEMENT QUERIES (e.g. "What is the status of IPS 1?", "Is IPS 1 started?", "Who is responsible for IPS 1?", "What is the schedule of IPS 1?"):
     - Provide a concise structured answer based on WBS records (status, responsible team, planned dates).
     - Do NOT perform unnecessary Knowledge Vault or Site Diary searches.
   • TECHNICAL SPECIFICATION / BOQ QUERIES (e.g. "IPS 1 specifications", "IPS 1 BOQ", "IPS 1 pump house", "IPS 1 rising main", "approved cement brands"):
     - Prioritize Knowledge Vault evidence via search_knowledge_vault. Extract exact figures, dimensions, material requirements, and brand lists with source citations.
   • OPERATIONAL SITE QUERIES (e.g. "What were the site activities on 7th August?"):
     - Use search_site_diaries exclusively. Do NOT trigger Vault or WBS.
   • EMPLOYEE QUERIES (e.g. "Who is Rinku?"):
     - Use resolve_project_entity / search_employees / get_employee for a structured profile lookup.
   • GENERAL ENGINEERING CONCEPTS (e.g. "What is a Vibro Stone Column?", "What is an Intermediate Pumping Station?"):
     - Explain from general engineering knowledge naturally without searching WBS or Vault unless project-specific records are explicitly requested.`

    const chatKeys = await this.getEnabledChatKeys()
    if (!chatKeys.length) {
      traceCollector.finish('FAILED', 'PROVIDER_FAILURE')
      throw new Error('No enabled AI chat keys found')
    }

    let lastError: any = null
    let reply = ''
    const requestVaultState: RequestVaultState = {
      seenDocuments: new Set<string>(),
      seenChunkIds: new Set<string>(),
    };

    const rawTools = {
      ...createEntityResolutionTools(this.entityResolutionService, projectId, undefined, requestVaultState),
      ...createEmployeeTools(this.dataSource, projectId),
      ...createWbsTools(this.dataSource, projectId),
      ...createVendorTools(this.dataSource, projectId),
      ...createSiteDiaryTools(this.dataSource, projectId, { defaultYear: activeProjectYear }),
      ...createVaultTools(this, projectId, traceCollector, requestVaultState),
    }
    const tools = this.wrapToolsWithTelemetry(rawTools, traceCollector)

    // Failover loop across enabled chat keys (Gemini -> NVIDIA -> Groq -> Ollama)
    for (const k of chatKeys) {
      const providerStart = Date.now()
      const preset = presetOf(k.provider)
      const modelName = (k.model || '').trim() || preset.model

      try {
        const turnMessages: any[] = JSON.parse(JSON.stringify(messages))
        let model: any
        if (preset.kind === 'openai') {
          const openai = createOpenAI({ apiKey: k.apiKey, baseURL: (k.baseUrl || '').trim() || preset.base })
          model = openai.chat(modelName)
        } else {
          const google = createGoogleGenerativeAI({ apiKey: k.apiKey })
          model = google(modelName)
        }

        const maxSteps = 5

        for (let i = 0; i < maxSteps; i++) {
          let result: any
          let retries = 2
          while (retries > 0) {
            try {
              result = await generateText({
                model,
                system: systemInstruction,
                messages: turnMessages,
                tools,
              })
              break
            } catch (err: any) {
              const status = err.statusCode || err.lastError?.statusCode
              const msg = err.message || err.lastError?.message || ''
              if (status === 429 || msg.includes('429') || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED')) {
                throw err
              }
              retries--
              if (retries === 0) throw err
            }
          }

          if (result.responseMessages && result.responseMessages.length > 0) {
            turnMessages.push(...result.responseMessages)
          } else if (result.toolCalls && result.toolCalls.length > 0) {
            turnMessages.push({ role: 'assistant', content: result.toolCalls })
            turnMessages.push({ role: 'tool', content: result.toolResults })
          }

          if (result.toolCalls && result.toolCalls.length > 0) {
            continue
          } else {
            reply = result.text
            break
          }
        }

        if (reply) {
          traceCollector.recordProviderAttempt(
            k.provider,
            modelName,
            'success',
            Date.now() - providerStart,
          )
          break // Successfully generated answer
        }
      } catch (keyErr: any) {
        const duration = Date.now() - providerStart
        const status = keyErr.statusCode || keyErr.lastError?.statusCode
        const msg = keyErr.message || keyErr.lastError?.message || ''
        const isRateLimited = status === 429 || msg.includes('429') || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED')

        traceCollector.recordProviderAttempt(
          k.provider,
          modelName,
          isRateLimited ? 'rate_limited' : 'failed',
          duration,
          status,
          keyErr,
        )
        this.logger.warn(`Chat provider ${k.provider} failed: ${keyErr.message}. Attempting failover...`)
        lastError = keyErr
      }
    }

    if (!reply) {
      this.logger.error(`[FAILOVER_FAILURE] All enabled chat providers failed. Last error: ${lastError?.message || 'Unknown'}`)
      reply = 'The AI service is temporarily experiencing high upstream provider traffic. All project records and evidence remain secure. Please retry your request in a few moments.'
      traceCollector.finish('FAILED', 'FAILOVER_FAILURE')
    } else {
      traceCollector.finish('SUCCESS')
    }

    await this.msgRepo.save(this.msgRepo.create({ sessionId: session.id, role: 'user', content: query }))
    await this.msgRepo.save(this.msgRepo.create({ sessionId: session.id, role: 'model', content: reply }))

    return reply
  }

  async getSessions(userId: string, projectId?: string) {
    const where: any = { userId }
    if (projectId) where.projectId = projectId

    return this.sessionRepo.find({
      where,
      order: { updatedAt: 'DESC' },
    })
  }

  async getSessionHistory(sessionId: string, userId: string) {
    const session = await this.sessionRepo.findOne({ where: { id: sessionId, userId } })
    if (!session) throw new NotFoundException('Session not found')
    const messages = await this.msgRepo.find({
      where: { sessionId },
      order: { createdAt: 'ASC' },
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
