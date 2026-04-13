"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EpcModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const boq_item_entity_1 = require("./boq-item.entity");
const ra_bill_entity_1 = require("./ra-bill.entity");
const measurement_entity_1 = require("./measurement.entity");
const epc_service_1 = require("./epc.service");
const epc_controller_1 = require("./epc.controller");
let EpcModule = class EpcModule {
};
exports.EpcModule = EpcModule;
exports.EpcModule = EpcModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([boq_item_entity_1.BoqItem, ra_bill_entity_1.RaBill, measurement_entity_1.Measurement])],
        providers: [epc_service_1.EpcService],
        controllers: [epc_controller_1.EpcController],
        exports: [epc_service_1.EpcService],
    })
], EpcModule);
//# sourceMappingURL=epc.module.js.map