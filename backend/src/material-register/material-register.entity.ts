import { Entity, Column, DeleteDateColumn } from 'typeorm'
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
  /**
   * The goods receipt this row came from, when it came from one.
   *
   * Receipts used to be linked by a sentence in `remarks` — "GRN 0012 against
   * PO/…" — which nothing can join on. A GRN submitted twice wrote its stock
   * twice with no way to tell the duplicate from a second genuine delivery, and
   * a GRN entered wrongly left rows that could never be traced back to it.
   */
  @Column({ name: 'grn_id', type: 'uuid', nullable: true }) grnId: string | null

  @Column({ name: 'contractor_rep', nullable: true }) contractorRep: string
  @Column({ name: 'ueed_rep', nullable: true }) ueedRep: string
  @Column({ type: 'text', nullable: true }) remarks: string

  /**
   * Withdrawn, not destroyed.
   *
   * These rows are a statutory record signed by both the contractor and the
   * client's engineer. They were hard-deleted, and the audit trail recorded
   * only that a DELETE happened at a time by a user — so the quantity, the
   * material, the date and both signatures were gone, and the register could
   * not be reconstructed. A row removed in error was unrecoverable; a row
   * removed deliberately left nothing to find.
   *
   * TypeORM excludes these from find() automatically, so the register reads
   * exactly as before while the history survives underneath it.
   */
  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null

  @Column({ name: 'deleted_by_id', type: 'uuid', nullable: true }) deletedById: string | null
  @Column({ name: 'deleted_reason', type: 'text', nullable: true }) deletedReason: string | null
}
