import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { VectorCorpusService } from './vector-corpus.service';

export type EntitySourceType = 'STRUCTURED_ENTITY' | 'DOCUMENT_MENTION';

export type ProjectEntityType =
  | 'employee'
  | 'vendor'
  | 'subcontractor'
  | 'contractor'
  | 'supplier'
  | 'wbs_task'
  | 'project'
  | 'client'
  | 'equipment'
  | 'letter'
  | 'boq_item'
  | 'document';

export type MatchRule =
  | 'exact_code'
  | 'exact_full_name'
  | 'normalized_name'
  | 'partial_word_match'
  | 'alias_or_trade_name'
  | 'gated_trigram'
  | 'document_mention';

export interface ResolvedEntityCandidate {
  entityType: ProjectEntityType;
  entityId: string;
  name: string;
  code?: string;
  rankingScore: number;
  matchRule: MatchRule;
  sourceType: EntitySourceType;
  source: string;
  metadata: {
    designation?: string;
    department?: string;
    category?: string;
    status?: string;
    responsible?: string;
    machineType?: string;
    documentTitle?: string;
    pageNumber?: number;
    [key: string]: any;
  };
}

export type QueryClassification =
  | 'SINGLE_ENTITY_LOOKUP'
  | 'RELATIONSHIP_QUERY'
  | 'GENERAL_KNOWLEDGE'
  | 'PROJECT_METRIC_QUERY';

export interface EntityResolutionContext {
  previousEntityId?: string;
  previousEntityType?: ProjectEntityType;
  previousEntityName?: string;
  turnIndex?: number;
  enrichmentCount?: number;
  userQuery?: string;
}

export interface EntityResolutionResult {
  query: string;
  classification: QueryClassification;
  resolved: boolean;
  isAmbiguous: boolean;
  primaryCandidate?: ResolvedEntityCandidate;
  candidates: ResolvedEntityCandidate[];
  clarificationPrompt?: string;
}

export type RelationshipStatus =
  | 'VERIFIED_DIRECT_LINK'
  | 'VERIFIED_DOCUMENT_LINK'
  | 'UNVERIFIED_NO_EVIDENCE'
  | 'UNKNOWN_ENTITY';

export interface RelationshipValidationResult {
  entityA?: ResolvedEntityCandidate;
  entityB?: ResolvedEntityCandidate;
  status: RelationshipStatus;
  evidenceSource?: string;
  evidenceSnippet?: string;
  explanation: string;
}

@Injectable()
export class EntityResolutionService {
  private readonly logger = new Logger(EntityResolutionService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly vectorCorpusService: VectorCorpusService,
  ) {}

  /**
   * Fast heuristic query classifier
   */
  classifyQuery(query: string): QueryClassification {
    const q = query.trim().toLowerCase();
    const isRelationship =
      (q.includes('working on') ||
        q.includes('involved with') ||
        q.includes('assigned to') ||
        q.includes('responsible for') ||
        q.includes('link between') ||
        q.includes('associated with') ||
        (q.includes('is ') && q.includes(' on '))) &&
      !q.startsWith('what is');

    if (isRelationship) return 'RELATIONSHIP_QUERY';

    const isGeneralConcept =
      (q.startsWith('what is a ') ||
        q.startsWith('what is an ') ||
        q.startsWith('what is ') ||
        q.startsWith('define ') ||
        q.startsWith('explain ')) &&
      (q.includes('vibro stone') ||
        q.includes('poclain') ||
        q.includes('excavator') ||
        q.includes('geotechnical') ||
        q.includes('sbr') ||
        q.includes('wastewater') ||
        q.includes('concrete grade') ||
        q.includes('hdpe') ||
        q.includes('np3') ||
        q.includes('trenchless') ||
        q.includes('jacking'));

    if (isGeneralConcept) return 'GENERAL_KNOWLEDGE';

    return 'SINGLE_ENTITY_LOOKUP';
  }

