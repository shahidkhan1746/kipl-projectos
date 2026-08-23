import { Module } from '@nestjs/common'
import { APP_INTERCEPTOR } from '@nestjs/core'
import { TypeOrmModule } from '@nestjs/typeorm'
import { KbIndexInterceptor } from './kb-index.interceptor'
import { AiConfig } from './ai-config.entity'
import { AiKey } from './ai-key.entity'
import { AiService } from './ai.service'
import { AiController } from './ai.controller'

import { AiChatSession } from './ai-chat-session.entity'
import { AiChatMessage } from './ai-chat-message.entity'
import { AiDocumentChunk } from './ai-document-chunk.entity'
import { AiKnowledgeDocument } from './ai-knowledge-document.entity'
import { AiEmbeddingProfile } from './ai-embedding-profile.entity'
import { AiDocumentChunkNvidia } from './entities/ai-document-chunk-nvidia.entity'
import { AiDocumentChunkGemini } from './entities/ai-document-chunk-gemini.entity'

import { NvidiaEmbeddingProvider } from './providers/nvidia-embedding.provider'
import { GeminiEmbeddingProvider } from './providers/gemini-embedding.provider'
import { EmbeddingProfileService } from './services/embedding-profile.service'
import { VectorCorpusService } from './services/vector-corpus.service'
import { EntityResolutionService } from './services/entity-resolution.service'
import { AiIndexerService } from './ai-indexer.service'
import { StorageModule } from '../storage/storage.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AiConfig,
      AiKey,
      AiChatSession,
      AiChatMessage,
      AiDocumentChunk,
      AiKnowledgeDocument,
      AiEmbeddingProfile,
      AiDocumentChunkNvidia,
      AiDocumentChunkGemini,
    ]),
    StorageModule,
  ],
  providers: [
    NvidiaEmbeddingProvider,
    GeminiEmbeddingProvider,
    EmbeddingProfileService,
    VectorCorpusService,
    EntityResolutionService,
    AiService,
    AiIndexerService,
    { provide: APP_INTERCEPTOR, useClass: KbIndexInterceptor },
  ],
  controllers: [AiController],
  exports: [
    AiService,
    AiIndexerService,
    EmbeddingProfileService,
    VectorCorpusService,
    EntityResolutionService,
  ],
})
export class AiModule {}
