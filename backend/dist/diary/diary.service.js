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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiaryService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const diary_entity_1 = require("./diary.entity");
let DiaryService = class DiaryService {
    repo;
    constructor(repo) {
        this.repo = repo;
    }
    async create(data) {
        const existing = await this.repo.findOne({ where: { projectId: data.projectId, date: data.date } });
        if (existing)
            throw new common_1.ConflictException('Diary entry for this date already exists');
        const total = (data.labourSkilled || 0) + (data.labourUnskilled || 0) + (data.labourSupervisory || 0);
        const saved = await this.repo.save(this.repo.create({ ...data, labourTotal: total }));
        return saved;
    }
    async update(id, data) {
        const total = (data.labourSkilled || 0) + (data.labourUnskilled || 0) + (data.labourSupervisory || 0);
        await this.repo.update(id, { ...data, labourTotal: total });
        return this.findOne(id);
    }
    async findOne(id) {
        const d = await this.repo.findOne({ where: { id } });
        if (!d)
            throw new common_1.NotFoundException('Diary entry not found');
        return d;
    }
    async findByDate(projectId, date) {
        return this.repo.findOne({ where: { projectId, date } });
    }
    async list(p) {
        const qb = this.repo.createQueryBuilder('d').orderBy('d.date', 'DESC');
        if (p.projectId)
            qb.andWhere('d.projectId = :pid', { pid: p.projectId });
        if (p.fromDate)
            qb.andWhere('d.date >= :from', { from: p.fromDate });
        if (p.toDate)
            qb.andWhere('d.date <= :to', { to: p.toDate });
        if (p.status)
            qb.andWhere('d.status = :s', { s: p.status });
        if (p.eotOnly)
            qb.andWhere('d.eotClaim = true');
        return qb.getMany();
    }
    async approve(id, approvedBy) {
        await this.repo.update(id, { status: diary_entity_1.DiaryStatus.APPROVED, approvedBy });
        return this.findOne(id);
    }
    async submit(id) {
        await this.repo.update(id, { status: diary_entity_1.DiaryStatus.SUBMITTED });
        return this.findOne(id);
    }
    async dashboard(projectId) {
        const entries = await this.list({ projectId });
        const now = new Date();
        const monthEntries = entries.filter(e => {
            const d = new Date(e.date);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });
        const totalLabour = monthEntries.reduce((s, e) => s + Number(e.labourTotal), 0);
        const rainyDays = entries.filter(e => e.weatherMorning === 'rainy' || e.weatherAfternoon === 'rainy').length;
        const eotDays = entries.filter(e => e.eotClaim).length;
        const hoursLost = entries.reduce((s, e) => s + Number(e.hoursLost), 0);
        const workDoneCount = entries.reduce((s, e) => s + (e.workDone?.length || 0), 0);
        return {
            totalEntries: entries.length,
            thisMonthEntries: monthEntries.length,
            avgLabourThisMonth: monthEntries.length > 0 ? Math.round(totalLabour / monthEntries.length) : 0,
            rainyDays,
            eotClaimDays: eotDays,
            hoursLostWeather: hoursLost,
            workDoneCount,
            pendingApproval: entries.filter(e => e.status === diary_entity_1.DiaryStatus.SUBMITTED).length,
        };
    }
};
exports.DiaryService = DiaryService;
exports.DiaryService = DiaryService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(diary_entity_1.SiteDiary)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], DiaryService);
//# sourceMappingURL=diary.service.js.map