import { Body, Controller, Get, Post, Query, Request, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ComplianceService } from './compliance.service'
import { StorageService } from '../storage/storage.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { UserRole } from '../users/user.entity'

const WRITE = [
  UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PROJECT_MANAGER,
  UserRole.QA_ENGINEER, UserRole.LIAISON_OFFICER, UserRole.ENGINEER,
]

@Controller('compliance')
@UseGuards(JwtAuthGuard)
export class ComplianceController {
  constructor(
    private readonly svc: ComplianceService,
    private readonly storage: StorageService,
  ) {}

  @Get('jha')
  jha(@Query('projectId') projectId: string) { return this.svc.listJha(projectId) }

  @Post('jha')
  @UseGuards(RolesGuard) @Roles(...WRITE)
  saveJha(@Body() body: any, @Request() req: any) { return this.svc.upsertJha(body, req.user) }

  @Get('items')
  items(@Query('projectId') projectId: string) { return this.svc.listItems(projectId) }

  @Post('items')
  @UseGuards(RolesGuard) @Roles(...WRITE)
  saveItem(@Body() body: any, @Request() req: any) { return this.svc.upsertItem(body, req.user) }

  @Post('evidence')
  @UseGuards(RolesGuard) @Roles(...WRITE)
  @UseInterceptors(FileInterceptor('file'))
  evidence(@UploadedFile() file: any) { return this.storage.upload(file, 'compliance') }
}
