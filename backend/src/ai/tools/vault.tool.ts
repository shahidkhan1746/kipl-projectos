import { tool } from 'ai';
import { z } from 'zod';
import { AiService } from '../ai.service';

export const createVaultTools = (aiService: AiService, projectId: string) => {
  return {
    search_knowledge_vault: tool(<any>{
      description: 'Search unstructured project documents (tender specifications, BOQs, contract agreements, letters) in the Knowledge Vault for project-specific evidence. Do NOT call this tool for general definitions or standard engineering concepts (e.g. "What is a Vibro Stone Column?"), which should be answered directly from general knowledge.',
      parameters: z.object({
        query: z.string().describe('The search query or phrase to find in technical project documents.'),
      }),
      execute: async (args: any) => {
        const query = (args?.query || args?.q || '').trim();
        if (!query) return 'No search query provided for Knowledge Vault.';
        const result = await aiService.searchVectorDb(query, projectId);
        if (!result || result.includes('No project-specific document was found') || result.includes('No relevant document evidence found')) {
          return `ProjectOS Document Vault has 0 project-specific documents for "${query}". GENERAL KNOWLEDGE DIRECTIVE: If "${query}" is a standard engineering technique, equipment, or concept (such as Vibro Stone Columns or Poclain), explain how it works and its engineering principles using your general domain knowledge. Clarify that it is a general methodology and no project-specific contract documents were found.`;
        }
        return result;
      }
    }),
  };
};
