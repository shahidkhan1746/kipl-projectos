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

  /**
   * Why this movement happened.
   *
   * On a receipt: what the material was brought in for. On an issue: what it
   * was used on. Both were being written into `remarks` as prose when they were
   * written at all, so neither could be grouped, filtered or asked about.
   */
  @Column({ type: 'text', nullable: true }) purpose: string | null

  /**
   * The work the material was consumed against.
   *
   * Consumption without this is a number leaving stock with no account of
   * where it went, which is exactly the question a client's engineer asks.
   */
  @Column({ name: 'wbs_code', type: 'varchar', length: 100, nullable: true })
  wbsCode: string | null

  /**
   * What this movement cost, per unit and in total.
   *
   * The register had no cost at all, so "how much of each material have we
   * procured and at what value" could not be answered from it — the rates lived
   * on purchase orders and the quantities lived here, with nothing joining them
   * except a sentence in `remarks`.
   *
   * `amount` is stored rather than derived on read. A receipt's value is a
   * historical fact: it must not move when the same material is bought at a
   * different rate next month.
   */
  @Column({ type: 'decimal', precision: 14, scale: 2, nullable: true })
  rate: number | null

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  amount: number | null

  /** Who it came from, and the papers it came with. */
  @Column({ name: 'vendor_id', type: 'uuid', nullable: true }) vendorId: string | null
  @Column({ name: 'supplier_name', type: 'varchar', length: 255, nullable: true }) supplierName: string | null
  @Column({ name: 'invoice_no', type: 'varchar', length: 100, nullable: true }) invoiceNo: string | null
  @Column({ name: 'challan_no', type: 'varchar', length: 100, nullable: true }) challanNo: string | null

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
