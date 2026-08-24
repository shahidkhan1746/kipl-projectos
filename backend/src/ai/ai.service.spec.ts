jest.mock('ai', () => ({
  generateText: jest.fn(),
}))
jest.mock('@ai-sdk/google', () => ({
  createGoogleGenerativeAI: jest.fn(),
}))
jest.mock('@ai-sdk/openai', () => ({
  createOpenAI: jest.fn(),
}))

import { BadRequestException } from '@nestjs/common'
import { AiService } from './ai.service'

describe('AiService - Master AI Toggle & P0-2 Safety', () => {
  let service: AiService
  let mockCfgRepo: any
  let mockKeyRepo: any
  let mockSessionRepo: any
  let mockMsgRepo: any
  let mockChunkRepo: any
  let mockDataSource: any
  let mockProfileService: any
  let mockVectorCorpusService: any
  let mockEntityResolutionService: any

  beforeEach(() => {
    mockCfgRepo = {
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    }

    mockKeyRepo = {
      find: jest.fn().mockResolvedValue([
        { id: 'k1', label: 'Gemini', provider: 'gemini', apiKey: 'valid-gemini-key', enabled: true, priority: 1 },
        { id: 'k2', label: 'NVIDIA', provider: 'nvidia', apiKey: 'valid-nvidia-key', enabled: true, priority: 2 },
      ]),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    }

    mockSessionRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    }

    mockMsgRepo = {
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    }

    mockChunkRepo = {}
    mockDataSource = {
      getRepository: jest.fn(),
    }
    mockProfileService = {}
    mockVectorCorpusService = {}
    mockEntityResolutionService = {}
    const mockTelemetryService = {
      createTrace: jest.fn().mockReturnValue({
        recordProviderAttempt: jest.fn(),
        recordToolInvocation: jest.fn(),
        recordRag: jest.fn(),
        finish: jest.fn().mockReturnValue({ requestId: 'req_123' }),
      }),
    }

    service = new AiService(
      mockCfgRepo,
      mockKeyRepo,
      mockSessionRepo,
      mockMsgRepo,
      mockChunkRepo as any,
      mockDataSource as any,
      mockProfileService as any,
      mockVectorCorpusService as any,
      mockEntityResolutionService as any,
      mockTelemetryService as any,
    )
  })

  it('should reject generate() with BadRequestException when master AI toggle is disabled', async () => {
    // Master AI toggle OFF
    mockCfgRepo.find.mockResolvedValue([{ enabled: false }])

    await expect(service.generate('Hello world')).rejects.toThrow(BadRequestException)
    await expect(service.generate('Hello world')).rejects.toThrow(/AI is not enabled/)

    // Ensure keyRepo was never queried for providers and no LLM was called
    expect(mockKeyRepo.find).not.toHaveBeenCalled()
  })

  it('should reject chat() with BadRequestException when master AI toggle is disabled', async () => {
    // Master AI toggle OFF
    mockCfgRepo.find.mockResolvedValue([{ enabled: false }])

    await expect(
      service.chat('session-123', 'Who is Rinku?', 'user-1', 'proj-1'),
    ).rejects.toThrow(BadRequestException)
    await expect(
      service.chat('session-123', 'Who is Rinku?', 'user-1', 'proj-1'),
    ).rejects.toThrow(/AI is not enabled/)

    // Ensure session repository was not queried
    expect(mockSessionRepo.findOne).not.toHaveBeenCalled()
  })

  it('should report enabled: false in getMasked() when toggle is OFF', async () => {
    mockCfgRepo.find.mockResolvedValue([{ enabled: false }])

    const masked = await service.getMasked()

    expect(masked.enabled).toBe(false)
    expect(masked.keys.length).toBe(2)
  })

  it('should report enabled: true in getMasked() when toggle is ON', async () => {
    mockCfgRepo.find.mockResolvedValue([{ enabled: true }])

    const masked = await service.getMasked()

    expect(masked.enabled).toBe(true)
    expect(masked.keys.length).toBe(2)
  })
})
