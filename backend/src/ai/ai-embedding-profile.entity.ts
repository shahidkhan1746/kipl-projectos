import { Entity, Column, Index } from 'typeorm'
import { BaseEntity } from '../shared/entities/base.entity'

export enum EmbeddingProfileStatus {
  ACTIVE = 'active',
  MIGRATING = 'migrating',
  ARCHIVED = 'archived',
}

@Entity('ai_embedding_profiles')
export class AiEmbeddingProfile extends BaseEntity {
  @Column({ length: 100 })
  name: string

  @Column({ length: 50 })
  provider: string // 'nvidia' | 'gemini' | 'openai'

  @Column({ length: 100 })
  model: string // 'nvidia/nv-embed-v1' | 'gemini-embedding-2'

  @Column({ type: 'int' })
  dimension: number // 4096 | 3072 | 1536

  @Column({ type: 'int', default: 1 })
  version: number

  @Column({
    type: 'enum',
    enum: EmbeddingProfileStatus,
    default: EmbeddingProfileStatus.MIGRATING,
  })
  @Index()
  status: EmbeddingProfileStatus

  @Column({ name: 'table_name', length: 100 })
  tableName: string // 'ai_document_chunks_nvidia' | 'ai_document_chunks_gemini'

  // Secure reference to ai_keys entry — NOT storing raw credentials in profile
  @Column({ name: 'key_id', type: 'varchar', nullable: true })
  keyId: string | null

  @Column({ name: 'base_url', type: 'varchar', nullable: true })
  baseUrl: string | null
}
