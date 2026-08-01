import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { OmLog } from './om-log.entity'
import { OmEvent } from './om-event.entity'
import { OmService } from './om.service'
import { OmController } from './om.controller'

@Module({
  imports: [TypeOrmModule.forFeature([OmLog, OmEvent])],
  providers: [OmService],
  controllers: [OmController],
  exports: [OmService],
})
export class OmModule {}
