import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, IsEmail } from 'class-validator';
import { LetterType } from '../letter.entity';

export class CreateLetterDto {
  @IsUUID()     projectId:       string;
  @IsOptional() @IsUUID()        fileId?:         string;
  @IsOptional() @IsEnum(LetterType) letterType?:  LetterType;
  @IsOptional() @IsString()      toName?:         string;
  @IsOptional() @IsString()      toOrganization?: string;
  @IsOptional() @IsEmail()       toEmail?:        string;
  @IsString() @IsNotEmpty()      subject:         string;
  @IsString() @IsNotEmpty()      body:            string;
  @IsOptional() @IsString()      date?:           string;
  @IsOptional() @IsString()      signedById?:     string;
}
