import { ConfigService } from '@nestjs/config';
export declare class GmailService {
    private readonly config;
    private readonly log;
    constructor(config: ConfigService);
    private getOAuth2Client;
    getAuthUrl(): string;
    exchangeCode(code: string): Promise<string>;
    sendLetter(params: {
        to: string;
        subject: string;
        bodyNote: string;
        pdfBuffer: Buffer;
        letterNumber: string;
        fileName: string;
    }): Promise<string>;
    isConfigured(): boolean;
}
