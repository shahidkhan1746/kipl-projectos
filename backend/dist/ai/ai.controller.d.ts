import { AiService } from './ai.service';
export declare class AiController {
    private readonly svc;
    constructor(svc: AiService);
    getConfig(): Promise<{
        enabled: boolean;
        provider: string;
        model: string;
        baseUrl: string;
        hasKey: boolean;
    }>;
    saveConfig(body: any): Promise<{
        ok: boolean;
    }>;
    test(): Promise<{
        ok: boolean;
        message: string;
    }>;
    generate(body: {
        prompt: string;
        system?: string;
    }): Promise<{
        text: string;
    }>;
}
