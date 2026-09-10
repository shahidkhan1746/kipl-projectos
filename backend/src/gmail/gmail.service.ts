import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import * as crypto from 'crypto';
import { SettingsService } from '../settings/settings.service';

const GMAIL_TOKEN_KEY = 'gmail_refresh_token';

@Injectable()
export class GmailService {
  private readonly log = new Logger(GmailService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly settings: SettingsService,
  ) {}

  private signingSecret(): string {
    return this.config.get<string>('JWT_SECRET') || 'dev-gmail-oauth-secret';
  }

  generateState(userId: string): string {
    const payload = JSON.stringify({
      uid: userId,
      ts: Date.now(),
      nonce: crypto.randomBytes(8).toString('hex'),
    });
    const b64 = Buffer.from(payload).toString('base64url');
    const sig = crypto.createHmac('sha256', this.signingSecret()).update(b64).digest('base64url');
    return `${b64}.${sig}`;
  }

  verifyState(state: string): boolean {
    if (!state || !state.includes('.')) return false;
    const [b64, sig] = state.split('.');
    if (!b64 || !sig) return false;
    const expected = crypto.createHmac('sha256', this.signingSecret()).update(b64).digest('base64url');
    if (sig !== expected) return false;
    try {
      const payload = JSON.parse(Buffer.from(b64, 'base64url').toString('utf8'));
      const age = Date.now() - (payload.ts || 0);
      if (age < 0 || age > 10 * 60 * 1000) return false; // 10-minute validity
      return true;
    } catch {
      return false;
    }
  }

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

  // Generate the Google OAuth URL with signed state — user visits this once to authorise
  getAuthUrl(userId = 'admin'): string {
    const client = this.getOAuth2Client();
    const state = this.generateState(userId);
    return client.generateAuthUrl({
      access_type: 'offline',
      prompt:      'consent',
      scope:       ['https://www.googleapis.com/auth/gmail.send'],
      state,
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
