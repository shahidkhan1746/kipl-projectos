import { Repository } from 'typeorm';
import { AiConfig } from './ai-config.entity';
export declare class AiService {
    private repo;
    constructor(repo: Repository<AiConfig>);
    private row;
    getMasked(): Promise<{
        enabled: boolean;
        provider: string;
        model: string;
        baseUrl: string;
        hasKey: boolean;
    }>;
    save(body: any): Promise<{
        ok: boolean;
    }>;
    generate(prompt: string, system?: string): Promise<string>;
    test(): Promise<{
        ok: boolean;
        message: string;
    }>;
}
