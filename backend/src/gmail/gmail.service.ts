import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import { SettingsService } from '../settings/settings.service';

const GMAIL_TOKEN_KEY = 'gmail_refresh_token';

@Injectable()
export class GmailService {
  private readonly log = new Logger(GmailService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly settings: SettingsService,
  ) {}

  private async storedRefreshToken(): Promise<string | undefined> {
    const fromSettings = await this.settings.get(GMAIL_TOKEN_KEY);
    return fromSettings || this.config.get('GMAIL_REFRESH_TOKEN') || undefined;
  }

  private getOAuth2Client() {
    const client = new google.auth.OAuth2(
      this.config.get('GMAIL_CLIENT_ID'),
      this.config.get('GMAIL_CLIENT_SECRET'),
      this.config.get('GMAIL_REDIRECT_URI') ?? 'http://localhost:3000/api/v1/gmail/callback',
    );

    return client;
  }

  private async authedClient() {
    const client = this.getOAuth2Client();
    const refreshToken = await this.storedRefreshToken();
    if (refreshToken) client.setCredentials({ refresh_token: refreshToken });
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
  async exchangeCode(code: string): Promise<void> {
    const client = this.getOAuth2Client();
    const { tokens } = await client.getToken(code);
    if (!tokens.refresh_token) {
      throw new Error('Google did not return a refresh token. Re-authorise with prompt=consent.');
    }
    await this.settings.set(
      GMAIL_TOKEN_KEY,
      tokens.refresh_token,
      'Gmail OAuth refresh token',
      'secrets',
    );
    this.log.log('Gmail refresh token stored in settings (not logged).');
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
    const refreshToken = await this.storedRefreshToken();
    if (!refreshToken) {
      throw new Error(
        'Gmail not configured. Visit /api/v1/gmail/auth to authorise Gmail access.'
      );
    }

    const client = await this.authedClient();
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

  async isConfigured(): Promise<boolean> {
    const token = await this.storedRefreshToken();
    return !!(
      this.config.get('GMAIL_CLIENT_ID') &&
      this.config.get('GMAIL_CLIENT_SECRET') &&
      token
    );
  }
}
