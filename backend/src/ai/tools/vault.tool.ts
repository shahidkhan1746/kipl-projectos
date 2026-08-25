import { tool } from 'ai';
import { z } from 'zod';
import { AiService } from '../ai.service';
import { AiTraceCollector } from '../observability/ai-telemetry.service';

export const DUPLICATE_EVIDENCE_NOTICE =
  'Notice: This search returned no new evidence beyond sections already retrieved during this request. No additional matching sections were found in the current Knowledge Vault retrieval. Use the evidence already provided to formulate the answer. If a requested item is not explicitly present in the evidence, state that it was not found rather than inventing a value.';

export const createVaultTools = (
  aiService: AiService,
  projectId: string,
  traceCollector?: AiTraceCollector,
) => {
  // Request-scoped set of chunk IDs returned across searches within this request/turn
  const seenChunkIds = new Set<string>();

  return {
    search_knowledge_vault: tool(<any>{
      description:
        'Search unstructured project documents (tender specifications, BOQs, contract agreements, letters) in the Knowledge Vault for project-specific evidence. Do NOT call this tool for general definitions or standard engineering concepts (e.g. "What is a Vibro Stone Column?"), which should be answered directly from general knowledge.',
      parameters: z.object({
        query: z.string().describe('The search query or phrase to find in technical project documents.'),
      }),
      execute: async (args: any) => {
        const query = (args?.query || args?.q || '').trim();
        if (!query) return 'No search query provided for Knowledge Vault.';
        const diagnostic = await aiService.searchVectorDbWithDiagnostics(query, projectId);

        const retrievedChunks = diagnostic.selectedCandidates || [];
        const retrievedChunkIds = retrievedChunks.map((c: any) => c.id).filter(Boolean);

        let newChunkCount = 0;
        let duplicateChunkCount = 0;

        for (const chunkId of retrievedChunkIds) {
          if (seenChunkIds.has(chunkId)) {
            duplicateChunkCount++;
          } else {
            newChunkCount++;
            seenChunkIds.add(chunkId);
          }
        }

        const isDuplicateSearch = retrievedChunkIds.length > 0 && newChunkCount === 0;

        if (traceCollector) {
          traceCollector.recordRag({
            embeddingProfile: diagnostic.activeProfile?.name,
            embeddingProvider: diagnostic.activeProfile?.provider,
            embeddingModel: diagnostic.activeProfile?.model,
            vectorTable: diagnostic.physicalTable,
            retrievalMode: 'hybrid_rrf',
            candidateCount: diagnostic.rrfCandidatesCount || (diagnostic.semanticCandidatesCount + diagnostic.keywordCandidatesCount),
            selectedChunkCount: diagnostic.finalSelectedCount,
            distinctDocumentCount: diagnostic.distinctDocumentCount,
            retrievalDurationMs: diagnostic.retrievalDurationMs,
            evidenceCharacterCount: (diagnostic.formattedContext || '').length,
            sourceDocuments: diagnostic.sourceDocuments,
            newChunkCount,
            duplicateChunkCount,
            duplicateEvidenceDetected: isDuplicateSearch,
          });
        }
        let result = diagnostic.formattedContext;
        if (!result || result.includes('No project-specific document was found') || result.includes('No relevant document evidence found')) {
          return `ProjectOS Document Vault has 0 project-specific documents for "${query}". GENERAL KNOWLEDGE DIRECTIVE: If "${query}" is a standard engineering technique, equipment, or concept (such as Vibro Stone Columns or Poclain), explain how it works and its engineering principles using your general domain knowledge. Clarify that it is a general methodology and no project-specific contract documents were found.`;
        }

        if (isDuplicateSearch) {
          result += `\n\n[${DUPLICATE_EVIDENCE_NOTICE}]`;
        }

        return result;
      },
    }),
  };
};
