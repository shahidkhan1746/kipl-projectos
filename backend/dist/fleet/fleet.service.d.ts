import { Repository } from 'typeorm';
import { FleetLog } from './fleet-log.entity';
export declare class FleetService {
    private repo;
    constructor(repo: Repository<FleetLog>);
    list(params: {
        projectId: string;
        logType?: string;
        from?: string;
        to?: string;
    }): Promise<FleetLog[]>;
    dashboard(projectId: string): Promise<{
        today: {
            vehicle: FleetLog[];
            plant: FleetLog[];
        };
        monthStats: {
            vehicle: {
                km: number;
                fuel: number;
            };
            plant: {
                hours: number;
                fuel: number;
            };
        };
        fleet: any[];
    }>;
    create(dto: Partial<FleetLog>): Promise<FleetLog>;
    update(id: string, dto: Partial<FleetLog>): Promise<FleetLog | null>;
    delete(id: string): Promise<import("typeorm").DeleteResult>;
}
