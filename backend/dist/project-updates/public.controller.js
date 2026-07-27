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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PublicUpdatesController = void 0;
const common_1 = require("@nestjs/common");
const updates_service_1 = require("./updates.service");
let PublicUpdatesController = class PublicUpdatesController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    timeline() { return this.svc.listPublic(); }
    gallery() { return this.svc.gallery(); }
    team() { return this.svc.listTeamPublic(); }
};
exports.PublicUpdatesController = PublicUpdatesController;
__decorate([
    (0, common_1.Get)('updates'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PublicUpdatesController.prototype, "timeline", null);
__decorate([
    (0, common_1.Get)('gallery'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PublicUpdatesController.prototype, "gallery", null);
__decorate([
    (0, common_1.Get)('team'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PublicUpdatesController.prototype, "team", null);
exports.PublicUpdatesController = PublicUpdatesController = __decorate([
    (0, common_1.Controller)('public'),
    __metadata("design:paramtypes", [updates_service_1.UpdatesService])
], PublicUpdatesController);
//# sourceMappingURL=public.controller.js.map