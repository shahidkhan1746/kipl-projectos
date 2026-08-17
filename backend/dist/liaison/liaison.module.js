"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LiaisonModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const liaison_file_entity_1 = require("./liaison-file.entity");
const approval_workflow_entity_1 = require("./approval-workflow.entity");
const file_document_entity_1 = require("./file-document.entity");
const letter_entity_1 = require("./letter.entity");
const liaison_service_1 = require("./liaison.service");
const liaison_controller_1 = require("./liaison.controller");
const pdf_module_1 = require("../pdf/pdf.module");
const gmail_module_1 = require("../gmail/gmail.module");
const ai_module_1 = require("../ai/ai.module");
let LiaisonModule = class LiaisonModule {
};
exports.LiaisonModule = LiaisonModule;
exports.LiaisonModule = LiaisonModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([liaison_file_entity_1.LiaisonFile, approval_workflow_entity_1.ApprovalWorkflow, file_document_entity_1.FileDocument, letter_entity_1.Letter]),
            pdf_module_1.PdfModule,
            gmail_module_1.GmailModule,
            ai_module_1.AiModule,
        ],
        providers: [liaison_service_1.LiaisonService],
        controllers: [liaison_controller_1.LiaisonController],
        exports: [liaison_service_1.LiaisonService],
    })
], LiaisonModule);
//# sourceMappingURL=liaison.module.js.map