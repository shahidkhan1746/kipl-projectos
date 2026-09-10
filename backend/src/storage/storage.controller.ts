import { Controller, Get, Post, Body, UseGuards, HttpCode, HttpStatus, Param, Query, Res } from '@nestjs/common'
import type { Response } from 'express'
import { StorageService } from './storage.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { UserRole } from '../users/user.entity'
import { Public } from '../auth/decorators/public.decorator'

@Controller('storage')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class StorageController {
  constructor(private readonly svc: StorageService) {}

  @Get('config')
  config() { return this.svc.getMaskedConfig() }

  @Post('config') @HttpCode(HttpStatus.OK)
  save(@Body() body: any) { return this.svc.saveConfig(body) }

  @Post('test') @HttpCode(HttpStatus.OK)
  test() { return this.svc.testConnection() }
}
