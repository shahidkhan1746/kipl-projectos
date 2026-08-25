jest.mock('ai', () => ({
  tool: (config: any) => config,
}))

import { createVaultTools, DUPLICATE_EVIDENCE_NOTICE } from './vault.tool'
import { AiTraceCollector } from '../observability/ai-telemetry.service'
import { RetrievalDiagnosticResult } from '../services/vector-corpus.service'

describe('createVaultTools - Request-Scoped Duplicate-Evidence Guard', () => {
  let mockAiService: any
  const projectId = 'proj-test-123'

  const makeMockDiagnostic = (
    chunks: Array<{ id: string; sourceName: string; textSnippet: string }>,
    formattedContext: string,
  ): RetrievalDiagnosticResult => ({
    query: 'test query',
    activeProfile: {
      id: 'prof-1',
      name: 'NVIDIA NV-Embed-V1',
      provider: 'nvidia',
      model: 'nvidia/nv-embed-v1',
      dimension: 4096,
    },
    physicalTable: 'ai_document_chunks_nvidia',
    queryVectorDimension: 4096,
    semanticCandidatesCount: chunks.length,
    keywordCandidatesCount: chunks.length,
    exactMatchesCount: chunks.length,
    rrfCandidatesCount: chunks.length,
    finalSelectedCount: chunks.length,
    distinctDocumentCount: new Set(chunks.map(c => c.sourceName)).size,
    sourceDocuments: Array.from(new Set(chunks.map(c => c.sourceName))),
    retrievalDurationMs: 45,
    extractedIdentifiers: [],
    selectedCandidates: chunks.map(c => ({
      id: c.id,
      sourceName: c.sourceName,
      sourceType: 'CONTRACT',
      similarity: 0.85,
      keywordScore: 0.75,
      rrfScore: 0.9,
      textSnippet: c.textSnippet,
    })),
    formattedContext,
  })

  beforeEach(() => {
    mockAiService = {
      searchVectorDbWithDiagnostics: jest.fn(),
    }
  })

  it('TEST 1: First search returns chunks A/B/C -> all are marked new, no duplicate warning', async () => {
    const traceCollector = new AiTraceCollector('session-1', 'user-1', projectId)
    const recordRagSpy = jest.spyOn(traceCollector, 'recordRag')
    const tools = createVaultTools(mockAiService, projectId, traceCollector)

    const diag = makeMockDiagnostic(
      [
        { id: 'chunk-A', sourceName: 'Doc1.xlsx', textSnippet: 'Item A specs' },
        { id: 'chunk-B', sourceName: 'Doc1.xlsx', textSnippet: 'Item B specs' },
        { id: 'chunk-C', sourceName: 'Doc1.xlsx', textSnippet: 'Item C specs' },
      ],
      '[Source: Doc1.xlsx] Specs for A, B, and C',
    )
    mockAiService.searchVectorDbWithDiagnostics.mockResolvedValueOnce(diag)

    const result = await (tools.search_knowledge_vault as any).execute({ query: 'specifications for A B C' })

    expect(result).toBe('[Source: Doc1.xlsx] Specs for A, B, and C')
    expect(result).not.toContain(DUPLICATE_EVIDENCE_NOTICE)

    expect(recordRagSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        newChunkCount: 3,
        duplicateChunkCount: 0,
        duplicateEvidenceDetected: false,
      }),
    )
  })

  it('TEST 2: Second search returns A/B/C again -> zero new chunks, duplicate evidence detected, authoritative hint added', async () => {
    const traceCollector = new AiTraceCollector('session-1', 'user-1', projectId)
    const recordRagSpy = jest.spyOn(traceCollector, 'recordRag')
    const tools = createVaultTools(mockAiService, projectId, traceCollector)

    const diag = makeMockDiagnostic(
      [
        { id: 'chunk-A', sourceName: 'Doc1.xlsx', textSnippet: 'Item A specs' },
        { id: 'chunk-B', sourceName: 'Doc1.xlsx', textSnippet: 'Item B specs' },
        { id: 'chunk-C', sourceName: 'Doc1.xlsx', textSnippet: 'Item C specs' },
      ],
      '[Source: Doc1.xlsx] Specs for A, B, and C',
    )

    // Turn 1
    mockAiService.searchVectorDbWithDiagnostics.mockResolvedValueOnce(diag)
    const res1 = await (tools.search_knowledge_vault as any).execute({ query: 'specifications for A B C' })
    expect(res1).not.toContain(DUPLICATE_EVIDENCE_NOTICE)

    // Turn 2 (Identical chunks returned)
    mockAiService.searchVectorDbWithDiagnostics.mockResolvedValueOnce(diag)
    const res2 = await (tools.search_knowledge_vault as any).execute({ query: 'specifications for A B C detailed' })

    expect(res2).toContain('[Source: Doc1.xlsx] Specs for A, B, and C')
    expect(res2).toContain(DUPLICATE_EVIDENCE_NOTICE)

    expect(recordRagSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({
        newChunkCount: 0,
        duplicateChunkCount: 3,
        duplicateEvidenceDetected: true,
      }),
    )
  })

  it('TEST 3: First search returns A/B/C. Second search returns C/D/E -> D/E recognized as new, NOT treated as duplicate', async () => {
    const traceCollector = new AiTraceCollector('session-1', 'user-1', projectId)
    const recordRagSpy = jest.spyOn(traceCollector, 'recordRag')
    const tools = createVaultTools(mockAiService, projectId, traceCollector)

    const diag1 = makeMockDiagnostic(
      [
        { id: 'chunk-A', sourceName: 'Doc1.xlsx', textSnippet: 'Item A' },
        { id: 'chunk-B', sourceName: 'Doc1.xlsx', textSnippet: 'Item B' },
        { id: 'chunk-C', sourceName: 'Doc1.xlsx', textSnippet: 'Item C' },
      ],
      '[Source: Doc1.xlsx] Part 1',
    )
    const diag2 = makeMockDiagnostic(
      [
        { id: 'chunk-C', sourceName: 'Doc1.xlsx', textSnippet: 'Item C' },
        { id: 'chunk-D', sourceName: 'Doc1.xlsx', textSnippet: 'Item D' },
        { id: 'chunk-E', sourceName: 'Doc1.xlsx', textSnippet: 'Item E' },
      ],
      '[Source: Doc1.xlsx] Part 2',
    )

    // Turn 1
    mockAiService.searchVectorDbWithDiagnostics.mockResolvedValueOnce(diag1)
    await (tools.search_knowledge_vault as any).execute({ query: 'part 1' })

    // Turn 2
    mockAiService.searchVectorDbWithDiagnostics.mockResolvedValueOnce(diag2)
    const res2 = await (tools.search_knowledge_vault as any).execute({ query: 'part 2' })

    expect(res2).toBe('[Source: Doc1.xlsx] Part 2')
    expect(res2).not.toContain(DUPLICATE_EVIDENCE_NOTICE)

    expect(recordRagSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({
        newChunkCount: 2,
        duplicateChunkCount: 1,
        duplicateEvidenceDetected: false,
      }),
    )
  })

  it('TEST 4: Different documents return different chunks -> no duplicate warning', async () => {
    const traceCollector = new AiTraceCollector('session-1', 'user-1', projectId)
    const tools = createVaultTools(mockAiService, projectId, traceCollector)

    const diagSBR = makeMockDiagnostic(
      [{ id: 'chunk-SBR-1', sourceName: '16. SBR TANKS.xlsx', textSnippet: 'SBR tank costs' }],
      '[Source: 16. SBR TANKS.xlsx] Total: 5.2 Cr',
    )
    const diagWall = makeMockDiagnostic(
      [{ id: 'chunk-WALL-1', sourceName: '14. Boundary wall.xlsx', textSnippet: 'Boundary wall costs' }],
      '[Source: 14. Boundary wall.xlsx] Total: 1.1 Cr',
    )
    const diagRoad = makeMockDiagnostic(
      [{ id: 'chunk-ROAD-1', sourceName: '15. Approach road.xlsx', textSnippet: 'Road costs' }],
      '[Source: 15. Approach road.xlsx] Total: 0.8 Cr',
    )

    // Search 1: SBR
    mockAiService.searchVectorDbWithDiagnostics.mockResolvedValueOnce(diagSBR)
    const resSBR = await (tools.search_knowledge_vault as any).execute({ query: 'SBR tanks' })
    expect(resSBR).not.toContain(DUPLICATE_EVIDENCE_NOTICE)

    // Search 2: Wall
    mockAiService.searchVectorDbWithDiagnostics.mockResolvedValueOnce(diagWall)
    const resWall = await (tools.search_knowledge_vault as any).execute({ query: 'Boundary wall' })
    expect(resWall).not.toContain(DUPLICATE_EVIDENCE_NOTICE)

    // Search 3: Road
    mockAiService.searchVectorDbWithDiagnostics.mockResolvedValueOnce(diagRoad)
    const resRoad = await (tools.search_knowledge_vault as any).execute({ query: 'Approach road' })
    expect(resRoad).not.toContain(DUPLICATE_EVIDENCE_NOTICE)
  })

  it('TEST 5: Gemini retrieves A/B and NVIDIA later retrieves A/B in the SAME request -> NVIDIA recognizes them as previously seen', async () => {
    const traceCollector = new AiTraceCollector('session-1', 'user-1', projectId)
    const recordRagSpy = jest.spyOn(traceCollector, 'recordRag')
    // Tools instance created once per request in AiService.chat()
    const tools = createVaultTools(mockAiService, projectId, traceCollector)

    const diag = makeMockDiagnostic(
      [
        { id: 'chunk-A', sourceName: 'Tender.pdf', textSnippet: 'Tender specs' },
        { id: 'chunk-B', sourceName: 'Tender.pdf', textSnippet: 'Tender specs 2' },
      ],
      '[Source: Tender.pdf] Tender data',
    )

    // Simulated Gemini Provider attempt (Turn 1)
    mockAiService.searchVectorDbWithDiagnostics.mockResolvedValueOnce(diag)
    const geminiRes = await (tools.search_knowledge_vault as any).execute({ query: 'Tender specs' })
    expect(geminiRes).not.toContain(DUPLICATE_EVIDENCE_NOTICE)

    // Gemini hits rate limit error (failover occurs in outer loop)
    // Simulated NVIDIA Provider attempt in same request (Turn 1)
    mockAiService.searchVectorDbWithDiagnostics.mockResolvedValueOnce(diag)
    const nvidiaRes = await (tools.search_knowledge_vault as any).execute({ query: 'Tender specs query variation' })

    // NVIDIA immediately benefits from request-scoped memory
    expect(nvidiaRes).toContain(DUPLICATE_EVIDENCE_NOTICE)
    expect(recordRagSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({
        newChunkCount: 0,
        duplicateChunkCount: 2,
        duplicateEvidenceDetected: true,
      }),
    )
  })

  it('TEST 6: Two concurrent/different requests retrieve the same chunk IDs -> state is isolated', async () => {
    const trace1 = new AiTraceCollector('session-req-1', 'user-1', projectId)
    const trace2 = new AiTraceCollector('session-req-2', 'user-2', projectId)

    const toolsRequest1 = createVaultTools(mockAiService, projectId, trace1)
    const toolsRequest2 = createVaultTools(mockAiService, projectId, trace2)

    const diag = makeMockDiagnostic(
      [{ id: 'chunk-SHARED-1', sourceName: 'Doc.xlsx', textSnippet: 'Shared data' }],
      '[Source: Doc.xlsx] Data',
    )

    // Request 1 Search
    mockAiService.searchVectorDbWithDiagnostics.mockResolvedValueOnce(diag)
    const res1 = await (toolsRequest1.search_knowledge_vault as any).execute({ query: 'data' })
    expect(res1).not.toContain(DUPLICATE_EVIDENCE_NOTICE)

    // Request 2 First Search (Same chunk, but distinct request!)
    mockAiService.searchVectorDbWithDiagnostics.mockResolvedValueOnce(diag)
    const res2 = await (toolsRequest2.search_knowledge_vault as any).execute({ query: 'data' })
    expect(res2).not.toContain(DUPLICATE_EVIDENCE_NOTICE)
  })

  it('TEST 7: General knowledge directive is returned when 0 documents match', async () => {
    const tools = createVaultTools(mockAiService, projectId)
    const diagEmpty = makeMockDiagnostic([], 'No project-specific document was found for "Vibro Stone Column".')
    mockAiService.searchVectorDbWithDiagnostics.mockResolvedValueOnce(diagEmpty)

    const res = await (tools.search_knowledge_vault as any).execute({ query: 'Vibro Stone Column' })
    expect(res).toContain('GENERAL KNOWLEDGE DIRECTIVE')
    expect(res).not.toContain(DUPLICATE_EVIDENCE_NOTICE)
  })

  it('TEST 8: Existing telemetry continues to be emitted safely with privacy preserved', async () => {
    const traceCollector = new AiTraceCollector('session-8', 'user-1', projectId)
    const tools = createVaultTools(mockAiService, projectId, traceCollector)

    const diag = makeMockDiagnostic(
      [{ id: 'chunk-1', sourceName: 'Spec.pdf', textSnippet: 'Confidential project details' }],
      '[Source: Spec.pdf] Contract details',
    )
    mockAiService.searchVectorDbWithDiagnostics.mockResolvedValueOnce(diag)

    await (tools.search_knowledge_vault as any).execute({ query: 'project specifications' })
    const trace = traceCollector.finish('SUCCESS')

    expect(trace.retrieval).toBeDefined()
    expect(trace.retrieval?.embeddingProfile).toBe('NVIDIA NV-Embed-V1')
    expect(trace.retrieval?.sourceDocuments).toEqual(['Spec.pdf'])
    expect(trace.retrieval?.newChunkCount).toBe(1)
    expect(trace.retrieval?.duplicateChunkCount).toBe(0)
    expect(trace.retrieval?.duplicateEvidenceDetected).toBe(false)
  })
})
