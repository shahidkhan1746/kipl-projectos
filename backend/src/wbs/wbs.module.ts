import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { WbsTask } from './wbs-task.entity'
import { LiaisonFile } from '../liaison/liaison-file.entity'
import { SiteDiary } from '../diary/diary.entity'
import { WbsService } from './wbs.service'
import { WbsPdfService } from './wbs-pdf.service'
import { WbsController } from './wbs.controller'

@Module({
  imports: [TypeOrmModule.forFeature([WbsTask, LiaisonFile, SiteDiary])],
  providers: [WbsService, WbsPdfService],
  controllers: [WbsController],
  exports: [WbsService],
})
export class WbsModule {}
