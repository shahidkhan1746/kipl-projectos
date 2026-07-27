import { StorageService } from './storage.service';
export declare class StorageController {
    private readonly svc;
    constructor(svc: StorageService);
    config(): Promise<{
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
    save(body: any): Promise<{
        ok: boolean;
    }>;
    test(): Promise<{
        success: boolean;
        message: string;
    }>;
}
