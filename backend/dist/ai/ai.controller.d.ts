import { AiService } from './ai.service';
import { AiIndexerService } from './ai-indexer.service';
export declare class AiController {
    private readonly svc;
    private readonly indexer;
    constructor(svc: AiService, indexer: AiIndexerService);
    getConfig(): Promise<{
        enabled: boolean;
        keys: {
            id: string;
            label: string;
            provider: string;
            model: string;
            baseUrl: string;
            enabled: boolean;
            priority: number;
            hasKey: boolean;
        }[];
    }>;
    saveConfig(body: any): Promise<{
        ok: boolean;
    }>;
    createKey(body: any): Promise<{
        ok: boolean;
        id: string;
    }>;
    updateKey(id: string, body: any): Promise<{
        ok: boolean;
    }>;
    deleteKey(id: string): Promise<{
        ok: boolean;
    }>;
    testKey(id: string): Promise<{
        ok: boolean;
        message: string;
    }>;
    generate(body: {
        prompt: string;
        system?: string;
    }): Promise<{
        text: string;
    }>;
    getSessions(req: any, projectId: string): Promise<import("./ai-chat-session.entity").AiChatSession[]>;
    getSessionHistory(id: string): Promise<{
        session: import("./ai-chat-session.entity").AiChatSession;
        messages: import("./ai-chat-message.entity").AiChatMessage[];
    }>;
    deleteSession(id: string, req: any): Promise<{
        success: boolean;
    }>;
    chat(body: {
        sessionId: string;
        query: string;
        projectId: string;
    }, req: any): Promise<{
        text: string;
    }>;
    syncKnowledge(body: {
        projectId?: string;
    }): Promise<{
        indexedSources: number;
        details: string[];
    }>;
}
