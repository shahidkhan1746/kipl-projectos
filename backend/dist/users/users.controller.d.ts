import { UsersService } from './users.service';
import { User } from './user.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    findAll(): Promise<User[]>;
    getMe(req: any): Promise<User>;
    findOne(id: string): Promise<User | null>;
    updateUser(id: string, body: UpdateUserDto): Promise<User | null>;
    resetPassword(id: string, body: ResetPasswordDto): Promise<{
        success: boolean;
        message: string;
    }>;
    deleteUser(id: string): Promise<any>;
}
