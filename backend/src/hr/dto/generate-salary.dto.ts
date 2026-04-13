import { IsInt, IsNotEmpty, IsString, Max, Min } from 'class-validator'
export class GenerateSalaryDto {
  @IsString() @IsNotEmpty() employeeId: string
  @IsInt() @Min(1) @Max(12) month:      number
  @IsInt() @Min(2020)       year:       number
}