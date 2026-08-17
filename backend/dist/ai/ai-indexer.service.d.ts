import { Repository, DataSource } from 'typeorm';
import { AiDocumentChunk } from './ai-document-chunk.entity';
import { AiKnowledgeDocument, KnowledgeCategory } from './ai-knowledge-document.entity';
import { AiService } from './ai.service';
import { StorageService } from '../storage/storage.service';
export declare class AiIndexerService {
    private chunkRepo;
    private docRepo;
    private storageSvc;
    private dataSource;
    private aiSvc;
    private readonly logger;
    constructor(chunkRepo: Repository<AiDocumentChunk>, docRepo: Repository<AiKnowledgeDocument>, storageSvc: StorageService, dataSource: DataSource, aiSvc: AiService);
    indexText(text: string, meta: {
        projectId?: string;
        sourceId: string;
        sourceType: string;
        sourceName: string;
    }): Promise<number>;
    indexBuffer(buffer: Buffer, meta: {
        projectId?: string;
        sourceId: string;
        sourceType: string;
        sourceName: string;
    }): Promise<number>;
    indexUrl(url: string, meta: {
        projectId?: string;
        sourceId: string;
        sourceType: string;
        sourceName: string;
    }): Promise<number>;
    uploadKnowledgeFile(file: {
        originalname: string;
        buffer: Buffer;
        mimetype: string;
        size: number;
    }, category?: KnowledgeCategory, projectId?: string, uploadedBy?: string): Promise<AiKnowledgeDocument>;
    fetchFromLiaison(projectId?: string): Promise<{
        fetched: number;
        details: string[];
    }>;
    getKnowledgeDocuments(projectId?: string, category?: string, search?: string): Promise<AiKnowledgeDocument[]>;
    reindexKnowledgeDocument(id: string): Promise<AiKnowledgeDocument>;
    deleteKnowledgeDocument(id: string): Promise<{
        success: boolean;
    }>;
    syncAllKnowledge(projectId?: string): Promise<{
        indexedSources: number;
        details: string[];
    }>;
    private chunkTextSemantically;
}
