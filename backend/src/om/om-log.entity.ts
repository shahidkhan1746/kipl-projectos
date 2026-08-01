import { Entity, Column } from 'typeorm'
import { BaseEntity } from '../shared/entities/base.entity'

// Design effluent standards for discharge to Dal Lake (NGT / CPCB STP norms).
// Editable reference — used to flag non-compliant readings.
export const EFFLUENT_LIMITS = {
  outBod: 10,          // mg/L, max
  outCod: 50,          // mg/L, max
  outTss: 10,          // mg/L, max
  outPhMin: 6.5,
  outPhMax: 9.0,
  outFecalColiform: 100, // MPN/100mL, max
  outAmmN: 5,          // mg/L, max
  outTotalN: 10,       // mg/L, max
  outTotalP: 1,        // mg/L, max (lake — nutrient sensitive)
}

@Entity('om_logs')
export class OmLog extends BaseEntity {
  @Column({ name: 'project_id' }) projectId: string
  @Column({ type: 'date' }) date: string
  @Column({ nullable: true }) shift: string   // e.g. Day / Night, optional

  // Flow (MLD)
  @Column({ name: 'inflow_mld', type: 'decimal', precision: 8, scale: 2, nullable: true }) inflowMld: number
  @Column({ name: 'outflow_mld', type: 'decimal', precision: 8, scale: 2, nullable: true }) outflowMld: number

  // Influent quality
  @Column({ name: 'in_bod', type: 'decimal', precision: 8, scale: 2, nullable: true }) inBod: number
  @Column({ name: 'in_cod', type: 'decimal', precision: 8, scale: 2, nullable: true }) inCod: number
  @Column({ name: 'in_tss', type: 'decimal', precision: 8, scale: 2, nullable: true }) inTss: number

  // Effluent quality (checked against EFFLUENT_LIMITS)
  @Column({ name: 'out_bod', type: 'decimal', precision: 8, scale: 2, nullable: true }) outBod: number
  @Column({ name: 'out_cod', type: 'decimal', precision: 8, scale: 2, nullable: true }) outCod: number
  @Column({ name: 'out_tss', type: 'decimal', precision: 8, scale: 2, nullable: true }) outTss: number
  @Column({ name: 'out_ph', type: 'decimal', precision: 4, scale: 2, nullable: true }) outPh: number
  @Column({ name: 'out_do', type: 'decimal', precision: 6, scale: 2, nullable: true }) outDo: number
  @Column({ name: 'out_fecal_coliform', type: 'decimal', precision: 12, scale: 2, nullable: true }) outFecalColiform: number
  @Column({ name: 'out_amm_n', type: 'decimal', precision: 8, scale: 2, nullable: true }) outAmmN: number
  @Column({ name: 'out_total_n', type: 'decimal', precision: 8, scale: 2, nullable: true }) outTotalN: number
  @Column({ name: 'out_total_p', type: 'decimal', precision: 8, scale: 2, nullable: true }) outTotalP: number

  // SBR process control
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true }) mlss: number  // mg/L
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true }) svi: number    // mL/g
  @Column({ name: 'do_aeration', type: 'decimal', precision: 6, scale: 2, nullable: true }) doAeration: number
  @Column({ name: 'chlorine_residual', type: 'decimal', precision: 6, scale: 2, nullable: true }) chlorineResidual: number

  // Utilities & sludge
  @Column({ name: 'power_kwh', type: 'decimal', precision: 12, scale: 2, nullable: true }) powerKwh: number
  @Column({ name: 'dg_hours', type: 'decimal', precision: 6, scale: 2, nullable: true }) dgHours: number
  @Column({ name: 'sludge_m3', type: 'decimal', precision: 10, scale: 2, nullable: true }) sludgeM3: number

  @Column({ nullable: true }) operator: string
  @Column({ type: 'text', nullable: true }) remarks: string
}
