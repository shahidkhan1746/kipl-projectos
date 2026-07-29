import { Entity, Column } from 'typeorm'
import { BaseEntity } from '../shared/entities/base.entity'
export enum ExpenseCategory { MATERIAL='material', LABOUR='labour', EQUIPMENT_HIRE='equipment_hire', FUEL='fuel', TRANSPORT='transport', SITE_OFFICE='site_office', SAFETY='safety', TESTING='testing', SUBCONTRACT='subcontract', GOVERNMENT_FEE='government_fee', STAFF_SALARY='staff_salary', MISCELLANEOUS='miscellaneous' }
export enum ExpenseStatus { PENDING='pending', APPROVED='approved', PAID='paid', REJECTED='rejected' }
@Entity('expenses')
export class Expense extends BaseEntity {
  @Column({ name:'project_id' }) projectId: string
  @Column({ name:'vendor_id', nullable:true }) vendorId: string
  @Column({ type:'date' }) date: string
  @Column({ type:'text' }) description: string
  @Column({ type:'enum', enum:ExpenseCategory }) category: ExpenseCategory
  // Nature of the bill/payment: running_bill | mobilisation_advance | material_advance |
  // secured_advance | final_bill | retention_release | security_deposit | other (custom text)
  @Column({ name:'payment_type', default:'running_bill' }) paymentType: string
  @Column({ name:'bill_no', nullable:true }) billNo: string
  @Column({ name:'bill_date', type:'date', nullable:true }) billDate: string
  @Column({ name:'gross_amount', type:'decimal', precision:15, scale:2 }) grossAmount: number
  @Column({ name:'gst_pct', type:'decimal', precision:5, scale:2, default:0 }) gstPct: number
  @Column({ name:'gst_amount', type:'decimal', precision:15, scale:2, default:0 }) gstAmount: number
  // GST split: 'intra' → CGST+SGST (each gst/2) · 'inter' → IGST (full gst)
  @Column({ name:'gst_type', default:'intra' }) gstType: string
  @Column({ name:'cgst_amount', type:'decimal', precision:15, scale:2, default:0 }) cgstAmount: number
  @Column({ name:'sgst_amount', type:'decimal', precision:15, scale:2, default:0 }) sgstAmount: number
  @Column({ name:'igst_amount', type:'decimal', precision:15, scale:2, default:0 }) igstAmount: number
  @Column({ name:'itc_claimed', default:false }) itcClaimed: boolean
  @Column({ name:'tds_pct', type:'decimal', precision:5, scale:2, default:0 }) tdsPct: number
  @Column({ name:'tds_amount', type:'decimal', precision:15, scale:2, default:0 }) tdsAmount: number
  @Column({ name:'net_payable', type:'decimal', precision:15, scale:2 }) netPayable: number
  @Column({ name:'paid_amount', type:'decimal', precision:15, scale:2, default:0 }) paidAmount: number
  @Column({ name:'payment_date', type:'date', nullable:true }) paymentDate: string
  @Column({ name:'payment_mode', nullable:true }) paymentMode: string
  @Column({ name:'payment_ref', nullable:true }) paymentRef: string
  @Column({ type:'enum', enum:ExpenseStatus, default:ExpenseStatus.PENDING }) status: ExpenseStatus
  @Column({ name:'approved_by', nullable:true }) approvedBy: string
  @Column({ name:'created_by', nullable:true }) createdBy: string
  @Column({ name:'attachment_url', nullable:true }) attachmentUrl: string
  @Column({ name:'attachment_name', nullable:true }) attachmentName: string
  @Column({ type:'text', nullable:true }) remarks: string
}