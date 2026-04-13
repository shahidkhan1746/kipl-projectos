import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { SiteDiary } from './diary.entity'
import { DiaryService } from './diary.service'
import { DiaryController } from './diary.controller'

@Module({
  imports: [TypeOrmModule.forFeature([SiteDiary])],
  providers: [DiaryService],
  controllers: [DiaryController],
  exports: [DiaryService],
})
export class DiaryModule {}
