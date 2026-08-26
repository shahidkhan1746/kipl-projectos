import { Injectable, Logger } from '@nestjs/common'
import { IEmbeddingProvider, EmbeddingRequestOptions } from './embedding-provider.interface'

@Injectable()
export class GeminiEmbeddingProvider implements IEmbeddingProvider {
  readonly providerName = 'gemini'
  private readonly logger = new Logger(GeminiEmbeddingProvider.name)

  async generateEmbedding(text: string, options: EmbeddingRequestOptions): Promise<number[]> {
    const modelName = options.model || 'gemini-embedding-2'
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:embedContent?key=${options.apiKey}`

    // Gemini requirement: RETRIEVAL_DOCUMENT for passages, RETRIEVAL_QUERY for search
    const taskType = options.inputType === 'passage' ? 'RETRIEVAL_DOCUMENT' : 'RETRIEVAL_QUERY'
    const body: any = {
      model: `models/${modelName}`,
      content: { parts: [{ text }] },
      taskType,
    }
    if (options.dimension && options.dimension < 3072) {
      body.outputDimensionality = options.dimension
    }

    let retries = 3
    let delayMs = 1000

    while (retries > 0) {
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 20000)

        const f: any = (globalThis as any).fetch
        const res = await f(url, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal,
        })
        clearTimeout(timeout)

        if (res.status === 429 || res.status >= 500) {
          const errText = await res.text().catch(() => '')
          this.logger.warn(`Gemini embedding API ${res.status}: ${errText}. Retrying in ${delayMs}ms...`)
          retries--
          if (retries === 0) {
            throw new Error(`Gemini embedding quota exhausted or unavailable (HTTP ${res.status}): ${errText}`)
          }
          await new Promise(r => setTimeout(r, delayMs))
          delayMs *= 2
          continue
        }

        const data = await res.json()
        const embedding = data?.embedding?.values
        if (!Array.isArray(embedding) || embedding.length === 0) {
          throw new Error(`Invalid embedding response structure from Gemini: ${JSON.stringify(data)}`)
        }
        return embedding
      } catch (err: any) {
        if (retries <= 1 || err.message?.includes('quota exhausted')) {
          throw err
        }
        this.logger.warn(`Gemini embedding request failed: ${err.message}. Retrying in ${delayMs}ms...`)
        retries--
        await new Promise(r => setTimeout(r, delayMs))
        delayMs *= 2
      }
    }
    throw new Error('Gemini embedding generation failed after retries')
  }

  async generateEmbeddingsBatch(texts: string[], options: EmbeddingRequestOptions): Promise<number[][]> {
    if (!texts.length) return []
    const modelName = options.model || 'gemini-embedding-2'
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:batchEmbedContents?key=${options.apiKey}`

    const taskType = options.inputType === 'passage' ? 'RETRIEVAL_DOCUMENT' : 'RETRIEVAL_QUERY'
    const requests = texts.map(text => {
      const req: any = {
        model: `models/${modelName}`,
        content: { parts: [{ text }] },
        taskType,
      }
      if (options.dimension && options.dimension < 3072) {
        req.outputDimensionality = options.dimension
      }
      return req
    })

    let retries = 3
    let delayMs = 1000

    while (retries > 0) {
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 30000)

        const f: any = (globalThis as any).fetch
        const res = await f(url, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ requests }),
          signal: controller.signal,
        })
        clearTimeout(timeout)

        if (res.status === 429 || res.status >= 500) {
          const errText = await res.text().catch(() => '')
          this.logger.warn(`Gemini batch embedding API ${res.status}: ${errText}. Retrying in ${delayMs}ms...`)
          retries--
          if (retries === 0) {
            throw new Error(`Gemini embedding quota exhausted or unavailable (HTTP ${res.status}): ${errText}`)
          }
          await new Promise(r => setTimeout(r, delayMs))
          delayMs *= 2
          continue
        }

        const data = await res.json()
        const embeddings = data?.embeddings
        if (!Array.isArray(embeddings) || embeddings.length !== texts.length) {
          throw new Error(`Invalid batch embedding response structure from Gemini: ${JSON.stringify(data)}`)
        }
        return embeddings.map((e: any) => e.values)
      } catch (err: any) {
        if (retries <= 1 || err.message?.includes('quota exhausted')) {
          throw err
        }
        this.logger.warn(`Gemini batch embedding request failed: ${err.message}. Retrying in ${delayMs}ms...`)
        retries--
        await new Promise(r => setTimeout(r, delayMs))
        delayMs *= 2
      }
    }
    throw new Error('Gemini batch embedding generation failed after retries')
  }
}
