import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { QaChecklist }  from './qa-checklist.entity'
import { QaInspection } from './qa-inspection.entity'
import { Ncr }          from './ncr.entity'
import { QaService }    from './qa.service'
import { QaController } from './qa.controller'
import { StorageModule } from '../storage/storage.module'
@Module({
  imports:[TypeOrmModule.forFeature([QaChecklist,QaInspection,Ncr]), StorageModule],
  providers:[QaService], controllers:[QaController], exports:[QaService],
})
export class QaModule {}