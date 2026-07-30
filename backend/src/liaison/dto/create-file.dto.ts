import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { LiaisonFileType, LiaisonPriority } from '../liaison-file.entity';

export class CreateFileDto {
  @IsUUID()       projectId:  string;
  @IsString()
  @IsNotEmpty()   subject:    string;
  @IsEnum(LiaisonFileType)  fileType:   LiaisonFileType;
  @IsOptional() @IsEnum(LiaisonPriority) priority?: LiaisonPriority;
  @IsOptional() @IsString()  department?: string;
  @IsOptional() @IsString()  dueDate?:    string;
  @IsOptional() @IsString()  remarks?:    string;
  // Delay / EOT tracking (all optional at creation)
  @IsOptional() @IsString()  expectedDate?:  string;
  @IsOptional() @IsString()  actualDate?:    string;
  @IsOptional() @IsBoolean() isEotGround?:   boolean;
  @IsOptional() @IsString()  eotReason?:     string;
  @IsOptional() @IsString()  linkedWbsCode?: string;
}
