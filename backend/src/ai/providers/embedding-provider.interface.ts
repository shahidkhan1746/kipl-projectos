import { AiEmbeddingProfile } from '../ai-embedding-profile.entity'

export interface EmbeddingRequestOptions {
  inputType: 'passage' | 'query'
  model: string
  dimension: number
  apiKey: string
  baseUrl?: string
}

export interface IEmbeddingProvider {
  readonly providerName: string
  generateEmbedding(text: string, options: EmbeddingRequestOptions): Promise<number[]>
  generateEmbeddingsBatch?(texts: string[], options: EmbeddingRequestOptions): Promise<number[][]>
}