  /**
   * Resolve an entity across all structured ProjectOS master tables.
   */
  async resolveProjectEntity(
    rawQuery: string,
    projectId: string,
    context?: EntityResolutionContext,
  ): Promise<EntityResolutionResult> {
    const query = rawQuery.trim();
    if (!query) {
      return {
        query,
        classification: 'SINGLE_ENTITY_LOOKUP',
        resolved: false,
        isAmbiguous: false,
        candidates: [],
      };
    }

    const classification = this.classifyQuery(query);

    if (classification === 'GENERAL_KNOWLEDGE') {
      return {
        query,
        classification,
        resolved: false,
        isAmbiguous: false,
        candidates: [],
      };
    }

    // Pronoun resolution
    const isPronoun = /^(he|him|his|she|her|it|its|they|them|that person|that entity|that task)$/i.test(query);
    if (isPronoun && context?.previousEntityId && context?.previousEntityType) {
      const refreshed = await this.fetchAuthoritativeById(
        context.previousEntityId,
        context.previousEntityType,
        projectId,
      );
      if (refreshed) {
        return {
          query,
          classification,
          resolved: true,
          isAmbiguous: false,
          primaryCandidate: refreshed,
          candidates: [refreshed],
        };
      }
    }

    const normQuery = query.toLowerCase();
    const cleanAlnum = normQuery.replace(/[^a-z0-9]/g, '');

    const candidates: ResolvedEntityCandidate[] = [];

    // Helper: Exact discrete word token match
    const hasExactTokenMatch = (target: string, q: string): boolean => {
      if (!target || !q) return false;
      const tokens = target.toLowerCase().split(/[\s,_\-\/()]+/);
      return tokens.includes(q.toLowerCase());
    };

    // Helper: Word boundary regex match (e.g. \bKeller\b or phrase prefix)
    const hasWordBoundaryMatch = (target: string, q: string): boolean => {
      if (!target || !q) return false;
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i');
      return regex.test(target);
    };

    // Helper: Identifier token extractor (e.g., "IPS-1" -> ["ips", "1", "ips1"], "Node 102" -> ["node", "102", "node102"])
    const extractIdentifierTokens = (text: string): string[] => {
      if (!text) return [];
      const lower = text.toLowerCase();
      const tokens = lower.split(/[\s,_\-\/()]+/).filter(Boolean);
      const matches = lower.match(/[a-z]+[\s\-_]*\d+([a-z0-9]*)|\d+[\s\-_]*[a-z]+/gi) || [];
      const collapsed = matches.map(m => m.replace(/[^a-z0-9]/g, '')).filter(Boolean);
      return Array.from(new Set([...tokens, ...collapsed]));
    };

    // ── STAGE 1: Parallel Cross-Domain Master Scan ─────────────────────────
    const collapsedParam = cleanAlnum.length >= 2 ? `%${cleanAlnum}%` : `%${query}%`;

    const [empRows, venRows, wbsRows, projRows] = await Promise.all([
      this.dataSource.query(
        `SELECT id, emp_code, first_name, last_name, designation, department, status 
         FROM employees 
         WHERE (project_id = $1 OR project_id IS NULL)
           AND (
             emp_code ILIKE $2
             OR first_name ILIKE $2
             OR last_name ILIKE $2
             OR (first_name || ' ' || COALESCE(last_name, '')) ILIKE $2
             OR designation ILIKE $2
           )
         LIMIT 10`,
        [projectId, `%${query}%`],
      ).catch(() => []),

      this.dataSource.query(
        `SELECT id, name, trade_name, category, gstin, pan, is_active
         FROM vendors 
         WHERE (project_id = $1 OR project_id IS NULL)
           AND (
             name ILIKE $2
             OR trade_name ILIKE $2
             OR gstin ILIKE $2
             OR pan ILIKE $2
           )
         LIMIT 10`,
        [projectId, `%${query}%`],
      ).catch(() => []),

      this.dataSource.query(
        `SELECT id, wbs_code, title, responsible, status
         FROM wbs_tasks 
         WHERE (project_id = $1 OR project_id IS NULL)
           AND (
             wbs_code ILIKE $2
             OR title ILIKE $2
             OR responsible ILIKE $2
             OR regexp_replace(title, '[\\s\\-_]', '', 'g') ILIKE $3
             OR regexp_replace(wbs_code, '[\\s\\-_]', '', 'g') ILIKE $3
           )
         LIMIT 10`,
        [projectId, `%${query}%`, collapsedParam],
      ).catch(() => []),

      this.dataSource.query(
        `SELECT id, code, name, client, location, status
         FROM projects 
         WHERE (id = $1 OR code ILIKE $2 OR name ILIKE $2 OR client ILIKE $2)
         LIMIT 5`,
        [projectId, `%${query}%`],
      ).catch(() => []),
    ]);

    // Score Employees
    for (const e of empRows) {
      const fullName = `${e.first_name || ''} ${e.last_name || ''}`.trim();
      const code = (e.emp_code || '').trim();
      let score = 0;
      let rule: MatchRule = 'partial_word_match';

      if (code && code.toLowerCase() === normQuery) {
        score = 1.0;
        rule = 'exact_code';
      } else if (fullName.toLowerCase() === normQuery) {
        score = 0.95;
        rule = 'exact_full_name';
      } else if (fullName.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanAlnum) {
        score = 0.9;
        rule = 'normalized_name';
      } else if (hasExactTokenMatch(fullName, normQuery)) {
        score = 0.85;
        rule = 'partial_word_match';
      } else if (e.designation && hasExactTokenMatch(e.designation, normQuery)) {
        score = 0.75;
        rule = 'alias_or_trade_name';
      } else {
        // Discard arbitrary subtoken collisions (e.g. "Shah" inside "Shahid", "Ali" inside "Liaison")
        continue;
      }

      candidates.push({
        entityType: 'employee',
        entityId: e.id,
        name: fullName,
        code: e.emp_code,
        rankingScore: score,
        matchRule: rule,
        sourceType: 'STRUCTURED_ENTITY',
        source: `employees table (emp_code: ${e.emp_code || 'N/A'})`,
        metadata: {
          designation: e.designation,
          department: e.department,
          status: e.status,
        },
      });
    }

    // Score Vendors
    for (const v of venRows) {
      const name = (v.name || '').trim();
      const trade = (v.trade_name || '').trim();
      let score = 0;
      let rule: MatchRule = 'partial_word_match';

      if ((v.gstin && v.gstin.toLowerCase() === normQuery) || (v.pan && v.pan.toLowerCase() === normQuery)) {
        score = 1.0;
        rule = 'exact_code';
      } else if (name.toLowerCase() === normQuery) {
        score = 0.95;
        rule = 'exact_full_name';
      } else if (name.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanAlnum) {
        score = 0.9;
        rule = 'normalized_name';
      } else if (hasExactTokenMatch(name, normQuery) || hasWordBoundaryMatch(name, normQuery)) {
        score = 0.85;
        rule = 'partial_word_match';
      } else if (trade && (hasExactTokenMatch(trade, normQuery) || hasWordBoundaryMatch(trade, normQuery))) {
        score = 0.75;
        rule = 'alias_or_trade_name';
      } else {
        // Discard subtoken collisions
        continue;
      }

      candidates.push({
        entityType: (v.category === 'subcontractor' ? 'subcontractor' : 'vendor') as ProjectEntityType,
        entityId: v.id,
        name: v.name,
        code: v.gstin || v.pan,
        rankingScore: score,
        matchRule: rule,
        sourceType: 'STRUCTURED_ENTITY',
        source: `vendors table (${v.category || 'vendor'})`,
        metadata: {
          category: v.category,
          isActive: v.is_active,
        },
      });
    }

    // Score WBS Tasks
    for (const w of wbsRows) {
      const code = (w.wbs_code || '').trim();
      const title = (w.title || '').trim();
      let score = 0;
      let rule: MatchRule = 'partial_word_match';

      const qIdTokens = extractIdentifierTokens(query);
      const titleIdTokens = extractIdentifierTokens(title);
      const codeIdTokens = extractIdentifierTokens(code);

      const hasIdMatch = qIdTokens.some(qId => 
        (qId.length >= 2 && (titleIdTokens.includes(qId) || codeIdTokens.includes(qId)))
      );

      if (code && code.toLowerCase() === normQuery) {
        score = 1.0;
        rule = 'exact_code';
      } else if (title.toLowerCase() === normQuery) {
        score = 0.95;
        rule = 'exact_full_name';
      } else if (code.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanAlnum) {
        score = 0.95;
        rule = 'normalized_name';
      } else if (hasIdMatch) {
        score = 0.90;
        rule = 'normalized_name';
      } else if (
        hasExactTokenMatch(title, normQuery) ||
        hasExactTokenMatch(code, normQuery) ||
        hasWordBoundaryMatch(title, normQuery)
      ) {
        score = 0.85;
        rule = 'partial_word_match';
      } else if (w.responsible && hasExactTokenMatch(w.responsible, normQuery)) {
        score = 0.7;
        rule = 'alias_or_trade_name';
      } else {
        continue;
      }

      candidates.push({
        entityType: 'wbs_task',
        entityId: w.id,
        name: title,
        code: w.wbs_code,
        rankingScore: score,
        matchRule: rule,
        sourceType: 'STRUCTURED_ENTITY',
        source: `wbs_tasks table (WBS Code: ${w.wbs_code || 'N/A'})`,
        metadata: {
          status: w.status,
          responsible: w.responsible,
        },
      });
    }

    // Score Projects
    for (const p of projRows) {
      const code = (p.code || '').trim();
      const name = (p.name || '').trim();
      let score = 0;
      let rule: MatchRule = 'partial_word_match';

      if (code && code.toLowerCase() === normQuery) {
        score = 1.0;
        rule = 'exact_code';
      } else if (name.toLowerCase() === normQuery) {
        score = 0.95;
        rule = 'exact_full_name';
      } else if (hasExactTokenMatch(name, normQuery) || hasWordBoundaryMatch(name, normQuery)) {
        score = 0.85;
        rule = 'partial_word_match';
      } else if (p.client && hasExactTokenMatch(p.client, normQuery)) {
        score = 0.75;
        rule = 'alias_or_trade_name';
      } else {
        continue;
      }

      candidates.push({
        entityType: 'project',
        entityId: p.id,
        name: p.name,
        code: p.code,
        rankingScore: score,
        matchRule: rule,
        sourceType: 'STRUCTURED_ENTITY',
        source: `projects table (Project Code: ${p.code || 'N/A'})`,
        metadata: {
          client: p.client,
          location: p.location,
          status: p.status,
        },
      });
    }

    // ── STAGE 2: Secondary Operational Lookup (if Stage 1 has 0 matches) ───
    if (candidates.length === 0) {
      const fleetRows = await this.dataSource.query(
        `SELECT id, machine_id, machine_type, vehicle, operator 
         FROM fleet_logs 
         WHERE (project_id = $1 OR project_id IS NULL)
           AND (machine_id ILIKE $2 OR machine_type ILIKE $2 OR vehicle ILIKE $2)
         LIMIT 5`,
        [projectId, `%${query}%`],
      ).catch(() => []);

      for (const f of fleetRows) {
        const machId = (f.machine_id || '').trim();
        const machType = f.machine_type || f.vehicle || 'Equipment';
        let score = 0;
        let rule: MatchRule = 'partial_word_match';

        if (machId.toLowerCase() === normQuery) {
          score = 1.0;
          rule = 'exact_code';
        } else if (hasExactTokenMatch(machType, normQuery) || hasExactTokenMatch(machId, normQuery)) {
          score = 0.75;
          rule = 'partial_word_match';
        } else {
          continue;
        }

        candidates.push({
          entityType: 'equipment',
          entityId: f.id,
          name: `${machType} (${machId || 'No ID'})`,
          code: machId,
          rankingScore: score,
          matchRule: rule,
          sourceType: 'STRUCTURED_ENTITY',
          source: `fleet_logs table (Machine: ${machId})`,
          metadata: {
            machineType: f.machine_type,
            operator: f.operator,
          },
        });
      }
    }

    // Sort all collected candidates strictly by ranking score descending
    candidates.sort((a, b) => b.rankingScore - a.rankingScore);

    // Exact match short-circuit
    if (candidates.length > 0 && candidates[0].rankingScore >= 0.95) {
      await this.enrichCandidateWithVaultEvidence(candidates[0], query, projectId, context);
      return {
        query,
        classification,
        resolved: true,
        isAmbiguous: false,
        primaryCandidate: candidates[0],
        candidates: [candidates[0]],
      };
    }

    // Ambiguity Check across all collected cross-domain candidates
    if (candidates.length >= 2) {
      const top1 = candidates[0];
      const top2 = candidates[1];
      const scoreDiff = top1.rankingScore - top2.rankingScore;

      // Only trigger ambiguity if top candidates are strong (>= 0.80) and scoreDiff is tightly matched (<= 0.05)
      if (top1.rankingScore >= 0.80 && scoreDiff <= 0.05) {
        const ambiguousSet = candidates.filter(c => c.rankingScore >= top1.rankingScore - 0.05);
        const promptLines = ambiguousSet.slice(0, 5).map((c, i) => {
          const detail =
            c.metadata.designation ||
            c.metadata.category ||
            c.metadata.responsible ||
            c.entityType;
          return `${i + 1}. **${c.name}** (${c.entityType} - ${detail})`;
        });

        return {
          query,
          classification,
          resolved: false,
          isAmbiguous: true,
          candidates: ambiguousSet.slice(0, 5),
          clarificationPrompt: `I found multiple matching project records for "${query}":\n${promptLines.join('\n')}\n\nPlease specify which one you are inquiring about.`,
        };
      }
    }

    // Single dominant candidate
    if (candidates.length > 0) {
      await this.enrichCandidateWithVaultEvidence(candidates[0], query, projectId, context);
      return {
        query,
        classification,
        resolved: true,
        isAmbiguous: false,
        primaryCandidate: candidates[0],
        candidates: [candidates[0]],
      };
    }

    // ── STAGE 3: Knowledge Vault Document Mention (Secondary Evidence) ─────
    try {
      const docSearchResult = await this.vectorCorpusService.search(query, projectId);
      if (
        docSearchResult &&
        !docSearchResult.includes('No project-specific document was found') &&
        !docSearchResult.includes('No relevant document evidence found')
      ) {
        const docCandidate: ResolvedEntityCandidate = {
          entityType: 'document',
          entityId: 'vault-mention',
          name: query,
          rankingScore: 0.45,
          matchRule: 'document_mention',
          sourceType: 'DOCUMENT_MENTION',
          source: 'Knowledge Vault Documents (unstructured document text)',
          metadata: {
            snippet: docSearchResult.substring(0, 200),
          },
        };

        return {
          query,
          classification,
          resolved: true,
          isAmbiguous: false,
          primaryCandidate: docCandidate,
          candidates: [docCandidate],
        };
      }
    } catch (e: any) {
      this.logger.warn(`Secondary Knowledge Vault scan failed: ${e.message}`);
    }

    return {
      query,
      classification: 'GENERAL_KNOWLEDGE',
      resolved: false,
      isAmbiguous: false,
      candidates: [],
    };
  }

