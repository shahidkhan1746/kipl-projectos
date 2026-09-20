import { Entity, Column, Index } from 'typeorm'
import { BaseEntity } from '../shared/entities/base.entity'

@Entity('audit_logs')
export class AuditLog extends BaseEntity {
  @Index()
  @Column({ name: 'user_id', nullable: true })
  userId: string

  @Column({ nullable: true })
  email: string

  @Column({ nullable: true })
  role: string

  @Column({ length: 10 })
  method: string

  @Index()
  @Column()
  path: string

  @Column({ name: 'status_code', type: 'int', default: 0 })
  statusCode: number

  @Column({ type: 'text', nullable: true })
  summary: string

  /**
   * The record the request acted on, where the path names one, so the trail can
   * be read as the history of an entry rather than a list of requests.
   */
  @Column({ name: 'entity_table', type: 'varchar', nullable: true, length: 100 })
  entityTable: string | null

  @Column({ name: 'entity_id', type: 'varchar', nullable: true, length: 100 })
  entityId: string | null

  /**
   * What the write asked for, and what came back. Credentials are stripped and
   * the size is capped before either reaches this table — see audit-payload.ts.
   *
   * These do not reconstruct an entity's prior state; nothing at this layer
   * knows it. They say what was requested and what resulted, which is what the
   * trail could not say at all before. Prior state for the Clause 55 register
   * survives because its rows are withdrawn rather than destroyed.
   */
  @Column({ name: 'change_requested', type: 'jsonb', nullable: true })
  changeRequested: unknown

  @Column({ name: 'change_result', type: 'jsonb', nullable: true })
  changeResult: unknown
}
