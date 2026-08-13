import { Entity, Column } from 'typeorm'
import { BaseEntity } from '../shared/entities/base.entity'

// One row per API key in the failover pool. generate() tries enabled keys in
// priority order (lower number = tried first) until one succeeds.
@Entity('ai_keys')
export class AiKey extends BaseEntity {
  @Column({ default: '' }) label: string
  @Column({ default: 'nvidia' }) provider: string  // gemini | openai | nvidia | groq | openrouter
  @Column({ name: 'api_key', type: 'text', nullable: true }) apiKey: string
  @Column({ nullable: true }) model: string
  @Column({ name: 'base_url', nullable: true }) baseUrl: string
  @Column({ default: true }) enabled: boolean
  @Column({ type: 'int', default: 100 }) priority: number
}
