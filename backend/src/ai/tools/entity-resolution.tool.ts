import { tool } from 'ai';
import { z } from 'zod';
import { EntityResolutionService } from '../services/entity-resolution.service';
import { RequestVaultState } from './vault.tool';

export const createEntityResolutionTools = (
  entityResolutionService: EntityResolutionService,
  projectId: string,
  sessionContext?: { previousEntityId?: string; previousEntityType?: any; previousEntityName?: string },
  requestVaultState?: RequestVaultState,
) => {
  return {
    resolve_project_entity: tool(<any>{
      description:
        'Locate and identify a named entity, person, company, vendor, WBS task, equipment, or document across all ProjectOS master records. Use this tool FIRST to determine which domain an entity belongs to before querying specialized tools.',
      parameters: z.object({
        query: z.string().optional().describe('The name, code, or identifier of the entity to locate (e.g. "Keller", "Rinku", "IPS-1", "Shah").'),
        entity: z.string().optional().describe('Alternative alias for entity query.'),
        entity_name: z.string().optional().describe('Alternative alias for entity query.'),
        name: z.string().optional().describe('Alternative alias for entity query.'),
      }),
      execute: async (args: any) => {
        const query = (args?.query || args?.entity || args?.entity_name || args?.name || args?.q || args?.search || '').trim();
        if (!query) return { error: 'No entity query provided' };
        const res = await entityResolutionService.resolveProjectEntity(query, projectId, sessionContext);

        // Seed request-scoped seenDocuments from P1.2b vaultEvidence
        if (requestVaultState && res) {
          const allCandidates: any[] = [];
          if (res.primaryCandidate) allCandidates.push(res.primaryCandidate);
          if (Array.isArray(res.candidates)) {
            for (const c of res.candidates) {
              if (c && c !== res.primaryCandidate) allCandidates.push(c);
            }
          }

          for (const cand of allCandidates) {
            if (cand?.metadata?.vaultEvidence && Array.isArray(cand.metadata.vaultEvidence)) {
              for (const ev of cand.metadata.vaultEvidence) {
                if (ev.documentName) {
                  requestVaultState.seenDocuments.add(ev.documentName.trim().toLowerCase());
                }
              }
            }
            if (cand?.sourceType === 'DOCUMENT_MENTION' && cand.name) {
              requestVaultState.seenDocuments.add(cand.name.trim().toLowerCase());
            }
          }
        }

        return res;
      },
    }),

    validate_project_relationship: tool(<any>{
      description:
        'Authoritatively verify whether an explicit relationship (assignment, subcontract, fleet operation, site record) connects two ProjectOS entities. Use this tool to prevent false associations between entities.',
      parameters: z.object({
        entityA: z.string().optional().describe('Name or code of the first entity (e.g. "Rinku", "Keller Ground Engineering")'),
        entityB: z.string().optional().describe('Name or code of the second entity (e.g. "IPS-1", "PC210")'),
        entity1: z.string().optional().describe('Alternative alias for first entity'),
        entity2: z.string().optional().describe('Alternative alias for second entity'),
        first_entity: z.string().optional().describe('Alternative alias for entity A'),
        second_entity: z.string().optional().describe('Alternative alias for entity B'),
        subject: z.string().optional().describe('Alternative alias for first entity'),
        object: z.string().optional().describe('Alternative alias for second entity'),
      }),
      execute: async (args: any) => {
        const nameA = (args?.entityA || args?.entity1 || args?.subject || args?.first_entity || args?.entity_a || '').trim();
        const nameB = (args?.entityB || args?.entity2 || args?.object || args?.second_entity || args?.entity_b || '').trim();
        if (!nameA || !nameB) {
          return { error: 'Both entityA and entityB are required for relationship validation.' };
        }

        const [resA, resB] = await Promise.all([
          entityResolutionService.resolveProjectEntity(nameA, projectId, sessionContext),
          entityResolutionService.resolveProjectEntity(nameB, projectId, sessionContext),
        ]);

        const candidateA = resA.primaryCandidate || resA.candidates[0];
        const candidateB = resB.primaryCandidate || resB.candidates[0];

        return await entityResolutionService.validateProjectRelationship(candidateA, candidateB, projectId);
      },
    }),
  };
};
