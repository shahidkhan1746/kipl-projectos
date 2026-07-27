import { Repository } from 'typeorm';
import { ProjectUpdate } from './project-update.entity';
import { TeamMember } from './team-member.entity';
export declare class UpdatesService {
    private updates;
    private team;
    constructor(updates: Repository<ProjectUpdate>, team: Repository<TeamMember>);
    listAll(): Promise<ProjectUpdate[]>;
    getOne(id: string): Promise<ProjectUpdate>;
    create(body: any, userName?: string): Promise<ProjectUpdate>;
    update(id: string, body: any): Promise<ProjectUpdate>;
    remove(id: string): Promise<{
        ok: boolean;
    }>;
    listPublic(): Promise<ProjectUpdate[]>;
    gallery(): Promise<{
        url: string;
        caption: string;
        date: string;
        category: string;
        updateId: string;
        idx: number;
    }[]>;
    listTeamAll(): Promise<TeamMember[]>;
    listTeamPublic(): Promise<TeamMember[]>;
    createTeam(body: any): Promise<TeamMember>;
    updateTeam(id: string, body: any): Promise<TeamMember>;
    removeTeam(id: string): Promise<{
        ok: boolean;
    }>;
}
