import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { QaChecklist }  from './qa-checklist.entity'
import { QaInspection } from './qa-inspection.entity'
import { Ncr }          from './ncr.entity'
import { QaService }    from './qa.service'
import { QaController } from './qa.controller'
@Module({
  imports:[TypeOrmModule.forFeature([QaChecklist,QaInspection,Ncr])],
  providers:[QaService], controllers:[QaController], exports:[QaService],
})
export class QaModule {}