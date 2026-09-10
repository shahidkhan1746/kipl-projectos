import { FleetModule } from './fleet/fleet.module'
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProjectsModule } from './projects/projects.module';
import { LiaisonModule } from './liaison/liaison.module';
import { HrModule } from './hr/hr.module';
import { EpcModule } from './epc/epc.module';
import { MailerModule } from './mailer/mailer.module'
import { TaskModule } from './tasks/task.module'
import { WbsModule } from './wbs/wbs.module'
import { MeetingModule } from './meetings/meeting.module'
import { DiaryModule } from './diary/diary.module'
import { OmModule } from './om/om.module'
import { MaterialRegisterModule } from './material-register/material-register.module'
import { SiteOrderModule } from './site-order/site-order.module'
import { AiModule } from './ai/ai.module'
import { QaModule } from './qa/qa.module'
import { AccountingModule } from './accounting/accounting.module';
import { SettingsModule } from './settings/settings.module'
import { PdfModule } from './pdf/pdf.module';
import { GmailModule } from './gmail/gmail.module';
import { StorageModule } from './storage/storage.module';
import { UpdatesModule } from './project-updates/updates.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { OpsSyncModule } from './ops-sync/ops-sync.module';
import { AuditModule } from './audit/audit.module';
import { ComplianceModule } from './compliance/compliance.module';

@Module({
  imports: [
    FleetModule,
    // Config — reads from .env
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot({ throttlers: [{ ttl: 60_000, limit: 120 }] }),

    // In-process events (used to auto-index records into the AI knowledge base on save)
    EventEmitterModule.forRoot(),

    // Database
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host:     config.get('DB_HOST'),
        port:     parseInt(config.get('DB_PORT') ?? '5432'),
        database: config.get('DB_NAME'),
        username: config.get('DB_USER'),
        password: config.get('DB_PASSWORD'),
        // Auto-creates/updates tables from entities — no migrations needed in dev
        synchronize: config.get('NODE_ENV') !== 'production',
        logging: config.get('NODE_ENV') === 'development',
        autoLoadEntities: true,
        ssl: config.get('DB_SSL') === 'false' || config.get('DB_HOST') === 'localhost'
          ? false
          : { rejectUnauthorized: config.get('DB_SSL_REJECT_UNAUTHORIZED') !== 'false' },
        extra: { max: 5 },
      }),
    }),

    // Feature modules
    AuthModule,
    UsersModule,
    ProjectsModule,
    LiaisonModule,
    HrModule,
    EpcModule,
    AccountingModule,
    QaModule,
    DiaryModule,
    OmModule,
    MaterialRegisterModule,
    SiteOrderModule,
    AiModule,
    MeetingModule,
    WbsModule,
    TaskModule,
    MailerModule,
    PdfModule,
    SettingsModule,
    GmailModule,
    StorageModule,
    UpdatesModule,
    OpsSyncModule,
    AuditModule,
    ComplianceModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Order matters: global guards run in the order they are provided. With the
    // JWT guard first, an unauthenticated flood is rejected as 401 before the
    // throttler ever counts it — so the one kind of traffic rate limiting most
    // needs to see is the kind it never sees. Throttle first, then authenticate.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
