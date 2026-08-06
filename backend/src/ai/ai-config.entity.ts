import { Entity, Column } from 'typeorm'
import { BaseEntity } from '../shared/entities/base.entity'

// AI provider configuration (single row). The API key stays server-side and is
// never returned to the frontend (see AiService.getMasked).
@Entity('ai_config')
export class AiConfig extends BaseEntity {
  @Column({ default: false }) enabled: boolean
  @Column({ default: 'gemini' }) provider: string        // 'gemini' | 'openai' (OpenAI-compatible: OpenAI/Groq/OpenRouter)
  @Column({ name: 'api_key', type: 'text', nullable: true }) apiKey: string
  @Column({ nullable: true }) model: string
  @Column({ name: 'base_url', nullable: true }) baseUrl: string  // for openai-compatible providers
}
