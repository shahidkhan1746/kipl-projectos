import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { WbsTask } from './wbs-task.entity'
import { LiaisonFile } from '../liaison/liaison-file.entity'
import { SiteDiary } from '../diary/diary.entity'
import { WbsService } from './wbs.service'
import { WbsPdfService } from './wbs-pdf.service'
import { WbsController } from './wbs.controller'
import { PertRiskEngineService } from './services/pert-risk-engine.service'

@Module({
  imports: [TypeOrmModule.forFeature([WbsTask, LiaisonFile, SiteDiary])],
  providers: [WbsService, WbsPdfService, PertRiskEngineService],
  controllers: [WbsController],
  exports: [WbsService, PertRiskEngineService],
})
export class WbsModule {}