  /**
   * Explicitly validate whether an authoritative ProjectOS relationship links Entity A and Entity B.
   */
  async validateProjectRelationship(
    entityA: ResolvedEntityCandidate,
    entityB: ResolvedEntityCandidate,
    projectId: string,
  ): Promise<RelationshipValidationResult> {
    if (!entityA || !entityB) {
      return {
        entityA,
        entityB,
        status: 'UNKNOWN_ENTITY',
        explanation: 'One or both entities could not be resolved from ProjectOS records.',
      };
    }

    const nameA = (entityA.name || '').trim();
    const nameB = (entityB.name || '').trim();
    const codeA = (entityA.code || '').trim();
    const codeB = (entityB.code || '').trim();

    // 1. Employee <-> WBS Task Check (via wbs_tasks.responsible or wbs_tasks.remarks)
    if (
      (entityA.entityType === 'employee' && entityB.entityType === 'wbs_task') ||
      (entityB.entityType === 'employee' && entityA.entityType === 'wbs_task')
    ) {
      const emp = entityA.entityType === 'employee' ? entityA : entityB;
      const task = entityA.entityType === 'wbs_task' ? entityA : entityB;

      const wbsRecords = await this.dataSource.query(
        `SELECT id, wbs_code, title, responsible, remarks 
         FROM wbs_tasks 
         WHERE id = $1 
           AND (
             responsible ILIKE $2 
             OR remarks ILIKE $2
             OR responsible ILIKE $3
           )`,
        [task.entityId, `%${emp.name}%`, `%${emp.code || '___'}%`],
      ).catch(() => []);

      if (wbsRecords.length > 0) {
        return {
          entityA,
          entityB,
          status: 'VERIFIED_DIRECT_LINK',
          evidenceSource: 'wbs_tasks table (responsible / remarks)',
          evidenceSnippet: `WBS Task "${task.name}" explicitly assigns responsibility to: ${wbsRecords[0].responsible}`,
          explanation: `Verified direct assignment: ${emp.name} is recorded as responsible for WBS Task ${task.code || task.name}.`,
        };
      }

      return {
        entityA,
        entityB,
        status: 'UNVERIFIED_NO_EVIDENCE',
        explanation: `Authoritative records confirm ${emp.name} is an active ${emp.metadata.designation || 'employee'} and ${task.name} is a valid WBS task, but there is NO record linking them specifically.`,
      };
    }

    // 2. Vendor <-> WBS Task Check (via wbs_tasks.responsible/remarks or expenses table)
    if (
      ((entityA.entityType === 'vendor' || entityA.entityType === 'subcontractor') &&
        entityB.entityType === 'wbs_task') ||
      ((entityB.entityType === 'vendor' || entityB.entityType === 'subcontractor') &&
        entityA.entityType === 'wbs_task')
    ) {
      const ven = (entityA.entityType === 'vendor' || entityA.entityType === 'subcontractor') ? entityA : entityB;
      const task = entityA.entityType === 'wbs_task' ? entityA : entityB;

      // Check WBS task records
      const wbsMatch = await this.dataSource.query(
        `SELECT id, wbs_code, title, responsible, remarks 
         FROM wbs_tasks 
         WHERE id = $1 
           AND (responsible ILIKE $2 OR remarks ILIKE $2)`,
        [task.entityId, `%${ven.name}%`],
      ).catch(() => []);

      if (wbsMatch.length > 0) {
        return {
          entityA,
          entityB,
          status: 'VERIFIED_DIRECT_LINK',
          evidenceSource: 'wbs_tasks table',
          evidenceSnippet: `WBS Task "${task.name}" lists responsible contractor as: ${wbsMatch[0].responsible}`,
          explanation: `${ven.name} is explicitly assigned to WBS Task ${task.code || task.name}.`,
        };
      }

      // Check Expenses linking vendor_id and task code/title
      const expMatch = await this.dataSource.query(
        `SELECT id, bill_no, description, gross_amount, date 
         FROM expenses 
         WHERE vendor_id = $1 
           AND (description ILIKE $2 OR description ILIKE $3)
         LIMIT 1`,
        [ven.entityId, `%${task.code || '___'}%`, `%${task.name}%`],
      ).catch(() => []);

      if (expMatch.length > 0) {
        return {
          entityA,
          entityB,
          status: 'VERIFIED_DIRECT_LINK',
          evidenceSource: 'expenses table',
          evidenceSnippet: `Expense bill ${expMatch[0].bill_no} records "${expMatch[0].description}" for vendor ${ven.name}`,
          explanation: `Financial expense records connect ${ven.name} to WBS Task ${task.code || task.name}.`,
        };
      }

      return {
        entityA,
        entityB,
        status: 'UNVERIFIED_NO_EVIDENCE',
        explanation: `${ven.name} is recorded as a ${ven.metadata.category || 'subcontractor'} and ${task.name} is a valid WBS task, but no database records establish an assignment linking them.`,
      };
    }

    // 3. Employee <-> Equipment Check (via fleet_logs.operator or driver)
    if (
      (entityA.entityType === 'employee' && entityB.entityType === 'equipment') ||
      (entityB.entityType === 'employee' && entityA.entityType === 'equipment')
    ) {
      const emp = entityA.entityType === 'employee' ? entityA : entityB;
      const equip = entityA.entityType === 'equipment' ? entityA : entityB;

      const fleetMatch = await this.dataSource.query(
        `SELECT id, machine_id, machine_type, operator, driver 
         FROM fleet_logs 
         WHERE (project_id = $1 OR project_id IS NULL)
           AND (machine_id ILIKE $2 OR id = $3)
           AND (operator ILIKE $4 OR driver ILIKE $4)
         LIMIT 1`,
        [projectId, `%${equip.code || '___'}%`, equip.entityId, `%${emp.name}%`],
      ).catch(() => []);

      if (fleetMatch.length > 0) {
        return {
          entityA,
          entityB,
          status: 'VERIFIED_DIRECT_LINK',
          evidenceSource: 'fleet_logs table',
          evidenceSnippet: `Fleet log records ${emp.name} as operator for machine ${fleetMatch[0].machine_id || fleetMatch[0].machine_type}`,
          explanation: `${emp.name} is verified as the operator of ${equip.name}.`,
        };
      }

      return {
        entityA,
        entityB,
        status: 'UNVERIFIED_NO_EVIDENCE',
        explanation: `${emp.name} is an active employee (${emp.metadata.designation || 'Operator'}) and ${equip.name} is registered equipment, but no fleet logs link this specific operator to this machine.`,
      };
    }

    // 4. Default Joint Knowledge Vault Search (for dual text mentions)
    try {
      const query = `"${nameA}" and "${nameB}"`;
      const docResult = await this.vectorCorpusService.search(query, projectId);
      if (
        docResult &&
        !docResult.includes('No project-specific document was found') &&
        !docResult.includes('No relevant document evidence found')
      ) {
        return {
          entityA,
          entityB,
          status: 'VERIFIED_DOCUMENT_LINK',
          evidenceSource: 'Knowledge Vault Documents',
          evidenceSnippet: docResult.substring(0, 250),
          explanation: `Document records mention ${nameA} and ${nameB} together in project documentation.`,
        };
      }
    } catch (e: any) {
      this.logger.warn(`Joint vector verification error: ${e.message}`);
    }

    return {
      entityA,
      entityB,
      status: 'UNVERIFIED_NO_EVIDENCE',
      explanation: `No explicit ProjectOS database join, contract record, or document mentions establish a relationship between ${nameA} and ${nameB}.`,
    };
  }

