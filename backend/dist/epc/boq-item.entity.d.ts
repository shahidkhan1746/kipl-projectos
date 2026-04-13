import { BaseEntity } from '../shared/entities/base.entity';
export declare enum BoqCategory {
    SEWER_NETWORK = "sewer_network",
    IPS_CIVIL = "ips_civil",
    IPS_EM = "ips_em",
    STP_CIVIL = "stp_civil",
    STP_EM = "stp_em",
    RISING_MAIN = "rising_main",
    ROAD_WORK = "road_work",
    OTHER = "other"
}
export declare class BoqItem extends BaseEntity {
    projectId: string;
    slNo: string;
    sorRef: string;
    description: string;
    unit: string;
    category: BoqCategory;
    subCategory: string;
    estimatedQty: number;
    rate: number;
    estimatedAmount: number;
    quotedRate: number;
    quotedAmount: number;
    measuredQty: number;
    measuredAmount: number;
    paymentMilestone: string;
    paymentPct: number;
    isActive: boolean;
}
