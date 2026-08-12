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
exports.PdfController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const pdf_service_1 = require("./pdf.service");
let PdfController = class PdfController {
    pdfSvc;
    constructor(pdfSvc) {
        this.pdfSvc = pdfSvc;
    }
    async salarySlip(body, res) {
        const pdf = await this.pdfSvc.generateSalarySlip(body);
        const filename = 'SalarySlip_' + (body.employee?.empCode ?? 'EMP') + '_' + body.month + '_' + body.year + '.pdf';
        res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="' + filename + '"' });
        res.send(pdf);
    }
    async raBill(body, res) {
        const pdf = await this.pdfSvc.generateRaBill(body);
        const filename = 'RaBill_' + (body.bill?.billNo ?? 'RA') + '.pdf';
        res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="' + filename + '"' });
        res.send(pdf);
    }
    async inspection(body, res) {
        const pdf = await this.pdfSvc.generateInspectionReport(body);
        const filename = 'Inspection_' + (body.inspection?.date ?? 'report') + '.pdf';
        res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="' + filename + '"' });
        res.send(pdf);
    }
    async attendanceReport(body, res) {
        const pdf = await this.pdfSvc.generateAttendanceReport(body);
        const filename = 'Attendance_' + (body.date ?? 'Report') + '.pdf';
        res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="' + filename + '"' });
        res.send(pdf);
    }
};
exports.PdfController = PdfController;
__decorate([
    (0, common_1.Post)('salary-slip'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PdfController.prototype, "salarySlip", null);
__decorate([
    (0, common_1.Post)('ra-bill'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PdfController.prototype, "raBill", null);
__decorate([
    (0, common_1.Post)('inspection'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PdfController.prototype, "inspection", null);
__decorate([
    (0, common_1.Post)('attendance-report'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PdfController.prototype, "attendanceReport", null);
exports.PdfController = PdfController = __decorate([
    (0, common_1.Controller)('pdf'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [pdf_service_1.PdfService])
], PdfController);
//# sourceMappingURL=pdf.controller.js.map