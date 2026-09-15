import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly usersService: UsersService,
  ) {
    const secret = config.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET must be configured');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: secret,
    });
  }

  async validate(payload: { sub: string; role: string }) {
    let user: any;
    try {
      user = await this.usersService.findById(payload.sub);
    } catch (err: any) {
      if (err instanceof UnauthorizedException) throw err;
      // Re-throw database/network hiccups as-is so they surface as 500/503 for cold-start retry
      // rather than falsely claiming the token is expired/revoked and killing the session.
      throw err;
    }
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User account no longer exists or is inactive');
    }
    return user;
  }
}
