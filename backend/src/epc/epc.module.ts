import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { BoqItem }     from './boq-item.entity'
import { RaBill }      from './ra-bill.entity'
import { Measurement } from './measurement.entity'
import { EpcService }  from './epc.service'
import { EpcController } from './epc.controller'

@Module({
  imports: [TypeOrmModule.forFeature([BoqItem, RaBill, Measurement])],
  providers:   [EpcService],
  controllers: [EpcController],
  exports:     [EpcService],
})
export class EpcModule {}