import { BaseEntity } from '../shared/entities/base.entity';
export declare enum KnowledgeCategory {
    CONTRACT = "contract",
    TENDER = "tender",
    BOQ = "boq",
    TECHNICAL_SPEC = "technical_spec",
    DRAWING = "drawing",
    VENDOR_APPROVAL = "vendor_approval",
    LIAISON_APPROVAL = "liaison_approval",
    MOM_MEETING = "mom_meeting",
    SITE_REPORT = "site_report",
    LEGAL_EOT = "legal_eot",
    OTHER = "other"
}
export declare enum KnowledgeSourceType {
    DIRECT_UPLOAD = "direct_upload",
    LIAISON_FETCH = "liaison_fetch",
    SYSTEM_SYNC = "system_sync"
}
export declare enum KnowledgeStatus {
    INDEXED = "indexed",
    PROCESSING = "processing",
    FAILED = "failed"
}
export declare class AiKnowledgeDocument extends BaseEntity {
    projectId: string;
    documentName: string;
    category: KnowledgeCategory;
    fileUrl: string;
    fileSizeBytes: number;
    mimeType: string;
    sourceType: KnowledgeSourceType;
    sourceId: string;
    totalChunks: number;
    status: KnowledgeStatus;
    errorMessage: string | null;
    uploadedBy: string;
}
