import { BaseEntity } from '../shared/entities/base.entity';
export declare enum ChecklistCategory {
    SEWER_NETWORK = "sewer_network",
    MANHOLE = "manhole",
    PIPE_LAYING = "pipe_laying",
    EARTHWORK = "earthwork",
    CONCRETE = "concrete",
    IPS_CIVIL = "ips_civil",
    IPS_EM = "ips_em",
    STP = "stp",
    ROAD_RESTORATION = "road_restoration",
    TESTING = "testing",
    MATERIAL = "material",
    SAFETY = "safety"
}
export declare class QaChecklist extends BaseEntity {
    projectId: string;
    title: string;
    category: ChecklistCategory;
    workItem: string;
    isTemplate: boolean;
    items: Array<{
        id: string;
        question: string;
        required: boolean;
        referenceSpec?: string;
    }>;
    isActive: boolean;
}
