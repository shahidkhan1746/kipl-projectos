import { Type } from 'class-transformer'
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator'

export class SaveAiConfigDto {
  @IsBoolean()
  enabled: boolean
}

export class UpsertAiKeyDto {
  @IsOptional()
  @IsString()
  label?: string

  @IsString()
  @MinLength(1)
  provider: string

  @IsOptional()
  @IsString()
  apiKey?: string

  @IsOptional()
  @IsString()
  model?: string

  @IsOptional()
  @IsString()
  baseUrl?: string

  @IsOptional()
  @IsBoolean()
  enabled?: boolean

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(99)
  priority?: number
}
