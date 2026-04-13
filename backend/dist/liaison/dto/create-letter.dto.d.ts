import { LetterType } from '../letter.entity';
export declare class CreateLetterDto {
    projectId: string;
    fileId?: string;
    letterType?: LetterType;
    toName?: string;
    toOrganization?: string;
    toEmail?: string;
    subject: string;
    body: string;
    date?: string;
    signedById?: string;
}
