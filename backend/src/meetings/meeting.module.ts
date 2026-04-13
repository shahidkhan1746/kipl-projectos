import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Meeting } from './meeting.entity'
import { MeetingService } from './meeting.service'
import { MeetingController } from './meeting.controller'

@Module({
  imports: [TypeOrmModule.forFeature([Meeting])],
  providers: [MeetingService],
  controllers: [MeetingController],
  exports: [MeetingService],
})
export class MeetingModule {}
