import { AuthService } from './auth.service';
declare class LoginDto {
    email: string;
    password: string;
}
declare class RefreshDto {
    refresh_token: string;
}
declare class LogoutDto {
    refresh_token: string;
}
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    login(dto: LoginDto): Promise<{
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
    refresh(dto: RefreshDto): Promise<{
        access_token: string;
        expires_in: number;
    }>;
    logout(dto: LogoutDto): Promise<void>;
    me(req: any): {
        user: any;
    };
}
export {};
