import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  async list(@Request() req: any, @Query() query: any) {
    return await this.service.getUserNotifications(req.user.id, query);
  }

  @Get('unread-count')
  async getUnreadCount(@Request() req: any) {
    return await this.service.getUnreadCount(req.user.id);
  }

  @Patch(':id/read')
  async markAsRead(@Request() req: any, @Param('id') id: string) {
    return await this.service.markAsRead(id, req.user.id);
  }

  @Post('mark-all-read')
  async markAllRead(@Request() req: any) {
    return await this.service.markAllAsRead(req.user.id);
  }

  @Delete('clear-read')
  async clearRead(@Request() req: any) {
    return await this.service.clearReadNotifications(req.user.id);
  }

  @Delete(':id')
  async deleteNotification(@Request() req: any, @Param('id') id: string) {
    return await this.service.deleteNotification(id, req.user.id);
  }
}
