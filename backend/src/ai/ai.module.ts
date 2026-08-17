import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AiConfig } from './ai-config.entity'
import { AiKey } from './ai-key.entity'
import { AiService } from './ai.service'
import { AiController } from './ai.controller'

import { AiChatSession } from './ai-chat-session.entity'
import { AiChatMessage } from './ai-chat-message.entity'
import { AiDocumentChunk } from './ai-document-chunk.entity'
import { AiIndexerService } from './ai-indexer.service'

@Module({
  imports: [TypeOrmModule.forFeature([AiConfig, AiKey, AiChatSession, AiChatMessage, AiDocumentChunk])],
  providers: [AiService, AiIndexerService],
  controllers: [AiController],
  exports: [AiService, AiIndexerService],
})
export class AiModule {}
