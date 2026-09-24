import { IsOptional, IsString, IsNumber, IsBoolean, IsIn } from 'class-validator'
import { Type } from 'class-transformer'

export class CreateSystemLogDto {
  @IsOptional()
  @IsIn(['backend', 'frontend', 'mobile'])
  source?: 'backend' | 'frontend' | 'mobile'

  @IsOptional()
  @IsIn(['error', 'warn', 'fatal', 'info'])
  level?: 'error' | 'warn' | 'fatal' | 'info'

  @IsOptional()
  @IsString()
  errorName?: string

  @IsString()
  message: string

  @IsOptional()
  @IsString()
  stack?: string

  @IsOptional()
  @IsString()
  path?: string

  @IsOptional()
  @IsString()
  method?: string

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  statusCode?: number

  @IsOptional()
  @IsString()
  userId?: string

  @IsOptional()
  @IsString()
  userEmail?: string

  @IsOptional()
  @IsString()
  userRole?: string

  @IsOptional()
  @IsString()
  ipAddress?: string

  @IsOptional()
  @IsString()
  userAgent?: string

  @IsOptional()
  metadata?: Record<string, any>
}

export class ListLogsQueryDto {
  @IsOptional()
  @IsString()
  source?: string

  @IsOptional()
  @IsString()
  level?: string

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  statusCode?: number

  @IsOptional()
  @IsString()
  search?: string

  @IsOptional()
  @IsString()
  startDate?: string

  @IsOptional()
  @IsString()
  endDate?: string

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  resolved?: boolean

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number
}
