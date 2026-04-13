import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';

@Injectable()
export class GmailService {
  private readonly log = new Logger(GmailService.name);

  constructor(private readonly config: ConfigService) {}

  private getOAuth2Client() {
    const client = new google.auth.OAuth2(
      this.config.get('GMAIL_CLIENT_ID'),
      this.config.get('GMAIL_CLIENT_SECRET'),
      this.config.get('GMAIL_REDIRECT_URI') ?? 'http://localhost:3000/api/v1/gmail/callback',
    );

    const refreshToken = this.config.get('GMAIL_REFRESH_TOKEN');
    if (refreshToken) {
      client.setCredentials({ refresh_token: refreshToken });
    }

    return client;
  }

  // Generate the Google OAuth URL — user visits this once to authorise
  getAuthUrl(): string {
    const client = this.getOAuth2Client();
    return client.generateAuthUrl({
      access_type: 'offline',
      prompt:      'consent',
      scope:       ['https://www.googleapis.com/auth/gmail.send'],
    });
  }

  // Exchange auth code for refresh token — called once during setup
  async exchangeCode(code: string): Promise<string> {
    const client = this.getOAuth2Client();
    const { tokens } = await client.getToken(code);
    this.log.log('Gmail refresh token obtained — save this to GMAIL_REFRESH_TOKEN in .env');
    this.log.log(`Refresh token: ${tokens.refresh_token}`);
    return tokens.refresh_token ?? '';
  }

  // Send a letter as email with PDF attachment
  async sendLetter(params: {
    to:          string;
    subject:     string;
    bodyNote:    string;
    pdfBuffer:   Buffer;
    letterNumber:string;
    fileName:    string;
  }): Promise<string> {
    const refreshToken = this.config.get('GMAIL_REFRESH_TOKEN');
    if (!refreshToken) {
      throw new Error(
        'Gmail not configured. Visit /api/v1/gmail/auth to authorise Gmail access.'
      );
    }

    const client = this.getOAuth2Client();
    const gmail  = google.gmail({ version: 'v1', auth: client });

    const fromEmail = this.config.get('GMAIL_FROM_EMAIL') ?? 'me';
    const companyName = this.config.get('COMPANY_NAME') ?? 'KIPL';

    // Build MIME email with PDF attachment
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

    // Base64url encode the full email
    const encoded = Buffer.from(emailBody)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const response = await gmail.users.messages.send({
      userId:      'me',
      requestBody: { raw: encoded },
    });

    const messageId = response.data.id ?? '';
    this.log.log(`Letter sent: ${params.letterNumber} → ${params.to} (Gmail ID: ${messageId})`);
    return messageId;
  }

  isConfigured(): boolean {
    return !!(
      this.config.get('GMAIL_CLIENT_ID') &&
      this.config.get('GMAIL_CLIENT_SECRET') &&
      this.config.get('GMAIL_REFRESH_TOKEN')
    );
  }
}
