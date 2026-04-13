import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common'
import { SettingsService } from './settings.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private readonly svc: SettingsService) {}

  @Get()
  getAll(@Query('category') category?: string) { return this.svc.getAll(category) }

  @Get('key')
  get(@Query('key') key: string) { return this.svc.get(key).then(v => ({ key, value: v })) }

  @Post()
  set(@Body() body: { key: string; value: string; label?: string; category?: string }) {
    return this.svc.set(body.key, body.value, body.label, body.category)
  }

  @Post('bulk')
  setBulk(@Body() body: Array<{ key: string; value: string; label?: string; category?: string }>) {
    return this.svc.setBulk(body)
  }
}
