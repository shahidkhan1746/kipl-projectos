import { IsDateString, IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, IsUrl, Matches, Max, MaxLength, Min } from 'class-validator'
import { ASSET_CATEGORIES, ASSET_CONDITIONS, ASSET_STATUSES } from './asset.entity'

export class AssetWriteDto {
  @IsUUID() projectId: string
  @IsString() @IsNotEmpty() @MaxLength(60) @Matches(/^[A-Za-z0-9][A-Za-z0-9._/-]*$/) assetTag: string
  @IsString() @IsNotEmpty() @MaxLength(200) name: string
  @IsIn(ASSET_CATEGORIES) category: string
  @IsString() @IsNotEmpty() @MaxLength(200) location: string
  @IsIn(ASSET_CONDITIONS) condition: string
  @IsOptional() @IsString() @MaxLength(120) brand?: string
  @IsOptional() @IsString() @MaxLength(120) model?: string
  @IsOptional() @IsString() @MaxLength(150) serialNumber?: string
  @IsOptional() @IsString() @MaxLength(200) supplier?: string
  @IsOptional() @IsString() @MaxLength(100) invoiceNumber?: string
  @IsOptional() @IsDateString({ strict: true }) @Matches(/^\d{4}-\d{2}-\d{2}$/) purchaseDate?: string
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(999999999999.99) purchaseCost?: number
  @IsOptional() @IsDateString({ strict: true }) @Matches(/^\d{4}-\d{2}-\d{2}$/) warrantyUntil?: string
  @IsOptional() @IsString() @MaxLength(60) registrationNumber?: string
  @IsOptional() @IsDateString({ strict: true }) @Matches(/^\d{4}-\d{2}-\d{2}$/) insuranceUntil?: string
  @IsOptional() @IsDateString({ strict: true }) @Matches(/^\d{4}-\d{2}-\d{2}$/) serviceDue?: string
  @IsOptional() @IsUrl({ protocols: ['https'], require_protocol: true }) @MaxLength(2000) documentUrl?: string
  @IsOptional() @IsUrl({ protocols: ['https'], require_protocol: true }) @MaxLength(2000) photoUrl?: string
  @IsOptional() @IsString() @MaxLength(4000) notes?: string
  @IsOptional() @IsInt() @Min(1) version?: number
  @IsOptional() @IsString() @MaxLength(1000) reason?: string
}

export class AssetQueryDto {
  @IsUUID() projectId: string
  @IsOptional() @IsString() @MaxLength(120) search?: string
  @IsOptional() @IsIn(ASSET_CATEGORIES) category?: string
  @IsOptional() @IsIn(ASSET_STATUSES) status?: string
  @IsOptional() @IsInt() @Min(1) @Max(100000) page?: number
}

export const ASSET_ACTIONS = ['assign', 'return', 'transfer', 'repair', 'repair_complete', 'lost', 'recover', 'dispose', 'verify', 'maintenance'] as const
export class AssetActionDto {
  @IsUUID() projectId: string
  @IsInt() @Min(1) version: number
  @IsIn(ASSET_ACTIONS) action: typeof ASSET_ACTIONS[number]
  @IsDateString({ strict: true }) @Matches(/^\d{4}-\d{2}-\d{2}$/) eventDate: string
  @IsString() @IsNotEmpty() @MaxLength(1000) reason: string
  @IsOptional() @IsUUID() employeeId?: string
  @IsOptional() @IsString() @MaxLength(200) location?: string
}
