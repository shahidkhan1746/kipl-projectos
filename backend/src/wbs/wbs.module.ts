import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { WbsTask } from './wbs-task.entity'
import { WbsService } from './wbs.service'
import { WbsController } from './wbs.controller'

@Module({
  imports: [TypeOrmModule.forFeature([WbsTask])],
  providers: [WbsService],
  controllers: [WbsController],
  exports: [WbsService],
})
export class WbsModule {}
