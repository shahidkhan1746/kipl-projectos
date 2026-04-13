import { Module } from '@nestjs/common'
import { UsersModule } from '../users/users.module'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Employee }     from './employee.entity'
import { Attendance }   from './attendance.entity'
import { SalaryRecord } from './salary-record.entity'
import { LeaveRequest } from './leave-request.entity'
import { Timesheet }    from './timesheet.entity'
import { HrService }    from './hr.service'
import { HrController } from './hr.controller'
@Module({
  imports: [TypeOrmModule.forFeature([Employee, Attendance, SalaryRecord, LeaveRequest, Timesheet]), UsersModule],
  providers:   [HrService],
  controllers: [HrController],
  exports:     [HrService],
})
export class HrModule {}