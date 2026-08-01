import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common'
import { OmService } from './om.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'

@Controller('om') @UseGuards(JwtAuthGuard)
export class OmController {
  constructor(private readonly svc: OmService) {}

  @Get('dashboard')
  dashboard(@Query('projectId') pid: string) { return this.svc.dashboard(pid) }

  // Process logs
  @Get('logs')
  listLogs(@Query() q: any) { return this.svc.listLogs({ projectId: q.projectId, from: q.from, to: q.to }) }
  @Post('logs') @HttpCode(HttpStatus.CREATED)
  createLog(@Body() body: any) { return this.svc.createLog(body) }
  @Patch('logs/:id')
  updateLog(@Param('id') id: string, @Body() body: any) { return this.svc.updateLog(id, body) }
  @Delete('logs/:id') @HttpCode(HttpStatus.NO_CONTENT)
  deleteLog(@Param('id') id: string) { return this.svc.deleteLog(id) }

  // Breakdown / maintenance events
  @Get('events')
  listEvents(@Query() q: any) { return this.svc.listEvents({ projectId: q.projectId, type: q.type, status: q.status }) }
  @Post('events') @HttpCode(HttpStatus.CREATED)
  createEvent(@Body() body: any) { return this.svc.createEvent(body) }
  @Patch('events/:id')
  updateEvent(@Param('id') id: string, @Body() body: any) { return this.svc.updateEvent(id, body) }
  @Delete('events/:id') @HttpCode(HttpStatus.NO_CONTENT)
  deleteEvent(@Param('id') id: string) { return this.svc.deleteEvent(id) }
}
