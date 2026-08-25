import { Injectable, Logger } from '@nestjs/common'
import { randomUUID } from 'crypto'
import {
  AiErrorCategory,
  AiRequestTrace,
  LatencyBreakdown,
  ProviderAttemptTelemetry,
  RagTelemetry,
  ToolTelemetryItem,
} from './ai-trace.interface'
import { RagSanitizer } from '../utils/rag-sanitizer.util'

export class AiTraceCollector {
  readonly requestId: string
  readonly sessionId: string
  readonly userId: string
  readonly projectId?: string
  readonly startTimestamp: number
  readonly startTime: string

  private providerAttempts: ProviderAttemptTelemetry[] = []
  private tools: ToolTelemetryItem[] = []
  private ragTelemetry?: RagTelemetry
  private currentToolOrder = 0

  constructor(
    sessionId: string,
    userId: string,
    projectId?: string,
    private readonly logger: Logger = new Logger('AiTraceCollector'),
  ) {
    this.requestId = `req_${randomUUID().replace(/-/g, '').slice(0, 12)}`
    this.sessionId = sessionId
    this.userId = userId
    this.projectId = projectId
    this.startTimestamp = Date.now()
    this.startTime = new Date(this.startTimestamp).toISOString()
  }

  startProviderAttempt(provider: string, model: string): number {
    return Date.now()
  }

  recordProviderAttempt(
    provider: string,
    model: string,
    status: 'success' | 'failed' | 'rate_limited',
    durationMs: number,
    httpStatus?: number,
    err?: any,
  ) {
    let errorCategory: AiErrorCategory | undefined
    let errorMessageSafe: string | undefined

    if (status !== 'success' && err) {
      const sanitized = this.classifyAndSanitizeError(err, status)
      errorCategory = sanitized.errorCategory
      errorMessageSafe = sanitized.errorMessageSafe
    }

    this.providerAttempts.push({
      provider,
      model,
      status,
      httpStatus,
      durationMs: Math.max(0, durationMs),
      errorCategory,
      errorMessageSafe,
    })
  }

  recordToolInvocation(
    toolName: string,
    durationMs: number,
    success: boolean,
    args?: any,
    result?: any,
    errorCategory?: AiErrorCategory,
  ) {
    this.currentToolOrder++
    const summary = this.sanitizeToolArgs(toolName, args)
    const resultSummary = this.sanitizeToolResult(toolName, result)

    this.tools.push({
      toolName,
      executionOrder: this.currentToolOrder,
      durationMs: Math.max(0, durationMs),
      success,
      resultCount: resultSummary.resultCount,
      errorCategory: errorCategory || (success ? null : 'TOOL_FAILURE'),
      sanitizedSummary: { ...summary, ...resultSummary.meta },
    })
  }

  recordRag(ragData: Partial<RagTelemetry>) {
    this.ragTelemetry = {
      embeddingProfile: ragData.embeddingProfile || 'Unknown',
      embeddingProvider: ragData.embeddingProvider || 'Unknown',
      embeddingModel: ragData.embeddingModel || 'Unknown',
      vectorTable: ragData.vectorTable || 'Unknown',
      retrievalMode: ragData.retrievalMode || 'hybrid_rrf',
      candidateCount: ragData.candidateCount || 0,
      selectedChunkCount: ragData.selectedChunkCount || 0,
      distinctDocumentCount: ragData.distinctDocumentCount || 0,
      retrievalDurationMs: Math.max(0, ragData.retrievalDurationMs || 0),
      evidenceCharacterCount: ragData.evidenceCharacterCount || 0,
      sourceDocuments: Array.isArray(ragData.sourceDocuments) ? ragData.sourceDocuments.slice(0, 10) : [],
      newChunkCount: ragData.newChunkCount,
      duplicateChunkCount: ragData.duplicateChunkCount,
      duplicateEvidenceDetected: ragData.duplicateEvidenceDetected,
    }
  }

