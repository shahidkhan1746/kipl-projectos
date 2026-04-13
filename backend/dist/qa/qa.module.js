"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QaModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const qa_checklist_entity_1 = require("./qa-checklist.entity");
const qa_inspection_entity_1 = require("./qa-inspection.entity");
const ncr_entity_1 = require("./ncr.entity");
const qa_service_1 = require("./qa.service");
const qa_controller_1 = require("./qa.controller");
let QaModule = class QaModule {
};
exports.QaModule = QaModule;
exports.QaModule = QaModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([qa_checklist_entity_1.QaChecklist, qa_inspection_entity_1.QaInspection, ncr_entity_1.Ncr])],
        providers: [qa_service_1.QaService], controllers: [qa_controller_1.QaController], exports: [qa_service_1.QaService],
    })
], QaModule);
//# sourceMappingURL=qa.module.js.map