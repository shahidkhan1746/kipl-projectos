import { Repository, DataSource } from 'typeorm';
import { AiDocumentChunk } from './ai-document-chunk.entity';
import { AiService } from './ai.service';
export declare class AiIndexerService {
    private chunkRepo;
    private dataSource;
    private aiSvc;
    private readonly logger;
    constructor(chunkRepo: Repository<AiDocumentChunk>, dataSource: DataSource, aiSvc: AiService);
    indexText(text: string, meta: {
        projectId?: string;
        sourceId: string;
        sourceType: string;
        sourceName: string;
    }): Promise<void>;
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
    syncAllKnowledge(projectId?: string): Promise<{
        indexedSources: number;
        details: string[];
    }>;
    private chunkTextSemantically;
}
