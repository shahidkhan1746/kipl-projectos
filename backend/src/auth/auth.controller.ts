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

  private cookieOpts() {
    const secure = process.env.NODE_ENV === 'production';
    return {
      httpOnly: true,
      secure,
      sameSite: (secure ? 'none' : 'lax') as 'none' | 'lax',
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

  private tokenFrom(req: ExpressRequest, body?: string) {
    return body || readCookie(req.headers.cookie, 'kipl_refresh') || '';
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

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Request() req) {
    const user = req.user ?? {};
    const { passwordHash: _omit, passwordResetHash: _r, ...safe } = user;
    return { user: safe };
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  changePassword(@Request() req, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(req.user.id, dto.currentPassword, dto.newPassword);
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
