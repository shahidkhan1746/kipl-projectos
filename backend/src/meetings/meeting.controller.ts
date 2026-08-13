import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Request, HttpCode, HttpStatus, BadRequestException } from '@nestjs/common'
import { MeetingService } from './meeting.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'

@Controller('meetings') @UseGuards(JwtAuthGuard)
export class MeetingController {
  constructor(private readonly svc: MeetingService) {}

  @Get('dashboard')
  dashboard(@Query('projectId') pid: string) { return this.svc.dashboard(pid) }

  @Get()
  list(@Query() q: any) { return this.svc.list({ projectId: q.projectId, type: q.type, status: q.status, fromDate: q.fromDate, toDate: q.toDate }) }

  @Post() @HttpCode(HttpStatus.CREATED)
  create(@Body() body: any, @Request() req: any) {
    if (!body.projectId) throw new BadRequestException('Project ID is required')
    if (!body.title?.trim()) throw new BadRequestException('Meeting title is required')
    if (!body.date) throw new BadRequestException('Meeting date is required')
    return this.svc.create({ ...body, minutedBy: body.minutedBy || req.user?.name })
  }

  @Get(':id')
  getOne(@Param('id') id: string) { return this.svc.findOne(id) }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) { return this.svc.update(id, body) }

  @Patch(':id/circulate')
  circulate(@Param('id') id: string) { return this.svc.circulate(id) }

  @Patch(':id/confirm')
  confirm(@Param('id') id: string) { return this.svc.confirm(id) }

  @Patch(':id/actions/:idx')
  updateAction(@Param('id') id: string, @Param('idx') idx: string, @Body() body: any) {
    return this.svc.updateActionItem(id, parseInt(idx), body)
  }
}
