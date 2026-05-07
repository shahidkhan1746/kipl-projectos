"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WbsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const wbs_task_entity_1 = require("./wbs-task.entity");
const wbs_service_1 = require("./wbs.service");
const wbs_pdf_service_1 = require("./wbs-pdf.service");
const wbs_controller_1 = require("./wbs.controller");
let WbsModule = class WbsModule {
};
exports.WbsModule = WbsModule;
exports.WbsModule = WbsModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([wbs_task_entity_1.WbsTask])],
        providers: [wbs_service_1.WbsService, wbs_pdf_service_1.WbsPdfService],
        controllers: [wbs_controller_1.WbsController],
        exports: [wbs_service_1.WbsService],
    })
], WbsModule);
//# sourceMappingURL=wbs.module.js.map