import { Column, Entity, Index } from 'typeorm'
import { BaseEntity } from '../shared/entities/base.entity'

export const ASSET_CATEGORIES = ['furniture', 'computer', 'laptop', 'printer', 'vehicle', 'office_equipment', 'other'] as const
export const ASSET_STATUSES = ['available', 'assigned', 'under_repair', 'lost', 'disposed'] as const
export const ASSET_CONDITIONS = ['new', 'good', 'fair', 'poor', 'unserviceable'] as const

@Entity('office_assets')
@Index('uq_office_assets_project_tag', ['projectId', 'assetTag'], { unique: true })
export class OfficeAsset extends BaseEntity {
  @Column({ name: 'project_id' }) projectId: string
  @Column({ name: 'asset_tag', length: 60 }) assetTag: string
  @Column({ length: 200 }) name: string
  @Column({ length: 40 }) category: string
  @Column({ length: 200 }) location: string
  @Column({ length: 30, default: 'available' }) status: string
  @Column({ length: 30, default: 'good' }) condition: string
  @Column({ type: 'varchar', length: 120, nullable: true }) brand: string | null
  @Column({ type: 'varchar', length: 120, nullable: true }) model: string | null
  @Column({ name: 'serial_number', type: 'varchar', length: 150, nullable: true }) serialNumber: string | null
  @Column({ type: 'varchar', length: 200, nullable: true }) supplier: string | null
  @Column({ name: 'invoice_number', type: 'varchar', length: 100, nullable: true }) invoiceNumber: string | null
  @Column({ name: 'purchase_date', type: 'date', nullable: true }) purchaseDate: string | null
  @Column({ name: 'purchase_cost', type: 'decimal', precision: 14, scale: 2, nullable: true }) purchaseCost: number | null
  @Column({ name: 'warranty_until', type: 'date', nullable: true }) warrantyUntil: string | null
  @Column({ name: 'registration_number', type: 'varchar', length: 60, nullable: true }) registrationNumber: string | null
  @Column({ name: 'insurance_until', type: 'date', nullable: true }) insuranceUntil: string | null
  @Column({ name: 'service_due', type: 'date', nullable: true }) serviceDue: string | null
  @Column({ name: 'document_url', type: 'text', nullable: true }) documentUrl: string | null
  @Column({ name: 'photo_url', type: 'text', nullable: true }) photoUrl: string | null
  @Column({ type: 'text', nullable: true }) notes: string | null
  @Column({ name: 'assigned_employee_id', type: 'uuid', nullable: true }) assignedEmployeeId: string | null
  @Column({ name: 'assigned_to', type: 'varchar', length: 220, nullable: true }) assignedTo: string | null
  @Column({ name: 'last_verified', type: 'date', nullable: true }) lastVerified: string | null
  @Column({ type: 'int', default: 1 }) version: number
}

@Entity('office_asset_events')
@Index('idx_office_asset_events_asset', ['assetId', 'createdAt'])
export class OfficeAssetEvent extends BaseEntity {
  @Column({ name: 'asset_id', type: 'uuid' }) assetId: string
  @Column({ name: 'project_id' }) projectId: string
  @Column({ length: 30 }) action: string
  @Column({ name: 'event_date', type: 'date' }) eventDate: string
  @Column({ type: 'text' }) reason: string
  @Column({ name: 'actor_id', type: 'uuid' }) actorId: string
  @Column({ name: 'actor_name', length: 220 }) actorName: string
  @Column({ type: 'jsonb', nullable: true }) before: Record<string, unknown> | null
  @Column({ type: 'jsonb' }) after: Record<string, unknown>
}
