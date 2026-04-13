import { BaseEntity } from '../shared/entities/base.entity';
export declare enum InspectionStatus {
    DRAFT = "draft",
    SUBMITTED = "submitted",
    PASSED = "passed",
    FAILED = "failed",
    CONDITIONAL = "conditional"
}
export declare class QaInspection extends BaseEntity {
    projectId: string;
    checklistId: string;
    date: string;
    workItem: string;
    location: string;
    chainage: string;
    inspectedBy: string;
    contractorRep: string;
    engineerRep: string;
    responses: Array<{
        itemId: string;
        question: string;
        result: 'pass' | 'fail' | 'na';
        remarks?: string;
        photos?: string[];
    }>;
    overallResult: InspectionStatus;
    passCount: number;
    failCount: number;
    naCount: number;
    remarks: string;
    ncrRaised: boolean;
    ncrId: string;
}
