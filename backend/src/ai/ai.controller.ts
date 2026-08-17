import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Request, Query } from '@nestjs/common'
import { AiService } from './ai.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { UserRole } from '../users/user.entity'

@Controller('ai') @UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly svc: AiService) {}

  // Config + key pool — SuperAdmin only
  @Get('config') @UseGuards(RolesGuard) @Roles(UserRole.SUPER_ADMIN)
  getConfig() { return this.svc.getMasked() }
  @Post('config') @UseGuards(RolesGuard) @Roles(UserRole.SUPER_ADMIN)
  saveConfig(@Body() body: any) { return this.svc.saveConfig(body) }

  @Post('keys') @UseGuards(RolesGuard) @Roles(UserRole.SUPER_ADMIN)
  createKey(@Body() body: any) { return this.svc.createKey(body) }
  @Patch('keys/:id') @UseGuards(RolesGuard) @Roles(UserRole.SUPER_ADMIN)
  updateKey(@Param('id') id: string, @Body() body: any) { return this.svc.updateKey(id, body) }
  @Delete('keys/:id') @UseGuards(RolesGuard) @Roles(UserRole.SUPER_ADMIN)
  deleteKey(@Param('id') id: string) { return this.svc.deleteKey(id) }
  @Post('keys/:id/test') @UseGuards(RolesGuard) @Roles(UserRole.SUPER_ADMIN)
  testKey(@Param('id') id: string) { return this.svc.testKey(id) }

  // Generation — any authenticated user
  @Post('generate')
  async generate(@Body() body: { prompt: string; system?: string }) {
    const text = await this.svc.generate(body.prompt, body.system)
    return { text }
  }

  @Get('chat/sessions')
  getSessions(@Request() req: any, @Query('projectId') projectId: string) {
    return this.svc.getSessions(req.user.id, projectId)
  }

  @Get('chat/sessions/:id')
  getSessionHistory(@Param('id') id: string) {
    return this.svc.getSessionHistory(id)
  }

  @Post('chat')
  async chat(@Body() body: { sessionId: string; query: string; projectId: string }, @Request() req: any) {
    const text = await this.svc.chat(body.sessionId, body.query, req.user.id, body.projectId)
    return { text }
  }
}
