import { tool } from 'ai';
import { z } from 'zod';
import { DataSource, ILike } from 'typeorm';
import { WbsTask } from '../../wbs/wbs-task.entity';

export const createWbsTools = (dataSource: DataSource, projectId: string) => {
  const repo = dataSource.getRepository(WbsTask);

  return {
    search_wbs_tasks: tool(<any>{
      description: 'Search for Work Breakdown Structure (WBS) tasks by title, code, or responsibility.',
      parameters: z.object({
        query: z.string().describe('Search query for task title, WBS code, or responsible entity.'),
        status: z.string().optional().describe('Filter by status (e.g. "not_started", "in_progress", "completed", "delayed").'),
        limit: z.number().optional().default(10),
      }),
      execute: async (args: any) => {
        const query = (args?.query || args?.title || args?.q || args?.search || args?.keyword || '').trim();
        const status = args?.status;
        const whereBase = projectId ? { projectId } : {};

        if (!query) {
          const whereClause: any = { ...whereBase };
          if (status) whereClause.status = status;
          const tasks = await repo.find({
            where: whereClause,
            take: args?.limit || 10,
            select: ['id', 'wbsCode', 'title', 'status', 'progressPct', 'plannedStart', 'plannedEnd', 'actualStart', 'actualEnd', 'responsible', 'isMilestone']
          });
          return tasks;
        }

        const whereClause: any[] = [
          { ...whereBase, title: ILike(`%${query}%`) },
          { ...whereBase, wbsCode: ILike(`%${query}%`) },
          { ...whereBase, responsible: ILike(`%${query}%`) }
        ];

        if (status) {
          whereClause.forEach(w => (w.status = status));
        }

        const tasks = await repo.find({
          where: whereClause,
          take: args?.limit || 10,
          select: ['id', 'wbsCode', 'title', 'status', 'progressPct', 'plannedStart', 'plannedEnd', 'actualStart', 'actualEnd', 'responsible', 'isMilestone']
        });
        return tasks;
      }
    }),

    get_wbs_task: tool(<any>{
      description: 'Get detailed information about a specific WBS task by its ID, WBS Code, or Title.',
      parameters: z.object({
        id: z.string().optional().describe('Task UUID in ProjectOS.'),
        wbs_code: z.string().optional().describe('WBS Code (e.g. "3.1").'),
        query: z.string().optional().describe('Task title search.'),
      }),
      execute: async (args: any) => {
        const id = (args?.id || args?.task_id || '').trim();
        const code = (args?.wbs_code || args?.code || args?.id_or_code || '').trim();
        const title = (args?.query || args?.title || '').trim();

        const whereConditions: any[] = [];
        const whereBase = projectId ? { projectId } : {};
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

        if (id && isUuid.test(id)) {
          whereConditions.push({ ...whereBase, id });
        }
        if (code) {
          if (isUuid.test(code)) {
            whereConditions.push({ ...whereBase, id: code });
          }
          whereConditions.push({ ...whereBase, wbsCode: code });
        }
        if (title) {
          whereConditions.push({ ...whereBase, title: ILike(`%${title}%`) });
        }

        if (whereConditions.length === 0) {
          return { error: 'No valid WBS task ID, Code, or Title provided for lookup.' };
        }

        const task = await repo.findOne({
          where: whereConditions,
          select: ['id', 'wbsCode', 'title', 'description', 'status', 'progressPct', 'plannedStart', 'plannedEnd', 'actualStart', 'actualEnd', 'responsible', 'isMilestone', 'delayDays', 'delayReason', 'predecessors']
        });

        if (!task) return { error: 'Task not found in project records.' };
        return task;
      }
    }),
  };
};
