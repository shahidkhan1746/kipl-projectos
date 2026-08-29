import { Entity, Column, Index } from 'typeorm'
import { BaseEntity } from '../shared/entities/base.entity'

export interface UpdatePhoto {
  url: string
  key: string
  caption?: string
}

export interface UpdateVideo {
  url: string
  key?: string
  title?: string
  thumbnail?: string
  provider?: 'upload' | 'youtube' | 'vimeo' | 'external'
}

// A dated record of project work, surfaced on the public Timeline & Gallery.
@Entity('project_updates')
export class ProjectUpdate extends BaseEntity {
  @Column({ name: 'project_id', type: 'varchar', nullable: true })
  projectId: string | null

  @Index()
  @Column({ type: 'date' })
  date: string

  @Column()
  title: string

  @Column({ type: 'text', default: '' })
  description: string

  // milestone | civil | mechanical | electrical | safety | survey | general
  @Column({ default: 'general' })
  category: string

  @Column({ type: 'jsonb', default: [] })
  photos: UpdatePhoto[]

  @Column({ type: 'jsonb', default: [] })
  videos: UpdateVideo[]

  @Column({ name: 'is_published', default: true })
  isPublished: boolean

  @Column({ name: 'created_by', type: 'varchar', nullable: true })
  createdBy: string | null

  @Column({ name: 'created_by_id', type: 'varchar', nullable: true })
  createdById: string | null
}
