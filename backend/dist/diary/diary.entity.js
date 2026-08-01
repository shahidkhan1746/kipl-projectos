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
exports.SiteDiary = exports.DiaryStatus = exports.WeatherCondition = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("../shared/entities/base.entity");
var WeatherCondition;
(function (WeatherCondition) {
    WeatherCondition["SUNNY"] = "sunny";
    WeatherCondition["CLOUDY"] = "cloudy";
    WeatherCondition["RAINY"] = "rainy";
    WeatherCondition["FOGGY"] = "foggy";
    WeatherCondition["SNOWY"] = "snowy";
    WeatherCondition["STORMY"] = "stormy";
})(WeatherCondition || (exports.WeatherCondition = WeatherCondition = {}));
var DiaryStatus;
(function (DiaryStatus) {
    DiaryStatus["DRAFT"] = "draft";
    DiaryStatus["SUBMITTED"] = "submitted";
    DiaryStatus["APPROVED"] = "approved";
})(DiaryStatus || (exports.DiaryStatus = DiaryStatus = {}));
let SiteDiary = class SiteDiary extends base_entity_1.BaseEntity {
    projectId;
    date;
    submittedBy;
    weatherMorning;
    weatherAfternoon;
    tempMin;
    tempMax;
    rainfallMm;
    workStoppedWeather;
    hoursLost;
    labourSkilled;
    labourUnskilled;
    labourSupervisory;
    labourTotal;
    equipment;
    workDone;
    materialsReceived;
    visitors;
    issuesFaced;
    instructionsGiven;
    nextDayPlan;
    photos;
    eotClaim;
    eotReason;
    status;
    approvedBy;
};
exports.SiteDiary = SiteDiary;
__decorate([
    (0, typeorm_1.Column)({ name: 'project_id' }),
    __metadata("design:type", String)
], SiteDiary.prototype, "projectId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date', unique: false }),
    __metadata("design:type", String)
], SiteDiary.prototype, "date", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'submitted_by' }),
    __metadata("design:type", String)
], SiteDiary.prototype, "submittedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'weather_morning', type: 'enum', enum: WeatherCondition, default: WeatherCondition.SUNNY }),
    __metadata("design:type", String)
], SiteDiary.prototype, "weatherMorning", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'weather_afternoon', type: 'enum', enum: WeatherCondition, default: WeatherCondition.SUNNY }),
    __metadata("design:type", String)
], SiteDiary.prototype, "weatherAfternoon", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'temp_min', type: 'decimal', precision: 5, scale: 1, nullable: true }),
    __metadata("design:type", Number)
], SiteDiary.prototype, "tempMin", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'temp_max', type: 'decimal', precision: 5, scale: 1, nullable: true }),
    __metadata("design:type", Number)
], SiteDiary.prototype, "tempMax", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'rainfall_mm', type: 'decimal', precision: 6, scale: 1, default: 0 }),
    __metadata("design:type", Number)
], SiteDiary.prototype, "rainfallMm", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'work_stopped_weather', default: false }),
    __metadata("design:type", Boolean)
], SiteDiary.prototype, "workStoppedWeather", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'hours_lost', type: 'decimal', precision: 4, scale: 1, default: 0 }),
    __metadata("design:type", Number)
], SiteDiary.prototype, "hoursLost", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'labour_skilled', default: 0 }),
    __metadata("design:type", Number)
], SiteDiary.prototype, "labourSkilled", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'labour_unskilled', default: 0 }),
    __metadata("design:type", Number)
], SiteDiary.prototype, "labourUnskilled", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'labour_supervisory', default: 0 }),
    __metadata("design:type", Number)
], SiteDiary.prototype, "labourSupervisory", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'labour_total', default: 0 }),
    __metadata("design:type", Number)
], SiteDiary.prototype, "labourTotal", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', default: [] }),
    __metadata("design:type", Array)
], SiteDiary.prototype, "equipment", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'work_done', type: 'jsonb', default: [] }),
    __metadata("design:type", Array)
], SiteDiary.prototype, "workDone", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'materials_received', type: 'jsonb', default: [] }),
    __metadata("design:type", Array)
], SiteDiary.prototype, "materialsReceived", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', default: [] }),
    __metadata("design:type", Array)
], SiteDiary.prototype, "visitors", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'issues_faced', type: 'text', nullable: true }),
    __metadata("design:type", String)
], SiteDiary.prototype, "issuesFaced", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'instructions_given', type: 'text', nullable: true }),
    __metadata("design:type", String)
], SiteDiary.prototype, "instructionsGiven", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'next_day_plan', type: 'text', nullable: true }),
    __metadata("design:type", String)
], SiteDiary.prototype, "nextDayPlan", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', default: [] }),
    __metadata("design:type", Array)
], SiteDiary.prototype, "photos", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'eot_claim', default: false }),
    __metadata("design:type", Boolean)
], SiteDiary.prototype, "eotClaim", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'eot_reason', type: 'text', nullable: true }),
    __metadata("design:type", String)
], SiteDiary.prototype, "eotReason", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: DiaryStatus, default: DiaryStatus.DRAFT }),
    __metadata("design:type", String)
], SiteDiary.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'approved_by', nullable: true }),
    __metadata("design:type", String)
], SiteDiary.prototype, "approvedBy", void 0);
exports.SiteDiary = SiteDiary = __decorate([
    (0, typeorm_1.Entity)('site_diaries')
], SiteDiary);
//# sourceMappingURL=diary.entity.js.map