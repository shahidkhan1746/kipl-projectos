import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common'
import { FleetService } from './fleet.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { UserRole } from '../users/user.entity'
import { CreateFleetLogDto } from './dto/create-fleet-log.dto'
import { UpdateFleetLogDto } from './dto/update-fleet-log.dto'

const FLEET_ROLES = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.PROJECT_MANAGER,
  UserRole.ENGINEER,
  UserRole.SUPERVISOR,
]

@UseGuards(JwtAuthGuard)
@Controller('fleet')
export class FleetController {
  constructor(private svc: FleetService) {}

  @Get('dashboard')
  dashboard(@Query('projectId') projectId: string) {
    return this.svc.dashboard(projectId)
  }

  @Get()
  list(@Query() q: any) { return this.svc.list(q) }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(...FLEET_ROLES)
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateFleetLogDto, @Request() req: any) {
    return this.svc.create({
      ...dto,
      reportedBy: req.user?.name ?? req.user?.id,
    })
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(...FLEET_ROLES)
  update(@Param('id') id: string, @Body() dto: UpdateFleetLogDto) { return this.svc.update(id, dto) }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(...FLEET_ROLES)
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id') id: string) { return this.svc.delete(id) }
}
