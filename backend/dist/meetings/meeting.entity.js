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
exports.Meeting = exports.MeetingStatus = exports.MeetingType = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("../shared/entities/base.entity");
var MeetingType;
(function (MeetingType) {
    MeetingType["SITE_PROGRESS"] = "site_progress";
    MeetingType["COORDINATION"] = "coordination";
    MeetingType["SAFETY"] = "safety";
    MeetingType["DESIGN_REVIEW"] = "design_review";
    MeetingType["QUALITY"] = "quality";
    MeetingType["CLIENT_UEED"] = "client_ueed";
    MeetingType["LCMA"] = "lcma";
    MeetingType["INTERNAL"] = "internal";
})(MeetingType || (exports.MeetingType = MeetingType = {}));
var MeetingStatus;
(function (MeetingStatus) {
    MeetingStatus["DRAFT"] = "draft";
    MeetingStatus["CIRCULATED"] = "circulated";
    MeetingStatus["CONFIRMED"] = "confirmed";
})(MeetingStatus || (exports.MeetingStatus = MeetingStatus = {}));
let Meeting = class Meeting extends base_entity_1.BaseEntity {
    projectId;
    meetingNo;
    type;
    title;
    date;
    time;
    venue;
    chairedBy;
    minutedBy;
    attendees;
    agendaItems;
    actionItems;
    prevMeetingId;
    prevActionsReviewed;
    nextMeetingDate;
    nextMeetingVenue;
    remarks;
    status;
};
exports.Meeting = Meeting;
__decorate([
    (0, typeorm_1.Column)({ name: 'project_id' }),
    __metadata("design:type", String)
], Meeting.prototype, "projectId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'meeting_no' }),
    __metadata("design:type", String)
], Meeting.prototype, "meetingNo", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: MeetingType, default: MeetingType.SITE_PROGRESS }),
    __metadata("design:type", String)
], Meeting.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Meeting.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date' }),
    __metadata("design:type", String)
], Meeting.prototype, "date", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Meeting.prototype, "time", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Meeting.prototype, "venue", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'chaired_by', nullable: true }),
    __metadata("design:type", String)
], Meeting.prototype, "chairedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'minuted_by', nullable: true }),
    __metadata("design:type", String)
], Meeting.prototype, "minutedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', default: [] }),
    __metadata("design:type", Array)
], Meeting.prototype, "attendees", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', default: [] }),
    __metadata("design:type", Array)
], Meeting.prototype, "agendaItems", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'action_items', type: 'jsonb', default: [] }),
    __metadata("design:type", Array)
], Meeting.prototype, "actionItems", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'prev_meeting_id', nullable: true }),
    __metadata("design:type", String)
], Meeting.prototype, "prevMeetingId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'prev_actions_reviewed', default: false }),
    __metadata("design:type", Boolean)
], Meeting.prototype, "prevActionsReviewed", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'next_meeting_date', type: 'date', nullable: true }),
    __metadata("design:type", String)
], Meeting.prototype, "nextMeetingDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'next_meeting_venue', nullable: true }),
    __metadata("design:type", String)
], Meeting.prototype, "nextMeetingVenue", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Meeting.prototype, "remarks", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: MeetingStatus, default: MeetingStatus.DRAFT }),
    __metadata("design:type", String)
], Meeting.prototype, "status", void 0);
exports.Meeting = Meeting = __decorate([
    (0, typeorm_1.Entity)('meetings')
], Meeting);
//# sourceMappingURL=meeting.entity.js.map