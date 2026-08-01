import { BaseEntity } from '../shared/entities/base.entity';
export declare class SiteOrder extends BaseEntity {
    projectId: string;
    orderNo: string;
    date: string;
    issuedBy: string;
    instruction: string;
    acknowledgedBy: string;
    acknowledgedDate: string;
    complianceStatus: string;
    remarks: string;
}
