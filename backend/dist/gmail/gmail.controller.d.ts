import { GmailService } from './gmail.service';
export declare class GmailController {
    private readonly gmail;
    constructor(gmail: GmailService);
    getAuthUrl(): {
        message: string;
        auth_url: string;
    };
    callback(code: string): Promise<{
        message: string;
        refresh_token: string;
    }>;
    status(): {
        configured: boolean;
    };
}
