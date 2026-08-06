import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common'
import { AiService } from './ai.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { UserRole } from '../users/user.entity'

@Controller('ai') @UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly svc: AiService) {}

  // Config — SuperAdmin only
  @Get('config') @UseGuards(RolesGuard) @Roles(UserRole.SUPER_ADMIN)
  getConfig() { return this.svc.getMasked() }
  @Post('config') @UseGuards(RolesGuard) @Roles(UserRole.SUPER_ADMIN)
  saveConfig(@Body() body: any) { return this.svc.save(body) }
  @Post('test') @UseGuards(RolesGuard) @Roles(UserRole.SUPER_ADMIN)
  test() { return this.svc.test() }

  // Generation — any authenticated user
  @Post('generate')
  async generate(@Body() body: { prompt: string; system?: string }) {
    const text = await this.svc.generate(body.prompt, body.system)
    return { text }
  }
}
