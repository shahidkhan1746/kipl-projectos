import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common'
import { SiteOrderService } from './site-order.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { UserRole } from '../users/user.entity'

const SO_ROLES = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.PROJECT_MANAGER,
  UserRole.ENGINEER,
  UserRole.LIAISON_OFFICER,
]

@Controller('site-orders')
@UseGuards(JwtAuthGuard)
export class SiteOrderController {
  constructor(private readonly svc: SiteOrderService) {}

  @Get()
  list(@Query('projectId') pid: string, @Query('status') status: string, @Query('limit') limit?: string) { return this.svc.list(pid, status, limit) }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(...SO_ROLES)
  @HttpCode(HttpStatus.CREATED)
  create(@Body() body: any) { return this.svc.create(body) }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(...SO_ROLES)
  update(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    const safeBody = body.acknowledgedBy !== undefined
      ? {
          ...body,
          acknowledgedBy: req.user?.name ?? req.user?.id,
          acknowledgedDate: new Date().toISOString().split('T')[0],
        }
      : body
    return this.svc.update(id, safeBody)
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(...SO_ROLES)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) { return this.svc.remove(id) }
}
