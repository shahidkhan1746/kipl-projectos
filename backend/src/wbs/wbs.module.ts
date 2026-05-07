import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { WbsTask } from './wbs-task.entity'
import { WbsService } from './wbs.service'
import { WbsPdfService } from './wbs-pdf.service'
import { WbsController } from './wbs.controller'

@Module({
  imports: [TypeOrmModule.forFeature([WbsTask])],
  providers: [WbsService, WbsPdfService],
  controllers: [WbsController],
  exports: [WbsService],
})
export class WbsModule {}
