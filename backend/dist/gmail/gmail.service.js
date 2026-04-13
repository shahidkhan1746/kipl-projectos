"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var GmailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GmailService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const googleapis_1 = require("googleapis");
let GmailService = GmailService_1 = class GmailService {
    config;
    log = new common_1.Logger(GmailService_1.name);
    constructor(config) {
        this.config = config;
    }
    getOAuth2Client() {
        const client = new googleapis_1.google.auth.OAuth2(this.config.get('GMAIL_CLIENT_ID'), this.config.get('GMAIL_CLIENT_SECRET'), this.config.get('GMAIL_REDIRECT_URI') ?? 'http://localhost:3000/api/v1/gmail/callback');
        const refreshToken = this.config.get('GMAIL_REFRESH_TOKEN');
        if (refreshToken) {
            client.setCredentials({ refresh_token: refreshToken });
        }
        return client;
    }
    getAuthUrl() {
        const client = this.getOAuth2Client();
        return client.generateAuthUrl({
            access_type: 'offline',
            prompt: 'consent',
            scope: ['https://www.googleapis.com/auth/gmail.send'],
        });
    }
    async exchangeCode(code) {
        const client = this.getOAuth2Client();
        const { tokens } = await client.getToken(code);
        this.log.log('Gmail refresh token obtained — save this to GMAIL_REFRESH_TOKEN in .env');
        this.log.log(`Refresh token: ${tokens.refresh_token}`);
        return tokens.refresh_token ?? '';
    }
    async sendLetter(params) {
        const refreshToken = this.config.get('GMAIL_REFRESH_TOKEN');
        if (!refreshToken) {
            throw new Error('Gmail not configured. Visit /api/v1/gmail/auth to authorise Gmail access.');
        }
        const client = this.getOAuth2Client();
        const gmail = googleapis_1.google.gmail({ version: 'v1', auth: client });
        const fromEmail = this.config.get('GMAIL_FROM_EMAIL') ?? 'me';
        const companyName = this.config.get('COMPANY_NAME') ?? 'KIPL';
        const boundary = `boundary_${Date.now()}`;
        const pdfBase64 = params.pdfBuffer.toString('base64');
        const emailBody = [
            `From: "${companyName}" <${fromEmail}>`,
            `To: ${params.to}`,
            `Subject: ${params.subject}`,
            `MIME-Version: 1.0`,
            `Content-Type: multipart/mixed; boundary="${boundary}"`,
            ``,
            `--${boundary}`,
            `Content-Type: text/plain; charset="UTF-8"`,
            ``,
            params.bodyNote || `Please find enclosed the letter ${params.letterNumber} from ${companyName}.`,
            ``,
            `--${boundary}`,
            `Content-Type: application/pdf`,
            `Content-Transfer-Encoding: base64`,
            `Content-Disposition: attachment; filename="${params.fileName}"`,
            ``,
            pdfBase64,
            `--${boundary}--`,
        ].join('\r\n');
        const encoded = Buffer.from(emailBody)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
        const response = await gmail.users.messages.send({
            userId: 'me',
            requestBody: { raw: encoded },
        });
        const messageId = response.data.id ?? '';
        this.log.log(`Letter sent: ${params.letterNumber} → ${params.to} (Gmail ID: ${messageId})`);
        return messageId;
    }
    isConfigured() {
        return !!(this.config.get('GMAIL_CLIENT_ID') &&
            this.config.get('GMAIL_CLIENT_SECRET') &&
            this.config.get('GMAIL_REFRESH_TOKEN'));
    }
};
exports.GmailService = GmailService;
exports.GmailService = GmailService = GmailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], GmailService);
//# sourceMappingURL=gmail.service.js.map