import { tool } from 'ai';
import { z } from 'zod';
import { DataSource, ILike } from 'typeorm';
import { QaInspection } from '../../qa/qa-inspection.entity';
import { Ncr } from '../../qa/ncr.entity';

export const createQaTools = (dataSource: DataSource, projectId: string) => {
  const inspRepo = dataSource.getRepository(QaInspection);
  const ncrRepo = dataSource.getRepository(Ncr);

  return {
    search_inspections: tool(<any>{
      description: 'Search for QA site inspections, checklist results, pass/fail status, and NCR flags.',
      parameters: z.object({
        query: z.string().optional().describe('Keyword, work item (e.g. "concrete", "pipe laying"), or location.'),
        result: z.string().optional().describe('Filter by overall result: "passed", "failed", "conditional", "draft".'),
        limit: z.number().optional().default(10),
      }),
      execute: async (args: any) => {
        const query = (args?.query || args?.keyword || '').trim();
        const whereBase: any = projectId ? { projectId } : {};
        if (args?.result) whereBase.overallResult = args.result;

        let whereClause: any = whereBase;
        if (query) {
          whereClause = [
            { ...whereBase, workItem: ILike(`%${query}%`) },
            { ...whereBase, location: ILike(`%${query}%`) },
            { ...whereBase, inspectedBy: ILike(`%${query}%`) },
          ];
        }

        const inspections = await inspRepo.find({
          where: whereClause,
          order: { date: 'DESC' },
          take: args?.limit || 10,
          select: ['id', 'date', 'workItem', 'location', 'chainage', 'inspectedBy', 'overallResult', 'passCount', 'failCount', 'ncrRaised', 'remarks'],
        });
        return inspections;
      },
    }),

    search_ncrs: tool(<any>{
      description: 'Search and inspect Non-Conformance Reports (NCRs), defects, root causes, corrective actions, and closure status.',
      parameters: z.object({
        status: z.string().optional().describe('Filter by status: "open", "under_review", "closed", "rejected".'),
        severity: z.string().optional().describe('Filter by severity: "minor", "major", "critical".'),
        query: z.string().optional().describe('Search query for NCR description, work item, or NCR number.'),
        limit: z.number().optional().default(10),
      }),
      execute: async (args: any) => {
        const query = (args?.query || '').trim();
        const whereBase: any = projectId ? { projectId } : {};
        if (args?.status) whereBase.status = args.status;
        if (args?.severity) whereBase.severity = args.severity;

        let whereClause: any = whereBase;
        if (query) {
          whereClause = [
            { ...whereBase, ncrNo: ILike(`%${query}%`) },
            { ...whereBase, workItem: ILike(`%${query}%`) },
            { ...whereBase, description: ILike(`%${query}%`) },
          ];
        }

        const ncrs = await ncrRepo.find({
          where: whereClause,
          order: { date: 'DESC' },
          take: args?.limit || 10,
          select: ['id', 'ncrNo', 'date', 'workItem', 'location', 'description', 'raisedBy', 'severity', 'status', 'rootCause', 'correctiveAction', 'targetDate', 'closedDate', 'remarks'],
        });
        return ncrs;
      },
    }),
  };
};
