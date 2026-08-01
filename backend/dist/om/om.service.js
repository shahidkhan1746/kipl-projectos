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
exports.OmService = void 0;
exports.effluentBreaches = effluentBreaches;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const om_log_entity_1 = require("./om-log.entity");
const om_event_entity_1 = require("./om-event.entity");
function effluentBreaches(l) {
    const b = [];
    const n = (v) => (v == null ? null : Number(v));
    if (n(l.outBod) != null && n(l.outBod) > om_log_entity_1.EFFLUENT_LIMITS.outBod)
        b.push('BOD');
    if (n(l.outCod) != null && n(l.outCod) > om_log_entity_1.EFFLUENT_LIMITS.outCod)
        b.push('COD');
    if (n(l.outTss) != null && n(l.outTss) > om_log_entity_1.EFFLUENT_LIMITS.outTss)
        b.push('TSS');
    if (n(l.outPh) != null && (n(l.outPh) < om_log_entity_1.EFFLUENT_LIMITS.outPhMin || n(l.outPh) > om_log_entity_1.EFFLUENT_LIMITS.outPhMax))
        b.push('pH');
    if (n(l.outFecalColiform) != null && n(l.outFecalColiform) > om_log_entity_1.EFFLUENT_LIMITS.outFecalColiform)
        b.push('Fecal Coliform');
    if (n(l.outAmmN) != null && n(l.outAmmN) > om_log_entity_1.EFFLUENT_LIMITS.outAmmN)
        b.push('NH3-N');
    if (n(l.outTotalN) != null && n(l.outTotalN) > om_log_entity_1.EFFLUENT_LIMITS.outTotalN)
        b.push('Total N');
    if (n(l.outTotalP) != null && n(l.outTotalP) > om_log_entity_1.EFFLUENT_LIMITS.outTotalP)
        b.push('Total P');
    return b;
}
function downtimeHours(e) {
    const end = e.endAt ? new Date(e.endAt).getTime() : Date.now();
    return Math.max(0, (end - new Date(e.startAt).getTime()) / 3600000);
}
function breakdownPenalty(e) {
    if (e.type !== om_event_entity_1.OmEventType.BREAKDOWN)
        return 0;
    const over = downtimeHours(e) - om_event_entity_1.BREAKDOWN_GRACE_HOURS;
    if (over <= 0)
        return 0;
    return Math.ceil(over / 24) * om_event_entity_1.BREAKDOWN_PENALTY_PER_DAY;
}
let OmService = class OmService {
    logRepo;
    evtRepo;
    constructor(logRepo, evtRepo) {
        this.logRepo = logRepo;
        this.evtRepo = evtRepo;
    }
    async createLog(data) {
        return this.logRepo.save(this.logRepo.create(data));
    }
    async updateLog(id, data) {
        await this.logRepo.update(id, data);
        const l = await this.logRepo.findOne({ where: { id } });
        if (!l)
            throw new common_1.NotFoundException('Log not found');
        return l;
    }
    async deleteLog(id) { return this.logRepo.delete(id); }
    async listLogs(p) {
        const qb = this.logRepo.createQueryBuilder('l').orderBy('l.date', 'DESC');
        if (p.projectId)
            qb.andWhere('l.projectId = :pid', { pid: p.projectId });
        if (p.from)
            qb.andWhere('l.date >= :from', { from: p.from });
        if (p.to)
            qb.andWhere('l.date <= :to', { to: p.to });
        const rows = await qb.getMany();
        return rows.map(l => ({ ...l, breaches: effluentBreaches(l) }));
    }
    async createEvent(data) {
        return this.evtRepo.save(this.evtRepo.create(data));
    }
    async updateEvent(id, data) {
        await this.evtRepo.update(id, data);
        const e = await this.evtRepo.findOne({ where: { id } });
        if (!e)
            throw new common_1.NotFoundException('Event not found');
        return e;
    }
    async deleteEvent(id) { return this.evtRepo.delete(id); }
    async listEvents(p) {
        const qb = this.evtRepo.createQueryBuilder('e').orderBy('e.startAt', 'DESC');
        if (p.projectId)
            qb.andWhere('e.projectId = :pid', { pid: p.projectId });
        if (p.type)
            qb.andWhere('e.type = :t', { t: p.type });
        if (p.status)
            qb.andWhere('e.status = :s', { s: p.status });
        const rows = await qb.getMany();
        return rows.map(e => ({ ...e, downtimeHours: +downtimeHours(e).toFixed(1), penalty: breakdownPenalty(e) }));
    }
    async dashboard(projectId) {
        const logs = await this.logRepo.find(projectId ? { where: { projectId } } : {});
        const events = await this.evtRepo.find(projectId ? { where: { projectId } } : {});
        const withEff = logs.filter(l => l.outBod != null || l.outCod != null || l.outTss != null);
        const compliant = withEff.filter(l => effluentBreaches(l).length === 0).length;
        const avg = (key) => {
            const vals = logs.map(l => l[key]).filter(v => v != null).map(Number);
            return vals.length ? +(vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(1) : null;
        };
        const sum = (key) => logs.reduce((s, l) => s + (Number(l[key]) || 0), 0);
        const breakdowns = events.filter(e => e.type === om_event_entity_1.OmEventType.BREAKDOWN);
        const openBreakdowns = breakdowns.filter(e => e.status === om_event_entity_1.OmEventStatus.OPEN);
        const totalDowntime = breakdowns.reduce((s, e) => s + downtimeHours(e), 0);
        const penaltyExposure = breakdowns.reduce((s, e) => s + breakdownPenalty(e), 0);
        return {
            logDays: logs.length,
            effluentDays: withEff.length,
            compliantDays: compliant,
            compliancePct: withEff.length ? Math.round((compliant / withEff.length) * 100) : null,
            avgOutBod: avg('outBod'), avgOutCod: avg('outCod'), avgOutTss: avg('outTss'),
            avgInflow: avg('inflowMld'), avgOutflow: avg('outflowMld'),
            totalPowerKwh: +sum('powerKwh').toFixed(0),
            totalSludgeM3: +sum('sludgeM3').toFixed(1),
            totalDgHours: +sum('dgHours').toFixed(0),
            openBreakdowns: openBreakdowns.length,
            totalBreakdowns: breakdowns.length,
            totalDowntimeHours: +totalDowntime.toFixed(1),
            breakdownPenaltyExposure: penaltyExposure,
            limits: om_log_entity_1.EFFLUENT_LIMITS,
        };
    }
};
exports.OmService = OmService;
exports.OmService = OmService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(om_log_entity_1.OmLog)),
    __param(1, (0, typeorm_1.InjectRepository)(om_event_entity_1.OmEvent)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], OmService);
//# sourceMappingURL=om.service.js.map