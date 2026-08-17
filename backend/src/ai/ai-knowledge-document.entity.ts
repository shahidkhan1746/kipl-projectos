import { Entity, Column, Index } from 'typeorm'
import { BaseEntity } from '../shared/entities/base.entity'

export enum KnowledgeCategory {
  CONTRACT = 'contract',
  TENDER = 'tender',
  BOQ = 'boq',
  TECHNICAL_SPEC = 'technical_spec',
  DRAWING = 'drawing',
  VENDOR_APPROVAL = 'vendor_approval',
  LIAISON_APPROVAL = 'liaison_approval',
  MOM_MEETING = 'mom_meeting',
  SITE_REPORT = 'site_report',
  LEGAL_EOT = 'legal_eot',
  OTHER = 'other',
}

export enum KnowledgeSourceType {
  DIRECT_UPLOAD = 'direct_upload',
  LIAISON_FETCH = 'liaison_fetch',
  SYSTEM_SYNC = 'system_sync',
}

export enum KnowledgeStatus {
  INDEXED = 'indexed',
  PROCESSING = 'processing',
  FAILED = 'failed',
}

@Entity('ai_knowledge_documents')
export class AiKnowledgeDocument extends BaseEntity {
  @Column({ name: 'project_id', nullable: true })
  @Index()
  projectId: string

  @Column({ name: 'document_name' })
  documentName: string

  @Column({
    type: 'enum',
    enum: KnowledgeCategory,
    default: KnowledgeCategory.OTHER,
  })
  category: KnowledgeCategory

  @Column({ name: 'file_url', type: 'text', nullable: true })
  fileUrl: string

  @Column({ name: 'file_size_bytes', type: 'bigint', nullable: true })
  fileSizeBytes: number

  @Column({ name: 'mime_type', nullable: true })
  mimeType: string

  @Column({
    name: 'source_type',
    type: 'enum',
    enum: KnowledgeSourceType,
    default: KnowledgeSourceType.DIRECT_UPLOAD,
  })
  sourceType: KnowledgeSourceType

  @Column({ name: 'source_id', nullable: true })
  sourceId: string

  @Column({ name: 'total_chunks', default: 0 })
  totalChunks: number

  @Column({
    type: 'enum',
    enum: KnowledgeStatus,
    default: KnowledgeStatus.PROCESSING,
  })
  status: KnowledgeStatus

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null

  @Column({ name: 'uploaded_by', nullable: true })
  uploadedBy: string
}
