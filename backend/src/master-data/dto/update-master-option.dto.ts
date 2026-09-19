import { IsString, IsOptional, IsBoolean, IsNumber, IsObject } from 'class-validator';

export class UpdateMasterOptionDto {
  @IsString()
  @IsOptional()
  dropdownType?: string;

  @IsString()
  @IsOptional()
  label?: string;

  @IsString()
  @IsOptional()
  value?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  unit?: string;

  @IsString()
  @IsOptional()
  spec?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @IsNumber()
  @IsOptional()
  displayOrder?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
