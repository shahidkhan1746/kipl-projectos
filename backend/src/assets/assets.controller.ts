import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Put, Query, Request, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { User, UserRole } from '../users/user.entity'
import { AssetsService } from './assets.service'
import { AssetActionDto, AssetQueryDto, AssetWriteDto } from './asset.dto'

const WRITE = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.ACCOUNTS, UserRole.ACCOUNTANT, UserRole.HR_OFFICER]
const READ = [...WRITE, UserRole.ENGINEER, UserRole.SUPERVISOR]
@Controller('assets')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...READ)
export class AssetsController {
  constructor(private readonly service: AssetsService) {}
  @Get() list(@Query() q: AssetQueryDto, @Request() req: { user: User }) { return this.service.list(q, req.user) }
  @Get('custodians') custodians(@Query('projectId', ParseUUIDPipe) pid: string, @Request() req: { user: User }) { return this.service.custodians(pid, req.user) }
  @Get(':id/history') history(@Param('id', ParseUUIDPipe) id: string, @Query('projectId', ParseUUIDPipe) pid: string, @Request() req: { user: User }) { return this.service.history(id, pid, req.user) }
  @Post() @Roles(...WRITE) create(@Body() dto: AssetWriteDto, @Request() req: { user: User }) { return this.service.create(dto, req.user) }
  @Put(':id') @Roles(...WRITE) update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AssetWriteDto, @Request() req: { user: User }) { return this.service.update(id, dto, req.user) }
  @Post(':id/events') @Roles(...WRITE) action(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AssetActionDto, @Request() req: { user: User }) { return this.service.action(id, dto, req.user) }
}