  private async fetchAuthoritativeById(
    id: string,
    type: ProjectEntityType,
    projectId: string,
  ): Promise<ResolvedEntityCandidate | null> {
    if (type === 'employee') {
      const rows = await this.dataSource.query(
        `SELECT id, emp_code, first_name, last_name, designation, department, status 
         FROM employees WHERE id = $1 AND (project_id = $2 OR project_id IS NULL)`,
        [id, projectId],
      ).catch(() => []);
      if (rows.length > 0) {
        const e = rows[0];
        return {
          entityType: 'employee',
          entityId: e.id,
          name: `${e.first_name || ''} ${e.last_name || ''}`.trim(),
          code: e.emp_code,
          rankingScore: 1.0,
          matchRule: 'exact_code',
          sourceType: 'STRUCTURED_ENTITY',
          source: `employees table (emp_code: ${e.emp_code || 'N/A'})`,
          metadata: {
            designation: e.designation,
            department: e.department,
            status: e.status,
          },
        };
      }
    }

    if (type === 'vendor' || type === 'subcontractor') {
      const rows = await this.dataSource.query(
        `SELECT id, name, trade_name, category, gstin, pan, is_active 
         FROM vendors WHERE id = $1 AND (project_id = $2 OR project_id IS NULL)`,
        [id, projectId],
      ).catch(() => []);
      if (rows.length > 0) {
        const v = rows[0];
        return {
          entityType: (v.category === 'subcontractor' ? 'subcontractor' : 'vendor') as ProjectEntityType,
          entityId: v.id,
          name: v.name,
          code: v.gstin || v.pan,
          rankingScore: 1.0,
          matchRule: 'exact_code',
          sourceType: 'STRUCTURED_ENTITY',
          source: `vendors table (${v.category || 'vendor'})`,
          metadata: {
            category: v.category,
            isActive: v.is_active,
          },
        };
      }
    }

    if (type === 'wbs_task') {
      const rows = await this.dataSource.query(
        `SELECT id, wbs_code, title, responsible, status 
         FROM wbs_tasks WHERE id = $1 AND (project_id = $2 OR project_id IS NULL)`,
        [id, projectId],
      ).catch(() => []);
      if (rows.length > 0) {
        const w = rows[0];
        return {
          entityType: 'wbs_task',
          entityId: w.id,
          name: w.title,
          code: w.wbs_code,
          rankingScore: 1.0,
          matchRule: 'exact_code',
          sourceType: 'STRUCTURED_ENTITY',
          source: `wbs_tasks table (WBS Code: ${w.wbs_code || 'N/A'})`,
          metadata: {
            status: w.status,
            responsible: w.responsible,
          },
        };
      }
    }

    return null;
  }

