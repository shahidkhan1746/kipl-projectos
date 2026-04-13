import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator'
import { LeaveType } from '../leave-request.entity'
export class ApplyLeaveDto {
  @IsString() @IsNotEmpty()  employeeId: string
  @IsEnum(LeaveType)         leaveType:  LeaveType
  @IsDateString()            fromDate:   string
  @IsDateString()            toDate:     string
  @IsOptional() @IsString()  reason?:    string
}