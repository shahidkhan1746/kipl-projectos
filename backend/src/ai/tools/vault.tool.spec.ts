jest.mock('ai', () => ({
  tool: (config: any) => config,
}))

import { createVaultTools, DUPLICATE_EVIDENCE_NOTICE, RequestVaultState } from './vault.tool'
import { createEntityResolutionTools } from './entity-resolution.tool'
import { AiTraceCollector } from '../observability/ai-telemetry.service'
import { RetrievalDiagnosticResult } from '../services/vector-corpus.service'

describe('createVaultTools - P1.6 Request-Scoped Deterministic Duplicate Vault Retrieval Guard', () => {
  let mockAiService: any
  let mockEntityResolutionService: any
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
    mockEntityResolutionService = {
      resolveProjectEntity: jest.fn(),
      validateProjectRelationship: jest.fn(),
    }
  })

  it('TEST 1 — duplicate same document: Initial seen IPS1.xlsx -> Search returns IPS1.xlsx -> duplicate suppression signal returned', async () => {
    const traceCollector = new AiTraceCollector('session-1', 'user-1', projectId)
    const recordRagSpy = jest.spyOn(traceCollector, 'recordRag')
    const requestVaultState: RequestVaultState = {
      seenDocuments: new Set<string>(['ips1.xlsx']),
      seenChunkIds: new Set<string>(),
    }
    const tools = createVaultTools(mockAiService, projectId, traceCollector, requestVaultState)

    const diag = makeMockDiagnostic(
      [
        { id: 'chunk-1', sourceName: 'IPS1.xlsx', textSnippet: 'IPS1 specifications' },
      ],
      '[Source: IPS1.xlsx] IPS1 details',
    )
    mockAiService.searchVectorDbWithDiagnostics.mockResolvedValueOnce(diag)

    const res = await (tools.search_knowledge_vault as any).execute({ query: 'Tell me about IPS 1' })

    expect(res).toContain('Knowledge Vault Search Notice: This search returned no new source documents')
    expect(res).toContain(DUPLICATE_EVIDENCE_NOTICE)
    expect(recordRagSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        newChunkCount: 1,
        duplicateEvidenceDetected: true,
      }),
    )
  })

  it('TEST 2 — new document: Initial seen IPS1.xlsx -> Search returns IPS2.xlsx -> newDocumentCount = 1 and search allowed', async () => {
    const traceCollector = new AiTraceCollector('session-1', 'user-1', projectId)
    const recordRagSpy = jest.spyOn(traceCollector, 'recordRag')
    const requestVaultState: RequestVaultState = {
      seenDocuments: new Set<string>(['ips1.xlsx']),
      seenChunkIds: new Set<string>(),
    }
    const tools = createVaultTools(mockAiService, projectId, traceCollector, requestVaultState)

    const diag = makeMockDiagnostic(
      [
        { id: 'chunk-2', sourceName: 'IPS2.xlsx', textSnippet: 'IPS2 specifications' },
      ],
      '[Source: IPS2.xlsx] IPS2 details',
    )
    mockAiService.searchVectorDbWithDiagnostics.mockResolvedValueOnce(diag)

    const res = await (tools.search_knowledge_vault as any).execute({ query: 'Tell me about IPS 2' })

    expect(res).toBe('[Source: IPS2.xlsx] IPS2 details')
    expect(res).not.toContain(DUPLICATE_EVIDENCE_NOTICE)
    expect(requestVaultState.seenDocuments.has('ips2.xlsx')).toBe(true)
    expect(recordRagSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        duplicateEvidenceDetected: false,
      }),
    )
  })

  it('TEST 3 — mixed old + new: Initial IPS1.xlsx -> Search returns IPS1.xlsx + IPS2.xlsx -> search accepted', async () => {
    const traceCollector = new AiTraceCollector('session-1', 'user-1', projectId)
    const recordRagSpy = jest.spyOn(traceCollector, 'recordRag')
    const requestVaultState: RequestVaultState = {
      seenDocuments: new Set<string>(['ips1.xlsx']),
      seenChunkIds: new Set<string>(),
    }
    const tools = createVaultTools(mockAiService, projectId, traceCollector, requestVaultState)

    const diag = makeMockDiagnostic(
      [
        { id: 'chunk-1', sourceName: 'IPS1.xlsx', textSnippet: 'IPS1 details' },
        { id: 'chunk-2', sourceName: 'IPS2.xlsx', textSnippet: 'IPS2 details' },
      ],
      '[Source: IPS1.xlsx] IPS1\n[Source: IPS2.xlsx] IPS2',
    )
    mockAiService.searchVectorDbWithDiagnostics.mockResolvedValueOnce(diag)

    const res = await (tools.search_knowledge_vault as any).execute({ query: 'Compare IPS 1 and IPS 2' })

    expect(res).toBe('[Source: IPS1.xlsx] IPS1\n[Source: IPS2.xlsx] IPS2')
    expect(res).not.toContain(DUPLICATE_EVIDENCE_NOTICE)
    expect(recordRagSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        duplicateEvidenceDetected: false,
      }),
    )
  })

  it('TEST 4 — multiple chunks same document: Search returns 3 chunks from IPS1.xlsx -> document count = 1', async () => {
    const traceCollector = new AiTraceCollector('session-1', 'user-1', projectId)
    const requestVaultState: RequestVaultState = {
      seenDocuments: new Set<string>(),
      seenChunkIds: new Set<string>(),
    }
    const tools = createVaultTools(mockAiService, projectId, traceCollector, requestVaultState)

    const diag = makeMockDiagnostic(
      [
        { id: 'chunk-1', sourceName: 'IPS1.xlsx', textSnippet: 'Chunk 1' },
        { id: 'chunk-2', sourceName: 'IPS1.xlsx', textSnippet: 'Chunk 2' },
        { id: 'chunk-3', sourceName: 'IPS1.xlsx', textSnippet: 'Chunk 3' },
      ],
      '[Source: IPS1.xlsx] Multi chunk content',
    )
    mockAiService.searchVectorDbWithDiagnostics.mockResolvedValueOnce(diag)

    const res = await (tools.search_knowledge_vault as any).execute({ query: 'IPS 1 pump house' })

    expect(res).toBe('[Source: IPS1.xlsx] Multi chunk content')
    expect(requestVaultState.seenDocuments.size).toBe(1)
    expect(requestVaultState.seenDocuments.has('ips1.xlsx')).toBe(true)
    expect(requestVaultState.seenChunkIds.size).toBe(3)
  })

  it('TEST 5 — P1.2b seeded evidence: P1.2b seeds IPS1.xlsx and RisingMains.xlsx -> explicit Vault search returns them -> 0 new docs and duplicate suppression signal', async () => {
    const requestVaultState: RequestVaultState = {
      seenDocuments: new Set<string>(),
      seenChunkIds: new Set<string>(),
    }

    const entityTools = createEntityResolutionTools(
      mockEntityResolutionService,
      projectId,
      undefined,
      requestVaultState,
    )
    const vaultTools = createVaultTools(mockAiService, projectId, undefined, requestVaultState)

    // Simulate resolve_project_entity returning P1.2b vaultEvidence
    mockEntityResolutionService.resolveProjectEntity.mockResolvedValueOnce({
      query: 'Tell me about IPS 1',
      classification: 'SINGLE_ENTITY_LOOKUP',
      resolved: true,
      isAmbiguous: false,
      primaryCandidate: {
        entityType: 'wbs_task',
        entityId: 'wbs-ips1',
        name: 'IPS-1 at Node 102',
        code: '3.1',
        rankingScore: 0.95,
        matchRule: 'exact_code',
        sourceType: 'STRUCTURED_ENTITY',
        source: 'wbs_tasks table',
        metadata: {
          vaultEvidence: [
            { documentName: 'IPS1.xlsx', evidence: 'Pump house dimensions 4.57m x 4.27m' },
            { documentName: 'RisingMains.xlsx', evidence: 'Rising main 150mm dia' },
          ],
        },
      },
      candidates: [],
    })

    await (entityTools.resolve_project_entity as any).execute({ query: 'IPS 1' })

    // Verify requestVaultState was seeded by P1.2b
    expect(requestVaultState.seenDocuments.has('ips1.xlsx')).toBe(true)
    expect(requestVaultState.seenDocuments.has('risingmains.xlsx')).toBe(true)

    // Subsequent explicit search returns IPS1.xlsx and RisingMains.xlsx
    const diag = makeMockDiagnostic(
      [
        { id: 'chunk-1', sourceName: 'IPS1.xlsx', textSnippet: 'IPS1 data' },
        { id: 'chunk-2', sourceName: 'RisingMains.xlsx', textSnippet: 'Rising main data' },
      ],
      '[Source: IPS1.xlsx] Data\n[Source: RisingMains.xlsx] Data',
    )
    mockAiService.searchVectorDbWithDiagnostics.mockResolvedValueOnce(diag)

    const vaultRes = await (vaultTools.search_knowledge_vault as any).execute({ query: 'IPS 1' })

    expect(vaultRes).toContain('Knowledge Vault Search Notice: This search returned no new source documents')
    expect(vaultRes).toContain(DUPLICATE_EVIDENCE_NOTICE)
  })

  it('TEST 6 — multi-entity: P1.2b seeds IPS1.xlsx -> Explicit Vault search returns IPS2.xlsx -> new document accepted', async () => {
    const requestVaultState: RequestVaultState = {
      seenDocuments: new Set<string>(),
      seenChunkIds: new Set<string>(),
    }
    const entityTools = createEntityResolutionTools(mockEntityResolutionService, projectId, undefined, requestVaultState)
    const vaultTools = createVaultTools(mockAiService, projectId, undefined, requestVaultState)

    mockEntityResolutionService.resolveProjectEntity.mockResolvedValueOnce({
      query: 'IPS 1',
      classification: 'SINGLE_ENTITY_LOOKUP',
      resolved: true,
      primaryCandidate: {
        entityType: 'wbs_task',
        name: 'IPS-1',
        metadata: {
          vaultEvidence: [{ documentName: 'IPS1.xlsx', evidence: 'evidence 1' }],
        },
      },
      candidates: [],
    })
    await (entityTools.resolve_project_entity as any).execute({ query: 'IPS 1' })

    const diag = makeMockDiagnostic(
      [{ id: 'chunk-ips2', sourceName: 'IPS2.xlsx', textSnippet: 'IPS2 data' }],
      '[Source: IPS2.xlsx] IPS2 data',
    )
    mockAiService.searchVectorDbWithDiagnostics.mockResolvedValueOnce(diag)

    const res = await (vaultTools.search_knowledge_vault as any).execute({ query: 'IPS 2' })

    expect(res).toBe('[Source: IPS2.xlsx] IPS2 data')
    expect(res).not.toContain(DUPLICATE_EVIDENCE_NOTICE)
  })

  it('TEST 7 — three-document request: Seen IPS1.xlsx, IPS2.xlsx -> Search returns IPS3.xlsx -> new document accepted', async () => {
    const requestVaultState: RequestVaultState = {
      seenDocuments: new Set<string>(['ips1.xlsx', 'ips2.xlsx']),
      seenChunkIds: new Set<string>(),
    }
    const vaultTools = createVaultTools(mockAiService, projectId, undefined, requestVaultState)

    const diag = makeMockDiagnostic(
      [{ id: 'chunk-ips3', sourceName: 'IPS3.xlsx', textSnippet: 'IPS3 data' }],
      '[Source: IPS3.xlsx] IPS3 data',
    )
    mockAiService.searchVectorDbWithDiagnostics.mockResolvedValueOnce(diag)

    const res = await (vaultTools.search_knowledge_vault as any).execute({ query: 'IPS 3' })

    expect(res).toBe('[Source: IPS3.xlsx] IPS3 data')
    expect(requestVaultState.seenDocuments.has('ips3.xlsx')).toBe(true)
  })

  it('TEST 8 — no documents returned: Search returns no results -> existing behavior preserved and no crash', async () => {
    const requestVaultState: RequestVaultState = {
      seenDocuments: new Set<string>(),
      seenChunkIds: new Set<string>(),
    }
    const vaultTools = createVaultTools(mockAiService, projectId, undefined, requestVaultState)

    const diagEmpty = makeMockDiagnostic([], 'No project-specific document was found for "Vibro Stone Column".')
    mockAiService.searchVectorDbWithDiagnostics.mockResolvedValueOnce(diagEmpty)

    const res = await (vaultTools.search_knowledge_vault as any).execute({ query: 'Vibro Stone Column' })

    expect(res).toContain('GENERAL KNOWLEDGE DIRECTIVE')
    expect(res).not.toContain(DUPLICATE_EVIDENCE_NOTICE)
  })

  it('TEST 9 — request isolation: Request A sees IPS1.xlsx -> Request B begins with empty state and treats IPS1.xlsx as NEW', async () => {
    const requestStateA: RequestVaultState = {
      seenDocuments: new Set<string>(['ips1.xlsx']),
      seenChunkIds: new Set<string>(['chunk-1']),
    }
    const requestStateB: RequestVaultState = {
      seenDocuments: new Set<string>(),
      seenChunkIds: new Set<string>(),
    }

    const toolsA = createVaultTools(mockAiService, projectId, undefined, requestStateA)
    const toolsB = createVaultTools(mockAiService, projectId, undefined, requestStateB)

    const diag = makeMockDiagnostic(
      [{ id: 'chunk-1', sourceName: 'IPS1.xlsx', textSnippet: 'IPS1 data' }],
      '[Source: IPS1.xlsx] IPS1 data',
    )

    // Request A gets duplicate notice
    mockAiService.searchVectorDbWithDiagnostics.mockResolvedValueOnce(diag)
    const resA = await (toolsA.search_knowledge_vault as any).execute({ query: 'IPS 1' })
    expect(resA).toContain(DUPLICATE_EVIDENCE_NOTICE)

    // Request B gets fresh document
    mockAiService.searchVectorDbWithDiagnostics.mockResolvedValueOnce(diag)
    const resB = await (toolsB.search_knowledge_vault as any).execute({ query: 'IPS 1' })
    expect(resB).toBe('[Source: IPS1.xlsx] IPS1 data')
    expect(resB).not.toContain(DUPLICATE_EVIDENCE_NOTICE)
  })

  it('TEST 10 — P0 compatibility: Multiple queries within same request tracking distinct multi-document structures (SBR, Wall, Road)', async () => {
    const requestVaultState: RequestVaultState = {
      seenDocuments: new Set<string>(),
      seenChunkIds: new Set<string>(),
    }
    const tools = createVaultTools(mockAiService, projectId, undefined, requestVaultState)

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

    mockAiService.searchVectorDbWithDiagnostics.mockResolvedValueOnce(diagSBR)
    const resSBR = await (tools.search_knowledge_vault as any).execute({ query: 'SBR tanks' })
    expect(resSBR).not.toContain(DUPLICATE_EVIDENCE_NOTICE)

    mockAiService.searchVectorDbWithDiagnostics.mockResolvedValueOnce(diagWall)
    const resWall = await (tools.search_knowledge_vault as any).execute({ query: 'Boundary wall' })
    expect(resWall).not.toContain(DUPLICATE_EVIDENCE_NOTICE)

    mockAiService.searchVectorDbWithDiagnostics.mockResolvedValueOnce(diagRoad)
    const resRoad = await (tools.search_knowledge_vault as any).execute({ query: 'Approach road' })
    expect(resRoad).not.toContain(DUPLICATE_EVIDENCE_NOTICE)

    expect(requestVaultState.seenDocuments.size).toBe(3)
  })
})
