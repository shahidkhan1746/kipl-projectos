import { BaseEntity } from '../shared/entities/base.entity';
import { LiaisonFile } from './liaison-file.entity';
import { User } from '../users/user.entity';
export declare const REVISIONS: string[];
export declare class FileDocument extends BaseEntity {
    file: LiaisonFile;
    fileId: string;
    documentName: string;
    revision: string;
    cloudinaryUrl: string;
    cloudinaryPublicId: string;
    fileSizeBytes: number;
    mimeType: string;
    uploadedBy: User;
    uploadedById: string;
    isCurrentRevision: boolean;
    uploadedAt: Date;
}
