import { Controller, Get, Post, Body, Query, UseGuards, Request } from '@nestjs/common'
import { SettingsService } from './settings.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { UserRole } from '../users/user.entity'

const SENSITIVE_CATEGORIES = new Set(['secrets', 'email', 'storage', 'ai_keys', 'api_keys', 'credentials'])
const SENSITIVE_KEY_PATTERNS = /(key|secret|token|pass|pwd|password|credential)/i

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private readonly svc: SettingsService) {}

  @Get()
  async getAll(@Query('category') category?: string, @Request() req?: any) {
    const list = await this.svc.getAll(category)
    const role = req?.user?.role
    const isAdmin = role === UserRole.SUPER_ADMIN || role === UserRole.ADMIN
    if (isAdmin) return list

    return list
      .filter(s => !SENSITIVE_CATEGORIES.has(s.category?.toLowerCase() ?? ''))
      .map(s => {
        if (SENSITIVE_KEY_PATTERNS.test(s.key)) {
          return { ...s, value: '••••••••' }
        }
        return s
      })
  }

  @Get('key')
  async get(@Query('key') key: string, @Request() req?: any) {
    const role = req?.user?.role
    const isAdmin = role === UserRole.SUPER_ADMIN || role === UserRole.ADMIN
    if (!isAdmin && SENSITIVE_KEY_PATTERNS.test(key)) {
      return { key, value: '••••••••' }
    }
    const val = await this.svc.get(key)
    return { key, value: val }
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  set(@Body() body: { key: string; value: string; label?: string; category?: string }) {
    return this.svc.set(body.key, body.value, body.label, body.category)
  }

  @Post('bulk')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  setBulk(@Body() body: Array<{ key: string; value: string; label?: string; category?: string }>) {
    return this.svc.setBulk(body)
  }
}
