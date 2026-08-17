import { AiChatSession } from './ai-chat-session.entity';
export declare class AiChatMessage {
    id: string;
    sessionId: string;
    session: AiChatSession;
    role: string;
    content: string;
    createdAt: Date;
}
