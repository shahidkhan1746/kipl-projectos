import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common'
import { TaskService } from './task.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'

@Controller('tasks-board') @UseGuards(JwtAuthGuard)
export class TaskController {
  constructor(private readonly svc: TaskService) {}

  @Get('dashboard')
  dashboard(@Query('projectId') pid: string) { return this.svc.dashboard(pid) }

  @Get()
  list(@Query() q: any) { return this.svc.list({ projectId: q.projectId, assignedTo: q.assignedTo, status: q.status, priority: q.priority }) }

  @Post() @HttpCode(HttpStatus.CREATED)
  create(@Body() body: any, @Request() req: any) {
    return this.svc.create({ ...body, createdBy: req.user?.name ?? req.user?.id })
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) { return this.svc.update(id, body) }

  @Post(':id/comments') @HttpCode(HttpStatus.CREATED)
  comment(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    return this.svc.addComment(id, { author: req.user?.name ?? 'Unknown', text: body.text })
  }

  @Delete(':id') @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id') id: string) { return this.svc.delete(id) }
}
