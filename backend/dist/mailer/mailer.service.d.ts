import { Repository } from 'typeorm';
import { EmailConfig } from './email-config.entity';
export declare class MailerService {
    private configRepo;
    private readonly logger;
    constructor(configRepo: Repository<EmailConfig>);
    getConfig(): Promise<EmailConfig | null>;
    saveConfig(data: {
        smtpHost?: string;
        smtpPort?: number;
        smtpUser: string;
        smtpPass: string;
        fromName?: string;
        fromEmail: string;
    }): Promise<EmailConfig>;
    private createTransporter;
    testConnection(to: string): Promise<{
        success: boolean;
        message: string;
    }>;
    sendEmail(p: {
        to: string | string[];
        subject: string;
        html: string;
        cc?: string[];
        replyTo?: string;
    }): Promise<{
        success: boolean;
        messageId?: string;
        error?: string;
    }>;
    isConfigured(): Promise<{
        configured: boolean;
        verified: boolean;
        email?: string;
        fromName?: string;
    }>;
}
