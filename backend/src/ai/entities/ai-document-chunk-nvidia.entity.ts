import { Entity, Column, Index } from 'typeorm'
import { AiDocumentChunkBase } from './ai-document-chunk-base'

@Entity('ai_document_chunks_nvidia')
export class AiDocumentChunkNvidia extends AiDocumentChunkBase {
  // Explicit 4096-dimensional pgvector column
  @Column({ type: 'vector', nullable: true })
  embedding: any
}
