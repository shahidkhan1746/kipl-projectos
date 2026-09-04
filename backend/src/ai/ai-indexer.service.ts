import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, DataSource, ILike } from 'typeorm'
import { AiKnowledgeDocument, KnowledgeCategory, KnowledgeSourceType, KnowledgeStatus } from './ai-knowledge-document.entity'
import { AiEmbeddingProfile } from './ai-embedding-profile.entity'
import { EmbeddingProfileService } from './services/embedding-profile.service'
import { VectorCorpusService, ChunkInsertItem } from './services/vector-corpus.service'
import { StorageService } from '../storage/storage.service'
import { RagSanitizer } from './utils/rag-sanitizer.util'

import * as xlsx from 'xlsx'
const { PDFParse } = require('pdf-parse')
const mammoth = require('mammoth')

@Injectable()
export class AiIndexerService {
  private readonly logger = new Logger(AiIndexerService.name)

  constructor(
    @InjectRepository(AiKnowledgeDocument) private docRepo: Repository<AiKnowledgeDocument>,
    private storageSvc: StorageService,
    private dataSource: DataSource,
    private profileService: EmbeddingProfileService,
    private vectorCorpusService: VectorCorpusService,
  ) {}

  /** Flatten a jsonb array of objects/strings into a compact readable line. */
  private flat(a: any): string {
    if (!Array.isArray(a) || !a.length) return 'None'
    return a
      .map(i => typeof i === 'string' ? i : Object.values(i).filter(v => v !== null && v !== undefined && v !== '').join(' · '))
      .filter(Boolean)
      .join('; ')
  }

  async indexText(
    text: string,
    meta: { projectId?: string; sourceId: string; sourceType: string; sourceName: string },
    profileOverride?: AiEmbeddingProfile,
  ) {
    if (!text) return 0
    // Postgres completely rejects null bytes (\x00), which Excel extractors sometimes produce
    text = RagSanitizer.sanitizeText(text.replace(/\x00/g, '')).trim()
    if (!text) return 0

    const chunks = this.chunkTextSemantically(text, 1000, 150)
    this.logger.log(`indexText: "${meta.sourceName}" → ${chunks.length} text chunks produced (text length: ${text.length} chars)`)

    const activeProfile = profileOverride || (await this.profileService.getActiveProfile())
    const validChunks = chunks.filter(c => c.trim().length > 0)
    if (!validChunks.length) return 0

    // Clean prior chunks for this document in the active isolated corpus
    await this.vectorCorpusService.deleteChunksForSource(meta.sourceId, meta.sourceType, activeProfile)

    let totalSaved = 0
    const blockSize = 50

    for (let b = 0; b < validChunks.length; b += blockSize) {
      const blockChunks = validChunks.slice(b, b + blockSize)
      const blockEnrichedTexts = blockChunks.map((chunk, offset) => `[Source: ${meta.sourceName} | Part ${b + offset + 1}/${validChunks.length}]\n${chunk}`)

      // Micro-batch embedding generation (payload safe)
      const blockEmbeddings = await this.profileService.generateEmbeddingsBatch(blockEnrichedTexts, 'passage', activeProfile, 4)

      const blockItems: ChunkInsertItem[] = blockEnrichedTexts.map((enrichedText, idx) => ({
        projectId: meta.projectId,
        sourceId: meta.sourceId,
        sourceType: meta.sourceType,
        sourceName: meta.sourceName,
        text: enrichedText,
        embedding: blockEmbeddings[idx],
      }))

      const saved = await this.vectorCorpusService.saveChunks(blockItems, activeProfile, false)
      totalSaved += saved
    }

    this.logger.log(`indexText: Indexed ${totalSaved}/${validChunks.length} chunks into "${activeProfile.tableName}" for "${meta.sourceName}"`)
    return totalSaved
  }


