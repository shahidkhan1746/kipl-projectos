import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm'

@Entity('ai_document_chunks')
export class AiDocumentChunk {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'varchar', nullable: true })
  projectId?: string

  @Column({ type: 'varchar', nullable: true })
  sourceId?: string

  @Column({ type: 'varchar', nullable: true })
  sourceType?: string

  @Column({ type: 'varchar', nullable: true })
  sourceName?: string

  @Column({ type: 'text' })
  text: string

  @Column({ type: 'vector', nullable: true })
  embedding: any

  @CreateDateColumn()
  createdAt: Date
}
