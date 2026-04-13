import { Entity, Column } from 'typeorm'
import { BaseEntity } from '../shared/entities/base.entity'

@Entity('system_settings')
export class Setting extends BaseEntity {
  @Column({ unique: true }) key: string
  @Column({ type: 'text', nullable: true }) value: string
  @Column({ nullable: true }) label: string
  @Column({ nullable: true }) category: string
}
