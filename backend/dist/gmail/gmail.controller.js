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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GmailController = void 0;
const common_1 = require("@nestjs/common");
const gmail_service_1 = require("./gmail.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
let GmailController = class GmailController {
    gmail;
    constructor(gmail) {
        this.gmail = gmail;
    }
    getAuthUrl() {
        const url = this.gmail.getAuthUrl();
        return {
            message: 'Open this URL in your browser to authorise Gmail',
            auth_url: url,
        };
    }
    async callback(code) {
        const refreshToken = await this.gmail.exchangeCode(code);
        return {
            message: 'Gmail authorised! Copy this refresh token into backend/.env as GMAIL_REFRESH_TOKEN',
            refresh_token: refreshToken,
        };
    }
    status() {
        return { configured: this.gmail.isConfigured() };
    }
};
exports.GmailController = GmailController;
__decorate([
    (0, common_1.Get)('auth'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], GmailController.prototype, "getAuthUrl", null);
__decorate([
    (0, common_1.Get)('callback'),
    __param(0, (0, common_1.Query)('code')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], GmailController.prototype, "callback", null);
__decorate([
    (0, common_1.Get)('status'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], GmailController.prototype, "status", null);
exports.GmailController = GmailController = __decorate([
    (0, common_1.Controller)('gmail'),
    __metadata("design:paramtypes", [gmail_service_1.GmailService])
], GmailController);
//# sourceMappingURL=gmail.controller.js.map