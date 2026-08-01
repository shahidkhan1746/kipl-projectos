import { Entity, Column } from 'typeorm'
import { BaseEntity } from '../shared/entities/base.entity'

// Works Site Order Book (Tender Clause 42.3): the EIC records instructions during
// site inspection; the contractor confirms receipt by acknowledging each order.
@Entity('site_orders')
export class SiteOrder extends BaseEntity {
  @Column({ name: 'project_id' }) projectId: string
  @Column({ name: 'order_no', nullable: true }) orderNo: string
  @Column({ type: 'date' }) date: string
  @Column({ name: 'issued_by' }) issuedBy: string        // EIC / AEE / XEN name & designation
  @Column({ type: 'text' }) instruction: string
  @Column({ name: 'acknowledged_by', nullable: true }) acknowledgedBy: string
  @Column({ name: 'acknowledged_date', type: 'date', nullable: true }) acknowledgedDate: string
  @Column({ name: 'compliance_status', default: 'pending' }) complianceStatus: string  // pending / complied / na
  @Column({ type: 'text', nullable: true }) remarks: string
}
