import { Controller, Post, Body, UseGuards, Request, Get, HttpCode, Res, Req } from '@nestjs/common';
import type { Request as ExpressRequest, Response } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from './decorators/public.decorator';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { Throttle } from '@nestjs/throttler';
import { readCookie } from '../common/secret-box';

class LoginDto {
  @IsEmail() email: string;
  @IsString() @MinLength(6) password: string;
}

class RefreshDto {
  @IsOptional() @IsString() refresh_token?: string;
}

class LogoutDto {
  @IsOptional() @IsString() refresh_token?: string;
}

class ChangePasswordDto {
  @IsString() currentPassword: string;
  @IsString() @MinLength(8) newPassword: string;
}

class ForgotDto {
  @IsEmail() email: string;
}

class ResetDto {
  @IsString() token: string;
  @IsString() @MinLength(8) password: string;
}

class DeleteAccountDto {
  @IsString() password: string;
}


@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * How the refresh cookie is scoped.
   *
   * The access token does not survive a reload, so this cookie is the only
   * thing standing between a page refresh and a login screen.
   *
   * It is first-party, and always has been. vercel.json rewrites /api/v1/*
   * through to the Render service, so the browser only ever addresses
   * kiplstpsrinagar.com — the Render origin never appears in it. An earlier
   * version of this comment claimed the opposite and sent someone chasing a
   * Safari third-party-cookie block that does not apply here.
   *
   * Three variables, all optional:
   *
   *   COOKIE_SAMESITE   lax    correct for a first-party cookie, and tighter
   *                            than the None this defaults to under HTTPS
   *   COOKIE_DOMAIN     unset  a host-only cookie is tighter still; set it
   *                            only to share the session with a subdomain
   *   COOKIE_SECURE     true   defaults to on in production
   *
   * Left unset, the behaviour is what it has been.
   */
  private cookieOpts() {
    const isProd = process.env.NODE_ENV === 'production';
    const secure = (process.env.COOKIE_SECURE ?? String(isProd)) === 'true';
    const sameSite = (process.env.COOKIE_SAMESITE
      ?? (secure ? 'none' : 'lax')) as 'none' | 'lax' | 'strict';
    // SameSite=None is only honoured on a Secure cookie; browsers drop the
    // pair silently otherwise, which would look exactly like "login is broken".
    if (sameSite === 'none' && !secure) {
      throw new Error('COOKIE_SAMESITE=none requires COOKIE_SECURE=true — browsers reject the pair.');
    }
    const domain = process.env.COOKIE_DOMAIN?.trim();
    return {
      httpOnly: true,
      secure,
      sameSite,
      ...(domain ? { domain } : {}),
      path: '/api/v1/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    };
  }

  private setRefreshCookie(res: Response, token: string) {
    res.cookie('kipl_refresh', token, this.cookieOpts());
  }

  private clearRefreshCookie(res: Response) {
    res.clearCookie('kipl_refresh', { ...this.cookieOpts(), maxAge: 0 });
  }

  /**
   * The cookie first, the body only as a fallback.
   *
   * It was the other way round, and a browser that still had an old token in
   * localStorage would post it here in preference to the live httpOnly cookie
   * it was also sending. A refresh token that is expired in the database is
   * treated as replay, and replay revokes every token the user has — so a
   * leftover in storage destroyed the valid session sitting right beside it,
   * on an ordinary page load.
   *
   * The cookie is set by this server and unreadable by script; the body is
   * whatever the caller had lying around. When both arrive, trust the cookie.
   * The body still serves callers that have no cookie jar, which is how the
   * mobile app authenticates.
   */
  private tokenFrom(req: ExpressRequest, body?: string) {
    return readCookie(req.headers.cookie, 'kipl_refresh') || body || '';
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const session = await this.authService.login(dto.email, dto.password);
    this.setRefreshCookie(res, session.refresh_token);
    return session;
  }

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Body() dto: RefreshDto,
    @Req() req: ExpressRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const session = await this.authService.refresh(this.tokenFrom(req, dto.refresh_token));
    this.setRefreshCookie(res, session.refresh_token);
    return session;
  }

  @Public()
  @Post('logout')
  @HttpCode(200)
  async logout(
    @Body() dto: LogoutDto,
    @Req() req: ExpressRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(this.tokenFrom(req, dto.refresh_token), (req as any).user?.id);
    this.clearRefreshCookie(res);
    return { ok: true };
  }

  @Post('change-password')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  changePassword(@Request() req: any, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(req.user.id, dto.currentPassword, dto.newPassword);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Request() req) {
    const user = req.user ?? {};
    const { passwordHash: _omit, passwordResetHash: _r, ...safe } = user;
    return { user: safe };
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post('forgot-password')
  @HttpCode(200)
  forgot(@Body() dto: ForgotDto) {
    return this.authService.requestPasswordReset(dto.email);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(200)
  reset(@Body() dto: ResetDto) {
    return this.authService.resetPasswordWithToken(dto.token, dto.password);
  }

  @Post('delete-account')
  @UseGuards(JwtAuthGuard)
  deleteAccount(@Request() req, @Body() dto: DeleteAccountDto) {
    return this.authService.deleteOwnAccount(req.user.id, dto.password);
  }
}
