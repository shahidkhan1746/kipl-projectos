import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common'
import { DiaryService } from './diary.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'

@Controller('diary') @UseGuards(JwtAuthGuard)
export class DiaryController {
  constructor(private readonly svc: DiaryService) {}

  @Get('dashboard')
  dashboard(@Query('projectId') pid: string) { return this.svc.dashboard(pid) }

  @Get()
  list(@Query() q: any) {
    return this.svc.list({ projectId: q.projectId, fromDate: q.fromDate, toDate: q.toDate, status: q.status, eotOnly: q.eotOnly === 'true' })
  }

  @Get('by-date')
  byDate(@Query('projectId') pid: string, @Query('date') date: string) {
    return this.svc.findByDate(pid, date)
  }

  @Get(':id')
  getOne(@Param('id') id: string) { return this.svc.findOne(id) }

  @Post() @HttpCode(HttpStatus.CREATED)
  create(@Body() body: any, @Request() req: any) {
    return this.svc.create({ ...body, submittedBy: req.user?.name ?? req.user?.id })
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) { return this.svc.update(id, body) }

  @Patch(':id/submit')
  submit(@Param('id') id: string) { return this.svc.submit(id) }

  @Patch(':id/approve')
  approve(@Param('id') id: string, @Request() req: any) { return this.svc.approve(id, req.user?.id) }
}
