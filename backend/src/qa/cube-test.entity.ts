import { Entity, Column } from 'typeorm'
import { BaseEntity } from '../shared/entities/base.entity'

@Entity('qa_cube_tests')
export class CubeTest extends BaseEntity {
  @Column({ name: 'project_id', length: 64 })
  projectId: string

  @Column({ name: 'sample_code', length: 64 })
  sampleCode: string

  @Column({ name: 'pour_location', length: 255 })
  pourLocation: string

  @Column({ name: 'structure_element', length: 128 })
  structureElement: string

  @Column({ length: 32 })
  grade: string // M15, M20, M25, M30, M35, M40, M50

  @Column({ name: 'cement_type', length: 32, default: 'OPC_53' })
  cementType: string

  @Column({ name: 'cast_date', type: 'date' })
  castDate: string

  @Column({ name: 'batch_or_mix_id', length: 128, nullable: true })
  batchOrMixId?: string

  @Column({ name: 'curing_method', length: 64, default: 'Water Curing' })
  curingMethod: string

  @Column({ name: 'curing_temp_celsius', type: 'decimal', precision: 5, scale: 2, default: 20.0 })
  curingTempCelsius: number

  @Column({ name: 'fck_required_mpa', type: 'decimal', precision: 6, scale: 2 })
  fckRequiredMpa: number

  // ── 7-Day Test Record ──
  @Column({ name: 'test_7d_date', type: 'date', nullable: true })
  test7dDate?: string

  @Column({ name: 'load_7d_1_kn', type: 'decimal', precision: 8, scale: 2, nullable: true })
  load7d1Kn?: number

  @Column({ name: 'load_7d_2_kn', type: 'decimal', precision: 8, scale: 2, nullable: true })
  load7d2Kn?: number

  @Column({ name: 'load_7d_3_kn', type: 'decimal', precision: 8, scale: 2, nullable: true })
  load7d3Kn?: number

  @Column({ name: 'avg_strength_7d_mpa', type: 'decimal', precision: 6, scale: 2, nullable: true })
  avgStrength7dMpa?: number

  @Column({ name: 'predicted_28d_mpa', type: 'decimal', precision: 6, scale: 2, nullable: true })
  predicted28dMpa?: number

  @Column({ name: 'status_7d', length: 32, default: 'PENDING' })
  status7d: string // PENDING, ON_TRACK, AT_RISK, FAILED

  // ── 28-Day Test Record ──
  @Column({ name: 'test_28d_date', type: 'date', nullable: true })
  test28dDate?: string

  @Column({ name: 'load_28d_1_kn', type: 'decimal', precision: 8, scale: 2, nullable: true })
  load28d1Kn?: number

  @Column({ name: 'load_28d_2_kn', type: 'decimal', precision: 8, scale: 2, nullable: true })
  load28d2Kn?: number

  @Column({ name: 'load_28d_3_kn', type: 'decimal', precision: 8, scale: 2, nullable: true })
  load28d3Kn?: number

  @Column({ name: 'avg_strength_28d_mpa', type: 'decimal', precision: 6, scale: 2, nullable: true })
  avgStrength28dMpa?: number

  @Column({ name: 'status_28d', length: 32, default: 'PENDING' })
  status28d: string // PENDING, PASSED, FAILED

  @Column({ name: 'overall_status', length: 32, default: 'CAST' })
  overallStatus: string // CAST, 7D_TESTED, COMPLETED_PASSED, COMPLETED_FAILED

  @Column({ name: 'technician_name', length: 128, nullable: true })
  technicianName?: string

  @Column({ type: 'text', nullable: true })
  remarks?: string
}
