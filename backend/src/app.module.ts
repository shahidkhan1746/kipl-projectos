import { FleetModule } from './fleet/fleet.module'
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProjectsModule } from './projects/projects.module';
import { LiaisonModule } from './liaison/liaison.module';
import { HrModule } from './hr/hr.module';
import { TasksModule } from './tasks/tasks.module';
import { EpcModule } from './epc/epc.module';
import { MailerModule } from './mailer/mailer.module'
import { TaskModule } from './tasks/task.module'
import { WbsModule } from './wbs/wbs.module'
import { MeetingModule } from './meetings/meeting.module'
import { DiaryModule } from './diary/diary.module'
import { QaModule } from './qa/qa.module'
import { AccountingModule } from './accounting/accounting.module';
import { UploadsModule } from './uploads/uploads.module';
import { SettingsModule } from './settings/settings.module'
import { PdfModule } from './pdf/pdf.module';
import { GmailModule } from './gmail/gmail.module';
import { StorageModule } from './storage/storage.module';
import { UpdatesModule } from './project-updates/updates.module';

@Module({
  imports: [
    FleetModule,
    // Config — reads from .env
    ConfigModule.forRoot({ isGlobal: true }),

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
        ssl: { rejectUnauthorized: false },
        extra: { max: 5 },
      }),
    }),

    // Feature modules
    AuthModule,
    UsersModule,
    ProjectsModule,
    LiaisonModule,
    HrModule,
    TasksModule,
    EpcModule,
    AccountingModule,
    QaModule,
    DiaryModule,
    MeetingModule,
    WbsModule,
    TaskModule,
    MailerModule,
    UploadsModule,
	PdfModule,
    SettingsModule,
	GmailModule,
    StorageModule,
    UpdatesModule,
  ],
})
export class AppModule {}
