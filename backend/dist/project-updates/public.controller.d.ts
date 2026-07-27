import { UpdatesService } from './updates.service';
export declare class PublicUpdatesController {
    private readonly svc;
    constructor(svc: UpdatesService);
    timeline(): Promise<import("./project-update.entity").ProjectUpdate[]>;
    gallery(): Promise<{
        url: string;
        caption: string;
        date: string;
        category: string;
        updateId: string;
        idx: number;
    }[]>;
    team(): Promise<import("./team-member.entity").TeamMember[]>;
}
