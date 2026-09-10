import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Request, HttpCode, HttpStatus, BadRequestException } from '@nestjs/common'
import { MeetingService } from './meeting.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { UserRole } from '../users/user.entity'

const MEETING_WRITE = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.PROJECT_MANAGER,
  UserRole.ENGINEER,
  UserRole.LIAISON_OFFICER,
]

@Controller('meetings') @UseGuards(JwtAuthGuard)
export class MeetingController {
  constructor(private readonly svc: MeetingService) {}

  @Get('dashboard')
  dashboard(@Query('projectId') pid: string) { return this.svc.dashboard(pid) }

  @Get()
  list(@Query() q: any) { return this.svc.list({ projectId: q.projectId, type: q.type, status: q.status, fromDate: q.fromDate, toDate: q.toDate }) }

  @Post() @HttpCode(HttpStatus.CREATED)
  @UseGuards(RolesGuard) @Roles(...MEETING_WRITE)
  create(@Body() body: any, @Request() req: any) {
    if (!body.projectId) throw new BadRequestException('Project ID is required')
    if (!body.title?.trim()) throw new BadRequestException('Meeting title is required')
    if (!body.date) throw new BadRequestException('Meeting date is required')
    return this.svc.create({ ...body, minutedBy: body.minutedBy || req.user?.name })
  }

  @Get(':id')
  getOne(@Param('id') id: string) { return this.svc.findOne(id) }

  @Patch(':id')
  @UseGuards(RolesGuard) @Roles(...MEETING_WRITE)
  update(@Param('id') id: string, @Body() body: any) { return this.svc.update(id, body) }

  @Patch(':id/circulate')
  @UseGuards(RolesGuard) @Roles(...MEETING_WRITE)
  circulate(@Param('id') id: string) { return this.svc.circulate(id) }

  @Patch(':id/confirm')
  @UseGuards(RolesGuard) @Roles(...MEETING_WRITE)
  confirm(@Param('id') id: string) { return this.svc.confirm(id) }

  @Patch(':id/actions/:idx')
  @UseGuards(RolesGuard) @Roles(...MEETING_WRITE)
  updateAction(@Param('id') id: string, @Param('idx') idx: string, @Body() body: any) {
    return this.svc.updateActionItem(id, parseInt(idx), body)
  }
}
