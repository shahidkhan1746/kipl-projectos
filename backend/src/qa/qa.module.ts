import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { QaChecklist }  from './qa-checklist.entity'
import { QaInspection } from './qa-inspection.entity'
import { Ncr }          from './ncr.entity'
import { CubeTest }     from './cube-test.entity'
import { QaService }    from './qa.service'
import { QaController } from './qa.controller'
import { ConcreteStrengthPredictorService } from './services/concrete-strength-predictor.service'
import { StorageModule } from '../storage/storage.module'

@Module({
  imports:[TypeOrmModule.forFeature([QaChecklist,QaInspection,Ncr,CubeTest]), StorageModule],
  providers:[QaService, ConcreteStrengthPredictorService],
  controllers:[QaController],
  exports:[QaService, ConcreteStrengthPredictorService],
})
export class QaModule {}