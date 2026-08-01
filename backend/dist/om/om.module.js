"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OmModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const om_log_entity_1 = require("./om-log.entity");
const om_event_entity_1 = require("./om-event.entity");
const om_service_1 = require("./om.service");
const om_controller_1 = require("./om.controller");
let OmModule = class OmModule {
};
exports.OmModule = OmModule;
exports.OmModule = OmModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([om_log_entity_1.OmLog, om_event_entity_1.OmEvent])],
        providers: [om_service_1.OmService],
        controllers: [om_controller_1.OmController],
        exports: [om_service_1.OmService],
    })
], OmModule);
//# sourceMappingURL=om.module.js.map