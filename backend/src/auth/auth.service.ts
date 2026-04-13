import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { RefreshToken } from './refresh-token.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    @InjectRepository(RefreshToken)
    private readonly refreshRepo: Repository<RefreshToken>,
  ) {}

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);

    // Constant-time comparison even if user not found
    const hash = user?.passwordHash ?? '$2b$12$placeholder.hash.prevents.timing.attack';
    const valid = await bcrypt.compare(password, hash);

    if (!user || !valid || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const [accessToken, refreshToken] = await Promise.all([
      this.signAccess(user.id, user.role),
      this.signRefresh(user.id),
    ]);

    // Store refresh token hash
    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.refreshRepo.save(
      this.refreshRepo.create({ user, tokenHash, expiresAt })
    );

    await this.usersService.updateLastLogin(user.id);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 900,
      user: {
        id: user.id, name: user.name,
        email: user.email, role: user.role,
      },
    };
  }

  async refresh(refreshToken: string) {
    let payload: any;
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const hash = createHash('sha256').update(refreshToken).digest('hex');
    const stored = await this.refreshRepo.findOne({
      where: { tokenHash: hash },
      relations: ['user'],
    });

    if (!stored || stored.expiresAt < new Date() || !stored.user.isActive) {
      throw new UnauthorizedException('Refresh token expired or revoked');
    }

    return {
      access_token: await this.signAccess(stored.user.id, stored.user.role),
      expires_in: 900,
    };
  }

  async logout(refreshToken: string) {
    const hash = createHash('sha256').update(refreshToken).digest('hex');
    await this.refreshRepo.delete({ tokenHash: hash });
  }

  private signAccess(userId: string, role: string) {
    return this.jwtService.signAsync(
      { sub: userId, role },
      { secret: this.config.get('JWT_SECRET'), expiresIn: this.config.get('JWT_EXPIRES_IN') ?? '15m' },
    );
  }

  private signRefresh(userId: string) {
    return this.jwtService.signAsync(
      { sub: userId, type: 'refresh' },
      { secret: this.config.get('JWT_REFRESH_SECRET'), expiresIn: '7d' },
    );
  }
}
