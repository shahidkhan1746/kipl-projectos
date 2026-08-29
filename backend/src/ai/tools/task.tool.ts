import { tool } from 'ai';
import { z } from 'zod';
import { DataSource, ILike } from 'typeorm';
import { Task } from '../../tasks/task.entity';

export const createTaskTools = (dataSource: DataSource, projectId: string) => {
  const repo = dataSource.getRepository(Task);

  return {
    search_tasks: tool(<any>{
      description: 'Search for project work order tasks, task assignments, due dates, priorities, and progress.',
      parameters: z.object({
        status: z.enum(['todo', 'in_progress', 'review', 'done', 'blocked']).optional().describe('Filter by task status.'),
        priority: z.enum(['critical', 'high', 'medium', 'low']).optional().describe('Filter by task priority.'),
        assignedName: z.string().optional().describe('Staff member name assigned to the task.'),
        query: z.string().optional().describe('Search keyword in task title or description.'),
        limit: z.number().optional().default(10),
      }),
      execute: async (args: any) => {
        const whereBase: any = projectId ? { projectId } : {};
        if (args?.status) whereBase.status = args.status;
        if (args?.priority) whereBase.priority = args.priority;
        if (args?.assignedName) whereBase.assignedName = ILike(`%${args.assignedName}%`);

        let whereClause: any = whereBase;
        const query = (args?.query || '').trim();
        if (query) {
          whereClause = [
            { ...whereBase, title: ILike(`%${query}%`) },
            { ...whereBase, description: ILike(`%${query}%`) },
            { ...whereBase, wbsCode: ILike(`%${query}%`) },
          ];
        }

        const tasks = await repo.find({
          where: whereClause,
          order: { dueDate: 'ASC', sortOrder: 'ASC' },
          take: args?.limit || 10,
          select: ['id', 'title', 'description', 'priority', 'status', 'assignedName', 'dueDate', 'progressPct', 'wbsCode', 'wbsTitle'],
        });

        return tasks;
      },
    }),
  };
};
