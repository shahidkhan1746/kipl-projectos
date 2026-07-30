import { BaseEntity } from '../shared/entities/base.entity';
export interface UpdatePhoto {
    url: string;
    key: string;
    caption?: string;
}
export declare class ProjectUpdate extends BaseEntity {
    projectId: string | null;
    date: string;
    title: string;
    description: string;
    category: string;
    photos: UpdatePhoto[];
    isPublished: boolean;
    createdBy: string | null;
    createdById: string | null;
}
