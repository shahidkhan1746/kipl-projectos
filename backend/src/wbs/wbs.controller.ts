import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common'
import { WbsService } from './wbs.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'

@Controller('wbs') @UseGuards(JwtAuthGuard)
export class WbsController {
  constructor(private readonly svc: WbsService) {}

  @Get('dashboard')
  dashboard(@Query('projectId') pid: string) { return this.svc.dashboard(pid) }

  @Get()
  list(@Query('projectId') pid: string) { return this.svc.list(pid) }

  @Post('seed') @HttpCode(HttpStatus.CREATED)
  seed(@Body('projectId') pid: string) { return this.svc.seed(pid) }

  @Post() @HttpCode(HttpStatus.CREATED)
  create(@Body() body: any) { return this.svc.create(body) }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) { return this.svc.update(id, body) }
}
