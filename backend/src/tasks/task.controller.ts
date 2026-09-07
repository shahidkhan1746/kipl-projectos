import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common'
import { TaskService } from './task.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { UserRole } from '../users/user.entity'

@Controller('tasks-board') @UseGuards(JwtAuthGuard)
export class TaskController {
  constructor(private readonly svc: TaskService) {}

  @Get('dashboard')
  dashboard(@Query('projectId') pid: string, @Request() req: any) { return this.svc.dashboard(pid, req.user) }

  @Get()
  list(@Query() q: any, @Request() req: any) { return this.svc.list({ projectId: q.projectId, assignedTo: q.assignedTo, status: q.status, priority: q.priority, limit: q.limit }, req.user) }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.ENGINEER, UserRole.SUPERVISOR)
  @HttpCode(HttpStatus.CREATED)
  create(@Body() body: any, @Request() req: any) {
    return this.svc.create({ ...body, createdBy: req.user?.name ?? req.user?.id })
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any, @Request() req: any) { return this.svc.update(id, body, req.user) }

  @Post(':id/comments') @HttpCode(HttpStatus.CREATED)
  comment(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    return this.svc.addComment(id, { author: req.user?.name ?? 'Unknown', text: body.text }, req.user)
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PROJECT_MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id') id: string) { return this.svc.delete(id) }
}
