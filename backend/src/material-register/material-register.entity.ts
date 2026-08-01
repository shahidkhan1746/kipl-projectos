import { Entity, Column } from 'typeorm'
import { BaseEntity } from '../shared/entities/base.entity'

// Record of consumption of cement & steel (Tender Clause 55): received / consumed
// / balance-in-hand, signed daily by contractor and UEED representatives.
@Entity('material_register')
export class MaterialRegister extends BaseEntity {
  @Column({ name: 'project_id' }) projectId: string
  @Column({ type: 'date' }) date: string
  @Column() material: string   // Cement (OPC 43/53) / Steel (TMT) / etc.
  @Column({ nullable: true }) unit: string  // Bags / MT
  @Column({ name: 'received_qty', type: 'decimal', precision: 12, scale: 3, default: 0 }) receivedQty: number
  @Column({ name: 'consumed_qty', type: 'decimal', precision: 12, scale: 3, default: 0 }) consumedQty: number
  @Column({ name: 'contractor_rep', nullable: true }) contractorRep: string
  @Column({ name: 'ueed_rep', nullable: true }) ueedRep: string
  @Column({ type: 'text', nullable: true }) remarks: string
}
