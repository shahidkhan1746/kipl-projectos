import { IsEnum, IsOptional, IsString } from 'class-validator';

export class ApproveFileDto {
  @IsEnum(['approved', 'rejected']) action: 'approved' | 'rejected';
  @IsOptional() @IsString()         remarks?: string;
}
