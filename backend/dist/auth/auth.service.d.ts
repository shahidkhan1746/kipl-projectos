import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { RefreshToken } from './refresh-token.entity';
export declare class AuthService {
    private readonly usersService;
    private readonly jwtService;
    private readonly config;
    private readonly refreshRepo;
    constructor(usersService: UsersService, jwtService: JwtService, config: ConfigService, refreshRepo: Repository<RefreshToken>);
    login(email: string, password: string): Promise<{
        access_token: string;
        refresh_token: string;
        expires_in: number;
        user: {
            id: string;
            name: string;
            email: string;
            role: import("../users/user.entity").UserRole;
        };
    }>;
    refresh(refreshToken: string): Promise<{
        access_token: string;
        expires_in: number;
    }>;
    logout(refreshToken: string): Promise<void>;
    private signAccess;
    private signRefresh;
}
