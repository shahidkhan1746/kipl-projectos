import { Entity, Column, Index } from 'typeorm'
import { AiDocumentChunkBase } from './ai-document-chunk-base'

@Entity('ai_document_chunks_gemini')
export class AiDocumentChunkGemini extends AiDocumentChunkBase {
  // Explicit 3072-dimensional pgvector column
  @Column({ type: 'vector', nullable: true })
  embedding: any
}
