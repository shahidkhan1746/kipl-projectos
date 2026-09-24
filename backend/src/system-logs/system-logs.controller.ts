import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Query,
  Param,
  Req,
  Ip,
  Headers,
  UseGuards,
} from '@nestjs/common'
import { SystemLogsService } from './system-logs.service'
import { CreateSystemLogDto, ListLogsQueryDto } from './dto/system-log.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { Public } from '../auth/decorators/public.decorator'
import { UserRole } from '../users/user.entity'

@Controller('system-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SystemLogsController {
  constructor(private readonly service: SystemLogsService) {}

  /**
   * Public endpoint to report client-side runtime errors, network timeouts,
   * and unexpected exceptions from web browsers and mobile apps.
   */
  @Public()
  @Post('client')
  async reportClientError(
    @Body() body: Partial<CreateSystemLogDto>,
    @Ip() ip: string,
    @Headers('user-agent') userAgent?: string,
    @Req() req?: any,
  ) {
    const user = req?.user
    return this.service.logError({
      source: body.source || 'frontend',
      level: body.level || 'error',
      errorName: body.errorName || 'ClientError',
      message: body.message || 'Unknown client error',
      stack: body.stack,
      path: body.path,
      method: body.method,
      statusCode: body.statusCode,
      userId: user?.id || body.userId,
      userEmail: user?.email || body.userEmail,
      userRole: user?.role || body.userRole,
      ipAddress: ip,
      userAgent: userAgent || body.userAgent,
      metadata: body.metadata,
    })
  }

  /**
   * Lists system logs with filters and pagination.
   */
  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PROJECT_MANAGER)
  async listLogs(@Query() query: ListLogsQueryDto) {
    return this.service.listLogs(query)
  }

  /**
   * Returns system error statistics and trends for the troubleshooting dashboard.
   */
  @Get('stats')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PROJECT_MANAGER)
  async getStats() {
    return this.service.getStats()
  }

  /**
   * Executes a live diagnostic check (database ping, memory usage, uptime, schema status).
   */
  @Get('diagnostics')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PROJECT_MANAGER)
  async getDiagnostics() {
    return this.service.getDiagnostics()
  }

  /**
   * Marks a specific error log as resolved.
   */
  @Patch(':id/resolve')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PROJECT_MANAGER)
  async resolveLog(
    @Param('id') id: string,
    @Body('resolved') resolved?: boolean,
  ) {
    return this.service.resolveLog(id, resolved !== false)
  }

  /**
   * Marks all unresolved error logs as resolved.
   */
  @Post('resolve-all')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PROJECT_MANAGER)
  async resolveAll() {
    return this.service.resolveAll()
  }

  /**
   * Prunes logs older than the specified number of days (default 30).
   */
  @Delete('prune')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async pruneLogs(@Query('days') days?: string) {
    const numDays = days ? parseInt(days, 10) : 30
    return this.service.deleteOldLogs(isNaN(numDays) ? 30 : numDays)
  }
}
