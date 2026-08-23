import { PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm'

export abstract class AiDocumentChunkBase {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'profile_id', type: 'uuid' })
  profileId: string

  @Column({ length: 50 })
  provider: string

  @Column({ length: 100 })
  model: string

  @Column({ type: 'int' })
  dimension: number

  @Column({ type: 'int', default: 1 })
  version: number

  @Column({ name: 'project_id', type: 'varchar', nullable: true })
  projectId?: string

  @Column({ name: 'source_id', type: 'varchar', nullable: true })
  sourceId?: string

  @Column({ name: 'source_type', type: 'varchar', nullable: true })
  sourceType?: string

  @Column({ name: 'source_name', type: 'varchar', nullable: true })
  sourceName?: string

  @Column({ type: 'text' })
  text: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
