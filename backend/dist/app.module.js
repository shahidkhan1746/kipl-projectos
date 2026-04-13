"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const fleet_module_1 = require("./fleet/fleet.module");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const auth_module_1 = require("./auth/auth.module");
const users_module_1 = require("./users/users.module");
const projects_module_1 = require("./projects/projects.module");
const liaison_module_1 = require("./liaison/liaison.module");
const hr_module_1 = require("./hr/hr.module");
const tasks_module_1 = require("./tasks/tasks.module");
const epc_module_1 = require("./epc/epc.module");
const mailer_module_1 = require("./mailer/mailer.module");
const task_module_1 = require("./tasks/task.module");
const wbs_module_1 = require("./wbs/wbs.module");
const meeting_module_1 = require("./meetings/meeting.module");
const diary_module_1 = require("./diary/diary.module");
const qa_module_1 = require("./qa/qa.module");
const accounting_module_1 = require("./accounting/accounting.module");
const uploads_module_1 = require("./uploads/uploads.module");
const settings_module_1 = require("./settings/settings.module");
const pdf_module_1 = require("./pdf/pdf.module");
const gmail_module_1 = require("./gmail/gmail.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            fleet_module_1.FleetModule,
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            typeorm_1.TypeOrmModule.forRootAsync({
                inject: [config_1.ConfigService],
                useFactory: (config) => ({
                    type: 'postgres',
                    host: config.get('DB_HOST'),
                    port: parseInt(config.get('DB_PORT') ?? '5432'),
                    database: config.get('DB_NAME'),
                    username: config.get('DB_USER'),
                    password: config.get('DB_PASSWORD'),
                    synchronize: config.get('NODE_ENV') !== 'production',
                    logging: config.get('NODE_ENV') === 'development',
                    autoLoadEntities: true,
                }),
            }),
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            projects_module_1.ProjectsModule,
            liaison_module_1.LiaisonModule,
            hr_module_1.HrModule,
            tasks_module_1.TasksModule,
            epc_module_1.EpcModule,
            accounting_module_1.AccountingModule,
            qa_module_1.QaModule,
            diary_module_1.DiaryModule,
            meeting_module_1.MeetingModule,
            wbs_module_1.WbsModule,
            task_module_1.TaskModule,
            mailer_module_1.MailerModule,
            uploads_module_1.UploadsModule,
            pdf_module_1.PdfModule,
            settings_module_1.SettingsModule,
            gmail_module_1.GmailModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map