import { FleetService } from './fleet.service';
export declare class FleetController {
    private svc;
    constructor(svc: FleetService);
    dashboard(projectId: string): Promise<{
        today: {
            vehicle: import("./fleet-log.entity").FleetLog[];
            plant: import("./fleet-log.entity").FleetLog[];
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
    list(q: any): Promise<import("./fleet-log.entity").FleetLog[]>;
    create(dto: any): Promise<import("./fleet-log.entity").FleetLog>;
    update(id: string, dto: any): Promise<import("./fleet-log.entity").FleetLog | null>;
    delete(id: string): Promise<import("typeorm").DeleteResult>;
}
