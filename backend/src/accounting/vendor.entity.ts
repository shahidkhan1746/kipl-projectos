import { Entity, Column } from 'typeorm'
import { BaseEntity } from '../shared/entities/base.entity'
export enum VendorCategory { MATERIAL_SUPPLIER='material_supplier', SUBCONTRACTOR='subcontractor', EQUIPMENT_HIRE='equipment_hire', LABOUR_CONTRACTOR='labour_contractor', CONSULTANT='consultant', GOVERNMENT='government', OTHER='other' }
@Entity('vendors')
export class Vendor extends BaseEntity {
  @Column() name: string
  @Column({ name:'trade_name', nullable:true }) tradeName: string
  @Column({ type:'enum', enum:VendorCategory, default:VendorCategory.OTHER }) category: VendorCategory
  @Column({ nullable:true }) gstin: string
  @Column({ nullable:true }) pan: string
  @Column({ nullable:true }) phone: string
  @Column({ nullable:true }) email: string
  @Column({ nullable:true }) address: string
  @Column({ name:'bank_account', type:'jsonb', default:{} }) bankAccount: Record<string,string>
  @Column({ name:'tds_applicable', default:true }) tdsApplicable: boolean
  @Column({ name:'tds_rate', type:'decimal', precision:5, scale:2, default:2 }) tdsRate: number
  @Column({ name:'is_active', default:true }) isActive: boolean
  @Column({ name:'project_id', nullable:true }) projectId: string
}