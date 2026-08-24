import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AiEmbeddingProfile, EmbeddingProfileStatus } from '../ai-embedding-profile.entity'
import { AiKey } from '../ai-key.entity'
import { NvidiaEmbeddingProvider } from '../providers/nvidia-embedding.provider'
import { GeminiEmbeddingProvider } from '../providers/gemini-embedding.provider'
import { IEmbeddingProvider } from '../providers/embedding-provider.interface'

export interface CreateEmbeddingProfileDto {
  name: string
  provider: string
  model: string
  dimension: number
  version?: number
  tableName: string
  keyId?: string | null
  baseUrl?: string | null
}

export interface ProfileValidationResult {
  valid: boolean
  profileId: string
  profileName: string
  provider: string
  model: string
  expectedDimension: number
  actualDimension: number
  sampleVectorPreview: number[]
  message: string
}

@Injectable()
export class EmbeddingProfileService {
  private readonly logger = new Logger(EmbeddingProfileService.name)
  private providers: Map<string, IEmbeddingProvider> = new Map()

  constructor(
    @InjectRepository(AiEmbeddingProfile)
    private profileRepo: Repository<AiEmbeddingProfile>,
    @InjectRepository(AiKey)
    private keyRepo: Repository<AiKey>,
    nvidiaProvider: NvidiaEmbeddingProvider,
    geminiProvider: GeminiEmbeddingProvider,
  ) {
    this.providers.set('nvidia', nvidiaProvider)
    this.providers.set('gemini', geminiProvider)
  }

  async getActiveProfile(): Promise<AiEmbeddingProfile> {
    const profile = await this.profileRepo.findOne({
      where: { status: EmbeddingProfileStatus.ACTIVE },
    })
    if (!profile) {
      throw new NotFoundException('No active embedding profile configured in system.')
    }
    return profile
  }

  async getProfileById(id: string): Promise<AiEmbeddingProfile> {
    const profile = await this.profileRepo.findOne({ where: { id } })
    if (!profile) throw new NotFoundException(`Embedding profile ${id} not found.`)
    return profile
  }

  async listProfiles(): Promise<AiEmbeddingProfile[]> {
    return this.profileRepo.find({ order: { createdAt: 'ASC' } })
  }

  async createProfile(dto: CreateEmbeddingProfileDto): Promise<AiEmbeddingProfile> {
    const profile = this.profileRepo.create({
      name: dto.name,
      provider: dto.provider,
      model: dto.model,
      dimension: dto.dimension,
      version: dto.version || 1,
      status: EmbeddingProfileStatus.MIGRATING,
      tableName: dto.tableName,
      keyId: dto.keyId || null,
      baseUrl: dto.baseUrl || null,
    })
    return await this.profileRepo.save(profile)
  }

  async resolveCredentials(profile: AiEmbeddingProfile): Promise<{ apiKey: string; baseUrl?: string }> {
    if (profile.keyId) {
      const key = await this.keyRepo.findOne({ where: { id: profile.keyId } })
      if (key && key.apiKey) {
        return { apiKey: key.apiKey, baseUrl: profile.baseUrl || key.baseUrl }
      }
    }
    // Secure lookup: match provider in ai_keys without exposing raw keys in profile table
    const key = await this.keyRepo.findOne({
      where: { provider: profile.provider, enabled: true },
      order: { priority: 'ASC' },
    })
    if (key && key.apiKey) {
      return { apiKey: key.apiKey, baseUrl: profile.baseUrl || key.baseUrl }
    }
    throw new BadRequestException(`No active API key found for embedding provider: "${profile.provider}".`)
  }

  async generateEmbedding(
    text: string,
    inputType: 'passage' | 'query',
    profileOverride?: AiEmbeddingProfile,
  ): Promise<number[]> {
    const results = await this.generateEmbeddingsBatch([text], inputType, profileOverride)
    return results[0]
  }

