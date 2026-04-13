import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { EmailConfig } from './email-config.entity'
import * as nodemailer from 'nodemailer'

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name)

  constructor(
    @InjectRepository(EmailConfig) private configRepo: Repository<EmailConfig>,
  ) {}

  async getConfig(): Promise<EmailConfig | null> {
    return this.configRepo.findOne({ where: { isActive: true } })
  }

  async saveConfig(data: {
    smtpHost?: string
    smtpPort?: number
    smtpUser: string
    smtpPass: string
    fromName?: string
    fromEmail: string
  }): Promise<EmailConfig> {
    // Deactivate old config
    await this.configRepo.update({}, { isActive: false })

    const config = this.configRepo.create({
      smtpHost:   data.smtpHost   ?? 'smtp.gmail.com',
      smtpPort:   data.smtpPort   ?? 587,
      smtpSecure: (data.smtpPort === 465),
      smtpUser:   data.smtpUser,
      smtpPass:   data.smtpPass,
      fromName:   data.fromName   ?? 'KIPL ProjectOS',
      fromEmail:  data.fromEmail,
      isActive:   true,
      isVerified: false,
    })
    return this.configRepo.save(config)
  }

  private async createTransporter(config: EmailConfig) {
    return nodemailer.createTransport({
      host:   config.smtpHost,
      port:   config.smtpPort,
      secure: config.smtpSecure,
      auth: {
        user: config.smtpUser,
        pass: config.smtpPass,
      },
    })
  }

  async testConnection(to: string): Promise<{ success: boolean; message: string }> {
    const config = await this.getConfig()
    if (!config) return { success: false, message: 'No email configuration found. Please save settings first.' }

    try {
      const transporter = await this.createTransporter(config)
      await transporter.verify()

      await transporter.sendMail({
        from:    config.fromName + ' <' + config.fromEmail + '>',
        to,
        subject: 'Test Email — KIPL ProjectOS',
        html: `
          <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto">
            <div style="background:#1a2540;padding:20px;border-radius:8px 8px 0 0">
              <h2 style="color:#fff;margin:0">KIPL ProjectOS</h2>
              <p style="color:rgba(255,255,255,0.5);margin:4px 0 0;font-size:13px">Dal Lake Sewerage Scheme</p>
            </div>
            <div style="padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px">
              <h3 style="color:#0f172a;margin:0 0 12px">✓ Email Configuration Working</h3>
              <p style="color:#475569">This is a test email from KIPL ProjectOS to verify your SMTP settings are configured correctly.</p>
              <p style="color:#475569">Sending from: <strong>${config.fromEmail}</strong></p>
              <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0">
              <p style="color:#94a3b8;font-size:12px">Allotment No: CE/UEED/PS/01 OF 2025-26</p>
            </div>
          </div>
        `,
      })

      await this.configRepo.update(config.id, { isVerified: true, lastTestedAt: new Date() })
      return { success: true, message: 'Test email sent successfully to ' + to }
    } catch (err: any) {
      this.logger.error('SMTP test failed: ' + err.message)
      return { success: false, message: err.message ?? 'Connection failed' }
    }
  }

  async sendEmail(p: {
    to: string | string[]
    subject: string
    html: string
    cc?: string[]
    replyTo?: string
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const config = await this.getConfig()
    if (!config) return { success: false, error: 'Email not configured. Go to Settings → Email.' }

    try {
      const transporter = await this.createTransporter(config)
      const info = await transporter.sendMail({
        from:    config.fromName + ' <' + config.fromEmail + '>',
        to:      Array.isArray(p.to) ? p.to.join(', ') : p.to,
        cc:      p.cc?.join(', '),
        replyTo: p.replyTo,
        subject: p.subject,
        html:    p.html,
      })
      return { success: true, messageId: info.messageId }
    } catch (err: any) {
      this.logger.error('Send email failed: ' + err.message)
      return { success: false, error: err.message }
    }
  }

  async isConfigured(): Promise<{ configured: boolean; verified: boolean; email?: string; fromName?: string }> {
    const config = await this.getConfig()
    if (!config) return { configured: false, verified: false }
    return {
      configured: true,
      verified: config.isVerified,
      email: config.fromEmail,
      fromName: config.fromName,
    }
  }
}
