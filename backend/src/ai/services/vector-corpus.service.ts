import { Injectable, Logger, BadRequestException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { AiEmbeddingProfile } from '../ai-embedding-profile.entity'
import { EmbeddingProfileService } from './embedding-profile.service'

export interface ChunkInsertItem {
  projectId?: string
  sourceId: string
  sourceType: string
  sourceName: string
  text: string
  embedding: number[]
}

export interface RetrievalCandidate {
  id: string
  sourceId: string
  sourceName: string
  sourceType: string
  text: string
  similarity?: number
  keywordScore?: number
  rrfScore?: number
  hasExactIdentifierMatch?: boolean
  matchedIdentifiers?: string[]
}

export interface RetrievalDiagnosticResult {
  query: string
  activeProfile: {
    id: string
    name: string
    provider: string
    model: string
    dimension: number
  }
  physicalTable: string
  queryVectorDimension: number
  semanticCandidatesCount: number
  keywordCandidatesCount: number
  exactMatchesCount: number
  rrfCandidatesCount: number
  finalSelectedCount: number
  extractedIdentifiers: string[]
  selectedCandidates: Array<{
    id: string
    sourceName: string
    sourceType: string
    similarity?: number
    keywordScore?: number
    rrfScore?: number
    hasExactIdentifierMatch?: boolean
    textSnippet: string
  }>
  formattedContext: string
}

@Injectable()
export class VectorCorpusService {
  private readonly logger = new Logger(VectorCorpusService.name)

  constructor(
    private dataSource: DataSource,
    private profileService: EmbeddingProfileService,
  ) {}

  /**
   * Strictly allow only new physical corpus tables at runtime.
   * Legacy ai_document_chunks table is explicitly excluded from production execution.
   */
  private sanitizeTableName(tableName: string): string {
    const allowed = ['ai_document_chunks_nvidia', 'ai_document_chunks_gemini']
    if (!allowed.includes(tableName)) {
      throw new BadRequestException(
        `Unauthorized physical corpus table: "${tableName}". Only isolated physical tables are permitted at runtime.`,
      )
    }
    return tableName
  }

  /**
   * Extract high-priority identifiers (e.g. IPS-1, KIPL-DL-SXR-009, EMP-101, WBS codes, vendor names)
   */
  private extractIdentifiers(query: string): string[] {
    const rawTokens = query.match(/[A-Za-z0-9]+(?:[-_][A-Za-z0-9]+)*/g) || []
    const stopWords = new Set(['the', 'and', 'for', 'with', 'about', 'what', 'who', 'tell', 'did', 'say', 'from', 'this', 'that'])
    return rawTokens.filter(t => t.length >= 2 && !stopWords.has(t.toLowerCase()))
  }


  async saveChunks(
    chunks: ChunkInsertItem[],
    profileOverride?: AiEmbeddingProfile,
    deleteExisting = true,
  ): Promise<number> {
    if (!chunks.length) return 0
    const profile = profileOverride || (await this.profileService.getActiveProfile())
    const table = this.sanitizeTableName(profile.tableName)

    const sourceId = chunks[0].sourceId
    const sourceType = chunks[0].sourceType

    await this.dataSource.transaction(async (em) => {
      if (deleteExisting) {
        await em.query(
          `DELETE FROM ${table} WHERE "source_id" = $1 AND "source_type" = $2`,
          [sourceId, sourceType],
        )
      }

      // Batch insert in blocks of 25 rows for optimal DB throughput
      const batchSize = 25
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize)
        const valueClauses: string[] = []
        const params: any[] = []
        let pIdx = 1

        for (const chunk of batch) {
          if (chunk.embedding.length !== profile.dimension) {
            throw new Error(
              `Cannot insert vector of dimension ${chunk.embedding.length} into corpus "${table}" with dimension constraint ${profile.dimension}`,
            )
          }
          valueClauses.push(
            `($${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}::vector, NOW())`,
          )
          params.push(
            profile.id,
            profile.provider,
            profile.model,
            profile.dimension,
            profile.version,
            chunk.projectId || null,
            chunk.sourceId,
            chunk.sourceType,
            chunk.sourceName,
            chunk.text,
            `[${chunk.embedding.join(',')}]`,
          )
        }

        const sql = `INSERT INTO ${table} (
          profile_id, provider, model, dimension, version, 
          project_id, source_id, source_type, source_name, 
          text, embedding, created_at
        ) VALUES ${valueClauses.join(', ')}`

        await em.query(sql, params)
      }
    })

    return chunks.length
  }

  /**
   * Diagnostic retrieval with comprehensive metrics and candidate filtering
   */
  async searchWithDiagnostics(
    query: string,
    projectId?: string,
    profileOverride?: AiEmbeddingProfile,
  ): Promise<RetrievalDiagnosticResult> {
    const profile = profileOverride || (await this.profileService.getActiveProfile())
    const table = this.sanitizeTableName(profile.tableName)

    // Generate query vector with input_type = 'query' (or RETRIEVAL_QUERY)
    const queryVec = await this.profileService.generateEmbedding(query, 'query', profile)
    const vectorStr = `[${queryVec.join(',')}]`
    const extractedIdentifiers = this.extractIdentifiers(query)

    // 1. Semantic Similarity search against isolated corpus
    const semanticSql = `
      SELECT id, source_id, text, source_name, source_type, 1 - (embedding <=> $1::vector) AS similarity
      FROM ${table}
      WHERE profile_id = $2
        AND ($3::varchar IS NULL OR project_id = $3 OR project_id IS NULL)
      ORDER BY embedding <=> $1::vector
      LIMIT 20
    `
    const semanticChunks: any[] = await this.dataSource.query(semanticSql, [
      vectorStr,
      profile.id,
      projectId || null,
    ])

    // 2. Keyword Search against isolated corpus
    const keywordSql = `
      SELECT id, source_id, text, source_name, source_type,
             ts_rank(to_tsvector('english', text), plainto_tsquery('english', $1::text)) AS keyword_score
      FROM ${table}
      WHERE profile_id = $2
        AND ($3::varchar IS NULL OR project_id = $3 OR project_id IS NULL)
        AND to_tsvector('english', text) @@ plainto_tsquery('english', $1::text)
      ORDER BY keyword_score DESC
      LIMIT 20
    `
    const keywordChunks: any[] = await this.dataSource.query(keywordSql, [
      query,
      profile.id,
      projectId || null,
    ])

    // 3. Reciprocal Rank Fusion (RRF) & Relevance Scoring
    const k = 60
    const candidateMap = new Map<string, RetrievalCandidate>()

    semanticChunks.forEach((c, idx) => {
      const sim = parseFloat(c.similarity) || 0
      const score = (1 / (k + idx + 1)) * (sim >= 0.35 ? 1.0 : 0.4)
      candidateMap.set(c.id, {
        id: c.id,
        sourceId: c.source_id,
        sourceName: c.source_name,
        sourceType: c.source_type,
        text: c.text,
        similarity: sim,
        rrfScore: score,
      })
    })

    keywordChunks.forEach((c, idx) => {
      const kwScore = parseFloat(c.keyword_score) || 0
      const score = (1 / (k + idx + 1))
      if (candidateMap.has(c.id)) {
        const item = candidateMap.get(c.id)!
        item.keywordScore = kwScore
        item.rrfScore = (item.rrfScore || 0) + score
      } else {
        candidateMap.set(c.id, {
          id: c.id,
          sourceId: c.source_id,
          sourceName: c.source_name,
          sourceType: c.source_type,
          text: c.text,
          keywordScore: kwScore,
          rrfScore: score,
        })
      }
    })

    // 4. Exact Identifier Matching & Boosting
    let exactMatchesCount = 0
    candidateMap.forEach((item) => {
      const matched: string[] = []
      const textLower = (item.text + ' ' + (item.sourceName || '')).toLowerCase()
      for (const idToken of extractedIdentifiers) {
        if (idToken.length >= 3 && textLower.includes(idToken.toLowerCase())) {
          matched.push(idToken)
        }
      }
      if (matched.length > 0) {
        item.hasExactIdentifierMatch = true
        item.matchedIdentifiers = matched
        // Substantial RRF boost for verified identifier matches
        item.rrfScore = (item.rrfScore || 0) + 0.15 * matched.length
        exactMatchesCount++
      }
    })

    // 5. Relevance-Aware Filtering
    // Filter out low-confidence artifacts that lack both semantic proximity and keyword relevance
    const allScored = Array.from(candidateMap.values()).sort((a, b) => (b.rrfScore || 0) - (a.rrfScore || 0))

    const topSimilarity = Math.max(0, ...allScored.map(c => c.similarity || 0))
    const filtered = allScored.filter((c) => {
      // Retain if:
      // A) Exact identifier matched (e.g. "IPS-1", "KIPL-DL-...")
      if (c.hasExactIdentifierMatch) return true
      // B) Strong keyword match
      if (c.keywordScore && c.keywordScore > 0.05) return true
      // C) Strong semantic similarity within 75% of the top candidate and above absolute floor
      if (c.similarity && c.similarity >= 0.40 && c.similarity >= topSimilarity * 0.70) return true
      return false
    })

    // 5. Document-Aware Evidence Budgeting Strategy
    // - Prioritize highest-ranked chunks (RRF / similarity)
    // - Limit to max 2 chunks per unique document (prevents single-doc flood)
    // - Limit to max 5 total chunks and max 5,500 total characters
    // - Line-aware trimming to preserve complete spreadsheet/table rows
    const MAX_CHUNKS_PER_DOC = 2
    const MAX_TOTAL_CHUNKS = 5
    const MAX_OVERALL_CHARS = 5500

    const docCounts = new Map<string, number>()
    const selected: typeof filtered = []
    let accumulatedChars = 0

    for (const chunk of filtered) {
      if (selected.length >= MAX_TOTAL_CHUNKS) break
      const docKey = chunk.sourceId || chunk.sourceName || 'unknown'
      const currentDocCount = docCounts.get(docKey) || 0
      if (currentDocCount >= MAX_CHUNKS_PER_DOC) continue

      // Line-aware trimming preserving table rows and headers
      let chunkText = (chunk.text || '').trim()
      if (chunkText.length > 1200) {
        const slice = chunkText.substring(0, 1200)
        const lastNewline = slice.lastIndexOf('\n')
        chunkText = lastNewline > 300 
          ? slice.substring(0, lastNewline) + '\n[... additional tabular rows truncated for context budget ...]' 
          : slice + '...'
      }

      const chunkLen = chunkText.length
      if (accumulatedChars + chunkLen > MAX_OVERALL_CHARS && selected.length > 0) {
        break
      }

      chunk.text = chunkText
      selected.push(chunk)
      docCounts.set(docKey, currentDocCount + 1)
      accumulatedChars += chunkLen
    }

    let formattedContext = ''
    if (selected.length > 0) {
      formattedContext = selected
        .map(
          (c: any) =>
            `[Type: ${c.sourceType || 'unknown'}] Source: ${c.sourceName || 'Document'}\nContent:\n${c.text}`,
        )
        .join('\n\n---\n\n')
    } else {
      formattedContext = `No project-specific document was found in the Knowledge Vault for "${query}". If this is a general engineering concept, standard terminology, or equipment (e.g. Vibro Stone Columns, Poclain, SBR), please provide the full engineering definition and explanation using your general knowledge, while clarifying that it is a general methodology and no project-specific records link it.`
    }

    const diagnostic: RetrievalDiagnosticResult = {
      query,
      activeProfile: {
        id: profile.id,
        name: profile.name,
        provider: profile.provider,
        model: profile.model,
        dimension: profile.dimension,
      },
      physicalTable: table,
      queryVectorDimension: queryVec.length,
      semanticCandidatesCount: semanticChunks.length,
      keywordCandidatesCount: keywordChunks.length,
      exactMatchesCount,
      rrfCandidatesCount: allScored.length,
      finalSelectedCount: selected.length,
      extractedIdentifiers,
      selectedCandidates: selected.map(s => ({
        id: s.id,
        sourceName: s.sourceName,
        sourceType: s.sourceType,
        similarity: s.similarity,
        keywordScore: s.keywordScore,
        rrfScore: s.rrfScore,
        hasExactIdentifierMatch: s.hasExactIdentifierMatch,
        textSnippet: s.text.substring(0, 150) + '...',
      })),
      formattedContext,
    }

    this.logger.log(
      `[RETRIEVAL DIAGNOSTIC] Query: "${query}" | Profile: ${profile.name} | Table: ${table} | Matches: ${selected.length}/${allScored.length} chunks (Exact Matches: ${exactMatchesCount})`,
    )

    return diagnostic
  }

  /**
   * User-facing retrieval entrypoint called by Knowledge Vault tool
   */
  async search(
    query: string,
    projectId?: string,
    profileOverride?: AiEmbeddingProfile,
  ): Promise<string> {
    const diagnostic = await this.searchWithDiagnostics(query, projectId, profileOverride)
    return diagnostic.formattedContext
  }

  async deleteChunksForSource(
    sourceId: string,
    sourceType?: string,
    profileOverride?: AiEmbeddingProfile,
  ): Promise<void> {
    try {
      const profile = profileOverride || (await this.profileService.getActiveProfile())
      const table = this.sanitizeTableName(profile.tableName)
      if (sourceType) {
        await this.dataSource.query(`DELETE FROM ${table} WHERE "source_id" = $1 AND "source_type" = $2`, [
          sourceId,
          sourceType,
        ])
      } else {
        await this.dataSource.query(`DELETE FROM ${table} WHERE "source_id" = $1`, [sourceId])
      }
    } catch (e: any) {
      this.logger.warn(`deleteChunksForSource warning: ${e.message}`)
    }
  }

  async getCorpusStats(profileId: string): Promise<{ chunkCount: number; documentCount: number }> {
    const profile = await this.profileService.getProfileById(profileId)
    const table = this.sanitizeTableName(profile.tableName)

    const chunks = await this.dataSource.query(
      `SELECT COUNT(*) as count FROM ${table} WHERE profile_id = $1`,
      [profileId],
    )
    const docs = await this.dataSource.query(
      `SELECT COUNT(DISTINCT source_id) as count FROM ${table} WHERE profile_id = $1`,
      [profileId],
    )

    return {
      chunkCount: parseInt(chunks[0]?.count || '0', 10),
      documentCount: parseInt(docs[0]?.count || '0', 10),
    }
  }
}
