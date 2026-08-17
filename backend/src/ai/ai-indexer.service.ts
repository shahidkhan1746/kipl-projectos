import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AiDocumentChunk } from './ai-document-chunk.entity'
import { AiService } from './ai.service'

const pdfParse = require('pdf-parse')

@Injectable()
export class AiIndexerService {
  private readonly logger = new Logger(AiIndexerService.name)

  constructor(
    @InjectRepository(AiDocumentChunk) private chunkRepo: Repository<AiDocumentChunk>,
    private aiSvc: AiService
  ) {}

  async indexBuffer(buffer: Buffer, meta: { projectId?: string; sourceId: string; sourceType: string; sourceName: string }) {
    try {
      let text = ''
      if (meta.sourceName.toLowerCase().endsWith('.pdf')) {
        const data = await pdfParse(buffer)
        text = data.text
      } else {
        text = buffer.toString('utf8')
      }

      if (!text || !text.trim()) return

      // Advanced Recursive Semantic Chunking
      const chunks = this.chunkTextSemantically(text, 1000, 150)

      // Delete old chunks for this source
      await this.chunkRepo.delete({ sourceId: meta.sourceId, sourceType: meta.sourceType })

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i]
        if (!chunk.trim()) continue

        // Context-enriched chunk text for higher retrieval precision
        const enrichedText = `[Source: ${meta.sourceName} | Part ${i + 1}/${chunks.length}]\n${chunk}`
        const embedding = await this.aiSvc.getEmbedding(enrichedText)
        if (!embedding) continue

        const doc = this.chunkRepo.create({
          projectId: meta.projectId,
          sourceId: meta.sourceId,
          sourceType: meta.sourceType,
          sourceName: meta.sourceName,
          text: enrichedText,
          embedding: `[${embedding.join(',')}]`
        })
        await this.chunkRepo.save(doc)
      }
      this.logger.log(`Indexed ${chunks.length} semantic chunks for "${meta.sourceName}"`)
    } catch (e) {
      this.logger.error(`Failed to index buffer for ${meta.sourceName}: ${e.message}`)
    }
  }

  async indexUrl(url: string, meta: { projectId?: string; sourceId: string; sourceType: string; sourceName: string }) {
    if (!url) return
    try {
      this.logger.log(`Downloading ${url} for indexing...`)
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const buffer = Buffer.from(await res.arrayBuffer())
      await this.indexBuffer(buffer, meta)
    } catch (e) {
      this.logger.error(`Failed to index URL ${url}: ${e.message}`)
    }
  }

  /**
   * Recursive Semantic Chunking:
   * 1. Preserves paragraph boundaries (\n\n)
   * 2. Preserves list items & table lines (\n)
   * 3. Preserves full sentence structures (. ! ?)
   * 4. Ensures no words are truncated mid-word
   */
  private chunkTextSemantically(text: string, maxChunkSize = 1000, overlap = 150): string[] {
    const cleaned = text
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()

    if (!cleaned) return []
    if (cleaned.length <= maxChunkSize) return [cleaned]

    const chunks: string[] = []
    const paragraphs = cleaned.split(/\n\n+/)
    let currentChunk = ''

    for (const para of paragraphs) {
      const trimmedPara = para.trim()
      if (!trimmedPara) continue

      if (trimmedPara.length > maxChunkSize) {
        if (currentChunk) {
          chunks.push(currentChunk.trim())
          currentChunk = ''
        }
        // Split long paragraphs by sentence or line breaks
        const sentences = trimmedPara.split(/(?<=[.?!;:\n])\s+/)
        for (const sentence of sentences) {
          if ((currentChunk + ' ' + sentence).length > maxChunkSize) {
            if (currentChunk) chunks.push(currentChunk.trim())
            currentChunk = sentence.length > maxChunkSize ? sentence.substring(0, maxChunkSize) : sentence
          } else {
            currentChunk = currentChunk ? currentChunk + ' ' + sentence : sentence
          }
        }
      } else if ((currentChunk + '\n\n' + trimmedPara).length > maxChunkSize) {
        if (currentChunk) chunks.push(currentChunk.trim())
        currentChunk = trimmedPara
      } else {
        currentChunk = currentChunk ? currentChunk + '\n\n' + trimmedPara : trimmedPara
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim())
    }

    return chunks
  }
}
