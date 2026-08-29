import { IsString, IsOptional, IsNumber, IsBoolean, IsNotEmpty } from 'class-validator'
import { Transform } from 'class-transformer'

export class CreateFleetLogDto {
  @IsOptional()
  @IsString()
  projectId?: string

  @IsNotEmpty()
  @IsString()
  logType: 'vehicle' | 'plant'

  @IsNotEmpty()
  @IsString()
  date: string

  // Vehicle fields
  @IsOptional()
  @IsString()
  vehicle?: string

  @IsOptional()
  @IsString()
  driver?: string

  @IsOptional()
  @Transform(({ value }) => (value === '' || value === null || value === undefined ? null : Number(value)))
  @IsNumber()
  meterStart?: number | null

  @IsOptional()
  @Transform(({ value }) => (value === '' || value === null || value === undefined ? null : Number(value)))
  @IsNumber()
  meterEnd?: number | null

  @IsOptional()
  @Transform(({ value }) => (value === '' || value === null || value === undefined ? null : Number(value)))
  @IsNumber()
  distanceKm?: number | null

  @IsOptional()
  @IsString()
  passengerName?: string

  @IsOptional()
  @IsString()
  passengerDesignation?: string

  @IsOptional()
  @IsString()
  purpose?: string

  @IsOptional()
  @IsString()
  fromLocation?: string

  @IsOptional()
  @IsString()
  toLocation?: string

  // Plant fields
  @IsOptional()
  @IsString()
  machineId?: string

  @IsOptional()
  @IsString()
  machineType?: string

  @IsOptional()
  @IsString()
  operator?: string

  @IsOptional()
  @Transform(({ value }) => (value === '' || value === null || value === undefined ? null : Number(value)))
  @IsNumber()
  hourStart?: number | null

  @IsOptional()
  @Transform(({ value }) => (value === '' || value === null || value === undefined ? null : Number(value)))
  @IsNumber()
  hourClose?: number | null

  @IsOptional()
  @Transform(({ value }) => (value === '' || value === null || value === undefined ? null : Number(value)))
  @IsNumber()
  hoursWorked?: number | null

  @IsOptional()
  @IsString()
  workZone?: string

  @IsOptional()
  @IsString()
  workDescription?: string

  @IsOptional()
  @IsBoolean()
  breakdown?: boolean

  @IsOptional()
  @IsString()
  breakdownDetails?: string

  // Common fields
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === null || value === undefined ? null : Number(value)))
  @IsNumber()
  fuelLitres?: number | null

  @IsOptional()
  @Transform(({ value }) => (value === '' || value === null || value === undefined ? null : Number(value)))
  @IsNumber()
  fuelCost?: number | null

  @IsOptional()
  @IsString()
  remarks?: string

  @IsOptional()
  @IsString()
  reportedBy?: string

  @IsOptional()
  @IsString()
  reportedVia?: string

  @IsOptional()
  @IsString()
  photoUrl?: string
}
