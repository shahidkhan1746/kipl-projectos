"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailConfig = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("../shared/entities/base.entity");
let EmailConfig = class EmailConfig extends base_entity_1.BaseEntity {
    smtpHost;
    smtpPort;
    smtpSecure;
    smtpUser;
    smtpPass;
    fromName;
    fromEmail;
    isActive;
    isVerified;
    lastTestedAt;
};
exports.EmailConfig = EmailConfig;
__decorate([
    (0, typeorm_1.Column)({ name: 'smtp_host', default: 'smtp.gmail.com' }),
    __metadata("design:type", String)
], EmailConfig.prototype, "smtpHost", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'smtp_port', default: 587 }),
    __metadata("design:type", Number)
], EmailConfig.prototype, "smtpPort", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'smtp_secure', default: false }),
    __metadata("design:type", Boolean)
], EmailConfig.prototype, "smtpSecure", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'smtp_user' }),
    __metadata("design:type", String)
], EmailConfig.prototype, "smtpUser", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'smtp_pass', type: 'text' }),
    __metadata("design:type", String)
], EmailConfig.prototype, "smtpPass", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'from_name', default: 'KIPL ProjectOS' }),
    __metadata("design:type", String)
], EmailConfig.prototype, "fromName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'from_email' }),
    __metadata("design:type", String)
], EmailConfig.prototype, "fromEmail", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_active', default: true }),
    __metadata("design:type", Boolean)
], EmailConfig.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_verified', default: false }),
    __metadata("design:type", Boolean)
], EmailConfig.prototype, "isVerified", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'last_tested_at', nullable: true }),
    __metadata("design:type", Date)
], EmailConfig.prototype, "lastTestedAt", void 0);
exports.EmailConfig = EmailConfig = __decorate([
    (0, typeorm_1.Entity)('email_configs')
], EmailConfig);
//# sourceMappingURL=email-config.entity.js.map