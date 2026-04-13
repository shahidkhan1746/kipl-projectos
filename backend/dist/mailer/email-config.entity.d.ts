import { BaseEntity } from '../shared/entities/base.entity';
export declare class EmailConfig extends BaseEntity {
    smtpHost: string;
    smtpPort: number;
    smtpSecure: boolean;
    smtpUser: string;
    smtpPass: string;
    fromName: string;
    fromEmail: string;
    isActive: boolean;
    isVerified: boolean;
    lastTestedAt: Date;
}
