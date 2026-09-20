import { Controller, Get, Post, Patch, Delete, Param, Body, Query, Request, UseGuards, HttpCode, HttpStatus } from '@nestjs/common'
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

  /**
   * Fills rate, purpose and WBS across many rows. Declared before the :id
   * routes so 'complete' is matched as the path it is rather than as an entry
   * id.
   */
  @Patch('complete')
  @UseGuards(RolesGuard)
  @Roles(...MAT_ROLES)
  completeEntries(@Body() body: any) {
    return this.svc.completeEntries(body?.entries ?? body)
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(...MAT_ROLES)
  update(@Param('id') id: string, @Body() body: any) { return this.svc.update(id, body) }

  @Get('withdrawn')
  listWithdrawn(@Query('projectId') pid: string) { return this.svc.listWithdrawn(pid) }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(...MAT_ROLES)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Request() req: any, @Query('reason') reason?: string) {
    return this.svc.remove(id, { userId: req.user?.id, reason })
  }
}
