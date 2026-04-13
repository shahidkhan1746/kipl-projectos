import { BaseEntity } from '../shared/entities/base.entity';
import { LiaisonFile } from './liaison-file.entity';
import { User } from '../users/user.entity';
export declare enum WorkflowStatus {
    PENDING = "pending",
    APPROVED = "approved",
    REJECTED = "rejected",
    SKIPPED = "skipped"
}
export declare class ApprovalWorkflow extends BaseEntity {
    file: LiaisonFile;
    fileId: string;
    stepOrder: number;
    approverRole: string;
    approver: User;
    approverId: string;
    status: WorkflowStatus;
    actionAt: Date;
    remarks: string;
}
