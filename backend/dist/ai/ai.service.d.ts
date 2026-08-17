import { Repository } from 'typeorm';
import { AiConfig } from './ai-config.entity';
import { AiKey } from './ai-key.entity';
import { AiChatSession } from './ai-chat-session.entity';
import { AiChatMessage } from './ai-chat-message.entity';
import { AiDocumentChunk } from './ai-document-chunk.entity';
export declare class AiService {
    private cfgRepo;
    private keyRepo;
    private sessionRepo;
    private msgRepo;
    private chunkRepo;
    constructor(cfgRepo: Repository<AiConfig>, keyRepo: Repository<AiKey>, sessionRepo: Repository<AiChatSession>, msgRepo: Repository<AiChatMessage>, chunkRepo: Repository<AiDocumentChunk>);
    private configRow;
    getMasked(): Promise<{
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
    private hasMask;
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
    private callProvider;
    generate(prompt: string, system?: string): Promise<string>;
    testKey(id: string): Promise<{
        ok: boolean;
        message: string;
    }>;
    getEmbedding(text: string): Promise<number[] | null>;
    chat(sessionId: string, query: string, userId: string, projectId: string): Promise<string>;
    getSessions(userId: string, projectId: string): Promise<AiChatSession[]>;
    getSessionHistory(sessionId: string): Promise<{
        session: AiChatSession;
        messages: AiChatMessage[];
    }>;
}