  finish(
    finalStatus?: 'SUCCESS' | 'FAILED' | 'PARTIAL',
    errorCategoryOverride?: AiErrorCategory,
  ): AiRequestTrace {
    const endTimestamp = Date.now()
    const totalDurationMs = Math.max(0, endTimestamp - this.startTimestamp)

    // Calculate latency breakdown
    const providerDurationMs = this.providerAttempts.reduce((acc, p) => acc + p.durationMs, 0)
    const toolDurationMs = this.tools.reduce((acc, t) => acc + t.durationMs, 0)
    const retrievalDurationMs = this.ragTelemetry?.retrievalDurationMs || 0

    const latencyBreakdown: LatencyBreakdown = {
      totalDurationMs,
      providerDurationMs,
      toolDurationMs,
      retrievalDurationMs,
    }

    // Determine final status & error category if not explicitly provided
    let computedStatus: 'SUCCESS' | 'FAILED' | 'PARTIAL' = finalStatus || 'SUCCESS'
    let computedCategory: AiErrorCategory = errorCategoryOverride || 'NONE'

    if (!finalStatus) {
      const hasProviderSuccess = this.providerAttempts.some(p => p.status === 'success')
      const hasToolFailure = this.tools.some(t => !t.success)

      if (!hasProviderSuccess && this.providerAttempts.length > 0) {
        computedStatus = 'FAILED'
        computedCategory = 'FAILOVER_FAILURE'
      } else if (hasToolFailure) {
        computedStatus = 'PARTIAL'
        computedCategory = 'TOOL_FAILURE'
      } else {
        computedStatus = 'SUCCESS'
        computedCategory = 'NONE'
      }
    }

    const trace: AiRequestTrace = {
      requestId: this.requestId,
      sessionId: this.sessionId,
      userId: this.userId,
      projectId: this.projectId,
      startTime: this.startTime,
      endTime: new Date(endTimestamp).toISOString(),
      totalDurationMs,
      finalStatus: computedStatus,
      errorCategory: computedCategory,
      providerAttempts: this.providerAttempts,
      tools: this.tools,
      retrieval: this.ragTelemetry,
      latencyBreakdown,
    }

    this.emitStructuredLog(trace)
    return trace
  }

  private emitStructuredLog(trace: AiRequestTrace) {
    this.logger.log(`[AI_TRACE] ${JSON.stringify(trace)}`)
  }

  private classifyAndSanitizeError(
    err: any,
    status: 'success' | 'failed' | 'rate_limited',
  ): { errorCategory: AiErrorCategory; errorMessageSafe: string } {
    const rawMsg = err?.message || String(err)
    const httpStatus = err?.statusCode || err?.status || err?.lastError?.statusCode

    let errorCategory: AiErrorCategory = 'PROVIDER_FAILURE'
    if (status === 'rate_limited' || httpStatus === 429 || rawMsg.includes('429') || rawMsg.includes('RESOURCE_EXHAUSTED')) {
      errorCategory = 'PROVIDER_FAILURE'
    } else if (rawMsg.includes('retrieval') || rawMsg.includes('embedding')) {
      errorCategory = 'RETRIEVAL_FAILURE'
    } else if (rawMsg.includes('Unauthorized') || rawMsg.includes('Forbidden')) {
      errorCategory = 'AUTHORIZATION_FAILURE'
    }

    // Scrub API keys, URLs with tokens, and raw headers from error message
    let errorMessageSafe = RagSanitizer.sanitizeText(rawMsg)
      .replace(/https?:\/\/[^\s]+/g, '[URL_REDACTED]')
      .replace(/AIza[a-zA-Z0-9_\-]{35}/g, '[KEY_REDACTED]')
      .replace(/sk-[a-zA-Z0-9_\-]{32,}/g, '[KEY_REDACTED]')
      .replace(/nvapi-[a-zA-Z0-9_\-]{32,}/g, '[KEY_REDACTED]')
      .substring(0, 150)

    return { errorCategory, errorMessageSafe }
  }

  private sanitizeToolArgs(toolName: string, args: any): Record<string, any> {
    if (!args || typeof args !== 'object') return {}

    const summary: Record<string, any> = {}
    if (args.query || args.entity || args.name || args.search) {
      const q = String(args.query || args.entity || args.name || args.search)
      summary.queryLength = q.length
    }
    if (args.entityA && args.entityB) {
      summary.entityALength = String(args.entityA).length
      summary.entityBLength = String(args.entityB).length
    }
    if (args.id) {
      summary.idPresent = true
    }
    return summary
  }

  private sanitizeToolResult(toolName: string, result: any): { resultCount: number | null; meta: Record<string, any> } {
    if (!result) return { resultCount: 0, meta: { empty: true } }

    const meta: Record<string, any> = {}
    let resultCount: number | null = null

    if (Array.isArray(result)) {
      resultCount = result.length
    } else if (typeof result === 'object') {
      if (result.candidates && Array.isArray(result.candidates)) {
        resultCount = result.candidates.length
        meta.primaryType = result.primaryCandidate?.type || null
      } else if (typeof result.isRelated === 'boolean') {
        resultCount = result.isRelated ? 1 : 0
        meta.isRelated = result.isRelated
        meta.confidence = result.confidence || null
      } else if (result.error) {
        resultCount = 0
        meta.hasError = true
      } else {
        resultCount = 1
      }
    } else if (typeof result === 'string') {
      resultCount = result.includes('0 project-specific documents') ? 0 : 1
      meta.resultLength = result.length
    }

    return { resultCount, meta }
  }
}

@Injectable()
export class AiTelemetryService {
  private readonly logger = new Logger('AiTelemetryService')

  createTrace(sessionId: string, userId: string, projectId?: string): AiTraceCollector {
    return new AiTraceCollector(sessionId, userId, projectId, this.logger)
  }
}
