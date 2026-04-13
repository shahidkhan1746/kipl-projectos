import { BaseEntity } from '../shared/entities/base.entity';
import { User } from '../users/user.entity';
export declare class RefreshToken extends BaseEntity {
    user: User;
    tokenHash: string;
    expiresAt: Date;
}
