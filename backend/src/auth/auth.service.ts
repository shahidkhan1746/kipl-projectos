import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
  Optional,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { UsersService } from '../users/users.service';
import { RefreshToken } from './refresh-token.entity';
import { MailerService } from '../mailer/mailer.service';
import { DeviceTrustService, DeviceMetadata } from './services/device-trust.service';

const LOCK_AFTER = 5;
const LOCK_MS = 15 * 60 * 1000;
export const REFRESH_ROTATION_GRACE_MS = 30 * 1000;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    @InjectRepository(RefreshToken)
    private readonly refreshRepo: Repository<RefreshToken>,
    @Optional() private readonly mailer?: MailerService,
    @Optional() private readonly deviceTrustService?: DeviceTrustService,
  ) {}

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private publicUser(user: any) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      assignedProjects: user.assignedProjects,
      canAccessAllProjects: user.canAccessAllProjects,
    };
  }

  async login(
    email: string,
    password: string,
    meta?: DeviceMetadata,
    rawIp?: string,
    userAgent?: string,
    rememberMe = true,
  ) {
    const user = await this.usersService.findByEmail((email || '').trim().toLowerCase());

    if (user?.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException('Account temporarily locked. Try again later.');
    }

    const hash = user?.passwordHash ?? '$2b$12$placeholder.hash.prevents.timing.attack';
    const valid = await bcrypt.compare(password, hash);

    if (!user || !valid || !user.isActive) {
      if (user) await this.recordFailure(user.id, user.failedLoginCount ?? 0);
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.usersService.update(user.id, { failedLoginCount: 0, lockedUntil: null } as any);
    await this.usersService.updateLastLogin(user.id);

    let deviceId = meta?.deviceId;
    let deviceTrustResult: any = null;
    if (this.deviceTrustService && meta) {
      deviceTrustResult = await this.deviceTrustService.assessAndRecord(
        user.id,
        meta,
        rawIp,
        userAgent,
      );
      deviceId = deviceTrustResult.deviceId;
    }

    const session = await this.issueSession(user, deviceId, rememberMe);
    return {
      ...session,
      deviceTrust: deviceTrustResult
        ? {
            isTrusted: deviceTrustResult.isTrusted,
            trustScore: deviceTrustResult.trustScore,
            isNewDevice: deviceTrustResult.isNewDevice,
          }
        : undefined,
    };
  }

  private async recordFailure(userId: string, current: number) {
    const next = current + 1;
    const patch: any = { failedLoginCount: next };
    if (next >= LOCK_AFTER) patch.lockedUntil = new Date(Date.now() + LOCK_MS);
    await this.usersService.update(userId, patch);
  }

  async refresh(
    refreshToken: string,
    meta?: DeviceMetadata,
    rawIp?: string,
    userAgent?: string,
  ) {
    if (!refreshToken) throw new UnauthorizedException('Invalid refresh token');
    let payload: any;
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const hash = this.hashToken(refreshToken);
    const stored = await this.refreshRepo.findOne({
      where: { tokenHash: hash },
      relations: ['user'],
    });

    const now = Date.now();
    const storedExpiryMs = stored?.expiresAt ? new Date(stored.expiresAt).getTime() : 0;

    if (!stored || storedExpiryMs < now || !stored.user?.isActive) {
      if (payload?.sub) await this.refreshRepo.delete({ user: { id: payload.sub } as any });
      throw new UnauthorizedException('Refresh token expired or revoked');
    }

    const deviceId = meta?.deviceId || stored.deviceId;
    if (this.deviceTrustService && meta && stored.user) {
      await this.deviceTrustService
        .assessAndRecord(stored.user.id, meta, rawIp, userAgent)
        .catch(() => undefined);
    }

    // Multi-tab rotation grace window:
    // Do not delete the rotated token instantly. Shorten its expiry to 30s so
    // sibling tabs or in-flight concurrent requests presenting the same token
    // receive a valid session rather than triggering user-wide revocation.
    // After 30s, storedExpiryMs < now triggers full token-theft revocation above.
    const isInitialRotation = storedExpiryMs > now + REFRESH_ROTATION_GRACE_MS;
    if (isInitialRotation) {
      await this.refreshRepo.update(stored.id, {
        expiresAt: new Date(now + REFRESH_ROTATION_GRACE_MS),
      });
    }

    return this.issueSession(stored.user, deviceId, true);
  }

  async logout(refreshToken?: string, userId?: string) {
    if (refreshToken) {
      await this.refreshRepo.delete({ tokenHash: this.hashToken(refreshToken) });
    }
    if (userId) {
      await this.refreshRepo
        .createQueryBuilder()
        .delete()
        .where('"user_id" = :uid', { uid: userId })
        .execute()
        .catch(() => undefined);
    }
    await this.refreshRepo.delete({ expiresAt: LessThan(new Date()) }).catch(() => undefined);
  }

  async changePassword(userId: string, current: string, next: string) {
    const user = await this.usersService.findByEmail(
      (await this.usersService.findById(userId)).email,
    );
    if (!user?.passwordHash) throw new UnauthorizedException('Invalid credentials');
    const ok = await bcrypt.compare(current, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Current password is incorrect');
    if (!next || next.length < 8) throw new BadRequestException('New password must be at least 8 characters');
    await this.usersService.resetPassword(userId, next);
    await this.refreshRepo.delete({ user: { id: userId } as any });
    return { ok: true };
  }

  async requestPasswordReset(email: string) {
    const user = await this.usersService.findByEmail((email || '').trim().toLowerCase());
    if (!user) return { ok: true };
    const raw = randomBytes(32).toString('hex');
    const passwordResetHash = this.hashToken(raw);
    const passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
    await this.usersService.update(user.id, { passwordResetHash, passwordResetExpires } as any);
    const frontend = String(this.config.get('FRONTEND_URL') ?? 'http://localhost:5173').split(',')[0];
    const link = `${frontend.replace(/\/$/, '')}/reset-password?token=${raw}`;
    try {
      await this.mailer?.sendEmail?.({
        to: user.email,
        subject: 'KIPL ProjectOS password reset',
        html: `<p>Reset your password:</p><p><a href="${link}">${link}</a></p><p>This link expires in 1 hour.</p>`,
      });
    } catch { /* still return ok so this cannot be used to probe emails */ }
    return { ok: true };
  }

  async resetPasswordWithToken(token: string, password: string) {
    if (!token || !password || password.length < 8) {
      throw new BadRequestException('A valid token and password (8+ characters) are required');
    }
    const hash = this.hashToken(token);
    const user = await this.usersService.findByResetHash(hash);
    if (!user || !user.passwordResetExpires || user.passwordResetExpires < new Date()) {
      throw new ForbiddenException('Reset link is invalid or expired');
    }
    await this.usersService.resetPassword(user.id, password);
    // The lock goes with it. Being locked out is the usual reason someone is
    // on this page at all, and a reset that leaves them locked for another
    // fifteen minutes has not resolved anything.
    await this.usersService.update(user.id, {
      passwordResetHash: null,
      passwordResetExpires: null,
      failedLoginCount: 0,
      lockedUntil: null,
    } as any);
    await this.refreshRepo.delete({ user: { id: user.id } as any });
    return { ok: true };
  }

  async deleteOwnAccount(userId: string, password: string) {
    const user = await this.usersService.findByEmail(
      (await this.usersService.findById(userId)).email,
    );
    if (!user?.passwordHash) throw new UnauthorizedException('Invalid credentials');
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');
    if (user.role === 'super_admin') {
      throw new ForbiddenException('A super admin account cannot be self-deleted');
    }
    await this.refreshRepo.delete({ user: { id: userId } as any });
    await this.usersService.update(userId, { isActive: false, email: `deleted+${userId}@invalid.local` } as any);
    return { ok: true };
  }

  async listUserDevices(userId: string, currentDeviceId?: string) {
    if (!this.deviceTrustService) return [];
    return this.deviceTrustService.listUserDevices(userId, currentDeviceId);
  }

  async revokeDevice(userId: string, deviceId: string) {
    if (this.deviceTrustService) {
      await this.deviceTrustService.revokeDevice(userId, deviceId);
    }
    await this.refreshRepo
      .createQueryBuilder()
      .delete()
      .where('"user_id" = :uid AND "device_id" = :did', { uid: userId, did: deviceId })
      .execute()
      .catch(() => undefined);
    return { ok: true };
  }

  async revokeAllOtherDevices(userId: string, keepDeviceId: string) {
    if (this.deviceTrustService) {
      await this.deviceTrustService.revokeAllOtherDevices(userId, keepDeviceId);
    }
    await this.refreshRepo
      .createQueryBuilder()
      .delete()
      .where('"user_id" = :uid AND ("device_id" IS NULL OR "device_id" != :did)', {
        uid: userId,
        did: keepDeviceId,
      })
      .execute()
      .catch(() => undefined);
    return { ok: true };
  }

  private async issueSession(
    user: { id: string; name: string; email: string; role: any; assignedProjects?: any; canAccessAllProjects?: any },
    deviceId?: string,
    rememberMe = true,
  ) {
    const [accessToken, refreshToken] = await Promise.all([
      this.signAccess(user.id, user.role),
      this.signRefresh(user.id),
    ]);
    const tokenHash = this.hashToken(refreshToken);
    const expiresAt = new Date();
    const days = rememberMe ? 30 : 7;
    expiresAt.setDate(expiresAt.getDate() + days);

    await this.refreshRepo.save(
      this.refreshRepo.create({
        user: user as any,
        tokenHash,
        expiresAt,
        deviceId: deviceId || undefined,
      }),
    );

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 7 * 24 * 3600,
      user: this.publicUser(user),
    };
  }

  private signAccess(userId: string, role: string) {
    return this.jwtService.signAsync(
      { sub: userId, role },
      { secret: this.config.get('JWT_SECRET'), expiresIn: this.config.get('JWT_EXPIRES_IN') ?? '7d' },
    );
  }

  private signRefresh(userId: string) {
    const jti = randomBytes(16).toString('hex');
    return this.jwtService.signAsync(
      { sub: userId, type: 'refresh', jti },
      { secret: this.config.get('JWT_REFRESH_SECRET'), expiresIn: '30d' },
    );
  }
}
