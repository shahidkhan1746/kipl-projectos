import { BaseEntity } from '../shared/entities/base.entity';
export declare class OmPmTask extends BaseEntity {
    projectId: string;
    equipment: string;
    task: string;
    frequencyDays: number;
    lastDone: string;
    responsible: string;
    remarks: string;
    active: boolean;
}
