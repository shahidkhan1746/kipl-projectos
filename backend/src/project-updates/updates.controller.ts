import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query,
  UseGuards, UseInterceptors, UploadedFile, Request,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { UpdatesService } from './updates.service'
import { StorageService } from '../storage/storage.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { UserRole } from '../users/user.entity'

const EDITORS = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PROJECT_MANAGER]

// Internal-only: create/manage the project updates & team shown on the public site.
@Controller('project-updates')
@UseGuards(JwtAuthGuard)
export class UpdatesController {
  constructor(
    private readonly svc: UpdatesService,
    private readonly storage: StorageService,
  ) {}

  // --- photo upload (shared by updates & team) ---
  @Post('upload')
  @UseGuards(RolesGuard) @Roles(...EDITORS)
  @UseInterceptors(FileInterceptor('file'))
  upload(@UploadedFile() file: any, @Query('folder') folder?: string) {
    return this.storage.upload(file, folder === 'team' ? 'team' : 'updates')
  }

  // --- updates ---
  @Get() list() { return this.svc.listAll() }
  @Get('team/all') teamAll() { return this.svc.listTeamAll() }
  @Get(':id') one(@Param('id') id: string) { return this.svc.getOne(id) }

  @Post()
  @UseGuards(RolesGuard) @Roles(...EDITORS)
  create(@Body() body: any, @Request() req: any) { return this.svc.create(body, req.user?.name) }

  @Patch(':id')
  @UseGuards(RolesGuard) @Roles(...EDITORS)
  edit(@Param('id') id: string, @Body() body: any) { return this.svc.update(id, body) }

  @Delete(':id')
  @UseGuards(RolesGuard) @Roles(...EDITORS)
  remove(@Param('id') id: string) { return this.svc.remove(id) }

  // --- team ---
  @Post('team')
  @UseGuards(RolesGuard) @Roles(...EDITORS)
  createTeam(@Body() body: any) { return this.svc.createTeam(body) }

  @Patch('team/:id')
  @UseGuards(RolesGuard) @Roles(...EDITORS)
  editTeam(@Param('id') id: string, @Body() body: any) { return this.svc.updateTeam(id, body) }

  @Delete('team/:id')
  @UseGuards(RolesGuard) @Roles(...EDITORS)
  removeTeam(@Param('id') id: string) { return this.svc.removeTeam(id) }
}
