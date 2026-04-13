import { MailerService } from './mailer.service';
export declare class MailerController {
    private readonly svc;
    constructor(svc: MailerService);
    status(): Promise<{
        configured: boolean;
        verified: boolean;
        email?: string;
        fromName?: string;
    }>;
    getConfig(): Promise<{
        smtpHost: string;
        smtpPort: number;
        smtpUser: string;
        fromName: string;
        fromEmail: string;
        isVerified: boolean;
        lastTestedAt: Date;
    } | null>;
    saveConfig(body: any): Promise<import("./email-config.entity").EmailConfig>;
    test(to: string): Promise<{
        success: boolean;
        message: string;
    }>;
    send(body: any): Promise<{
        success: boolean;
        messageId?: string;
        error?: string;
    }>;
}
