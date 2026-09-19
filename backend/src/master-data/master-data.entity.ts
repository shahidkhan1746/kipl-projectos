import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../shared/entities/base.entity';

@Entity('master_dropdown_options')
export class MasterDropdownOption extends BaseEntity {
  @Column({ name: 'dropdown_type', length: 64 })
  dropdownType: string;

  @Column({ length: 255 })
  label: string;

  @Column({ length: 255 })
  value: string;

  @Column({ length: 64, nullable: true })
  category: string;

  @Column({ length: 32, nullable: true })
  unit: string;

  @Column({ type: 'text', nullable: true })
  spec: string;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @Column({ name: 'display_order', type: 'int', default: 0 })
  displayOrder: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;
}
