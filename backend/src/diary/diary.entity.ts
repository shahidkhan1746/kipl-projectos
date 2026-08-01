import { Entity, Column } from 'typeorm'
import { BaseEntity } from '../shared/entities/base.entity'

export enum WeatherCondition {
  SUNNY   = 'sunny',
  CLOUDY  = 'cloudy',
  RAINY   = 'rainy',
  FOGGY   = 'foggy',
  SNOWY   = 'snowy',
  STORMY  = 'stormy',
}

export enum DiaryStatus { DRAFT = 'draft', SUBMITTED = 'submitted', APPROVED = 'approved' }

@Entity('site_diaries')
export class SiteDiary extends BaseEntity {
  @Column({ name: 'project_id' }) projectId: string
  @Column({ type: 'date', unique: false }) date: string
  @Column({ name: 'submitted_by' }) submittedBy: string

  // Weather
  @Column({ name: 'weather_morning', type: 'enum', enum: WeatherCondition, default: WeatherCondition.SUNNY }) weatherMorning: WeatherCondition
  @Column({ name: 'weather_afternoon', type: 'enum', enum: WeatherCondition, default: WeatherCondition.SUNNY }) weatherAfternoon: WeatherCondition
  @Column({ name: 'temp_min', type: 'decimal', precision: 5, scale: 1, nullable: true }) tempMin: number
  @Column({ name: 'temp_max', type: 'decimal', precision: 5, scale: 1, nullable: true }) tempMax: number
  @Column({ name: 'rainfall_mm', type: 'decimal', precision: 6, scale: 1, default: 0 }) rainfallMm: number
  @Column({ name: 'work_stopped_weather', default: false }) workStoppedWeather: boolean
  @Column({ name: 'hours_lost', type: 'decimal', precision: 4, scale: 1, default: 0 }) hoursLost: number

  // Labour
  @Column({ name: 'labour_skilled', default: 0 }) labourSkilled: number
  @Column({ name: 'labour_unskilled', default: 0 }) labourUnskilled: number
  @Column({ name: 'labour_supervisory', default: 0 }) labourSupervisory: number
  @Column({ name: 'labour_total', default: 0 }) labourTotal: number

  // Equipment — jsonb array [{type, count, hours, remarks}]
  @Column({ type: 'jsonb', default: [] }) equipment: any[]

  // Work done — jsonb array [{zone, activity, quantity, unit, remarks}]
  @Column({ name: 'work_done', type: 'jsonb', default: [] }) workDone: any[]

  // Materials received — jsonb array [{material, quantity, unit, supplier}]
  @Column({ name: 'materials_received', type: 'jsonb', default: [] }) materialsReceived: any[]

  // Visitors — jsonb array [{name, organisation, purpose}]
  @Column({ type: 'jsonb', default: [] }) visitors: any[]

  // Issues / Instructions
  @Column({ name: 'issues_faced', type: 'text', nullable: true }) issuesFaced: string
  @Column({ name: 'instructions_given', type: 'text', nullable: true }) instructionsGiven: string
  @Column({ name: 'next_day_plan', type: 'text', nullable: true }) nextDayPlan: string

  // Site photographs — jsonb array [{url, key, caption}] (Clause 17.5 / 23.3)
  @Column({ type: 'jsonb', default: [] }) photos: any[]

  // EOT tracking
  @Column({ name: 'eot_claim', default: false }) eotClaim: boolean
  @Column({ name: 'eot_reason', type: 'text', nullable: true }) eotReason: string

  @Column({ type: 'enum', enum: DiaryStatus, default: DiaryStatus.DRAFT }) status: DiaryStatus
  @Column({ name: 'approved_by', nullable: true }) approvedBy: string
}
