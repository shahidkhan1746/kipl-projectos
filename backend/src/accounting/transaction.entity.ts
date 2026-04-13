import { Entity, Column } from 'typeorm'
import { BaseEntity } from '../shared/entities/base.entity'
export enum TxnType { RECEIPT='receipt', PAYMENT='payment', JOURNAL='journal' }
@Entity('transactions')
export class Transaction extends BaseEntity {
  @Column({ name:'project_id' }) projectId: string
  @Column({ type:'date' }) date: string
  @Column({ type:'enum', enum:TxnType }) type: TxnType
  @Column({ type:'text' }) description: string
  @Column({ name:'ref_no', nullable:true }) refNo: string
  @Column({ name:'ref_type', nullable:true }) refType: string
  @Column({ name:'ref_id', nullable:true }) refId: string
  @Column({ name:'vendor_id', nullable:true }) vendorId: string
  @Column({ name:'debit', type:'decimal', precision:15, scale:2, default:0 }) debit: number
  @Column({ name:'credit', type:'decimal', precision:15, scale:2, default:0 }) credit: number
  @Column({ name:'balance', type:'decimal', precision:15, scale:2, default:0 }) balance: number
  @Column({ name:'payment_mode', nullable:true }) paymentMode: string
  @Column({ name:'bank_ref', nullable:true }) bankRef: string
  @Column({ type:'text', nullable:true }) narration: string
}