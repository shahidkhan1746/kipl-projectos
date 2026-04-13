import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, IsNumber } from 'class-validator'
import { AttendanceStatus, AttendanceSource } from '../attendance.entity'
export class MarkAttendanceDto {
  @IsString() @IsNotEmpty()  employeeId: string
  @IsDateString()            date:       string
  @IsEnum(AttendanceStatus)  status:     AttendanceStatus
  @IsOptional() @IsEnum(AttendanceSource) source?: AttendanceSource
  @IsOptional() @IsNumber()  checkInLat?:   number
  @IsOptional() @IsNumber()  checkInLng?:   number
  @IsOptional() @IsString()  checkInTime?:  string
  @IsOptional() @IsString()  checkOutTime?: string
  @IsOptional() @IsString()  remarks?:      string
  @IsOptional() @IsString()  projectId?:    string
}