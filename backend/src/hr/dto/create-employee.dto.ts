import { IsEnum, IsNotEmpty, IsOptional, IsString, IsNumber, IsBoolean } from 'class-validator'
import { Type } from 'class-transformer'
import { EmploymentType } from '../employee.entity'

export class CreateEmployeeDto {
  @IsString() @IsNotEmpty()  empCode:        string
  @IsString() @IsNotEmpty()  firstName:      string
  @IsOptional() @IsString()  lastName?:      string
  @IsOptional() @IsString()  designation?:   string
  @IsOptional() @IsString()  labourCategory?: string
  @IsOptional() @IsString()  department?:    string
  @IsOptional() @IsString()  phone?:         string
  @IsOptional() @IsString()  email?:         string
  @IsOptional() @IsString()  bloodGroup?:    string
  @IsOptional() @IsString()  emergencyName?: string
  @IsOptional() @IsString()  emergencyPhone?: string
  @IsOptional() @IsString()  dateOfJoining?: string
  @IsOptional() @IsString()  dateOfBirth?:   string
  @IsOptional() @IsString()  aadharNo?:      string
  @IsOptional() @IsString()  panNo?:         string
  @IsOptional()              bankAccount?:   Record<string, string>

  @IsOptional() @Type(() => Number) @IsNumber()  baseSalary?: number
  @IsOptional() @Type(() => Number) @IsNumber()  hra?:        number
  @IsOptional() @Type(() => Number) @IsNumber()  allowances?: number

  @IsOptional() @IsEnum(EmploymentType) employmentType?: EmploymentType
  @IsOptional() @IsString()  projectId?:     string

  // System login — consumed by HrService.createEmployee()
  @IsOptional() @IsBoolean() createLogin?:   boolean
  @IsOptional() @IsString()  loginEmail?:    string
  @IsOptional() @IsString()  loginRole?:     string
  @IsOptional() @IsString()  loginPassword?: string
}
