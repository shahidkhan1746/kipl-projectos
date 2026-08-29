import { tool } from 'ai';
import { z } from 'zod';
import { DataSource, ILike } from 'typeorm';
import { FleetLog } from '../../fleet/fleet-log.entity';

export const createFleetTools = (dataSource: DataSource, projectId: string) => {
  const repo = dataSource.getRepository(FleetLog);

  return {
    search_fleet_logs: tool(<any>{
      description: 'Search machinery, excavator, heavy plant, and vehicle operational logs, hours worked, and fuel usage.',
      parameters: z.object({
        logType: z.enum(['vehicle', 'plant']).optional().describe('Filter by log type: "vehicle" (cars/SUVs/trucks) or "plant" (JCBs, excavators).'),
        machineOrVehicle: z.string().optional().describe('Machine ID (e.g. "JCB-01", "PC210") or vehicle registration/model.'),
        hasBreakdown: z.boolean().optional().describe('Filter logs where equipment experienced a breakdown.'),
        limit: z.number().optional().default(10),
      }),
      execute: async (args: any) => {
        const whereBase: any = projectId ? { projectId } : {};
        if (args?.logType) whereBase.logType = args.logType;
        if (args?.hasBreakdown !== undefined) whereBase.breakdown = args.hasBreakdown;

        let whereClause: any = whereBase;
        const search = (args?.machineOrVehicle || '').trim();
        if (search) {
          whereClause = [
            { ...whereBase, machineId: ILike(`%${search}%`) },
            { ...whereBase, machineType: ILike(`%${search}%`) },
            { ...whereBase, vehicle: ILike(`%${search}%`) },
            { ...whereBase, workDescription: ILike(`%${search}%`) },
          ];
        }

        const logs = await repo.find({
          where: whereClause,
          order: { date: 'DESC' },
          take: args?.limit || 10,
          select: [
            'id', 'date', 'logType', 'vehicle', 'driver', 'distanceKm',
            'machineId', 'machineType', 'operator', 'hoursWorked', 'workZone', 'workDescription',
            'breakdown', 'breakdownDetails', 'fuelLitres', 'fuelCost', 'remarks'
          ],
        });
        return logs;
      },
    }),
  };
};
