import { Type } from 'class-transformer'
import {
  IsArray, IsBoolean, IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min, ValidateNested,
} from 'class-validator'

/**
 * Input for an activity. The global ValidationPipe strips anything not
 * declared here, so every field the app writes is listed — including the ones
 * that are only displayed back (remarks, responsibility, EOT notes).
 */
export class DependencyDto {
  @IsString() @MaxLength(40) code: string
  @IsIn(['FS', 'SS', 'FF', 'SF']) type: 'FS' | 'SS' | 'FF' | 'SF'
  @Type(() => Number) @IsInt() @Min(-3650) @Max(3650) lag: number
}

class WbsTaskFields {
  @IsOptional() @IsString() description?: string
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(6) level?: number
  @IsOptional() @IsString() parentId?: string | null
  @IsOptional() @Type(() => Number) @IsInt() sortOrder?: number

  @IsOptional() @IsDateString() plannedStart?: string
  @IsOptional() @IsDateString() plannedEnd?: string
  /** Working days. The CPM input — dates are only the plan it is compared with. */
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(5000) plannedDuration?: number
  @IsOptional() @IsIn(['seven_day', 'six_day', 'winter_restricted']) calendar?: string
  @IsOptional() @IsIn(['contract', 'post_completion']) scheduleScope?: 'contract' | 'post_completion'
  @IsOptional() @IsIn(['SNET', 'FNLT', '', null]) constraintType?: 'SNET' | 'FNLT' | '' | null
  @IsOptional() @IsString() constraintDate?: string | null

  @IsOptional() @IsString() actualStart?: string | null
  @IsOptional() @IsString() actualEnd?: string | null
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(100) progressPct?: number
  @IsOptional() @IsIn(['not_started', 'in_progress', 'completed', 'delayed', 'on_hold']) status?: string

  @IsOptional() @IsBoolean() isMilestone?: boolean
  @IsOptional() @IsString() paymentMilestone?: string
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(100) paymentPct?: number

  @IsOptional() @IsString() responsible?: string
  @IsOptional() @IsString() remarks?: string
  @IsOptional() @IsString() delayReason?: string
  @IsOptional() @IsBoolean() eotApplied?: boolean
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) eotDays?: number

  @IsOptional() @IsString() predecessors?: string
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => DependencyDto) dependencies?: DependencyDto[]
}

// Identity fields are declared on each class rather than overridden: an
// override of an optional parent field does not make it required.
export class CreateWbsTaskDto extends WbsTaskFields {
  @IsString() projectId: string
  @IsString() @MaxLength(40) wbsCode: string
  @IsString() @MaxLength(300) title: string
}

export class UpdateWbsTaskDto extends WbsTaskFields {
  @IsOptional() @IsString() @MaxLength(40) wbsCode?: string
  @IsOptional() @IsString() @MaxLength(300) title?: string
}

export class CreateBaselineDto {
  @IsString() projectId: string
  @IsString() @MaxLength(120) name: string
  @IsOptional() @IsString() @MaxLength(2000) notes?: string
}
