import { Controller, Get, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common'
import { MailerService } from './mailer.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'

@Controller('mailer')
@UseGuards(JwtAuthGuard)
export class MailerController {
  constructor(private readonly svc: MailerService) {}

  @Get('status')
  status() { return this.svc.isConfigured() }

  @Get('config')
  async getConfig() {
    const c = await this.svc.getConfig()
    if (!c) return null
    // Never return the password
    return {
      smtpHost:   c.smtpHost,
      smtpPort:   c.smtpPort,
      smtpUser:   c.smtpUser,
      fromName:   c.fromName,
      fromEmail:  c.fromEmail,
      isVerified: c.isVerified,
      lastTestedAt: c.lastTestedAt,
    }
  }

  @Post('config') @HttpCode(HttpStatus.CREATED)
  saveConfig(@Body() body: any) { return this.svc.saveConfig(body) }

  @Post('test') @HttpCode(HttpStatus.OK)
  test(@Body('to') to: string) { return this.svc.testConnection(to) }

  @Post('send') @HttpCode(HttpStatus.OK)
  send(@Body() body: any) { return this.svc.sendEmail(body) }
}
