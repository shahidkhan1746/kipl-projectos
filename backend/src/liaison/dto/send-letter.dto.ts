import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SendLetterDto {
  @IsEmail()                     toEmail:    string;
  @IsString() @IsNotEmpty()      subject:    string;
  @IsOptional() @IsString()      bodyNote?:  string; // short covering note in email body
}
