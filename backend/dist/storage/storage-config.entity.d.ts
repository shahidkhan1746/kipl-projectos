import { BaseEntity } from '../shared/entities/base.entity';
export type StorageProvider = 'local' | 'cloudinary' | 's3';
export declare class StorageConfig extends BaseEntity {
    provider: StorageProvider;
    cloudName: string;
    cloudApiKey: string;
    cloudApiSecret: string;
    s3Endpoint: string;
    s3Region: string;
    s3Bucket: string;
    s3AccessKey: string;
    s3SecretKey: string;
    s3PublicBase: string;
    isActive: boolean;
    isVerified: boolean;
    lastTestedAt: Date | null;
}
