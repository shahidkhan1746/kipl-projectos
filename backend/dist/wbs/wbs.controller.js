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
exports.WbsController = void 0;
const common_1 = require("@nestjs/common");
const wbs_service_1 = require("./wbs.service");
const wbs_pdf_service_1 = require("./wbs-pdf.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
let WbsController = class WbsController {
    svc;
    pdfSvc;
    constructor(svc, pdfSvc) {
        this.svc = svc;
        this.pdfSvc = pdfSvc;
    }
    dashboard(pid) { return this.svc.dashboard(pid); }
    list(pid) { return this.svc.list(pid); }
    seed(body) {
        return this.svc.seed(body.projectId, body.force ?? false);
    }
    create(body) { return this.svc.create(body); }
    update(id, body) { return this.svc.update(id, body); }
    cpm(pid) { return this.svc.getCPM(pid); }
    pert(pid) { return this.svc.getPERT(pid); }
    recalculate(pid) { return this.svc.recalculate(pid); }
    async ganttFullPdf(pid, res) {
        const tasks = await this.svc.list(pid);
        const dashboard = await this.svc.dashboard(pid);
        const buffer = await this.pdfSvc.generateGanttFull(tasks, dashboard);
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="DalLake_Gantt_Full_${new Date().toISOString().split('T')[0]}.pdf"`,
        });
        res.end(buffer);
    }
    async ganttQuarterlyPdf(pid, res) {
        const tasks = await this.svc.list(pid);
        const dashboard = await this.svc.dashboard(pid);
        const buffer = await this.pdfSvc.generateGanttQuarterly(tasks, dashboard);
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="DalLake_Gantt_Quarterly_${new Date().toISOString().split('T')[0]}.pdf"`,
        });
        res.end(buffer);
    }
    async progressReportPdf(pid, res) {
        const tasks = await this.svc.list(pid);
        const dashboard = await this.svc.dashboard(pid);
        const cpm = await this.svc.getCPM(pid);
        const pert = await this.svc.getPERT(pid);
        const buffer = await this.pdfSvc.generateProgressReport(tasks, dashboard, cpm, pert);
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="DalLake_ProgressReport_${new Date().toISOString().split('T')[0]}.pdf"`,
        });
        res.end(buffer);
    }
};
exports.WbsController = WbsController;
__decorate([
    (0, common_1.Get)('dashboard'),
    __param(0, (0, common_1.Query)('projectId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], WbsController.prototype, "dashboard", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('projectId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], WbsController.prototype, "list", null);
__decorate([
    (0, common_1.Post)('seed'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], WbsController.prototype, "seed", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], WbsController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], WbsController.prototype, "update", null);
__decorate([
    (0, common_1.Get)('cpm'),
    __param(0, (0, common_1.Query)('projectId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], WbsController.prototype, "cpm", null);
__decorate([
    (0, common_1.Get)('pert'),
    __param(0, (0, common_1.Query)('projectId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], WbsController.prototype, "pert", null);
__decorate([
    (0, common_1.Post)('recalculate'),
    __param(0, (0, common_1.Body)('projectId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], WbsController.prototype, "recalculate", null);
__decorate([
    (0, common_1.Get)('pdf/gantt-full'),
    __param(0, (0, common_1.Query)('projectId')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], WbsController.prototype, "ganttFullPdf", null);
__decorate([
    (0, common_1.Get)('pdf/gantt-quarterly'),
    __param(0, (0, common_1.Query)('projectId')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], WbsController.prototype, "ganttQuarterlyPdf", null);
__decorate([
    (0, common_1.Get)('pdf/report'),
    __param(0, (0, common_1.Query)('projectId')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], WbsController.prototype, "progressReportPdf", null);
exports.WbsController = WbsController = __decorate([
    (0, common_1.Controller)('wbs'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [wbs_service_1.WbsService,
        wbs_pdf_service_1.WbsPdfService])
], WbsController);
//# sourceMappingURL=wbs.controller.js.map