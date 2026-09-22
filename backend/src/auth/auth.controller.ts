import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  HttpCode,
  Res,
  Req,
  Param,
} from '@nestjs/common';
import type { Request as ExpressRequest, Response } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from './decorators/public.decorator';
import { IsBoolean, IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { Throttle } from '@nestjs/throttler';
import { readCookie } from '../common/secret-box';

class LoginDto {
  @IsEmail() email: string;
  @IsString() @MinLength(6) password: string;
  @IsOptional() @IsString() deviceId?: string;
  @IsOptional() @IsString() deviceName?: string;
  @IsOptional() @IsString() deviceFingerprint?: string;
  @IsOptional() @IsBoolean() rememberMe?: boolean;
}

class RefreshDto {
  @IsOptional() @IsString() refresh_token?: string;
  @IsOptional() @IsString() deviceId?: string;
  @IsOptional() @IsString() deviceName?: string;
  @IsOptional() @IsString() deviceFingerprint?: string;
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
   * kiplstpsrinagar.com — the Render origin never appears in it.
   */
  private cookieOpts(rememberMe = true) {
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
    const days = rememberMe ? 30 : 7;
    return {
      httpOnly: true,
      secure,
      sameSite,
      ...(domain ? { domain } : {}),
      path: '/api/v1/auth',
      maxAge: days * 24 * 60 * 60 * 1000,
    };
  }

  private setRefreshCookie(res: Response, token: string, rememberMe = true) {
    res.cookie('kipl_refresh', token, this.cookieOpts(rememberMe));
  }

  private clearRefreshCookie(res: Response) {
    res.clearCookie('kipl_refresh', { ...this.cookieOpts(false), maxAge: 0 });
  }

  private getClientIp(req: ExpressRequest): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
      return raw?.trim() || req.ip || req.socket?.remoteAddress || '';
    }
    return req.ip || req.socket?.remoteAddress || '';
  }

  private extractDeviceMeta(
    req: ExpressRequest,
    dto: { deviceId?: string; deviceName?: string; deviceFingerprint?: string },
  ) {
    const headerDeviceId = (req.headers['x-device-id'] as string) || undefined;
    const headerFingerprint = (req.headers['x-device-fingerprint'] as string) || undefined;
    const deviceId = dto.deviceId || headerDeviceId;
    const deviceFingerprint = dto.deviceFingerprint || headerFingerprint;
    const deviceName = dto.deviceName;

    if (!deviceId && !deviceFingerprint) return undefined;
    return {
      deviceId: deviceId || 'legacy-device',
      deviceName,
      deviceFingerprint: deviceFingerprint || 'unknown-fingerprint',
    };
  }

  /**
   * The cookie first, the body only as a fallback.
   */
  private tokenFrom(req: ExpressRequest, body?: string) {
    return readCookie(req.headers.cookie, 'kipl_refresh') || body || '';
  }

  @Public()
  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  @Post('login')
  @HttpCode(200)
  async login(
    @Body() dto: LoginDto,
    @Req() req: ExpressRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const rawIp = this.getClientIp(req);
    const userAgent = req.headers['user-agent'];
    const meta = this.extractDeviceMeta(req, dto);
    const rememberMe = dto.rememberMe !== false;

    const session = await this.authService.login(
      dto.email,
      dto.password,
      meta,
      rawIp,
      userAgent,
      rememberMe,
    );
    this.setRefreshCookie(res, session.refresh_token, rememberMe);
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
    const rawIp = this.getClientIp(req);
    const userAgent = req.headers['user-agent'];
    const meta = this.extractDeviceMeta(req, dto);

    const session = await this.authService.refresh(
      this.tokenFrom(req, dto.refresh_token),
      meta,
      rawIp,
      userAgent,
    );
    this.setRefreshCookie(res, session.refresh_token, true);
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

  @Get('devices')
  @UseGuards(JwtAuthGuard)
  async listDevices(@Request() req: any) {
    const currentDeviceId = (req.headers['x-device-id'] as string) || undefined;
    return this.authService.listUserDevices(req.user.id, currentDeviceId);
  }

  @Post('devices/:deviceId/revoke')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async revokeDevice(@Request() req: any, @Param('deviceId') deviceId: string) {
    return this.authService.revokeDevice(req.user.id, deviceId);
  }

  @Post('devices/revoke-others')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async revokeOtherDevices(@Request() req: any) {
    const currentDeviceId = (req.headers['x-device-id'] as string) || '';
    if (!currentDeviceId) {
      return { ok: false, message: 'Current device ID not provided' };
    }
    return this.authService.revokeAllOtherDevices(req.user.id, currentDeviceId);
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
