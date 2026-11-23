import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { FleetLog } from './fleet-log.entity'
import { FleetService } from './fleet.service'
import { FleetController } from './fleet.controller'
import { FuelModule } from '../fuel/fuel.module'

@Module({
  imports: [TypeOrmModule.forFeature([FleetLog]), FuelModule],
  providers: [FleetService],
  controllers: [FleetController],
})
export class FleetModule {}
