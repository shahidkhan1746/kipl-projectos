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
exports.MeetingService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const meeting_entity_1 = require("./meeting.entity");
let MeetingService = class MeetingService {
    repo;
    constructor(repo) {
        this.repo = repo;
    }
    clean(data) {
        const out = { ...data };
        for (const k of ['date', 'nextMeetingDate']) {
            if (typeof out[k] === 'string' && out[k].trim() === '')
                out[k] = null;
        }
        return out;
    }
    async create(data) {
        const count = await this.repo.count({ where: { projectId: data.projectId } });
        const meetingNo = 'MOM-' + String(count + 1).padStart(4, '0');
        const saved = await this.repo.save(this.repo.create({ ...this.clean(data), meetingNo }));
        return saved;
    }
    async list(p) {
        const qb = this.repo.createQueryBuilder('m').orderBy('m.date', 'DESC');
        if (p.projectId)
            qb.andWhere('m.projectId = :pid', { pid: p.projectId });
        if (p.type)
            qb.andWhere('m.type = :type', { type: p.type });
        if (p.status)
            qb.andWhere('m.status = :s', { s: p.status });
        if (p.fromDate)
            qb.andWhere('m.date >= :from', { from: p.fromDate });
        if (p.toDate)
            qb.andWhere('m.date <= :to', { to: p.toDate });
        return qb.getMany();
    }
    async findOne(id) {
        const m = await this.repo.findOne({ where: { id } });
        if (!m)
            throw new common_1.NotFoundException('Meeting not found');
        return m;
    }
    async update(id, data) {
        await this.repo.update(id, this.clean(data));
        return this.findOne(id);
    }
    async circulate(id) {
        await this.repo.update(id, { status: meeting_entity_1.MeetingStatus.CIRCULATED });
        return this.findOne(id);
    }
    async confirm(id) {
        await this.repo.update(id, { status: meeting_entity_1.MeetingStatus.CONFIRMED });
        return this.findOne(id);
    }
    async updateActionItem(id, actionIdx, updates) {
        const meeting = await this.findOne(id);
        const actions = [...(meeting.actionItems ?? [])];
        if (actions[actionIdx]) {
            actions[actionIdx] = { ...actions[actionIdx], ...updates };
            if (updates.status === 'closed')
                actions[actionIdx].closedDate = new Date().toISOString().split('T')[0];
        }
        await this.repo.update(id, { actionItems: actions });
        return this.findOne(id);
    }
    async dashboard(projectId) {
        const meetings = await this.list({ projectId });
        const allActions = meetings.flatMap(m => m.actionItems ?? []);
        const openActions = allActions.filter(a => a.status !== 'closed').length;
        const overdueActions = allActions.filter(a => {
            return a.status !== 'closed' && a.dueDate && new Date(a.dueDate) < new Date();
        }).length;
        return {
            totalMeetings: meetings.length,
            thisMonth: meetings.filter(m => {
                const d = new Date(m.date);
                const n = new Date();
                return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
            }).length,
            openActions,
            overdueActions,
            byType: meetings.reduce((acc, m) => {
                acc[m.type] = (acc[m.type] || 0) + 1;
                return acc;
            }, {}),
        };
    }
};
exports.MeetingService = MeetingService;
exports.MeetingService = MeetingService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(meeting_entity_1.Meeting)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], MeetingService);
//# sourceMappingURL=meeting.service.js.map