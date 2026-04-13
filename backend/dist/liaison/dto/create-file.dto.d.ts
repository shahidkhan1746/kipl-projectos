import { LiaisonFileType, LiaisonPriority } from '../liaison-file.entity';
export declare class CreateFileDto {
    projectId: string;
    subject: string;
    fileType: LiaisonFileType;
    priority?: LiaisonPriority;
    department?: string;
    dueDate?: string;
    remarks?: string;
}
