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
exports.RaBillController = void 0;
const common_1 = require("@nestjs/common");
const ra_bill_pdf_service_1 = require("./ra-bill.pdf.service");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const boq_item_entity_1 = require("./boq-item.entity");
let RaBillController = class RaBillController {
    pdfService;
    boqRepo;
    constructor(pdfService, boqRepo) {
        this.pdfService = pdfService;
        this.boqRepo = boqRepo;
    }
    async generatePdf(payload, res) {
        const buffer = await this.pdfService.generate(payload);
        const filename = `KIPL_${payload.header.billNo}_${payload.header.billDate}.pdf`;
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Content-Length': buffer.length,
        });
        res.end(buffer);
    }
    async updateBoqItem(id, body) {
        await this.boqRepo.update({ id }, { quotedRate: body.quotedRate ?? body.quotedCost });
        return { success: true, id, quotedCost: body.quotedCost };
    }
    async getBoqItems() {
        return this.boqRepo.find({ order: { category: 'ASC' } });
    }
};
exports.RaBillController = RaBillController;
__decorate([
    (0, common_1.Post)('ra-bill/generate-pdf'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], RaBillController.prototype, "generatePdf", null);
__decorate([
    (0, common_1.Patch)('boq-items/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], RaBillController.prototype, "updateBoqItem", null);
__decorate([
    (0, common_1.Get)('boq-items'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], RaBillController.prototype, "getBoqItems", null);
exports.RaBillController = RaBillController = __decorate([
    (0, common_1.Controller)(),
    __param(1, (0, typeorm_1.InjectRepository)(boq_item_entity_1.BoqItem)),
    __metadata("design:paramtypes", [ra_bill_pdf_service_1.RaBillPdfService,
        typeorm_2.Repository])
], RaBillController);
//# sourceMappingURL=ra-bill.controller.js.map