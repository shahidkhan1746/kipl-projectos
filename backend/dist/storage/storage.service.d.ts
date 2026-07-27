import { Repository } from 'typeorm';
import { StorageConfig } from './storage-config.entity';
export interface UploadedPhoto {
    url: string;
    key: string;
}
type MulterFile = {
    originalname: string;
    buffer: Buffer;
    mimetype: string;
    size: number;
};
export declare class StorageService {
    private repo;
    private readonly logger;
    constructor(repo: Repository<StorageConfig>);
    getConfig(): Promise<StorageConfig | null>;
    getMaskedConfig(): Promise<{
        provider: string;
        isVerified: boolean;
        lastTestedAt: null;
        cloudName?: undefined;
        cloudApiKey?: undefined;
        cloudApiSecretSet?: undefined;
        s3Endpoint?: undefined;
        s3Region?: undefined;
        s3Bucket?: undefined;
        s3AccessKey?: undefined;
        s3SecretKeySet?: undefined;
        s3PublicBase?: undefined;
    } | {
        provider: import("./storage-config.entity").StorageProvider;
        cloudName: string;
        cloudApiKey: string;
        cloudApiSecretSet: boolean;
        s3Endpoint: string;
        s3Region: string;
        s3Bucket: string;
        s3AccessKey: string;
        s3SecretKeySet: boolean;
        s3PublicBase: string;
        isVerified: boolean;
        lastTestedAt: Date | null;
    }>;
    saveConfig(body: any): Promise<{
        ok: boolean;
    }>;
    testConnection(): Promise<{
        success: boolean;
        message: string;
    }>;
    upload(file: MulterFile, folder?: string): Promise<UploadedPhoto>;
    private applyCloudinary;
    private buildS3;
}
export {};
