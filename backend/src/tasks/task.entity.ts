import { Entity, Column } from 'typeorm'
import { BaseEntity } from '../shared/entities/base.entity'

export enum TaskPriority { CRITICAL='critical', HIGH='high', MEDIUM='medium', LOW='low' }
export enum TaskStatus   { TODO='todo', IN_PROGRESS='in_progress', REVIEW='review', DONE='done', BLOCKED='blocked' }

@Entity('tasks')
export class Task extends BaseEntity {
  @Column({ name:'project_id' }) projectId: string
  @Column() title: string
  @Column({ type:'text', nullable:true }) description: string
  @Column({ type:'enum', enum:TaskPriority, default:TaskPriority.MEDIUM }) priority: TaskPriority
  @Column({ type:'enum', enum:TaskStatus,   default:TaskStatus.TODO     }) status: TaskStatus
  @Column({ name:'assigned_to', nullable:true }) assignedTo: string
  @Column({ name:'assigned_name', nullable:true }) assignedName: string
  @Column({ name:'created_by', nullable:true }) createdBy: string
  @Column({ name:'due_date', type:'date', nullable:true }) dueDate: string
  @Column({ name:'completed_date', type:'date', nullable:true }) completedDate: string
  @Column({ name:'wbs_code', nullable:true }) wbsCode: string
  @Column({ name:'wbs_title', nullable:true }) wbsTitle: string
  @Column({ nullable:true }) category: string
  @Column({ name:'progress_pct', type:'decimal', precision:5, scale:1, default:0 }) progressPct: number
  @Column({ type:'jsonb', default:[] }) comments: any[]
  @Column({ name:'sort_order', default:0 }) sortOrder: number
}
