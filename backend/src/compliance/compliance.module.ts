import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { JhaCheck } from './jha-check.entity'
import { ComplianceRecord } from './compliance-record.entity'
import { ComplianceService } from './compliance.service'
import { ComplianceController } from './compliance.controller'
import { StorageModule } from '../storage/storage.module'

@Module({
  imports: [TypeOrmModule.forFeature([JhaCheck, ComplianceRecord]), StorageModule],
  providers: [ComplianceService],
  controllers: [ComplianceController],
})
export class ComplianceModule {}
