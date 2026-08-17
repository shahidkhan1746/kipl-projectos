import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm'

@Entity('ai_document_chunks')
export class AiDocumentChunk {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ nullable: true })
  projectId: string

  @Column({ nullable: true })
  sourceId: string

  @Column({ nullable: true })
  sourceType: string

  @Column({ nullable: true })
  sourceName: string

  @Column('text')
  text: string

  // Note: For pgvector, we use string definition in typeorm but it Maps to vector in DB
  @Column({ type: 'vector', length: 768, nullable: true })
  embedding: any

  @CreateDateColumn()
  createdAt: Date
}
