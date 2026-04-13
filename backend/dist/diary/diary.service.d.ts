import { Repository } from 'typeorm';
import { SiteDiary } from './diary.entity';
export declare class DiaryService {
    private repo;
    constructor(repo: Repository<SiteDiary>);
    create(data: any): Promise<SiteDiary>;
    update(id: string, data: any): Promise<SiteDiary>;
    findOne(id: string): Promise<SiteDiary>;
    findByDate(projectId: string, date: string): Promise<SiteDiary | null>;
    list(p: {
        projectId?: string;
        fromDate?: string;
        toDate?: string;
        status?: string;
        eotOnly?: boolean;
    }): Promise<SiteDiary[]>;
    approve(id: string, approvedBy: string): Promise<SiteDiary>;
    submit(id: string): Promise<SiteDiary>;
    dashboard(projectId: string): Promise<{
        totalEntries: number;
        thisMonthEntries: number;
        avgLabourThisMonth: number;
        rainyDays: number;
        eotClaimDays: number;
        hoursLostWeather: number;
        workDoneCount: number;
        pendingApproval: number;
    }>;
}