  async generateEmbeddingsBatch(
    texts: string[],
    inputType: 'passage' | 'query',
    profileOverride?: AiEmbeddingProfile,
    batchSize = 4,
  ): Promise<number[][]> {
    if (!texts.length) return []
    const profile = profileOverride || (await this.getActiveProfile())
    const provider = this.providers.get(profile.provider)
    if (!provider) {
      throw new BadRequestException(`Unsupported embedding provider: "${profile.provider}".`)
    }

    const { apiKey, baseUrl } = await this.resolveCredentials(profile)
    const allVectors: number[][] = []

    for (let i = 0; i < texts.length; i += batchSize) {
      const chunkBatch = texts.slice(i, i + batchSize)
      let batchVectors: number[][] = []

      if (provider.generateEmbeddingsBatch) {
        try {
          batchVectors = await provider.generateEmbeddingsBatch(chunkBatch, {
            inputType,
            model: profile.model,
            dimension: profile.dimension,
            apiKey,
            baseUrl,
          })
        } catch (batchErr: any) {
          this.logger.warn(`Batch embedding failed (${batchErr.message}). Falling back to individual chunk processing for ${chunkBatch.length} items...`)
          batchVectors = []
          for (const t of chunkBatch) {
            const vec = await provider.generateEmbedding(t, {
              inputType,
              model: profile.model,
              dimension: profile.dimension,
              apiKey,
              baseUrl,
            })
            batchVectors.push(vec)
          }
        }
      } else {
        for (const t of chunkBatch) {
          const vec = await provider.generateEmbedding(t, {
            inputType,
            model: profile.model,
            dimension: profile.dimension,
            apiKey,
            baseUrl,
          })
          batchVectors.push(vec)
        }
      }

      for (const vec of batchVectors) {
        if (vec.length !== profile.dimension) {
          throw new Error(
            `Vector dimension mismatch: Profile "${profile.name}" expects ${profile.dimension} dimensions, but provider returned ${vec.length}.`,
          )
        }
        allVectors.push(vec)
      }
    }

    return allVectors
  }

  /**
   * Controlled single-shot dimension & credential validation for an embedding profile
   */
  async validateProfileCompatibility(profileIdOrInstance: string | AiEmbeddingProfile): Promise<ProfileValidationResult> {
    const profile = typeof profileIdOrInstance === 'string'
      ? await this.getProfileById(profileIdOrInstance)
      : profileIdOrInstance

    const provider = this.providers.get(profile.provider)
    if (!provider) {
      throw new BadRequestException(`Unsupported embedding provider: "${profile.provider}".`)
    }

    const { apiKey, baseUrl } = await this.resolveCredentials(profile)
    const testText = 'KIPL ProjectOS controlled dimension verification probe'

    const vec = await provider.generateEmbedding(testText, {
      inputType: 'passage',
      model: profile.model,
      dimension: profile.dimension,
      apiKey,
      baseUrl,
    })

    const isMatch = vec.length === profile.dimension
    return {
      valid: isMatch,
      profileId: profile.id,
      profileName: profile.name,
      provider: profile.provider,
      model: profile.model,
      expectedDimension: profile.dimension,
      actualDimension: vec.length,
      sampleVectorPreview: vec.slice(0, 5),
      message: isMatch
        ? `Profile validated successfully: returned ${vec.length} dimensions matching expected ${profile.dimension}.`
        : `Validation failed: returned ${vec.length} dimensions, expected ${profile.dimension}.`,
    }
  }

  async activateProfile(profileId: string): Promise<AiEmbeddingProfile> {
    const target = await this.getProfileById(profileId)

    if (target.status === EmbeddingProfileStatus.ACTIVE) {
      return target
    }

    // Pre-activation check 1: Validate compatibility (credentials and dimension)
    const validation = await this.validateProfileCompatibility(target)
    if (!validation.valid) {
      throw new BadRequestException(
        `Cannot activate profile "${target.name}": Dimension mismatch (${validation.actualDimension} returned, ${target.dimension} expected).`,
      )
    }

    // Pre-activation check 2: Determine whether target profile has an indexed corpus suitable for current knowledge base
    const table = target.tableName.replace(/[^a-zA-Z0-9_]/g, '')
    let chunkCount = 0
    try {
      const countRes = await this.profileRepo.manager.query(
        `SELECT COUNT(*) as count FROM "${table}" WHERE profile_id = $1`,
        [target.id],
      )
      chunkCount = parseInt(countRes[0]?.count || '0', 10)
    } catch (err: any) {
      throw new BadRequestException(
        `Cannot activate profile "${target.name}": Target vector table "${table}" is inaccessible or does not exist.`,
      )
    }

    if (chunkCount === 0) {
      throw new BadRequestException(
        `Cannot activate profile "${target.name}": Target vector corpus in table "${table}" has 0 indexed chunks for profile ID ${target.id}. The corpus must be indexed before activating this profile.`,
      )
    }

    await this.profileRepo.manager.transaction(async (em) => {
      // Archive previously active profile
      await em.update(
        AiEmbeddingProfile,
        { status: EmbeddingProfileStatus.ACTIVE },
        { status: EmbeddingProfileStatus.ARCHIVED },
      )
      target.status = EmbeddingProfileStatus.ACTIVE
      await em.save(target)
    })
    this.logger.log(`Activated embedding profile: "${target.name}" (${target.tableName}) with ${chunkCount} chunks`)
    return target
  }
}
