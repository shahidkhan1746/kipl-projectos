import { IsEnum, IsNotEmpty, IsOptional, IsString, IsNumber } from 'class-validator'
import { EmploymentType } from '../employee.entity'
export class CreateEmployeeDto {
  @IsString() @IsNotEmpty()  empCode:        string
  @IsString() @IsNotEmpty()  firstName:      string
  @IsOptional() @IsString()  lastName?:      string
  @IsOptional() @IsString()  designation?:   string
  @IsOptional() @IsString()  department?:    string
  @IsOptional() @IsString()  phone?:         string
  @IsOptional() @IsString()  email?:         string
  @IsOptional() @IsString()  dateOfJoining?: string
  @IsOptional() @IsString()  dateOfBirth?:   string
  @IsOptional() @IsString()  aadharNo?:      string
  @IsOptional() @IsString()  panNo?:         string
  @IsOptional()              bankAccount?:   Record<string, string>
  @IsNumber()                baseSalary:     number
  @IsOptional() @IsNumber()  hra?:           number
  @IsOptional() @IsNumber()  allowances?:    number
  @IsOptional() @IsEnum(EmploymentType) employmentType?: EmploymentType
  @IsOptional() @IsString()  projectId?:     string
}