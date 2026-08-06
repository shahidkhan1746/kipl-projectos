import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AiConfig } from './ai-config.entity'
import { AiService } from './ai.service'
import { AiController } from './ai.controller'

@Module({
  imports: [TypeOrmModule.forFeature([AiConfig])],
  providers: [AiService],
  controllers: [AiController],
  exports: [AiService],
})
export class AiModule {}
