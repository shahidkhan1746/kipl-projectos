"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var MailerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MailerService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const email_config_entity_1 = require("./email-config.entity");
const nodemailer = __importStar(require("nodemailer"));
let MailerService = MailerService_1 = class MailerService {
    configRepo;
    logger = new common_1.Logger(MailerService_1.name);
    constructor(configRepo) {
        this.configRepo = configRepo;
    }
    async getConfig() {
        return this.configRepo.findOne({ where: { isActive: true } });
    }
    async saveConfig(data) {
        await this.configRepo.update({ isActive: true }, { isActive: false });
        const config = this.configRepo.create({
            smtpHost: data.smtpHost ?? 'smtp.gmail.com',
            smtpPort: data.smtpPort ?? 587,
            smtpSecure: (data.smtpPort === 465),
            smtpUser: data.smtpUser,
            smtpPass: data.smtpPass,
            fromName: data.fromName ?? 'KIPL ProjectOS',
            fromEmail: data.fromEmail,
            isActive: true,
            isVerified: false,
        });
        return this.configRepo.save(config);
    }
    async createTransporter(config) {
        return nodemailer.createTransport({
            host: config.smtpHost,
            port: config.smtpPort,
            secure: config.smtpSecure,
            auth: {
                user: config.smtpUser,
                pass: config.smtpPass,
            },
        });
    }
    async testConnection(to) {
        const config = await this.getConfig();
        if (!config)
            return { success: false, message: 'No email configuration found. Please save settings first.' };
        try {
            const transporter = await this.createTransporter(config);
            await transporter.verify();
            await transporter.sendMail({
                from: config.fromName + ' <' + config.fromEmail + '>',
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
            });
            await this.configRepo.update(config.id, { isVerified: true, lastTestedAt: new Date() });
            return { success: true, message: 'Test email sent successfully to ' + to };
        }
        catch (err) {
            this.logger.error('SMTP test failed: ' + err.message);
            return { success: false, message: err.message ?? 'Connection failed' };
        }
    }
    async sendEmail(p) {
        const config = await this.getConfig();
        if (!config)
            return { success: false, error: 'Email not configured. Go to Settings → Email.' };
        try {
            const transporter = await this.createTransporter(config);
            const info = await transporter.sendMail({
                from: config.fromName + ' <' + config.fromEmail + '>',
                to: Array.isArray(p.to) ? p.to.join(', ') : p.to,
                cc: p.cc?.join(', '),
                replyTo: p.replyTo,
                subject: p.subject,
                html: p.html,
            });
            return { success: true, messageId: info.messageId };
        }
        catch (err) {
            this.logger.error('Send email failed: ' + err.message);
            return { success: false, error: err.message };
        }
    }
    async isConfigured() {
        const config = await this.getConfig();
        if (!config)
            return { configured: false, verified: false };
        return {
            configured: true,
            verified: config.isVerified,
            email: config.fromEmail,
            fromName: config.fromName,
        };
    }
};
exports.MailerService = MailerService;
exports.MailerService = MailerService = MailerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(email_config_entity_1.EmailConfig)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], MailerService);
//# sourceMappingURL=mailer.service.js.map