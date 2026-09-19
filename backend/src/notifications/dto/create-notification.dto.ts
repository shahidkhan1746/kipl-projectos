import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { NotificationCategory } from '../notification.entity';

export class CreateNotificationDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsEnum(NotificationCategory)
  category?: NotificationCategory | string;

  @IsString()
  @IsNotEmpty()
  type: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsOptional()
  @IsString()
  link?: string;

  @IsOptional()
  metadata?: Record<string, any>;
}
