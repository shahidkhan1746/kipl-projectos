import { Entity, Column } from 'typeorm'
import { BaseEntity } from '../shared/entities/base.entity'

// Public-facing team roster — deliberately separate from internal `users`
// so we never expose staff logins / emails on the marketing site.
@Entity('team_members')
export class TeamMember extends BaseEntity {
  @Column() name: string
  @Column({ default: '' }) title: string          // designation, e.g. "Project Manager"
  @Column({ default: '' }) department: string      // e.g. "EPC", "Liaison", "HSE"
  @Column({ name: 'photo_url', type: 'varchar', nullable: true }) photoUrl: string | null
  @Column({ name: 'photo_key', type: 'varchar', nullable: true }) photoKey: string | null
  @Column({ type: 'text', default: '' }) bio: string
  @Column({ name: 'sort_order', default: 0 }) sortOrder: number
  @Column({ name: 'is_published', default: true }) isPublished: boolean
}
