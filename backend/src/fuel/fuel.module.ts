import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ProjectsModule } from '../projects/projects.module'
import { FleetLog } from '../fleet/fleet-log.entity'
import { FuelEntry, FuelMachine } from './fuel.entity'
import { FuelController } from './fuel.controller'
import { FuelService } from './fuel.service'

@Module({
  imports: [ProjectsModule, TypeOrmModule.forFeature([FuelEntry, FuelMachine, FleetLog])],
  controllers: [FuelController],
  providers: [FuelService],
  exports: [FuelService],
})
export class FuelModule {}
