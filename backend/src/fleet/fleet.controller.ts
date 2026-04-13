import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common'
import { FleetService } from './fleet.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'

@UseGuards(JwtAuthGuard)
@Controller('api/v1/fleet')
export class FleetController {
  constructor(private svc: FleetService) {}

  @Get('dashboard')
  dashboard(@Query('projectId') projectId: string) {
    return this.svc.dashboard(projectId)
  }

  @Get()
  list(@Query() q: any) { return this.svc.list(q) }

  @Post()
  create(@Body() dto: any) { return this.svc.create(dto) }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: any) { return this.svc.update(id, dto) }

  @Delete(':id')
  delete(@Param('id') id: string) { return this.svc.delete(id) }
}
