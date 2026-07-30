import { BaseEntity } from '../shared/entities/base.entity';
import { Project } from '../projects/project.entity';
import { User } from '../users/user.entity';
export declare enum LiaisonFileType {
    APPROVAL = "approval",
    NOC = "noc",
    DRAWING = "drawing",
    ESTIMATE = "estimate",
    REPORT = "report",
    LETTER = "letter",
    CLEARANCE = "clearance",
    VETTING = "vetting",
    OTHER = "other"
}
export declare enum LiaisonStatus {
    DRAFT = "draft",
    SUBMITTED = "submitted",
    UNDER_REVIEW = "under_review",
    APPROVED = "approved",
    REJECTED = "rejected",
    RETURNED = "returned",
    CLOSED = "closed"
}
export declare enum LiaisonPriority {
    LOW = "low",
    MEDIUM = "medium",
    HIGH = "high",
    URGENT = "urgent"
}
export declare const APPROVAL_CHAINS: Record<LiaisonFileType, string[]>;
export declare class LiaisonFile extends BaseEntity {
    project: Project;
    projectId: string;
    fileNumber: string;
    departmentRef: string;
    subject: string;
    fileType: LiaisonFileType;
    priority: LiaisonPriority;
    currentStatus: LiaisonStatus;
    currentHolder: User;
    currentHolderId: string;
    initiatedBy: User;
    initiatedById: string;
    department: string;
    dueDate: string;
    expectedDate: string;
    actualDate: string;
    delayDays: number;
    isEotGround: boolean;
    eotReason: string;
    linkedWbsCode: string;
    remarks: string;
    approvalChain: string[];
}
