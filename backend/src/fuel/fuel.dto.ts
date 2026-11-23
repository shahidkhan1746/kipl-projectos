import { Type } from 'class-transformer'
import { IsBoolean, IsDateString, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min, ValidateIf } from 'class-validator'
import { FUEL_ENTRY_TYPES, FUEL_TYPES, MACHINE_OWNERSHIP, METER_UNITS } from './fuel.entity'

export class FuelRegisterQueryDto {
  @IsUUID() projectId: string
  /** ISO dates. Default: this month so far. */
  @IsOptional() @IsDateString() from?: string
  @IsOptional() @IsDateString() to?: string
}

export class FuelEntryDto {
  @IsUUID() projectId: string
  @IsIn(FUEL_ENTRY_TYPES) entryType: (typeof FUEL_ENTRY_TYPES)[number]
  @IsOptional() @IsIn(FUEL_TYPES) fuelType?: (typeof FUEL_TYPES)[number]
  @IsDateString() date: string
  /** Signed only for adjustments. */
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) litres: number
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) rate?: number | null
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) amount?: number | null
  @IsOptional() @IsString() @MaxLength(160) supplier?: string | null
  @IsOptional() @IsString() @MaxLength(80) billNo?: string | null
  @ValidateIf(o => o.entryType === 'issue') @IsUUID() machineId?: string | null
  @IsOptional() @IsString() @MaxLength(120) operator?: string | null
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 1 }) @Min(0) meterReading?: number | null
  @IsOptional() @IsString() @MaxLength(1000) remarks?: string | null
  @IsOptional() @IsString() @MaxLength(500) photoUrl?: string | null
}

export class FuelVoidDto {
  @IsUUID() projectId: string
  @IsString() @IsNotEmpty() @MaxLength(500) reason: string
}

export class FuelMachineDto {
  @IsUUID() projectId: string
  @IsString() @IsNotEmpty() @MaxLength(120) name: string
  @IsOptional() @IsString() @MaxLength(60) kind?: string | null
  @IsIn(MACHINE_OWNERSHIP) ownership: (typeof MACHINE_OWNERSHIP)[number]
  @ValidateIf(o => o.ownership === 'hired') @IsString() @IsNotEmpty({ message: 'Name the firm the machine is hired from' }) @MaxLength(160) ownerName?: string | null
  @IsOptional() @IsUUID() assetId?: string | null
  @IsOptional() @IsString() @MaxLength(120) operator?: string | null
  @IsIn(FUEL_TYPES) fuelType: (typeof FUEL_TYPES)[number]
  @IsIn(METER_UNITS) meterUnit: (typeof METER_UNITS)[number]
  @IsOptional() @IsString() @MaxLength(300) logbookNames?: string | null
  @IsOptional() @IsBoolean() active?: boolean
}
