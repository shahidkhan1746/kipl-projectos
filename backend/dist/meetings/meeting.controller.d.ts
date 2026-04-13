import { MeetingService } from './meeting.service';
export declare class MeetingController {
    private readonly svc;
    constructor(svc: MeetingService);
    dashboard(pid: string): Promise<{
        totalMeetings: number;
        thisMonth: number;
        openActions: number;
        overdueActions: number;
        byType: any;
    }>;
    list(q: any): Promise<import("./meeting.entity").Meeting[]>;
    create(body: any, req: any): Promise<any>;
    getOne(id: string): Promise<import("./meeting.entity").Meeting>;
    update(id: string, body: any): Promise<any>;
    circulate(id: string): Promise<any>;
    confirm(id: string): Promise<any>;
    updateAction(id: string, idx: string, body: any): Promise<any>;
}
