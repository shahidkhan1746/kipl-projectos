import { BaseEntity } from '../shared/entities/base.entity';
import { Project } from '../projects/project.entity';
import { LiaisonFile } from './liaison-file.entity';
import { User } from '../users/user.entity';
export declare enum LetterType {
    OUTGOING = "outgoing",
    INCOMING = "incoming",
    INTERNAL = "internal"
}
export declare enum LetterStatus {
    DRAFT = "draft",
    GENERATED = "generated",
    DISPATCHED = "dispatched"
}
export declare class Letter extends BaseEntity {
    project: Project;
    projectId: string;
    file: LiaisonFile;
    fileId: string;
    letterNumber: string;
    letterType: LetterType;
    toName: string;
    toOrganization: string;
    toEmail: string;
    subject: string;
    body: string;
    date: string;
    signedBy: User;
    signedById: string;
    pdfUrl: string;
    pdfPublicId: string;
    status: LetterStatus;
    dispatchedAt: Date;
    gmailMessageId: string;
    emailSubject: string;
}
