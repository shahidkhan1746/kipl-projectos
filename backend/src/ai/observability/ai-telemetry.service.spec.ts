import { AiTelemetryService, AiTraceCollector } from './ai-telemetry.service'
import { Logger } from '@nestjs/common'

describe('AiTelemetryService - P1 AI Observability & Request Tracing', () => {
  let telemetryService: AiTelemetryService
  let logSpy: jest.SpyInstance

  beforeEach(() => {
    telemetryService = new AiTelemetryService()
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    logSpy.mockRestore()
  })

  it('1. Successful normal AI request produces a trace with requestId, duration, and SUCCESS status', () => {
    const collector = telemetryService.createTrace('session-001', 'user-001', 'project-001')

    expect(collector.requestId).toMatch(/^req_[a-zA-Z0-9]+$/)
    expect(collector.sessionId).toBe('session-001')
    expect(collector.userId).toBe('user-001')
    expect(collector.projectId).toBe('project-001')

    collector.recordProviderAttempt('gemini', 'gemini-2.5-flash', 'success', 450)
    const trace = collector.finish('SUCCESS')

    expect(trace.finalStatus).toBe('SUCCESS')
    expect(trace.errorCategory).toBe('NONE')
    expect(trace.providerAttempts.length).toBe(1)
    expect(trace.providerAttempts[0]).toEqual({
      provider: 'gemini',
      model: 'gemini-2.5-flash',
      status: 'success',
      durationMs: 450,
      httpStatus: undefined,
      errorCategory: undefined,
      errorMessageSafe: undefined,
    })
    expect(trace.latencyBreakdown.totalDurationMs).toBeGreaterThanOrEqual(0)
    expect(trace.latencyBreakdown.providerDurationMs).toBe(450)

    // Verify structured log emission
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('[AI_TRACE]'))
    const loggedJson = JSON.parse(logSpy.mock.calls[0][0].replace('[AI_TRACE] ', ''))
    expect(loggedJson.requestId).toBe(collector.requestId)
    expect(loggedJson.finalStatus).toBe('SUCCESS')
  })

  it('2. Gemini failure -> NVIDIA fallback produces a trace showing both attempts', () => {
    const collector = telemetryService.createTrace('session-002', 'user-001')

    // First attempt: Gemini throws 429 quota exhaustion
    collector.recordProviderAttempt(
      'gemini',
      'gemini-2.5-flash',
      'rate_limited',
      210,
      429,
      new Error('Resource has been exhausted (e.g. check quota)'),
    )

    // Second attempt: NVIDIA succeeds
    collector.recordProviderAttempt(
      'nvidia',
      'meta/llama-3.1-8b-instruct',
      'success',
      850,
    )

    const trace = collector.finish('SUCCESS')

    expect(trace.finalStatus).toBe('SUCCESS')
    expect(trace.providerAttempts.length).toBe(2)

    // Attempt 1: Gemini 429
    expect(trace.providerAttempts[0].provider).toBe('gemini')
    expect(trace.providerAttempts[0].status).toBe('rate_limited')
    expect(trace.providerAttempts[0].httpStatus).toBe(429)
    expect(trace.providerAttempts[0].errorCategory).toBe('PROVIDER_FAILURE')
    expect(trace.providerAttempts[0].errorMessageSafe).toContain('quota')

    // Attempt 2: NVIDIA Success
    expect(trace.providerAttempts[1].provider).toBe('nvidia')
    expect(trace.providerAttempts[1].status).toBe('success')
    expect(trace.providerAttempts[1].durationMs).toBe(850)

    expect(trace.latencyBreakdown.providerDurationMs).toBe(1060)
  })

  it('3. Tool invocation appears in trace metadata with execution order and duration', () => {
    const collector = telemetryService.createTrace('session-003', 'user-001')

    collector.recordToolInvocation(
      'resolve_project_entity',
      45,
      true,
      { query: 'Keller' },
      { candidates: [{ id: 'v1', type: 'vendor', name: 'Keller' }], primaryCandidate: { type: 'vendor' } },
    )

    collector.recordToolInvocation(
      'get_vendor',
      30,
      true,
      { id: 'v1' },
      { name: 'Keller Ground Engineering Pvt Ltd', category: 'subcontractor' },
    )

    const trace = collector.finish('SUCCESS')

    expect(trace.tools.length).toBe(2)
    expect(trace.tools[0].toolName).toBe('resolve_project_entity')
    expect(trace.tools[0].executionOrder).toBe(1)
    expect(trace.tools[0].durationMs).toBe(45)
    expect(trace.tools[0].success).toBe(true)
    expect(trace.tools[0].resultCount).toBe(1)
    expect(trace.tools[0].sanitizedSummary.primaryType).toBe('vendor')

    expect(trace.tools[1].toolName).toBe('get_vendor')
    expect(trace.tools[1].executionOrder).toBe(2)
    expect(trace.tools[1].durationMs).toBe(30)
    expect(trace.latencyBreakdown.toolDurationMs).toBe(75)
  })

  it('4. RAG invocation records retrieval metadata and safe source document names without raw chunks', () => {
    const collector = telemetryService.createTrace('session-004', 'user-001')

    collector.recordRag({
      embeddingProfile: 'NVIDIA NV-Embed-V1 (4096d)',
      embeddingProvider: 'nvidia',
      embeddingModel: 'nvidia/nv-embed-v1',
      vectorTable: 'ai_document_chunks_nvidia',
      retrievalMode: 'hybrid_rrf',
      candidateCount: 17,
      selectedChunkCount: 5,
      distinctDocumentCount: 2,
      retrievalDurationMs: 240,
      evidenceCharacterCount: 4821,
      sourceDocuments: ['16. SBR TANKS.xlsx', '15. Approach road.xlsx'],
    })

    const trace = collector.finish('SUCCESS')

    expect(trace.retrieval).toBeDefined()
    expect(trace.retrieval?.embeddingProfile).toBe('NVIDIA NV-Embed-V1 (4096d)')
    expect(trace.retrieval?.vectorTable).toBe('ai_document_chunks_nvidia')
    expect(trace.retrieval?.candidateCount).toBe(17)
    expect(trace.retrieval?.selectedChunkCount).toBe(5)
    expect(trace.retrieval?.distinctDocumentCount).toBe(2)
    expect(trace.retrieval?.evidenceCharacterCount).toBe(4821)
    expect(trace.retrieval?.retrievalDurationMs).toBe(240)
    expect(trace.retrieval?.sourceDocuments).toEqual(['16. SBR TANKS.xlsx', '15. Approach road.xlsx'])

    // Confirm that no raw chunk text property exists in retrieval telemetry
    expect((trace.retrieval as any).chunks).toBeUndefined()
    expect((trace.retrieval as any).rawText).toBeUndefined()
    expect(trace.latencyBreakdown.retrievalDurationMs).toBe(240)
  })

  it('5. Provider failure does not leak API keys, auth headers, or raw credentials in logs', () => {
    const collector = telemetryService.createTrace('session-005', 'user-001')

    const leakError = new Error('HTTP 401 Unauthorized for key nvapi-abc123456789012345678901234567890 at https://integrate.api.nvidia.com/v1/chat')
    collector.recordProviderAttempt('nvidia', 'meta/llama-3.1-8b-instruct', 'failed', 120, 401, leakError)

    const trace = collector.finish('FAILED', 'PROVIDER_FAILURE')

    expect(trace.providerAttempts[0].errorMessageSafe).not.toContain('nvapi-abc123456789012345678901234567890')
    expect(trace.providerAttempts[0].errorMessageSafe).not.toContain('https://integrate.api.nvidia.com')
    expect(trace.providerAttempts[0].errorMessageSafe).toContain('[KEY_REDACTED]')
    expect(trace.providerAttempts[0].errorMessageSafe).toContain('[URL_REDACTED]')
  })

  it('6. Tool arguments and results are sanitized and not logged verbatim', () => {
    const collector = telemetryService.createTrace('session-006', 'user-001')

    const rawArgs = { query: 'Very detailed sensitive query about financial terms', apiKey: 'sk-secret123' }
    const rawResult = {
      candidates: [{ name: 'Secret Employee', base_salary: 200000, bank_account: '123456789' }],
      primaryCandidate: { type: 'employee' },
    }

    collector.recordToolInvocation('resolve_project_entity', 50, true, rawArgs, rawResult)

    const trace = collector.finish('SUCCESS')
    const toolTrace = trace.tools[0]

    // Summary only contains safe query length and candidate metadata
    expect(toolTrace.sanitizedSummary.queryLength).toBe(rawArgs.query.length)
    expect(toolTrace.sanitizedSummary.primaryType).toBe('employee')

    // Verbatim sensitive fields must NOT exist in the trace
    expect((toolTrace as any).args).toBeUndefined()
    expect((toolTrace as any).result).toBeUndefined()
    expect(JSON.stringify(toolTrace)).not.toContain('200000')
    expect(JSON.stringify(toolTrace)).not.toContain('123456789')
    expect(JSON.stringify(toolTrace)).not.toContain('sk-secret123')
  })

  it('7. Sensitive ERP fields (salaries, bank accounts, passwords) are completely excluded from trace output', () => {
    const collector = telemetryService.createTrace('session-007', 'user-001')

    collector.recordToolInvocation(
      'get_employee',
      25,
      true,
      { id: 'emp_123' },
      {
        name: 'Rinku',
        designation: 'Poclain Operator',
        base_salary: 50000,
        bank_account: '987654321012',
        ifsc: 'HDFC0001234',
        pan: 'ABCDE1234F',
        password_hash: '$2b$10$secretpasswordhash',
      },
    )

    const trace = collector.finish('SUCCESS')
    const traceJson = JSON.stringify(trace)

    expect(traceJson).not.toContain('50000')
    expect(traceJson).not.toContain('987654321012')
    expect(traceJson).not.toContain('HDFC0001234')
    expect(traceJson).not.toContain('ABCDE1234F')
    expect(traceJson).not.toContain('$2b$10$secretpasswordhash')
  })

  it('8. Complete failover failure is classified as FAILOVER_FAILURE and recorded properly', () => {
    const collector = telemetryService.createTrace('session-008', 'user-001')

    collector.recordProviderAttempt('gemini', 'gemini-2.5-flash', 'rate_limited', 300, 429, new Error('429 Quota Exceeded'))
    collector.recordProviderAttempt('nvidia', 'meta/llama-3.1-8b-instruct', 'failed', 500, 500, new Error('500 Internal Server Error'))
    collector.recordProviderAttempt('groq', 'llama-3.3-70b-versatile', 'failed', 400, 503, new Error('503 Service Unavailable'))

    const trace = collector.finish('FAILED', 'FAILOVER_FAILURE')

    expect(trace.finalStatus).toBe('FAILED')
    expect(trace.errorCategory).toBe('FAILOVER_FAILURE')
    expect(trace.providerAttempts.length).toBe(3)
    expect(trace.latencyBreakdown.providerDurationMs).toBe(1200)
  })
})
