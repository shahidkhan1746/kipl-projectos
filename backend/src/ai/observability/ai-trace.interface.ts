/**
 * Telemetry and Observability Interfaces for ProjectOS AI.
 *
 * Strict Privacy & Security Standards:
 * - NO API keys, bearer tokens, or raw credentials.
 * - NO raw database records, employee salaries, or bank accounts.
 * - NO raw chunk texts or unrestricted tool outputs.
 */

export type AiErrorCategory =
  | 'RETRIEVAL_FAILURE'
  | 'PROVIDER_FAILURE'
  | 'FAILOVER_FAILURE'
  | 'TOOL_FAILURE'
  | 'SYNTHESIS_FAILURE'
  | 'AUTHORIZATION_FAILURE'
  | 'NO_EVIDENCE'
  | 'UNKNOWN_FAILURE'
  | 'NONE'

export interface ProviderAttemptTelemetry {
  provider: string
  model: string
  status: 'success' | 'failed' | 'rate_limited'
  httpStatus?: number
  durationMs: number
  errorCategory?: AiErrorCategory
  errorMessageSafe?: string
}

export interface ToolTelemetryItem {
  toolName: string
  executionOrder: number
  durationMs: number
  success: boolean
  resultCount: number | null
  errorCategory?: AiErrorCategory | null
  sanitizedSummary: Record<string, any>
}

export interface RagTelemetry {
  embeddingProfile: string
  embeddingProvider: string
  embeddingModel: string
  vectorTable: string
  retrievalMode: string
  candidateCount: number
  selectedChunkCount: number
  distinctDocumentCount: number
  retrievalDurationMs: number
  evidenceCharacterCount: number
  sourceDocuments: string[]
  newChunkCount?: number
  duplicateChunkCount?: number
  duplicateEvidenceDetected?: boolean
}

export interface LatencyBreakdown {
  totalDurationMs: number
  providerDurationMs: number
  toolDurationMs: number
  retrievalDurationMs: number
}

export interface AiRequestTrace {
  requestId: string
  sessionId: string
  userId: string
  projectId?: string
  startTime: string
  endTime: string
  totalDurationMs: number
  finalStatus: 'SUCCESS' | 'FAILED' | 'PARTIAL'
  errorCategory: AiErrorCategory
  providerAttempts: ProviderAttemptTelemetry[]
  tools: ToolTelemetryItem[]
  retrieval?: RagTelemetry
  latencyBreakdown: LatencyBreakdown
}
