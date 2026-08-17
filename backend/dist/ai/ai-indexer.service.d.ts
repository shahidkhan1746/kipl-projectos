import { Repository } from 'typeorm';
import { AiDocumentChunk } from './ai-document-chunk.entity';
import { AiService } from './ai.service';
export declare class AiIndexerService {
    private chunkRepo;
    private aiSvc;
    private readonly logger;
    constructor(chunkRepo: Repository<AiDocumentChunk>, aiSvc: AiService);
    indexBuffer(buffer: Buffer, meta: {
        projectId?: string;
        sourceId: string;
        sourceType: string;
        sourceName: string;
    }): Promise<void>;
    indexUrl(url: string, meta: {
        projectId?: string;
        sourceId: string;
        sourceType: string;
        sourceName: string;
    }): Promise<void>;
    private chunkTextSemantically;
}
