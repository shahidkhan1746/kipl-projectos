import { Repository } from 'typeorm';
import { SiteOrder } from './site-order.entity';
export declare class SiteOrderService {
    private repo;
    constructor(repo: Repository<SiteOrder>);
    private nextOrderNo;
    create(data: Partial<SiteOrder>): Promise<SiteOrder>;
    update(id: string, data: Partial<SiteOrder>): Promise<SiteOrder>;
    remove(id: string): Promise<import("typeorm").DeleteResult>;
    list(projectId?: string, status?: string): Promise<SiteOrder[]>;
}