  /**
   * P1.2b: Controlled, bounded 1-shot Knowledge Vault enrichment for resolved WBS technical entities.
   */
  private async enrichCandidateWithVaultEvidence(
    candidate: ResolvedEntityCandidate,
    originalQuery: string,
    projectId?: string,
    context?: EntityResolutionContext,
  ): Promise<void> {
    if (!candidate || candidate.entityType !== 'wbs_task' || (candidate.rankingScore || 0) < 0.85) {
      return;
    }

    // Enforce request-level maximum of 2 enrichments
    if (context) {
      if ((context.enrichmentCount || 0) >= 2) {
        return;
      }
    }

    // Conservative Intent Gate: Skip enrichment if query is asking for purely structured metadata
    const qLower = (context?.userQuery ? `${context.userQuery} ${originalQuery}` : originalQuery || '').trim().toLowerCase();
    const isPureStatusQuery =
      qLower.includes('status') ||
      qLower.includes('responsible') ||
      qLower.includes('assigned to') ||
      qLower.includes('who is assigned') ||
      qLower.includes('is started') ||
      qLower.includes('planned start') ||
      qLower.includes('planned end') ||
      qLower.includes('deadline') ||
      qLower.includes('scheduled to take') ||
      qLower.includes('duration') ||
      qLower.includes('delay') ||
      qLower.includes('timeline') ||
      qLower.includes('total float') ||
      qLower.includes('critical path') ||
      qLower.includes('is critical');

    if (isPureStatusQuery) {
      return;
    }

    // Canonicalize entity name: "IPS-1 at Node 102" -> "IPS-1"
    const cleanEntityName = (candidate.name || '')
      .replace(/\s+at\s+Node\s+\d+/i, '')
      .replace(/\s*\(.*?\)\s*/g, '')
      .trim();

    if (!cleanEntityName) {
      return;
    }

    try {
      const diagnostic = await this.vectorCorpusService.searchWithDiagnostics(
        cleanEntityName,
        projectId,
      );

      if (
        diagnostic &&
        diagnostic.formattedContext &&
        !diagnostic.formattedContext.includes('No project-specific document was found') &&
        !diagnostic.formattedContext.includes('No relevant document evidence found')
      ) {
        // Parse formattedContext chunks to preserve natural table rows & attribution
        const rawChunks = diagnostic.formattedContext.split('\n\n---\n\n').slice(0, 2);
        const enrichedChunks: { documentName: string; evidence: string }[] = [];
        let totalChars = 0;

        for (const chunkStr of rawChunks) {
          const lines = chunkStr.split('\n');
          const sourceLine = lines.find((l) => l.includes('Source:')) || '';
          const docName = sourceLine
            ? sourceLine.substring(sourceLine.indexOf('Source:') + 7).trim()
            : 'Knowledge Vault Document';
          const contentIdx = chunkStr.indexOf('Content:\n');
          const evidence = contentIdx !== -1 ? chunkStr.substring(contentIdx + 9).trim() : chunkStr.trim();

          if (totalChars + evidence.length > 2500 && enrichedChunks.length > 0) {
            break;
          }

          enrichedChunks.push({
            documentName: docName,
            evidence,
          });
          totalChars += evidence.length;
        }

        if (enrichedChunks.length > 0) {
          candidate.metadata = {
            ...candidate.metadata,
            vaultEvidence: enrichedChunks,
          };
          if (context) {
            context.enrichmentCount = (context.enrichmentCount || 0) + 1;
          }
        }
      }
    } catch (err: any) {
      this.logger.warn(`[P1.2b] Vault enrichment skipped due to error: ${err.message}`);
    }
  }
}
