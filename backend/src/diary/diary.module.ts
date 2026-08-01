import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { SiteDiary } from './diary.entity'
import { DiaryService } from './diary.service'
import { DiaryController } from './diary.controller'
import { StorageModule } from '../storage/storage.module'

@Module({
  imports: [TypeOrmModule.forFeature([SiteDiary]), StorageModule],
  providers: [DiaryService],
  controllers: [DiaryController],
  exports: [DiaryService],
})
export class DiaryModule {}
