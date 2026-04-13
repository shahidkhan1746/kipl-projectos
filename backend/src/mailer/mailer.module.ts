import { Module, Global } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { EmailConfig } from './email-config.entity'
import { MailerService } from './mailer.service'
import { MailerController } from './mailer.controller'

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([EmailConfig])],
  providers: [MailerService],
  controllers: [MailerController],
  exports: [MailerService],
})
export class MailerModule {}
