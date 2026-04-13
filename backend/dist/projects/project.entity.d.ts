import { BaseEntity } from '../shared/entities/base.entity';
import { User } from '../users/user.entity';
export declare enum ProjectStatus {
    ACTIVE = "active",
    ON_HOLD = "on_hold",
    COMPLETED = "completed",
    CANCELLED = "cancelled"
}
export declare class Project extends BaseEntity {
    name: string;
    code: string;
    description: string;
    client: string;
    location: string;
    contractValue: number;
    startDate: string;
    endDate: string;
    status: ProjectStatus;
    progressPct: number;
    manager: User;
}
