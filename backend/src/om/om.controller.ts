import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common'
import { OmService } from './om.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { UserRole } from '../users/user.entity'

const OM_ROLES = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.PROJECT_MANAGER,
  UserRole.ENGINEER,
  UserRole.QA_ENGINEER,
]

@Controller('om')
@UseGuards(JwtAuthGuard)
export class OmController {
  constructor(private readonly svc: OmService) {}

  @Get('dashboard')
  dashboard(@Query('projectId') pid: string) { return this.svc.dashboard(pid) }

  // Process logs
  @Get('logs')
  listLogs(@Query() q: any) { return this.svc.listLogs({ projectId: q.projectId, from: q.from, to: q.to }) }

  @Post('logs')
  @UseGuards(RolesGuard)
  @Roles(...OM_ROLES)
  @HttpCode(HttpStatus.CREATED)
  createLog(@Body() body: any) { return this.svc.createLog(body) }

  @Patch('logs/:id')
  @UseGuards(RolesGuard)
  @Roles(...OM_ROLES)
  updateLog(@Param('id') id: string, @Body() body: any) { return this.svc.updateLog(id, body) }

  @Delete('logs/:id')
  @UseGuards(RolesGuard)
  @Roles(...OM_ROLES)
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteLog(@Param('id') id: string) { return this.svc.deleteLog(id) }

  // Breakdown / maintenance events
  @Get('events')
  listEvents(@Query() q: any) { return this.svc.listEvents({ projectId: q.projectId, type: q.type, status: q.status }) }

  @Post('events')
  @UseGuards(RolesGuard)
  @Roles(...OM_ROLES)
  @HttpCode(HttpStatus.CREATED)
  createEvent(@Body() body: any) { return this.svc.createEvent(body) }

  @Patch('events/:id')
  @UseGuards(RolesGuard)
  @Roles(...OM_ROLES)
  updateEvent(@Param('id') id: string, @Body() body: any) { return this.svc.updateEvent(id, body) }

  @Delete('events/:id')
  @UseGuards(RolesGuard)
  @Roles(...OM_ROLES)
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteEvent(@Param('id') id: string) { return this.svc.deleteEvent(id) }

  // Preventive-maintenance schedule
  @Get('pm')
  listPm(@Query('projectId') pid: string) { return this.svc.listPm(pid) }

  @Post('pm')
  @UseGuards(RolesGuard)
  @Roles(...OM_ROLES)
  @HttpCode(HttpStatus.CREATED)
  createPm(@Body() body: any) { return this.svc.createPm(body) }

  @Patch('pm/:id')
  @UseGuards(RolesGuard)
  @Roles(...OM_ROLES)
  updatePm(@Param('id') id: string, @Body() body: any) { return this.svc.updatePm(id, body) }

  @Post('pm/:id/done')
  @UseGuards(RolesGuard)
  @Roles(...OM_ROLES)
  markPmDone(@Param('id') id: string) { return this.svc.markPmDone(id) }

  @Delete('pm/:id')
  @UseGuards(RolesGuard)
  @Roles(...OM_ROLES)
  @HttpCode(HttpStatus.NO_CONTENT)
  deletePm(@Param('id') id: string) { return this.svc.deletePm(id) }
}
