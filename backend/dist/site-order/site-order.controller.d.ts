import { SiteOrderService } from './site-order.service';
export declare class SiteOrderController {
    private readonly svc;
    constructor(svc: SiteOrderService);
    list(pid: string, status: string): Promise<import("./site-order.entity").SiteOrder[]>;
    create(body: any): Promise<import("./site-order.entity").SiteOrder>;
    update(id: string, body: any): Promise<import("./site-order.entity").SiteOrder>;
    remove(id: string): Promise<import("typeorm").DeleteResult>;
}
