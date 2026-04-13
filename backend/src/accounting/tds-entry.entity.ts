import { Entity, Column } from 'typeorm'
import { BaseEntity } from '../shared/entities/base.entity'
export enum TdsSection { S194C='194C', S194I='194I', S194J='194J', S194A='194A', OTHER='Other' }
export enum TdsStatus   { DEDUCTED='deducted', DEPOSITED='deposited' }
@Entity('tds_entries')
export class TdsEntry extends BaseEntity {
  @Column({ name:'project_id' }) projectId: string
  @Column({ name:'vendor_id', nullable:true }) vendorId: string
  @Column({ name:'ref_id', nullable:true }) refId: string
  @Column({ name:'ref_type', nullable:true }) refType: string
  @Column({ type:'date' }) date: string
  @Column({ name:'payee_name' }) payeeName: string
  @Column({ name:'payee_pan', nullable:true }) payeePan: string
  @Column({ type:'enum', enum:TdsSection, default:TdsSection.S194C }) section: TdsSection
  @Column({ name:'gross_amount', type:'decimal', precision:15, scale:2 }) grossAmount: number
  @Column({ name:'tds_rate', type:'decimal', precision:5, scale:2 }) tdsRate: number
  @Column({ name:'tds_amount', type:'decimal', precision:15, scale:2 }) tdsAmount: number
  @Column({ nullable:true }) quarter: string
  @Column({ name:'financial_year', nullable:true }) financialYear: string
  @Column({ type:'enum', enum:TdsStatus, default:TdsStatus.DEDUCTED }) status: TdsStatus
  @Column({ name:'deposit_date', type:'date', nullable:true }) depositDate: string
  @Column({ name:'challan_no', nullable:true }) challanNo: string
}