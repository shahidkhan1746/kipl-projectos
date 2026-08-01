import { DiaryService } from './diary.service';
import { StorageService } from '../storage/storage.service';
export declare class DiaryController {
    private readonly svc;
    private readonly storage;
    constructor(svc: DiaryService, storage: StorageService);
    upload(file: any): Promise<import("../storage/storage.service").UploadedPhoto>;
    dashboard(pid: string): Promise<{
        totalEntries: number;
        thisMonthEntries: number;
        avgLabourThisMonth: number;
        rainyDays: number;
        eotClaimDays: number;
        hoursLostWeather: number;
        workDoneCount: number;
        pendingApproval: number;
    }>;
    list(q: any): Promise<import("./diary.entity").SiteDiary[]>;
    byDate(pid: string, date: string): Promise<import("./diary.entity").SiteDiary | null>;
    getOne(id: string): Promise<import("./diary.entity").SiteDiary>;
    create(body: any, req: any): Promise<import("./diary.entity").SiteDiary>;
    update(id: string, body: any): Promise<import("./diary.entity").SiteDiary>;
    submit(id: string): Promise<import("./diary.entity").SiteDiary>;
    approve(id: string, req: any): Promise<import("./diary.entity").SiteDiary>;
}
