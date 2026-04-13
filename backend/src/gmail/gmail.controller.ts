import { Controller, Get, Query, Redirect, UseGuards } from '@nestjs/common';
import { GmailService } from './gmail.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('gmail')
export class GmailController {
  constructor(private readonly gmail: GmailService) {}

  // Step 1: Visit this URL to start Gmail OAuth
  // Admin opens browser to: GET /api/v1/gmail/auth
  @Get('auth')
  @UseGuards(JwtAuthGuard)
  getAuthUrl() {
    const url = this.gmail.getAuthUrl();
    return {
      message: 'Open this URL in your browser to authorise Gmail',
      auth_url: url,
    };
  }

  // Step 2: Google redirects here with ?code=xxx
  // Save the refresh_token printed to console into backend/.env
  @Get('callback')
  async callback(@Query('code') code: string) {
    const refreshToken = await this.gmail.exchangeCode(code);
    return {
      message: 'Gmail authorised! Copy this refresh token into backend/.env as GMAIL_REFRESH_TOKEN',
      refresh_token: refreshToken,
    };
  }

  // Check if Gmail is configured
  @Get('status')
  @UseGuards(JwtAuthGuard)
  status() {
    return { configured: this.gmail.isConfigured() };
  }
}
