import { tool } from 'ai';
import { z } from 'zod';
import { DataSource, ILike } from 'typeorm';
import { OmLog, EFFLUENT_LIMITS } from '../../om/om-log.entity';
import { OmEvent, OmEventType, OmEventStatus } from '../../om/om-event.entity';
import { OmPmTask } from '../../om/om-pm-task.entity';

export const createOmTools = (dataSource: DataSource, projectId: string) => {
  const logRepo = dataSource.getRepository(OmLog);
  const eventRepo = dataSource.getRepository(OmEvent);
  const pmRepo = dataSource.getRepository(OmPmTask);

  return {
    get_effluent_summary: tool(<any>{
      description: 'Get STP daily process logs, inflow/outflow, effluent parameters (BOD, COD, TSS, pH), and compliance against standard discharge limits.',
      parameters: z.object({
        from: z.string().optional().describe('Start date (YYYY-MM-DD).'),
        to: z.string().optional().describe('End date (YYYY-MM-DD).'),
        limit: z.number().optional().default(10),
      }),
      execute: async (args: any) => {
        const qb = logRepo.createQueryBuilder('l');
        if (projectId) qb.andWhere('l.project_id = :projectId', { projectId });
        if (args?.from) qb.andWhere('l.date >= :from', { from: args.from });
        if (args?.to) qb.andWhere('l.date <= :to', { to: args.to });
        qb.orderBy('l.date', 'DESC').take(args?.limit || 10);

        const logs = await qb.getMany();
        return {
          limits: EFFLUENT_LIMITS,
          recentLogs: logs.map(l => ({
            date: l.date,
            inflowMld: l.inflowMld,
            outflowMld: l.outflowMld,
            inBod: l.inBod,
            outBod: l.outBod,
            outCod: l.outCod,
            outTss: l.outTss,
            outPh: l.outPh,
            powerKwh: l.powerKwh,
            sludgeM3: l.sludgeM3,
            compliant: (l.outBod != null && l.outBod <= EFFLUENT_LIMITS.outBod) &&
                       (l.outCod != null && l.outCod <= EFFLUENT_LIMITS.outCod) &&
                       (l.outTss != null && l.outTss <= EFFLUENT_LIMITS.outTss),
          })),
        };
      },
    }),

    search_om_breakdowns: tool(<any>{
      description: 'Search STP equipment breakdowns, mechanical/electrical failures, downtime hours, and maintenance actions.',
      parameters: z.object({
        status: z.enum(['open', 'closed']).optional().describe('Filter by breakdown status: "open" or "closed".'),
        equipment: z.string().optional().describe('Equipment name (e.g. "Blower 1", "RAS Pump").'),
        limit: z.number().optional().default(10),
      }),
      execute: async (args: any) => {
        const whereBase: any = projectId ? { projectId } : {};
        if (args?.status) whereBase.status = args.status;
        whereBase.type = OmEventType.BREAKDOWN;

        let whereClause: any = whereBase;
        if (args?.equipment) {
          whereClause = { ...whereBase, equipment: ILike(`%${args.equipment}%`) };
        }

        const events = await eventRepo.find({
          where: whereClause,
          order: { startAt: 'DESC' },
          take: args?.limit || 10,
        });

        return events.map(e => ({
          id: e.id,
          equipment: e.equipment,
          startAt: e.startAt,
          endAt: e.endAt,
          status: e.status,
          cause: e.cause,
          action: e.action,
          attendedBy: e.attendedBy,
          remarks: e.remarks,
        }));
      },
    }),

    list_pm_tasks: tool(<any>{
      description: 'List preventive maintenance (PM) schedule for STP machinery and equipment.',
      parameters: z.object({
        equipment: z.string().optional().describe('Filter by equipment name.'),
      }),
      execute: async (args: any) => {
        const whereBase: any = projectId ? { projectId, active: true } : { active: true };
        if (args?.equipment) whereBase.equipment = ILike(`%${args.equipment}%`);

        const tasks = await pmRepo.find({ where: whereBase, order: { lastDone: 'ASC' } });
        return tasks.map(t => {
          let nextDue: string | null = null;
          let isOverdue = false;
          if (t.lastDone) {
            const d = new Date(t.lastDone);
            d.setDate(d.getDate() + (t.frequencyDays || 30));
            nextDue = d.toISOString().split('T')[0];
            isOverdue = d < new Date();
          }
          return {
            id: t.id,
            equipment: t.equipment,
            task: t.task,
            frequencyDays: t.frequencyDays,
            lastDone: t.lastDone,
            nextDue,
            isOverdue,
            responsible: t.responsible,
          };
        });
      },
    }),
  };
};
