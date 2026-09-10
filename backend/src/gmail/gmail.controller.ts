import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { GmailService } from './gmail.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { UserRole } from '../users/user.entity';

@Controller('gmail')
export class GmailController {
  constructor(private readonly gmail: GmailService) {}

  // Step 1: Visit this URL to start Gmail OAuth
  // Admin opens browser to: GET /api/v1/gmail/auth
  @Get('auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  getAuthUrl() {
    const url = this.gmail.getAuthUrl();
    return {
      message: 'Open this URL in your browser to authorise Gmail',
      auth_url: url,
    };
  }

  // Step 2: Google redirects here with ?code=xxx
  // Save the refresh_token printed to console into backend/.env
  @Public()
  @Get('callback')
  async callback(@Query('code') code: string, @Res() res: Response) {
    await this.gmail.exchangeCode(code);
    res
      .type('html')
      .send(
        '<html><body style="font-family:sans-serif;padding:2rem">' +
          '<h1>Gmail authorised</h1>' +
          '<p>The refresh token has been stored on the server. You can close this window.</p>' +
          '</body></html>',
      );
  }

  // Check if Gmail is configured
  @Get('status')
  @UseGuards(JwtAuthGuard)
  async status() {
    return { configured: await this.gmail.isConfigured() };
  }
}
