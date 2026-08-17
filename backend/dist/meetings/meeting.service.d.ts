import { Repository } from 'typeorm';
import { Meeting } from './meeting.entity';
export declare class MeetingService {
    private repo;
    constructor(repo: Repository<Meeting>);
    private clean;
    create(data: any): Promise<any>;
    list(p: {
        projectId?: string;
        type?: string;
        status?: string;
        fromDate?: string;
        toDate?: string;
    }): Promise<Meeting[]>;
    findOne(id: string): Promise<Meeting>;
    update(id: string, data: any): Promise<any>;
    circulate(id: string): Promise<any>;
    confirm(id: string): Promise<any>;
    updateActionItem(id: string, actionIdx: number, updates: any): Promise<any>;
    dashboard(projectId: string): Promise<{
        totalMeetings: number;
        thisMonth: number;
        openActions: number;
        overdueActions: number;
        byType: any;
    }>;
}
