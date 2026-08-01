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
exports.OmEvent = exports.BREAKDOWN_PENALTY_PER_DAY = exports.BREAKDOWN_GRACE_HOURS = exports.OmEventStatus = exports.OmEventType = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("../shared/entities/base.entity");
var OmEventType;
(function (OmEventType) {
    OmEventType["BREAKDOWN"] = "breakdown";
    OmEventType["PREVENTIVE"] = "preventive";
    OmEventType["CORRECTIVE"] = "corrective";
})(OmEventType || (exports.OmEventType = OmEventType = {}));
var OmEventStatus;
(function (OmEventStatus) {
    OmEventStatus["OPEN"] = "open";
    OmEventStatus["CLOSED"] = "closed";
})(OmEventStatus || (exports.OmEventStatus = OmEventStatus = {}));
exports.BREAKDOWN_GRACE_HOURS = 48;
exports.BREAKDOWN_PENALTY_PER_DAY = 15000;
let OmEvent = class OmEvent extends base_entity_1.BaseEntity {
    projectId;
    type;
    equipment;
    startAt;
    endAt;
    cause;
    action;
    status;
    attendedBy;
    remarks;
};
exports.OmEvent = OmEvent;
__decorate([
    (0, typeorm_1.Column)({ name: 'project_id' }),
    __metadata("design:type", String)
], OmEvent.prototype, "projectId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: OmEventType, default: OmEventType.BREAKDOWN }),
    __metadata("design:type", String)
], OmEvent.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], OmEvent.prototype, "equipment", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'start_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], OmEvent.prototype, "startAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'end_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Date)
], OmEvent.prototype, "endAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], OmEvent.prototype, "cause", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], OmEvent.prototype, "action", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: OmEventStatus, default: OmEventStatus.OPEN }),
    __metadata("design:type", String)
], OmEvent.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'attended_by', nullable: true }),
    __metadata("design:type", String)
], OmEvent.prototype, "attendedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], OmEvent.prototype, "remarks", void 0);
exports.OmEvent = OmEvent = __decorate([
    (0, typeorm_1.Entity)('om_events')
], OmEvent);
//# sourceMappingURL=om-event.entity.js.map