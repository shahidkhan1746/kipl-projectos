import { BadRequestException, NotFoundException } from '@nestjs/common'
import { EmbeddingProfileService } from './embedding-profile.service'
import { EmbeddingProfileStatus } from '../ai-embedding-profile.entity'

describe('EmbeddingProfileService - P0 Profile Activation Safety', () => {
  let service: EmbeddingProfileService
  let mockProfileRepo: any
  let mockKeyRepo: any
  let mockNvidiaProvider: any
  let mockGeminiProvider: any
  let mockQueryRunner: any

  const activeProfile = {
    id: 'prof-nvidia-1',
    name: 'NVIDIA NV-Embed-QA (4096d)',
    provider: 'nvidia',
    model: 'nvidia/llama-3.2-nv-embedqa-1b-v2',
    dimension: 4096,
    tableName: 'ai_document_chunks_nvidia',
    status: EmbeddingProfileStatus.ACTIVE,
  }

  const emptyGeminiProfile = {
    id: 'prof-gemini-1',
    name: 'Google Gemini text-embedding-004 (768d)',
    provider: 'gemini',
    model: 'text-embedding-004',
    dimension: 768,
    tableName: 'ai_document_chunks_gemini',
    status: EmbeddingProfileStatus.ARCHIVED,
  }

  const populatedGeminiProfile = {
    id: 'prof-gemini-populated',
    name: 'Google Gemini text-embedding-004 (768d)',
    provider: 'gemini',
    model: 'text-embedding-004',
    dimension: 768,
    tableName: 'ai_document_chunks_gemini',
    status: EmbeddingProfileStatus.ARCHIVED,
  }

  beforeEach(() => {
    mockQueryRunner = {
      query: jest.fn(),
      update: jest.fn(),
      save: jest.fn(),
    }

    mockProfileRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
      manager: {
        query: jest.fn(),
        transaction: jest.fn(async (cb) => cb(mockQueryRunner)),
      },
    }

    mockKeyRepo = {
      find: jest.fn().mockResolvedValue([
        { id: 'key-nvidia', provider: 'nvidia', apiKey: 'nv-test-key', enabled: true },
        { id: 'key-gemini', provider: 'gemini', apiKey: 'gem-test-key', enabled: true },
      ]),
      findOne: jest.fn().mockImplementation(async (opts: any) => {
        const prov = opts?.where?.provider
        if (prov === 'nvidia') return { id: 'key-nvidia', provider: 'nvidia', apiKey: 'nv-test-key', enabled: true }
        if (prov === 'gemini') return { id: 'key-gemini', provider: 'gemini', apiKey: 'gem-test-key', enabled: true }
        return null
      }),
    }

    mockNvidiaProvider = {
      generateEmbedding: jest.fn().mockResolvedValue(new Array(4096).fill(0.1)),
    }

    mockGeminiProvider = {
      generateEmbedding: jest.fn().mockResolvedValue(new Array(768).fill(0.1)),
    }

    service = new EmbeddingProfileService(
      mockProfileRepo,
      mockKeyRepo,
      mockNvidiaProvider,
      mockGeminiProvider,
    )
  })

  it('1. should reject activation if target profile has 0 chunks (even if table might have chunks for other profiles)', async () => {
    mockProfileRepo.findOne.mockResolvedValue(emptyGeminiProfile)
    // Scoped query WHERE profile_id = target.id returns 0 chunks
    mockProfileRepo.manager.query.mockImplementation(async (sql: string, params: any[]) => {
      if (sql.includes('WHERE profile_id = $1') && params[0] === emptyGeminiProfile.id) {
        return [{ count: '0' }]
      }
      // If an unscoped table query were erroneously made, it would return chunks
      return [{ count: '999' }]
    })

    await expect(service.activateProfile('prof-gemini-1')).rejects.toThrow(BadRequestException)
    await expect(service.activateProfile('prof-gemini-1')).rejects.toThrow(/0 indexed chunks/)

    // Ensure transaction was never executed and active profile was not archived
    expect(mockQueryRunner.update).not.toHaveBeenCalled()
  })

  it('2. should successfully activate profile when target profile has >0 chunks', async () => {
    mockProfileRepo.findOne.mockResolvedValue({ ...populatedGeminiProfile })
    // Scoped query WHERE profile_id = target.id returns 150 chunks
    mockProfileRepo.manager.query.mockImplementation(async (sql: string, params: any[]) => {
      if (sql.includes('WHERE profile_id = $1') && params[0] === populatedGeminiProfile.id) {
        return [{ count: '150' }]
      }
      return [{ count: '0' }]
    })

    const activated = await service.activateProfile('prof-gemini-populated')

    expect(activated.status).toBe(EmbeddingProfileStatus.ACTIVE)
    expect(mockQueryRunner.update).toHaveBeenCalledWith(
      expect.anything(),
      { status: EmbeddingProfileStatus.ACTIVE },
      { status: EmbeddingProfileStatus.ARCHIVED },
    )
    expect(mockQueryRunner.save).toHaveBeenCalled()
  })

  it('3. should reject activation if dimension/provider validation fails and leave active profile unchanged', async () => {
    mockProfileRepo.findOne.mockResolvedValue({
      ...emptyGeminiProfile,
      dimension: 1536, // Mismatched dimension (Gemini provider returns 768)
    })

    await expect(service.activateProfile('prof-gemini-1')).rejects.toThrow(BadRequestException)
    await expect(service.activateProfile('prof-gemini-1')).rejects.toThrow(/Dimension mismatch/)

    // Ensure transaction was never executed and active profile was not archived
    expect(mockQueryRunner.update).not.toHaveBeenCalled()
  })

  it('4. should return immediately without state changes if target profile is already active', async () => {
    mockProfileRepo.findOne.mockResolvedValue({ ...activeProfile })

    const res = await service.activateProfile('prof-nvidia-1')

    expect(res.status).toBe(EmbeddingProfileStatus.ACTIVE)
    expect(mockProfileRepo.manager.transaction).not.toHaveBeenCalled()
  })
})
