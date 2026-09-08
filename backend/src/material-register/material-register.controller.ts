import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common'
import { MaterialRegisterService } from './material-register.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { UserRole } from '../users/user.entity'

const MAT_ROLES = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.PROJECT_MANAGER,
  UserRole.ENGINEER,
  UserRole.SUPERVISOR,
]

@Controller('material-register')
@UseGuards(JwtAuthGuard)
export class MaterialRegisterController {
  constructor(private readonly svc: MaterialRegisterService) {}

  @Get()
  list(@Query('projectId') pid: string, @Query('limit') limit?: string) { return this.svc.list(pid, limit) }

  @Get('summary')
  summary(@Query('projectId') pid: string) { return this.svc.summary(pid) }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(...MAT_ROLES)
  @HttpCode(HttpStatus.CREATED)
  create(@Body() body: any) { return this.svc.create(body) }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(...MAT_ROLES)
  update(@Param('id') id: string, @Body() body: any) { return this.svc.update(id, body) }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(...MAT_ROLES)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) { return this.svc.remove(id) }
}
