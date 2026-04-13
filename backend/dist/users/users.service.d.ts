import { Repository } from 'typeorm';
import { User, UserRole } from './user.entity';
export declare class UsersService {
    private readonly repo;
    constructor(repo: Repository<User>);
    findAll(includeInactive?: boolean): Promise<User[]>;
    findById(id: string): Promise<User>;
    findByEmail(email: string): Promise<User | null>;
    create(data: {
        name: string;
        email: string;
        password: string;
        role?: UserRole;
        department?: string;
        designation?: string;
        phone?: string;
    }): Promise<User>;
    update(id: string, data: Partial<User>): Promise<User>;
    updateLastLogin(id: string): Promise<void>;
    updateUser(id: string, data: {
        isActive?: boolean;
        role?: string;
        name?: string;
        email?: string;
    }): Promise<User | null>;
    resetPassword(id: string, password: string): Promise<{
        success: boolean;
        message: string;
    }>;
    createUser(data: {
        name: string;
        email: string;
        role: string;
        password: string;
    }): Promise<User>;
    deleteUser(id: string): Promise<import("typeorm").DeleteResult>;
}