  async indexBuffer(buffer: Buffer, meta: { projectId?: string; sourceId: string; sourceType: string; sourceName: string }) {
    let text = ''
    const name = (meta.sourceName || '').toLowerCase()
    const isPdf = name.includes('.pdf')
    const isExcel = name.includes('.xlsx') || name.includes('.xls') || name.includes('.csv')
    const isDoc = name.includes('.docx') || name.includes('.doc')

    if (isPdf) {
      try {
        const parser = new PDFParse({ data: buffer })
        const textResult = await parser.getText()
        text = (textResult?.text || '').trim()
        if (!text || text.length < 50) {
          text = `[Document: ${meta.sourceName}]\n(Scanned PDF Document - No embedded OCR text layer)`
        }
      } catch (e: any) {
        this.logger.warn(`PDF parse error for ${meta.sourceName}: ${e.message}`)
        text = `[Document: ${meta.sourceName}]\n(PDF Document - Parsing error)`
      }
    } else if (isExcel) {
      const workbook = xlsx.read(buffer, { type: 'buffer' })
      const sheetTexts: string[] = []
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName]
        const csvData = xlsx.utils.sheet_to_csv(sheet)
        if (csvData && csvData.trim()) {
          sheetTexts.push(`[Sheet: ${sheetName}]\n${csvData.trim()}`)
        }
      }
      text = sheetTexts.join('\n\n')
    } else if (isDoc) {
      const result = await mammoth.extractRawText({ buffer })
      text = result.value || buffer.toString('utf8')
    } else {
      text = buffer.toString('utf8')
    }

    if (!text || !text.trim()) {
      throw new Error('No readable text found in document. If this is a PDF, it might be a scanned image without OCR text.')
    }
    
    return await this.indexText(text, meta)
  }

  async indexUrl(url: string, meta: { projectId?: string; sourceId: string; sourceType: string; sourceName: string }) {
    if (!url) return 0
    this.logger.log(`Downloading ${url} for indexing...`)
    const buffer = await this.storageSvc.download(url)
    return await this.indexBuffer(buffer, meta)
  }

  /**
   * Direct Multi-File Upload to Knowledge Vault
   */
  async uploadKnowledgeFile(
    file: { originalname: string; buffer: Buffer; mimetype: string; size: number },
    category: KnowledgeCategory = KnowledgeCategory.OTHER,
    projectId?: string,
    uploadedBy?: string
  ): Promise<AiKnowledgeDocument> {
    const uploaded = await this.storageSvc.upload(file, 'knowledge-vault')
    
    const doc = this.docRepo.create({
      projectId,
      documentName: file.originalname,
      category,
      fileUrl: uploaded.url,
      fileSizeBytes: file.size,
      mimeType: file.mimetype,
      sourceType: KnowledgeSourceType.DIRECT_UPLOAD,
      status: KnowledgeStatus.PROCESSING,
      uploadedBy: uploadedBy || 'User',
    })
    const savedDoc = await this.docRepo.save(doc)

    try {
      const chunks = await this.indexBuffer(file.buffer, {
        projectId,
        sourceId: `kdoc_${savedDoc.id}`,
        sourceType: 'knowledge_vault',
        sourceName: `Document: ${file.originalname} (${category.toUpperCase()})`
      })

      savedDoc.totalChunks = chunks
      if (chunks === 0) {
        savedDoc.status = KnowledgeStatus.FAILED
        savedDoc.errorMessage = 'Extraction failed: No readable text found in document (0 chunks generated).'
      } else {
        savedDoc.status = KnowledgeStatus.INDEXED
        savedDoc.errorMessage = null
      }
      return await this.docRepo.save(savedDoc)
    } catch (err: any) {
      savedDoc.status = KnowledgeStatus.FAILED
      savedDoc.errorMessage = err.message
      return await this.docRepo.save(savedDoc)
    }
  }

  /**
   * Auto-Fetch & Ingest All Files & Attachments from Liaison Section
   */
  async fetchFromLiaison(projectId?: string): Promise<{ fetched: number; details: string[] }> {
    const details: string[] = []
    let fetched = 0

    let query = `
      SELECT fd.id, fd.document_name, fd.cloudinary_url, fd.file_size_bytes, fd.mime_type, fd.revision,
             lf.file_number, lf.subject, lf.department, lf.project_id
      FROM file_documents fd
      LEFT JOIN liaison_files lf ON lf.id = fd.file_id
      WHERE fd.cloudinary_url IS NOT NULL
    `
    const params: any[] = []
    if (projectId) {
      query += ` AND (lf.project_id = $1 OR lf.project_id IS NULL)`
      params.push(projectId)
    }

    const docs = await this.dataSource.query(query, params)
    for (const d of docs) {
      // Check if already registered in Knowledge Documents
      let existing = await this.docRepo.findOne({ where: { sourceId: `liaison_doc_${d.id}` } })
      if (!existing) {
        existing = this.docRepo.create({
          projectId: d.project_id || projectId,
          documentName: d.document_name || `Liaison Attachment (${d.file_number || 'General'})`,
          category: KnowledgeCategory.LIAISON_APPROVAL,
          fileUrl: d.cloudinary_url,
          fileSizeBytes: d.file_size_bytes || 0,
          mimeType: d.mime_type || 'application/pdf',
          sourceType: KnowledgeSourceType.LIAISON_FETCH,
          sourceId: `liaison_doc_${d.id}`,
          status: KnowledgeStatus.PROCESSING,
          uploadedBy: 'Liaison System Auto-Fetch',
        })
        existing = await this.docRepo.save(existing)
      }

      try {
        const chunks = await this.indexUrl(d.cloudinary_url, {
          projectId: d.project_id || projectId,
          sourceId: `liaison_doc_${d.id}`,
          sourceType: 'liaison_document',
          sourceName: `Liaison Document: ${d.document_name} (File ${d.file_number || 'Ref'} - ${d.department || 'Govt'})`
        })
        existing.totalChunks = chunks
        if (chunks === 0) {
          existing.status = KnowledgeStatus.FAILED
          existing.errorMessage = 'Extraction failed: No readable text found in document (0 chunks generated).'
          details.push(`Fetched & Failed: ${d.document_name} (0 chunks)`)
        } else {
          existing.status = KnowledgeStatus.INDEXED
          existing.errorMessage = null
          fetched++
          details.push(`Fetched & Indexed: ${d.document_name} (${chunks} chunks)`)
        }
        await this.docRepo.save(existing)
      } catch (err: any) {
        existing.status = KnowledgeStatus.FAILED
        existing.errorMessage = err.message
        await this.docRepo.save(existing)
      }
    }

    return { fetched, details }
  }

  async getKnowledgeDocuments(projectId?: string, category?: string, search?: string) {
    const qb = this.docRepo.createQueryBuilder('doc')
    if (projectId) {
      qb.andWhere('(doc.project_id = :projectId OR doc.project_id IS NULL)', { projectId })
    }
    if (category && category !== 'all') {
      qb.andWhere('doc.category = :category', { category })
    }
    if (search && search.trim()) {
      qb.andWhere('doc.document_name ILIKE :search', { search: `%${search.trim()}%` })
    }
    qb.orderBy('doc.created_at', 'DESC')
    return qb.getMany()
  }

  /** Fetch a vault document's bytes for an auth-gated download (never exposes the raw storage URL). */
  async getKnowledgeFile(id: string): Promise<{ buffer: Buffer; mimeType: string; filename: string }> {
    const doc = await this.docRepo.findOne({ where: { id } })
    if (!doc) throw new NotFoundException('Knowledge document not found')
    if (!doc.fileUrl) throw new NotFoundException('Document has no stored file to download')
    const buffer = await this.storageSvc.download(doc.fileUrl)
    return {
      buffer,
      mimeType: doc.mimeType || 'application/octet-stream',
      filename: doc.documentName || `document-${id}`,
    }
  }

  async reindexKnowledgeDocument(id: string): Promise<AiKnowledgeDocument> {
    const doc = await this.docRepo.findOne({ where: { id } })
    if (!doc) throw new NotFoundException('Knowledge document not found')
    if (!doc.fileUrl) throw new NotFoundException('Document has no file URL to download')

    doc.status = KnowledgeStatus.PROCESSING
    await this.docRepo.save(doc)

    try {
      const chunks = await this.indexUrl(doc.fileUrl, {
        projectId: doc.projectId,
        sourceId: doc.sourceId || `kdoc_${doc.id}`,
        sourceType: doc.sourceType === KnowledgeSourceType.LIAISON_FETCH ? 'liaison_document' : 'knowledge_vault',
        sourceName: `Document: ${doc.documentName} (${doc.category.toUpperCase()})`
      })
      doc.totalChunks = chunks
      doc.status = KnowledgeStatus.INDEXED
      doc.errorMessage = null
      return await this.docRepo.save(doc)
    } catch (err: any) {
      doc.status = KnowledgeStatus.FAILED
      doc.errorMessage = err.message
      return await this.docRepo.save(doc)
    }
  }

  /**
   * Re-index ALL knowledge documents that have 0 chunks (failed embedding).
   * This is used after fixing an API key or embedding model issue.
   */
  async reindexAllFailed(): Promise<{ total: number; success: number; failed: number; details: string[] }> {
    const allDocs = await this.docRepo.find()
    const toReindex = allDocs.filter(d => (d.totalChunks || 0) === 0 && d.fileUrl)
    this.logger.log(`reindexAllFailed: Found ${toReindex.length} documents with 0 chunks out of ${allDocs.length} total`)

    let success = 0
    let failed = 0
    const details: string[] = []

    for (const doc of toReindex) {
      try {
        doc.status = KnowledgeStatus.PROCESSING
        await this.docRepo.save(doc)

        const chunks = await this.indexUrl(doc.fileUrl, {
          projectId: doc.projectId,
          sourceId: doc.sourceId || `kdoc_${doc.id}`,
          sourceType: doc.sourceType === KnowledgeSourceType.LIAISON_FETCH ? 'liaison_document' : 'knowledge_vault',
          sourceName: `Document: ${doc.documentName} (${doc.category.toUpperCase()})`
        })
        doc.totalChunks = chunks
        if (chunks === 0) {
          doc.status = KnowledgeStatus.FAILED
          doc.errorMessage = 'Extraction failed: No readable text found in document (0 chunks generated).'
          failed++
          details.push(`❌ ${doc.documentName}: Extraction failed (0 chunks)`)
          this.logger.error(`reindexAllFailed: ❌ "${doc.documentName}" → Extraction failed`)
        } else {
          doc.status = KnowledgeStatus.INDEXED
          doc.errorMessage = null
          success++
          details.push(`✅ ${doc.documentName}: ${chunks} chunks`)
          this.logger.log(`reindexAllFailed: ✅ "${doc.documentName}" → ${chunks} chunks`)
        }
        await this.docRepo.save(doc)
      } catch (err: any) {
        doc.status = KnowledgeStatus.FAILED
        doc.errorMessage = err.message
        await this.docRepo.save(doc)
        failed++
        details.push(`❌ ${doc.documentName}: ${err.message}`)
        this.logger.error(`reindexAllFailed: ❌ "${doc.documentName}" → ${err.message}`)
      }
    }

    return { total: toReindex.length, success, failed, details }
  }

  async deleteKnowledgeDocument(id: string): Promise<{ success: boolean }> {
    const doc = await this.docRepo.findOne({ where: { id } })
    if (!doc) throw new NotFoundException('Knowledge document not found')

    const sourceId = doc.sourceId || `kdoc_${doc.id}`
    await this.vectorCorpusService.deleteChunksForSource(sourceId)
    await this.docRepo.delete({ id })
    return { success: true }
  }

  /**
   * Comprehensive System Sync:
   * Crawls projects, settings, vendors & subcontractors, WBS tasks, material registers,
   * site orders, QA inspections & NCRs, employees, users, letters, meetings, liaison files,
   * uploaded PDFs, and site diaries to build a complete project memory in the vector database.
   */
  async syncAllKnowledge(projectId?: string): Promise<{ indexedSources: number; details: string[] }> {
    const details: string[] = []
    let totalSources = 0

    try {
      // 1. Index Projects Overview & Contract Details
      const projects = await this.dataSource.query(`SELECT * FROM projects`)
      for (const p of projects) {
        const pText = `Project Name: ${p.name} (${p.code})\nDescription: ${p.description || 'N/A'}\nClient / Employer: ${p.client}\nLocation: ${p.location}\nContract Value: ₹${p.contract_value}\nStart Date / Commencement: ${p.start_date}\nEnd Date / Target Completion: ${p.end_date}\nStatus: ${p.status}`
        await this.indexText(pText, {
          projectId: p.id,
          sourceId: `project_${p.id}`,
          sourceType: 'project',
          sourceName: `Project Overview: ${p.name}`
        })
        totalSources++
      }
      if (projects.length > 0) details.push(`Indexed ${projects.length} Project Overviews`)

      // 2. Index Project Settings & Contract Parameters
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
        details.push(`Indexed ${settings.length} Project Settings & Dates`)
      }

      // 3. Index Vendors, Subcontractors, Specialist Agencies, and Material Suppliers
      const vendors = await this.dataSource.query(`SELECT * FROM vendors`)
      for (const v of vendors) {
        const catLabel = v.category ? v.category.replace('_', ' ').toUpperCase() : 'VENDOR'
        const vText = RagSanitizer.serializeVendor(v)
        await this.indexText(vText, {
          projectId: v.project_id || projectId,
          sourceId: `vendor_${v.id}`,
          sourceType: 'vendor',
          sourceName: `Vendor / Subcontractor: ${v.name} (${catLabel})`
        })
        totalSources++
      }
      if (vendors.length > 0) details.push(`Indexed ${vendors.length} Vendors & Subcontractors (e.g. Keller Ground Engineering, Wani Infra)`)

      // 4. Index WBS Tasks, Milestones & Engineering Deliverables
      const wbsTasks = await this.dataSource.query(`SELECT * FROM wbs_tasks`)
      for (const t of wbsTasks) {
        const tText = `WBS Task Code: ${t.wbs_code || 'N/A'}\nTask Title: ${t.title}\nCategory / Scope: ${t.category || 'EPC Execution'}\nPlanned Start: ${t.start_date || 'N/A'}, Planned End: ${t.end_date || 'N/A'}\nProgress: ${t.progress || 0}%, Status: ${t.status || 'Pending'}\nDelay Days: ${t.delay_days || 0}\nDelay Reason: ${t.delay_reason || 'None'}\nRemarks & Vendor Notes: ${t.remarks || 'None'}`
        await this.indexText(tText, {
          projectId: t.project_id || projectId,
          sourceId: `wbs_${t.id}`,
          sourceType: 'wbs_task',
          sourceName: `WBS Task: ${t.wbs_code} - ${t.title}`
        })
        totalSources++
      }
      if (wbsTasks.length > 0) details.push(`Indexed ${wbsTasks.length} WBS Schedule Tasks & Milestones`)

      // 5. Index Material Consumption Register (Cement, Steel, etc.)
      const materials = await this.dataSource.query(`SELECT * FROM material_register ORDER BY date DESC LIMIT 500`)
      for (const m of materials) {
        const mText = `Material Register Entry Date: ${m.date}\nMaterial: ${m.material} (${m.unit || 'Units'})\nReceived Quantity: ${m.received_qty || 0}\nConsumed Quantity: ${m.consumed_qty || 0}\nContractor Representative: ${m.contractor_rep || 'N/A'}\nUEED Representative: ${m.ueed_rep || 'N/A'}\nRemarks: ${m.remarks || 'None'}`
        await this.indexText(mText, {
          projectId: m.project_id || projectId,
          sourceId: `mat_${m.id}`,
          sourceType: 'material_register',
          sourceName: `Material Register: ${m.material} (${m.date})`
        })
        totalSources++
      }
      if (materials.length > 0) details.push(`Indexed ${materials.length} Material Consumption Entries`)

      // 6. Index Works Site Orders Book (Engineer Site Instructions)
      const siteOrders = await this.dataSource.query(`SELECT * FROM site_orders ORDER BY date DESC LIMIT 500`)
      for (const so of siteOrders) {
        const soText = `Site Order No: ${so.order_no || 'N/A'}\nDate: ${so.date}\nIssued By (EIC / UEED / XEN): ${so.issued_by}\nSite Instruction / Order: ${so.instruction}\nAcknowledged By: ${so.acknowledged_by || 'Pending'} (${so.acknowledged_date || 'N/A'})\nCompliance Status: ${so.compliance_status || 'Pending'}\nRemarks: ${so.remarks || 'None'}`
        await this.indexText(soText, {
          projectId: so.project_id || projectId,
          sourceId: `site_order_${so.id}`,
          sourceType: 'site_order',
          sourceName: `Site Order ${so.order_no || so.id} (${so.issued_by})`
        })
        totalSources++
      }
      if (siteOrders.length > 0) details.push(`Indexed ${siteOrders.length} Site Orders & Instructions`)

      // 7. Index QA Inspections & Non-Conformance Reports (NCR)
      const qaInspections = await this.dataSource.query(`SELECT * FROM qa_inspections ORDER BY date DESC LIMIT 500`)
      for (const qa of qaInspections) {
        const qaText = `QA Inspection Date: ${qa.date}\nWork Item: ${qa.work_item}\nLocation: ${qa.location || 'N/A'}, Chainage: ${qa.chainage || 'N/A'}\nInspected By: ${qa.inspected_by}\nContractor Rep: ${qa.contractor_rep || 'N/A'}, Engineer Rep: ${qa.engineer_rep || 'N/A'}\nOverall Result: ${qa.overall_result}\nPass Count: ${qa.pass_count || 0}, Fail Count: ${qa.fail_count || 0}, NA: ${qa.na_count || 0}\nNCR Raised: ${qa.ncr_raised ? 'YES' : 'NO'}\nRemarks: ${qa.remarks || 'None'}`
        await this.indexText(qaText, {
          projectId: qa.project_id || projectId,
          sourceId: `qa_${qa.id}`,
          sourceType: 'qa_inspection',
          sourceName: `QA Inspection: ${qa.work_item} (${qa.overall_result})`
        })
        totalSources++
      }
      if (qaInspections.length > 0) details.push(`Indexed ${qaInspections.length} QA Inspections`)

      // 8. Index Employees & Site Staff (Sanitized)
      const employees = await this.dataSource.query(`SELECT * FROM employees`)
      for (const e of employees) {
        const empName = `${e.first_name || ''} ${e.last_name || ''}`.trim() || e.name || 'Unnamed Employee'
        const empText = RagSanitizer.serializeEmployee(e)
        await this.indexText(empText, {
          projectId: e.project_id || projectId,
          sourceId: `emp_${e.id}`,
          sourceType: 'employee',
          sourceName: `Employee: ${empName} (${e.designation || 'Staff'})`
        })
        totalSources++
      }
      if (employees.length > 0) details.push(`Indexed ${employees.length} Employees & Site Staff`)

      // 9. Index Users & System Management Roles (Sanitized)
      const users = await this.dataSource.query(`SELECT id, name, email, role, designation FROM users`)
      for (const u of users) {
        const uText = RagSanitizer.serializeUser(u)
        await this.indexText(uText, {
          projectId,
          sourceId: `user_${u.id}`,
          sourceType: 'user',
          sourceName: `User & Role: ${u.name}`
        })
        totalSources++
      }
      if (users.length > 0) details.push(`Indexed ${users.length} Users & Roles`)

      // 10. Index Letters & Formal Communication
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
          sourceId: `letter_${l.id}`,
          sourceType: 'letter',
          sourceName: `Letter ${l.letter_number || l.subject || l.id}`
        })
        totalSources++
      }
      if (letters.length > 0) details.push(`Indexed ${letters.length} Official Letters`)

      // 11. Index Meetings & Minutes of Meeting (MOM)
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
          sourceId: `meeting_${m.id}`,
          sourceType: 'meeting',
          sourceName: `MOM: ${m.title} (${m.date})`
        })
        totalSources++
      }
      if (meetings.length > 0) details.push(`Indexed ${meetings.length} Meeting Records & Action Items`)

      // 12. Index Liaison Files & Approvals
      let liaisonQuery = `SELECT * FROM liaison_files`
      const liaisonParams: any[] = []
      if (projectId) {
        liaisonQuery += ` WHERE project_id = $1`
        liaisonParams.push(projectId)
      }
      const liaisonFiles = await this.dataSource.query(liaisonQuery, liaisonParams)
      for (const lf of liaisonFiles) {
        const lfText = `Liaison File Ref: ${lf.file_number || 'N/A'}\nDepartment: ${lf.department}\nSubject: ${lf.subject}\nStatus: ${lf.current_status}\nExpected Approval Date: ${lf.expected_date || 'N/A'}\nActual Date: ${lf.actual_date || 'N/A'}\nDelay Days: ${lf.delay_days || 0}\nEOT Relevant Ground: ${lf.is_eot_ground ? 'Yes' : 'No'} (${lf.eot_reason || 'N/A'})\nRemarks: ${lf.remarks || ''}`
        await this.indexText(lfText, {
          projectId: lf.project_id || projectId,
          sourceId: `liaison_${lf.id}`,
          sourceType: 'liaison_file',
          sourceName: `Liaison File: ${lf.file_number || lf.subject}`
        })
        totalSources++
      }
      if (liaisonFiles.length > 0) details.push(`Indexed ${liaisonFiles.length} Liaison Government Clearance Files`)

      // 13. Index Direct Knowledge Vault Documents & PDF Attachments
      const vaultDocs = await this.docRepo.find({ where: { status: KnowledgeStatus.INDEXED } })
      for (const vd of vaultDocs) {
        if (vd.fileUrl) {
          try {
            const chunks = await this.indexUrl(vd.fileUrl, {
              projectId: vd.projectId,
              sourceId: vd.sourceId || `kdoc_${vd.id}`,
              sourceType: vd.sourceType === KnowledgeSourceType.LIAISON_FETCH ? 'liaison_document' : 'knowledge_vault',
              sourceName: `Vault Document: ${vd.documentName} (${vd.category.toUpperCase()})`
            })
            
            if (chunks === 0) {
              this.logger.warn(`syncAllKnowledge: Vault Document "${vd.documentName}" generated 0 chunks.`);
              vd.status = KnowledgeStatus.FAILED;
              vd.errorMessage = 'Extraction failed during sync: 0 chunks generated.';
              await this.docRepo.save(vd);
            } else {
              totalSources++
            }
          } catch (err: any) {
            this.logger.error(`syncAllKnowledge: Failed to index Vault Document "${vd.documentName}": ${err.message}`);
            vd.status = KnowledgeStatus.FAILED;
            vd.errorMessage = err.message;
            await this.docRepo.save(vd);
          }
        }
      }
      if (vaultDocs.length > 0) details.push(`Processed ${vaultDocs.length} Knowledge Vault Documents`)

      // 14. Index Recent Site Diaries
      const diaries = await this.dataSource.query(`SELECT * FROM site_diaries ORDER BY date DESC LIMIT 365`)
      for (const d of diaries) {
        const diaryText = `Site Diary Date: ${d.date} (submitted by ${d.submitted_by || 'N/A'}, status ${d.status || 'draft'})
Weather: AM ${d.weather_morning || 'Fair'}, PM ${d.weather_afternoon || 'Fair'}; Rainfall ${d.rainfall_mm || 0}mm${d.work_stopped_weather ? `; work stopped for weather (${d.hours_lost || 0}h lost)` : ''}
Labour: skilled ${d.labour_skilled || 0}, unskilled ${d.labour_unskilled || 0}, supervisory ${d.labour_supervisory || 0}, total ${d.labour_total || 0}
Plant / Equipment deployed: ${this.flat(d.equipment)}
Work done today: ${this.flat(d.work_done)}
Materials received: ${this.flat(d.materials_received)}
Visitors: ${this.flat(d.visitors)}
Issues / Hindrances: ${d.issues_faced || 'None'}
Instructions given: ${d.instructions_given || 'None'}
Next day plan: ${d.next_day_plan || 'N/A'}
EOT claim: ${d.eot_claim ? 'Yes' : 'No'}${d.eot_reason ? ' — ' + d.eot_reason : ''}`
        await this.indexText(diaryText, {
          projectId: d.project_id || projectId,
          sourceId: `diary_${d.id}`,
          sourceType: 'site_diary',
          sourceName: `Site Diary: ${d.date}`
        })
        totalSources++
      }
      if (diaries.length > 0) details.push(`Indexed ${diaries.length} Site Diaries (labour, plant, materials, visitors)`)

      // 15. Index Timesheets (staff daily work logs)
      const timesheets = await this.dataSource.query(`
        SELECT t.*, e.first_name, e.last_name, e.name AS emp_name, e.designation
        FROM timesheets t LEFT JOIN employees e ON e.id = t.employee_id
        ORDER BY t.date DESC LIMIT 500`)
      for (const t of timesheets) {
        const who = `${t.first_name || ''} ${t.last_name || ''}`.trim() || t.emp_name || 'Staff'
        const tsText = `Timesheet — ${who} (${t.designation || 'Staff'}) on ${t.date}
Attendance: ${t.attendance_status || 'present'}; Status: ${t.status || 'draft'}
Work done: ${t.work_done_summary || 'N/A'}
Task entries: ${this.flat(t.entries)}
Issues: ${t.issues_faced || 'None'}
Next day plan: ${t.next_day_plan || 'N/A'}`
        await this.indexText(tsText, {
          projectId: t.project_id || projectId,
          sourceId: `timesheet_${t.id}`,
          sourceType: 'timesheet',
          sourceName: `Timesheet: ${who} (${t.date})`
        })
        totalSources++
      }
      if (timesheets.length > 0) details.push(`Indexed ${timesheets.length} Timesheets`)

      // 16. Index Attendance — aggregated per day (who was present/absent)
      const attRows = await this.dataSource.query(`
        SELECT a.date, a.status, a.hours_worked, e.first_name, e.last_name, e.name AS emp_name
        FROM attendance a LEFT JOIN employees e ON e.id = a.employee_id
        ORDER BY a.date DESC LIMIT 5000`)
      const byDate = new Map<string, string[]>()
      for (const a of attRows) {
        const day = String(a.date).split('T')[0]
        const who = `${a.first_name || ''} ${a.last_name || ''}`.trim() || a.emp_name || 'Unknown'
        if (!byDate.has(day)) byDate.set(day, [])
        if (byDate.get(day)!.length < 400) byDate.get(day)!.push(`${who}: ${a.status || 'present'}${a.hours_worked ? ` (${a.hours_worked}h)` : ''}`)
      }
      let attDays = 0
      for (const [day, lines] of byDate) {
        if (attDays >= 365) break
        await this.indexText(`Attendance for ${day} (${lines.length} staff recorded):\n${lines.join('\n')}`, {
          projectId,
          sourceId: `attendance_${day}`,
          sourceType: 'attendance',
          sourceName: `Attendance: ${day}`
        })
        totalSources++; attDays++
      }
      if (attDays > 0) details.push(`Indexed attendance for ${attDays} days`)

      // 17. Index Fleet Logs & Equipment Operations
      const fleetLogs = await this.dataSource.query(`SELECT * FROM fleet_logs ORDER BY date DESC LIMIT 500`)
      for (const fl of fleetLogs) {
        const flText = `Fleet / Equipment Log Date: ${fl.date}\nType: ${fl.log_type}\nVehicle / Machine: ${fl.vehicle || fl.machine_id || 'N/A'} (${fl.machine_type || ''})\nDriver / Operator: ${fl.driver || fl.operator || 'N/A'}\nDistance / Hours: ${fl.distance_km ? fl.distance_km + ' km' : fl.hours_worked ? fl.hours_worked + ' hours' : 'N/A'}\nWork Zone / Description: ${fl.work_zone || ''} ${fl.work_description || ''}\nBreakdown: ${fl.breakdown ? 'YES - ' + (fl.breakdown_details || '') : 'None'}\nFuel: ${fl.fuel_litres || 0} L\nRemarks: ${fl.remarks || ''}`
        await this.indexText(flText, {
          projectId: fl.project_id || projectId,
          sourceId: `fleet_${fl.id}`,
          sourceType: 'fleet_log',
          sourceName: `Fleet Log: ${fl.vehicle || fl.machine_id || 'Equipment'} (${fl.date})`,
        })
        totalSources++
      }
      if (fleetLogs.length > 0) details.push(`Indexed ${fleetLogs.length} Fleet & Machinery Logs`)

      // 18. Index STP O&M Process Quality Logs
      const omLogs = await this.dataSource.query(`SELECT * FROM om_logs ORDER BY date DESC LIMIT 365`)
      for (const ol of omLogs) {
        const olText = `STP O&M Process Log Date: ${ol.date}\nInflow: ${ol.inflow_mld || 0} MLD, Outflow: ${ol.outflow_mld || 0} MLD\nInfluent: BOD ${ol.in_bod || 'N/A'}, COD ${ol.in_cod || 'N/A'}, TSS ${ol.in_tss || 'N/A'}\nEffluent: BOD ${ol.out_bod || 'N/A'}, COD ${ol.out_cod || 'N/A'}, TSS ${ol.out_tss || 'N/A'}, pH ${ol.out_ph || 'N/A'}, DO ${ol.out_do || 'N/A'}\nSBR MLSS: ${ol.mlss || 'N/A'} mg/L, SVI: ${ol.svi || 'N/A'}\nPower: ${ol.power_kwh || 0} kWh, DG: ${ol.dg_hours || 0} h, Sludge: ${ol.sludge_m3 || 0} m3\nOperator: ${ol.operator || 'N/A'}\nRemarks: ${ol.remarks || ''}`
        await this.indexText(olText, {
          projectId: ol.project_id || projectId,
          sourceId: `om_log_${ol.id}`,
          sourceType: 'om_log',
          sourceName: `STP O&M Process Log: ${ol.date}`,
        })
        totalSources++
      }
      if (omLogs.length > 0) details.push(`Indexed ${omLogs.length} STP O&M Process Quality Logs`)

      // 19. Index STP Equipment Breakdown Events & PM Tasks
      const omEvents = await this.dataSource.query(`SELECT * FROM om_events ORDER BY start_at DESC LIMIT 200`)
      for (const oe of omEvents) {
        const oeText = `STP Event Equipment: ${oe.equipment}\nEvent Type: ${oe.type}\nStatus: ${oe.status}\nStart: ${oe.start_at}, End: ${oe.end_at || 'Ongoing'}\nCause: ${oe.cause || 'N/A'}\nAction Taken: ${oe.action || 'N/A'}\nAttended By: ${oe.attended_by || 'N/A'}\nRemarks: ${oe.remarks || ''}`
        await this.indexText(oeText, {
          projectId: oe.project_id || projectId,
          sourceId: `om_event_${oe.id}`,
          sourceType: 'om_event',
          sourceName: `STP Event: ${oe.equipment} (${oe.type})`,
        })
        totalSources++
      }
      const omPmTasks = await this.dataSource.query(`SELECT * FROM om_pm_tasks WHERE active = true`)
      for (const op of omPmTasks) {
        const opText = `STP Preventive Maintenance Task\nEquipment: ${op.equipment}\nTask: ${op.task}\nFrequency: Every ${op.frequency_days} days\nLast Done: ${op.last_done || 'Never'}\nResponsible: ${op.responsible || 'N/A'}\nRemarks: ${op.remarks || ''}`
        await this.indexText(opText, {
          projectId: op.project_id || projectId,
          sourceId: `om_pm_${op.id}`,
          sourceType: 'om_pm_task',
          sourceName: `STP PM Task: ${op.equipment}`,
        })
        totalSources++
      }
      if (omEvents.length > 0 || omPmTasks.length > 0) details.push(`Indexed ${omEvents.length} STP Breakdown Events & ${omPmTasks.length} PM Tasks`)

      // 20. Index BOQ Line Items (Technical Specifications & Quantities Only)
      const boqItems = await this.dataSource.query(`SELECT * FROM boq_items LIMIT 500`)
      for (const b of boqItems) {
        // NOTE: Commercial quoted rate/cost is intentionally EXCLUDED from all-staff vector index for data governance
        const bText = `BOQ Line Item Number: ${b.item_number || 'N/A'}\nCategory / Structure: ${b.category || 'General'}\nDescription & Technical Specification: ${b.description || 'N/A'}\nUnit of Measurement: ${b.unit || 'Units'}\nEstimated Quantity: ${b.quantity || 0}`
        await this.indexText(bText, {
          projectId: b.project_id || projectId,
          sourceId: `boq_${b.id}`,
          sourceType: 'boq_item',
          sourceName: `BOQ Item: ${b.item_number || b.id}`,
        })
        totalSources++
      }
      if (boqItems.length > 0) details.push(`Indexed ${boqItems.length} BOQ Line Items (Technical Scope & Specs)`)

      // 21. Index Project Work Order Tasks
      const tasks = await this.dataSource.query(`SELECT * FROM tasks ORDER BY created_at DESC LIMIT 500`)
      for (const tk of tasks) {
        const tkText = `Task Title: ${tk.title}\nDescription: ${tk.description || 'N/A'}\nPriority: ${tk.priority}, Status: ${tk.status}\nAssigned To: ${tk.assigned_name || 'Unassigned'}\nDue Date: ${tk.due_date || 'N/A'}\nWBS Reference: ${tk.wbs_code || ''} ${tk.wbs_title || ''}\nProgress: ${tk.progress_pct || 0}%`
        await this.indexText(tkText, {
          projectId: tk.project_id || projectId,
          sourceId: `task_${tk.id}`,
          sourceType: 'task',
          sourceName: `Work Order Task: ${tk.title}`,
        })
        totalSources++
      }
      if (tasks.length > 0) details.push(`Indexed ${tasks.length} Work Order Tasks`)

      // 22. Index QA Non-Conformance Reports (NCRs)
      const ncrs = await this.dataSource.query(`SELECT * FROM ncrs ORDER BY date DESC LIMIT 200`)
      for (const n of ncrs) {
        const nText = `Non-Conformance Report (NCR) Number: ${n.ncr_no}\nDate: ${n.date}\nWork Item: ${n.work_item}\nLocation: ${n.location || 'N/A'}\nSeverity: ${n.severity}, Status: ${n.status}\nRaised By: ${n.raised_by}\nDefect Description: ${n.description}\nRoot Cause: ${n.root_cause || 'Under investigation'}\nCorrective Action Required: ${n.corrective_action || 'Pending'}\nTarget Date: ${n.target_date || 'N/A'}, Closed Date: ${n.closed_date || 'Open'}`
        await this.indexText(nText, {
          projectId: n.project_id || projectId,
          sourceId: `ncr_${n.id}`,
          sourceType: 'ncr',
          sourceName: `NCR: ${n.ncr_no}`,
        })
        totalSources++
      }
      if (ncrs.length > 0) details.push(`Indexed ${ncrs.length} Quality NCRs`)

    } catch (err) {
      this.logger.error('Failed full knowledge sync:', err)
    }

    return { indexedSources: totalSources, details }
  }

  // ── Incremental auto-index: re-index a single record when it is saved ───────
  // Modules emit 'kb.entity.changed' after create/update; this keeps the AI
  // knowledge base fresh without a manual full sync. Fire-and-forget: failures
  // are logged, never surfaced to the user's save request.
  @OnEvent('kb.entity.changed', { async: true })
  async onEntityChanged(p: { type: string; id: string; projectId?: string }) {
    try { await this.indexOne(p.type, p.id, p.projectId) }
    catch (e: any) { this.logger.warn(`Auto-index failed for ${p?.type} ${p?.id}: ${e?.message}`) }
  }

  @OnEvent('kb.entity.deleted', { async: true })
  async onEntityDeleted(p: { type: string; id: string }) {
    try {
      const sid = this.sourceIdFor(p.type, p.id)
      if (sid) await this.vectorCorpusService.deleteChunksForSource(sid)
    } catch (e: any) { this.logger.warn(`Auto-deindex failed for ${p?.type} ${p?.id}: ${e?.message}`) }
  }

  private sourceIdFor(type: string, id: string): string | null {
    const prefix: Record<string, string> = {
      site_diary: 'diary', timesheet: 'timesheet', letter: 'letter', meeting: 'meeting',
      liaison_file: 'liaison', material_register: 'mat', site_order: 'site_order',
      qa_inspection: 'qa', employee: 'emp', vendor: 'vendor', wbs_task: 'wbs',
      fleet_log: 'fleet', om_log: 'om_log', om_event: 'om_event', om_pm_task: 'om_pm',
      boq_item: 'boq', task: 'task', ncr: 'ncr',
    }
    return prefix[type] ? `${prefix[type]}_${id}` : null
  }

  /** Index (or re-index) a single record by type + id. Returns chunks written. */
  async indexOne(type: string, id: string, projectIdHint?: string): Promise<number> {
    if (!id) return 0
    if (type === 'attendance') return this.indexAttendanceForRow(id, projectIdHint)

    const one = async (sql: string) => (await this.dataSource.query(sql, [id]))[0]
    let text = '', sourceName = '', projectId = projectIdHint

    switch (type) {
      case 'site_diary': {
        const d = await one(`SELECT * FROM site_diaries WHERE id = $1`); if (!d) return 0
        projectId = d.project_id || projectIdHint; sourceName = `Site Diary: ${d.date}`
        text = `Site Diary Date: ${d.date} (submitted by ${d.submitted_by || 'N/A'}, status ${d.status || 'draft'})
Weather: AM ${d.weather_morning || 'Fair'}, PM ${d.weather_afternoon || 'Fair'}; Rainfall ${d.rainfall_mm || 0}mm${d.work_stopped_weather ? `; work stopped for weather (${d.hours_lost || 0}h lost)` : ''}
Labour: skilled ${d.labour_skilled || 0}, unskilled ${d.labour_unskilled || 0}, supervisory ${d.labour_supervisory || 0}, total ${d.labour_total || 0}
Plant / Equipment deployed: ${this.flat(d.equipment)}
Work done today: ${this.flat(d.work_done)}
Materials received: ${this.flat(d.materials_received)}
Visitors: ${this.flat(d.visitors)}
Issues / Hindrances: ${d.issues_faced || 'None'}
Instructions given: ${d.instructions_given || 'None'}
Next day plan: ${d.next_day_plan || 'N/A'}
EOT claim: ${d.eot_claim ? 'Yes' : 'No'}${d.eot_reason ? ' — ' + d.eot_reason : ''}`
        break
      }
      case 'timesheet': {
        const t = await one(`SELECT t.*, e.first_name, e.last_name, e.name AS emp_name, e.designation FROM timesheets t LEFT JOIN employees e ON e.id = t.employee_id WHERE t.id = $1`); if (!t) return 0
        const who = `${t.first_name || ''} ${t.last_name || ''}`.trim() || t.emp_name || 'Staff'
        projectId = t.project_id || projectIdHint; sourceName = `Timesheet: ${who} (${t.date})`
        text = `Timesheet — ${who} (${t.designation || 'Staff'}) on ${t.date}\nAttendance: ${t.attendance_status || 'present'}; Status: ${t.status || 'draft'}\nWork done: ${t.work_done_summary || 'N/A'}\nTask entries: ${this.flat(t.entries)}\nIssues: ${t.issues_faced || 'None'}\nNext day plan: ${t.next_day_plan || 'N/A'}`
        break
      }
      case 'letter': {
        const l = await one(`SELECT * FROM letters WHERE id = $1`); if (!l) return 0
        projectId = l.project_id || projectIdHint; sourceName = `Letter ${l.letter_number || l.subject || l.id}`
        text = `Letter Number: ${l.letter_number || 'N/A'}\nType: ${l.letter_type}\nDate: ${l.date}\nTo Organization: ${l.to_organization || 'N/A'} (Attn: ${l.to_name || 'N/A'})\nSubject: ${l.subject || 'N/A'}\nStatus: ${l.status}\n\nContent:\n${l.body || 'N/A'}`
        break
      }
      case 'meeting': {
        const m = await one(`SELECT * FROM meetings WHERE id = $1`); if (!m) return 0
        const items = Array.isArray(m.action_items) ? m.action_items.map((a: any, i: number) => `  ${i + 1}. [${a.status || 'Pending'}] ${a.action} (Responsible: ${a.responsible || 'N/A'}, Due: ${a.dueDate || 'N/A'})`).join('\n') : ''
        const att = Array.isArray(m.attendees) ? m.attendees.map((a: any) => `${a.name || a.designation} (${a.organisation || ''})`).join(', ') : ''
        projectId = m.project_id || projectIdHint; sourceName = `MOM: ${m.title} (${m.date})`
        text = `Meeting Title: ${m.title}\nMeeting No: ${m.meeting_no || 'N/A'} (${m.type})\nDate: ${m.date}, Venue: ${m.venue || 'Site Office'}\nChaired By: ${m.chaired_by || 'N/A'}, Minuted By: ${m.minuted_by || 'N/A'}\nAttendees: ${att}\n\nAction Items:\n${items || 'None recorded'}\n\nNext Meeting: ${m.next_meeting_date || 'N/A'}\nRemarks: ${m.remarks || ''}`
        break
      }
      case 'liaison_file': {
        const lf = await one(`SELECT * FROM liaison_files WHERE id = $1`); if (!lf) return 0
        projectId = lf.project_id || projectIdHint; sourceName = `Liaison File: ${lf.file_number || lf.subject}`
        text = `Liaison File Ref: ${lf.file_number || 'N/A'}\nDepartment: ${lf.department}\nSubject: ${lf.subject}\nStatus: ${lf.current_status}\nExpected Approval Date: ${lf.expected_date || 'N/A'}\nActual Date: ${lf.actual_date || 'N/A'}\nDelay Days: ${lf.delay_days || 0}\nEOT Relevant Ground: ${lf.is_eot_ground ? 'Yes' : 'No'} (${lf.eot_reason || 'N/A'})\nRemarks: ${lf.remarks || ''}`
        break
      }
      case 'material_register': {
        const m = await one(`SELECT * FROM material_register WHERE id = $1`); if (!m) return 0
        projectId = m.project_id || projectIdHint; sourceName = `Material Register: ${m.material} (${m.date})`
        text = `Material Register Entry Date: ${m.date}\nMaterial: ${m.material} (${m.unit || 'Units'})\nReceived Quantity: ${m.received_qty || 0}\nConsumed Quantity: ${m.consumed_qty || 0}\nContractor Representative: ${m.contractor_rep || 'N/A'}\nUEED Representative: ${m.ueed_rep || 'N/A'}\nRemarks: ${m.remarks || 'None'}`
        break
      }
      case 'site_order': {
        const so = await one(`SELECT * FROM site_orders WHERE id = $1`); if (!so) return 0
        projectId = so.project_id || projectIdHint; sourceName = `Site Order ${so.order_no || so.id} (${so.issued_by})`
        text = `Site Order No: ${so.order_no || 'N/A'}\nDate: ${so.date}\nIssued By (EIC / UEED / XEN): ${so.issued_by}\nSite Instruction / Order: ${so.instruction}\nAcknowledged By: ${so.acknowledged_by || 'Pending'} (${so.acknowledged_date || 'N/A'})\nCompliance Status: ${so.compliance_status || 'Pending'}\nRemarks: ${so.remarks || 'None'}`
        break
      }
      case 'qa_inspection': {
        const qa = await one(`SELECT * FROM qa_inspections WHERE id = $1`); if (!qa) return 0
        projectId = qa.project_id || projectIdHint; sourceName = `QA Inspection: ${qa.work_item} (${qa.overall_result})`
        text = `QA Inspection Date: ${qa.date}\nWork Item: ${qa.work_item}\nLocation: ${qa.location || 'N/A'}, Chainage: ${qa.chainage || 'N/A'}\nInspected By: ${qa.inspected_by}\nOverall Result: ${qa.overall_result}\nPass: ${qa.pass_count || 0}, Fail: ${qa.fail_count || 0}\nNCR Raised: ${qa.ncr_raised ? 'YES' : 'NO'}\nRemarks: ${qa.remarks || 'None'}`
        break
      }
      case 'employee': {
        const e = await one(`SELECT * FROM employees WHERE id = $1`); if (!e) return 0
        const nm = `${e.first_name || ''} ${e.last_name || ''}`.trim() || e.name || 'Unnamed Employee'
        projectId = e.project_id || projectIdHint; sourceName = `Employee: ${nm} (${e.designation || 'Staff'})`
        text = RagSanitizer.serializeEmployee(e)
        break
      }
      case 'vendor': {
        const v = await one(`SELECT * FROM vendors WHERE id = $1`); if (!v) return 0
        const cat = v.category ? v.category.replace('_', ' ').toUpperCase() : 'VENDOR'
        projectId = v.project_id || projectIdHint; sourceName = `Vendor / Subcontractor: ${v.name} (${cat})`
        text = RagSanitizer.serializeVendor(v)
        break
      }
      case 'wbs_task': {
        const t = await one(`SELECT * FROM wbs_tasks WHERE id = $1`); if (!t) return 0
        projectId = t.project_id || projectIdHint; sourceName = `WBS Task: ${t.wbs_code} - ${t.title}`
        text = `WBS Task Code: ${t.wbs_code || 'N/A'}\nTask Title: ${t.title}\nDescription: ${t.description || 'N/A'}\nPlanned Start: ${t.start_date || 'N/A'}, End: ${t.end_date || 'N/A'}\nProgress: ${t.progress || 0}%, Status: ${t.status || 'Pending'}\nDelay Days: ${t.delay_days || 0}\nRemarks: ${t.remarks || 'None'}`
        break
      }
      case 'fleet_log': {
        const fl = await one(`SELECT * FROM fleet_logs WHERE id = $1`); if (!fl) return 0
        projectId = fl.project_id || projectIdHint
        sourceName = `Fleet Log: ${fl.vehicle || fl.machine_id || 'Equipment'} (${fl.date})`
        text = `Fleet / Equipment Log Date: ${fl.date}\nType: ${fl.log_type}\nVehicle / Machine: ${fl.vehicle || fl.machine_id || 'N/A'} (${fl.machine_type || ''})\nDriver / Operator: ${fl.driver || fl.operator || 'N/A'}\nDistance / Hours: ${fl.distance_km ? fl.distance_km + ' km' : fl.hours_worked ? fl.hours_worked + ' hours' : 'N/A'}\nWork Zone / Description: ${fl.work_zone || ''} ${fl.work_description || ''}\nBreakdown: ${fl.breakdown ? 'YES - ' + (fl.breakdown_details || '') : 'None'}\nFuel: ${fl.fuel_litres || 0} L\nRemarks: ${fl.remarks || ''}`
        break
      }
      case 'om_log': {
        const ol = await one(`SELECT * FROM om_logs WHERE id = $1`); if (!ol) return 0
        projectId = ol.project_id || projectIdHint
        sourceName = `STP O&M Process Log: ${ol.date}`
        text = `STP O&M Process Log Date: ${ol.date}\nInflow: ${ol.inflow_mld || 0} MLD, Outflow: ${ol.outflow_mld || 0} MLD\nInfluent: BOD ${ol.in_bod || 'N/A'}, COD ${ol.in_cod || 'N/A'}, TSS ${ol.in_tss || 'N/A'}\nEffluent: BOD ${ol.out_bod || 'N/A'}, COD ${ol.out_cod || 'N/A'}, TSS ${ol.out_tss || 'N/A'}, pH ${ol.out_ph || 'N/A'}, DO ${ol.out_do || 'N/A'}\nSBR MLSS: ${ol.mlss || 'N/A'} mg/L, SVI: ${ol.svi || 'N/A'}\nPower: ${ol.power_kwh || 0} kWh, DG: ${ol.dg_hours || 0} h, Sludge: ${ol.sludge_m3 || 0} m3\nOperator: ${ol.operator || 'N/A'}\nRemarks: ${ol.remarks || ''}`
        break
      }
      case 'om_event': {
        const oe = await one(`SELECT * FROM om_events WHERE id = $1`); if (!oe) return 0
        projectId = oe.project_id || projectIdHint
        sourceName = `STP Event: ${oe.equipment} (${oe.type})`
        text = `STP Event Equipment: ${oe.equipment}\nEvent Type: ${oe.type}\nStatus: ${oe.status}\nStart: ${oe.start_at}, End: ${oe.end_at || 'Ongoing'}\nCause: ${oe.cause || 'N/A'}\nAction Taken: ${oe.action || 'N/A'}\nAttended By: ${oe.attended_by || 'N/A'}\nRemarks: ${oe.remarks || ''}`
        break
      }
      case 'om_pm_task': {
        const op = await one(`SELECT * FROM om_pm_tasks WHERE id = $1`); if (!op) return 0
        projectId = op.project_id || projectIdHint
        sourceName = `STP PM Task: ${op.equipment}`
        text = `STP Preventive Maintenance Task\nEquipment: ${op.equipment}\nTask: ${op.task}\nFrequency: Every ${op.frequency_days} days\nLast Done: ${op.last_done || 'Never'}\nResponsible: ${op.responsible || 'N/A'}\nRemarks: ${op.remarks || ''}`
        break
      }
      case 'boq_item': {
        const b = await one(`SELECT * FROM boq_items WHERE id = $1`); if (!b) return 0
        projectId = b.project_id || projectIdHint
        sourceName = `BOQ Item: ${b.item_number || b.id}`
        // NOTE: Commercial quoted rate/cost is intentionally EXCLUDED from all-staff vector index for data governance
        text = `BOQ Line Item Number: ${b.item_number || 'N/A'}\nCategory / Structure: ${b.category || 'General'}\nDescription & Technical Specification: ${b.description || 'N/A'}\nUnit of Measurement: ${b.unit || 'Units'}\nEstimated Quantity: ${b.quantity || 0}`
        break
      }
      case 'task': {
        const tk = await one(`SELECT * FROM tasks WHERE id = $1`); if (!tk) return 0
        projectId = tk.project_id || projectIdHint
        sourceName = `Work Order Task: ${tk.title}`
        text = `Task Title: ${tk.title}\nDescription: ${tk.description || 'N/A'}\nPriority: ${tk.priority}, Status: ${tk.status}\nAssigned To: ${tk.assigned_name || 'Unassigned'}\nDue Date: ${tk.due_date || 'N/A'}\nWBS Reference: ${tk.wbs_code || ''} ${tk.wbs_title || ''}\nProgress: ${tk.progress_pct || 0}%`
        break
      }
      case 'ncr': {
        const n = await one(`SELECT * FROM ncrs WHERE id = $1`); if (!n) return 0
        projectId = n.project_id || projectIdHint
        sourceName = `NCR: ${n.ncr_no}`
        text = `Non-Conformance Report (NCR) Number: ${n.ncr_no}\nDate: ${n.date}\nWork Item: ${n.work_item}\nLocation: ${n.location || 'N/A'}\nSeverity: ${n.severity}, Status: ${n.status}\nRaised By: ${n.raised_by}\nDefect Description: ${n.description}\nRoot Cause: ${n.root_cause || 'Under investigation'}\nCorrective Action Required: ${n.corrective_action || 'Pending'}\nTarget Date: ${n.target_date || 'N/A'}, Closed Date: ${n.closed_date || 'Open'}`
        break
      }
      default: return 0
    }

    const sourceId = this.sourceIdFor(type, id)
    if (!sourceId || !text.trim()) return 0
    return this.indexText(text, { projectId, sourceId, sourceType: type, sourceName })
  }

  /** Attendance is stored per employee/day but indexed as one chunk per day. */
  private async indexAttendanceForRow(rowId: string, projectIdHint?: string): Promise<number> {
    const row = (await this.dataSource.query(`SELECT date, project_id FROM attendance WHERE id = $1`, [rowId]))[0]
    if (!row) return 0
    const day = String(row.date).split('T')[0]
    const recs = await this.dataSource.query(
      `SELECT a.status, a.hours_worked, e.first_name, e.last_name, e.name AS emp_name
       FROM attendance a LEFT JOIN employees e ON e.id = a.employee_id WHERE a.date = $1`, [day])
    const lines = recs.map((a: any) => {
      const who = `${a.first_name || ''} ${a.last_name || ''}`.trim() || a.emp_name || 'Unknown'
      return `${who}: ${a.status || 'present'}${a.hours_worked ? ` (${a.hours_worked}h)` : ''}`
    })
    return this.indexText(`Attendance for ${day} (${lines.length} staff recorded):\n${lines.join('\n')}`, {
      projectId: row.project_id || projectIdHint,
      sourceId: `attendance_${day}`, sourceType: 'attendance', sourceName: `Attendance: ${day}`,
    })
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
