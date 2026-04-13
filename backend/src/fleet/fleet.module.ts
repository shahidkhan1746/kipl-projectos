import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { FleetLog } from './fleet-log.entity'
import { FleetService } from './fleet.service'
import { FleetController } from './fleet.controller'

@Module({
  imports: [TypeOrmModule.forFeature([FleetLog])],
  providers: [FleetService],
  controllers: [FleetController],
})
export class FleetModule {}
