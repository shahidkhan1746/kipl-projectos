import { BaseEntity } from '../shared/entities/base.entity';
export declare class TeamMember extends BaseEntity {
    name: string;
    title: string;
    department: string;
    photoUrl: string | null;
    photoKey: string | null;
    bio: string;
    sortOrder: number;
    isPublished: boolean;
}
