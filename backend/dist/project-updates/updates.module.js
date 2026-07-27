"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdatesModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const project_update_entity_1 = require("./project-update.entity");
const team_member_entity_1 = require("./team-member.entity");
const updates_service_1 = require("./updates.service");
const updates_controller_1 = require("./updates.controller");
const public_controller_1 = require("./public.controller");
const storage_module_1 = require("../storage/storage.module");
let UpdatesModule = class UpdatesModule {
};
exports.UpdatesModule = UpdatesModule;
exports.UpdatesModule = UpdatesModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([project_update_entity_1.ProjectUpdate, team_member_entity_1.TeamMember]), storage_module_1.StorageModule],
        controllers: [updates_controller_1.UpdatesController, public_controller_1.PublicUpdatesController],
        providers: [updates_service_1.UpdatesService],
    })
], UpdatesModule);
//# sourceMappingURL=updates.module.js.map