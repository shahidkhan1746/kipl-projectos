import { UpdatesService } from './updates.service';
import { StorageService } from '../storage/storage.service';
export declare class UpdatesController {
    private readonly svc;
    private readonly storage;
    constructor(svc: UpdatesService, storage: StorageService);
    upload(file: any, folder?: string): Promise<import("../storage/storage.service").UploadedPhoto>;
    list(): Promise<import("./project-update.entity").ProjectUpdate[]>;
    teamAll(): Promise<import("./team-member.entity").TeamMember[]>;
    one(id: string): Promise<import("./project-update.entity").ProjectUpdate>;
    create(body: any, req: any): Promise<import("./project-update.entity").ProjectUpdate>;
    edit(id: string, body: any): Promise<import("./project-update.entity").ProjectUpdate>;
    remove(id: string): Promise<{
        ok: boolean;
    }>;
    createTeam(body: any): Promise<import("./team-member.entity").TeamMember>;
    editTeam(id: string, body: any): Promise<import("./team-member.entity").TeamMember>;
    removeTeam(id: string): Promise<{
        ok: boolean;
    }>;
}
