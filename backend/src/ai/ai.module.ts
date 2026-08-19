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
    ]),
    StorageModule,
  ],
  providers: [
    AiService,
    AiIndexerService,
    { provide: APP_INTERCEPTOR, useClass: KbIndexInterceptor },
  ],
  controllers: [AiController],
  exports: [AiService, AiIndexerService],
})
export class AiModule {}
