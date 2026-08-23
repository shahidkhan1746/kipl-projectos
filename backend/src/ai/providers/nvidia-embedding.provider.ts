import { Injectable, Logger } from '@nestjs/common'
import { IEmbeddingProvider, EmbeddingRequestOptions } from './embedding-provider.interface'

@Injectable()
export class NvidiaEmbeddingProvider implements IEmbeddingProvider {
  readonly providerName = 'nvidia'
  private readonly logger = new Logger(NvidiaEmbeddingProvider.name)

  async generateEmbedding(text: string, options: EmbeddingRequestOptions): Promise<number[]> {
    const results = await this.generateEmbeddingsBatch([text], options)
    return results[0]
  }

  async generateEmbeddingsBatch(texts: string[], options: EmbeddingRequestOptions): Promise<number[][]> {
    if (!texts.length) return []
    const base = (options.baseUrl || 'https://integrate.api.nvidia.com/v1').replace(/\/$/, '')
    const url = `${base}/embeddings`

    const body = {
      model: options.model || 'nvidia/nv-embed-v1',
      input: texts,
      input_type: options.inputType, // 'passage' | 'query'
      encoding_format: 'float',
      truncate: 'END',
    }

    let retries = 3
    let delayMs = 1000

    while (retries > 0) {
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 30000)

        const f: any = (globalThis as any).fetch
        const res = await f(url, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${options.apiKey}`,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        })
        clearTimeout(timeout)

        if (res.status === 429 || res.status >= 500) {
          const errText = await res.text().catch(() => '')
          this.logger.warn(`NVIDIA embedding API ${res.status}: ${errText}. Retrying in ${delayMs}ms...`)
          retries--
          if (retries === 0) {
            throw new Error(`NVIDIA embedding quota exhausted or unavailable (HTTP ${res.status}): ${errText}`)
          }
          await new Promise(r => setTimeout(r, delayMs))
          delayMs *= 2
          continue
        }

        const data = await res.json()
        const items = data?.data
        if (!Array.isArray(items) || items.length === 0) {
          throw new Error(`Invalid embedding batch response structure from NVIDIA: ${JSON.stringify(data)}`)
        }
        // Ensure sorted by index
        items.sort((a: any, b: any) => (a.index || 0) - (b.index || 0))
        return items.map((item: any) => item.embedding)
      } catch (err: any) {
        if (retries <= 1 || err.message?.includes('quota exhausted')) {
          throw err
        }
        this.logger.warn(`NVIDIA embedding batch request failed: ${err.message}. Retrying in ${delayMs}ms...`)
        retries--
        await new Promise(r => setTimeout(r, delayMs))
        delayMs *= 2
      }
    }
    throw new Error('NVIDIA batch embedding generation failed after retries')
  }
}
