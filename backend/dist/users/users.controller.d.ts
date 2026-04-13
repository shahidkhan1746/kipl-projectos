import { UsersService } from './users.service';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    findAll(): Promise<import("./user.entity").User[]>;
    getMe(req: any): any;
    findOne(id: string): Promise<import("./user.entity").User>;
    updateUser(id: string, body: {
        isActive?: boolean;
        role?: string;
        name?: string;
        email?: string;
    }): Promise<import("./user.entity").User | null>;
    resetPassword(id: string, body: {
        password: string;
    }): Promise<{
        success: boolean;
        message: string;
    }>;
    deleteUser(id: string): Promise<import("typeorm").DeleteResult>;
}
