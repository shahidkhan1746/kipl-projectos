import { BaseEntity } from '../shared/entities/base.entity';
export declare class Measurement extends BaseEntity {
    projectId: string;
    boqItemId: string;
    raBillId: string;
    mbNo: string;
    mbPage: string;
    date: string;
    location: string;
    entries: any[];
    totalQty: number;
    measuredBy: string;
    checkedBy: string;
    remarks: string;
}
