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
        // Assume text file for now if not pdf
        text = buffer.toString('utf8')
      }

      if (!text || !text.trim()) return

      // Simple chunking: split by paragraphs or a fixed number of characters
      const chunks = this.chunkText(text, 1000, 200)

      // Delete old chunks for this source
      await this.chunkRepo.delete({ sourceId: meta.sourceId, sourceType: meta.sourceType })

      for (const chunk of chunks) {
        if (!chunk.trim()) continue
        const embedding = await this.aiSvc.getEmbedding(chunk)
        if (!embedding) continue

        const doc = this.chunkRepo.create({
          projectId: meta.projectId,
          sourceId: meta.sourceId,
          sourceType: meta.sourceType,
          sourceName: meta.sourceName,
          text: chunk,
          embedding: `[${embedding.join(',')}]` // pgvector expects array format
        })
        await this.chunkRepo.save(doc)
      }
      this.logger.log(`Indexed ${chunks.length} chunks for ${meta.sourceName}`)
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

  private chunkText(text: string, chunkSize: number, overlap: number): string[] {
    const chunks: string[] = []
    let i = 0
    while (i < text.length) {
      chunks.push(text.slice(i, i + chunkSize))
      i += (chunkSize - overlap)
    }
    return chunks
  }
}
