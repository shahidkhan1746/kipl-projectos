import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, DataSource } from 'typeorm'
import { AiDocumentChunk } from './ai-document-chunk.entity'
import { AiService } from './ai.service'

const pdfParse = require('pdf-parse')

@Injectable()
export class AiIndexerService {
  private readonly logger = new Logger(AiIndexerService.name)

  constructor(
    @InjectRepository(AiDocumentChunk) private chunkRepo: Repository<AiDocumentChunk>,
    private dataSource: DataSource,
    private aiSvc: AiService
  ) {}

  async indexText(text: string, meta: { projectId?: string; sourceId: string; sourceType: string; sourceName: string }) {
    if (!text || !text.trim()) return

    const chunks = this.chunkTextSemantically(text, 1000, 150)
    await this.chunkRepo.delete({ sourceId: meta.sourceId, sourceType: meta.sourceType })

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      if (!chunk.trim()) continue

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
    this.logger.log(`Indexed ${chunks.length} chunks for "${meta.sourceName}"`)
  }

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
      await this.indexText(text, meta)
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
   * Comprehensive System Sync:
   * Crawls settings, letters, meetings, liaison files, uploaded PDFs, and site diaries
   * to build a complete project memory in the vector database.
   */
  async syncAllKnowledge(projectId?: string): Promise<{ indexedSources: number; details: string[] }> {
    const details: string[] = []
    let totalSources = 0

    try {
      // 1. Index Project Settings & Contract Parameters
      const settings = await this.dataSource.query(`SELECT key, value, label, category FROM system_settings WHERE value IS NOT NULL`)
      if (settings && settings.length > 0) {
        const settingsText = settings.map((s: any) => `• ${s.label || s.key} (${s.category || 'General'}): ${s.value}`).join('\n')
        await this.indexText(settingsText, {
          projectId,
          sourceId: 'system_settings_all',
          sourceType: 'settings',
          sourceName: 'Project Settings & Contract Key Parameters'
        })
        totalSources++
        details.push(`Indexed ${settings.length} Project Contract Settings`)
      }

      // 2. Index Letters & Formal Communication
      let letterQuery = `SELECT * FROM letters`
      const letterParams: any[] = []
      if (projectId) {
        letterQuery += ` WHERE project_id = $1`
        letterParams.push(projectId)
      }
      const letters = await this.dataSource.query(letterQuery, letterParams)
      for (const l of letters) {
        const letterText = `Letter Number: ${l.letter_number || 'N/A'}\nType: ${l.letter_type}\nDate: ${l.date}\nTo Organization: ${l.to_organization || 'N/A'} (Attn: ${l.to_name || 'N/A'})\nSubject: ${l.subject || 'N/A'}\nStatus: ${l.status}\n\nContent:\n${l.body || 'N/A'}`
        await this.indexText(letterText, {
          projectId: l.project_id || projectId,
          sourceId: l.id,
          sourceType: 'letter',
          sourceName: `Letter ${l.letter_number || l.subject || l.id}`
        })
        totalSources++
      }
      if (letters.length > 0) details.push(`Indexed ${letters.length} Official Letters`)

      // 3. Index Meetings & Minutes of Meeting (MOM)
      let meetQuery = `SELECT * FROM meetings`
      const meetParams: any[] = []
      if (projectId) {
        meetQuery += ` WHERE project_id = $1`
        meetParams.push(projectId)
      }
      const meetings = await this.dataSource.query(meetQuery, meetParams)
      for (const m of meetings) {
        let itemsStr = ''
        if (Array.isArray(m.action_items)) {
          itemsStr = m.action_items.map((a: any, idx: number) => `  ${idx + 1}. [${a.status || 'Pending'}] ${a.action} (Responsible: ${a.responsible || 'N/A'}, Due: ${a.dueDate || 'N/A'})`).join('\n')
        }
        let attendeesStr = ''
        if (Array.isArray(m.attendees)) {
          attendeesStr = m.attendees.map((at: any) => `${at.name || at.designation} (${at.organisation || ''})`).join(', ')
        }

        const meetText = `Meeting Title: ${m.title}\nMeeting No: ${m.meeting_no || 'N/A'} (${m.type})\nDate: ${m.date}, Venue: ${m.venue || 'Site Office'}\nChaired By: ${m.chaired_by || 'N/A'}, Minuted By: ${m.minuted_by || 'N/A'}\nAttendees: ${attendeesStr}\n\nAction Items & Next Steps:\n${itemsStr || 'None recorded'}\n\nNext Meeting Date: ${m.next_meeting_date || 'N/A'}\nRemarks: ${m.remarks || ''}`
        await this.indexText(meetText, {
          projectId: m.project_id || projectId,
          sourceId: m.id,
          sourceType: 'meeting',
          sourceName: `MOM: ${m.title} (${m.date})`
        })
        totalSources++
      }
      if (meetings.length > 0) details.push(`Indexed ${meetings.length} Meeting Records & Action Items`)

      // 4. Index Liaison Files & Approvals
      let liaisonQuery = `SELECT * FROM liaison_files`
      const liaisonParams: any[] = []
      if (projectId) {
        liaisonQuery += ` WHERE "projectId" = $1`
        liaisonParams.push(projectId)
      }
      const liaisonFiles = await this.dataSource.query(liaisonQuery, liaisonParams)
      for (const lf of liaisonFiles) {
        const lfText = `Liaison File Ref: ${lf.fileNumber || 'N/A'}\nDepartment: ${lf.department}\nSubject: ${lf.subject}\nStatus: ${lf.currentStatus}\nExpected Approval Date: ${lf.expectedDate || 'N/A'}\nActual Date: ${lf.actualDate || 'N/A'}\nDelay Days: ${lf.delayDays || 0}\nEOT Relevant Ground: ${lf.isEotGround ? 'Yes' : 'No'} (${lf.eotReason || 'N/A'})\nRemarks: ${lf.remarks || ''}`
        await this.indexText(lfText, {
          projectId: lf.projectId || projectId,
          sourceId: lf.id,
          sourceType: 'liaison_file',
          sourceName: `Liaison File: ${lf.fileNumber || lf.subject}`
        })
        totalSources++
      }
      if (liaisonFiles.length > 0) details.push(`Indexed ${liaisonFiles.length} Liaison Government Clearance Files`)

      // 5. Index Uploaded PDF Documents
      const pdfDocs = await this.dataSource.query(`SELECT id, "fileId", "documentName", "cloudinaryUrl", "revision" FROM file_documents WHERE "cloudinaryUrl" IS NOT NULL AND ("mimeType" = 'application/pdf' OR "documentName" ILIKE '%.pdf')`)
      for (const doc of pdfDocs) {
        if (doc.cloudinaryUrl) {
          await this.indexUrl(doc.cloudinaryUrl, {
            projectId,
            sourceId: doc.id,
            sourceType: 'liaison_document',
            sourceName: doc.documentName || `Document ${doc.revision || ''}`
          })
          totalSources++
        }
      }
      if (pdfDocs.length > 0) details.push(`Processed & Indexed ${pdfDocs.length} Uploaded PDF Attachments`)

    } catch (err) {
      this.logger.error('Failed full knowledge sync:', err)
    }

    return { indexedSources: totalSources, details }
  }

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
