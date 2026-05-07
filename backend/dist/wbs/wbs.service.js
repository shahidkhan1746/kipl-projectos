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
exports.WbsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const wbs_task_entity_1 = require("./wbs-task.entity");
const PROJECT_START = '2025-11-07';
const PROJECT_END = '2028-05-07';
const SEED_TASKS = [
    { wbsCode: '1', title: 'Survey, Design & Vetting', level: 1, sortOrder: 1, plannedStart: '2025-11-07', plannedEnd: '2026-01-31', plannedDuration: 86, isMilestone: false, paymentPct: 5, paymentMilestone: 'Survey & Vetting of Design', predecessors: '' },
    { wbsCode: '2', title: 'Sewer Network — Civil Works', level: 1, sortOrder: 2, plannedStart: '2026-02-01', plannedEnd: '2027-03-31', plannedDuration: 423, isMilestone: false, paymentPct: 55, paymentMilestone: 'Pipe Laying & Backfilling', predecessors: '1' },
    { wbsCode: '3', title: 'IPS Construction — Civil', level: 1, sortOrder: 3, plannedStart: '2026-02-01', plannedEnd: '2027-03-31', plannedDuration: 423, isMilestone: false, paymentPct: 30, paymentMilestone: 'Civil Structure Work', predecessors: '1' },
    { wbsCode: '4', title: 'STP Construction (30 MLD)', level: 1, sortOrder: 4, plannedStart: '2026-02-01', plannedEnd: '2027-06-30', plannedDuration: 514, isMilestone: false, paymentPct: 30, paymentMilestone: 'Civil Structure Work', predecessors: '1' },
    { wbsCode: '5', title: 'Rising Mains & Appurtenances', level: 1, sortOrder: 5, plannedStart: '2026-04-01', plannedEnd: '2027-03-31', plannedDuration: 365, isMilestone: false, paymentPct: 55, paymentMilestone: 'Pipe Laying & Backfilling', predecessors: '1' },
    { wbsCode: '6', title: 'E&M Works — IPS & STP', level: 1, sortOrder: 6, plannedStart: '2026-10-01', plannedEnd: '2027-10-31', plannedDuration: 396, isMilestone: false, paymentPct: 40, paymentMilestone: 'Delivery at Site after TPI', predecessors: '3,4' },
    { wbsCode: '7', title: 'Road Reinstatement', level: 1, sortOrder: 7, plannedStart: '2026-07-01', plannedEnd: '2028-05-07', plannedDuration: 676, isMilestone: false, paymentPct: 20, paymentMilestone: 'Permanent Road Reinstatement', predecessors: '2' },
    { wbsCode: '8', title: 'Testing & Commissioning', level: 1, sortOrder: 8, plannedStart: '2027-10-01', plannedEnd: '2028-05-07', plannedDuration: 219, isMilestone: false, paymentPct: 10, paymentMilestone: 'Sectional Flow Testing', predecessors: '6' },
    { wbsCode: '9', title: 'Free Trial Run (6 Months)', level: 1, sortOrder: 9, plannedStart: '2027-11-07', plannedEnd: '2028-05-07', plannedDuration: 182, isMilestone: true, paymentPct: 5, paymentMilestone: 'Trial Run Completion', predecessors: '8' },
    { wbsCode: '10', title: 'O&M Period (5 Years)', level: 1, sortOrder: 10, plannedStart: '2028-05-08', plannedEnd: '2033-05-07', plannedDuration: 1825, isMilestone: false, paymentPct: 5, paymentMilestone: 'O&M Year 1', predecessors: '9' },
    { wbsCode: '2.1', title: '200mm dia RCC NP3 Pipes (184,793m)', level: 2, sortOrder: 11, plannedStart: '2026-02-01', plannedEnd: '2027-01-31', plannedDuration: 365, isMilestone: false, parentId: '2', responsible: 'Civil Team', predecessors: '1' },
    { wbsCode: '2.2', title: '300-500mm dia Pipes', level: 2, sortOrder: 12, plannedStart: '2026-03-01', plannedEnd: '2027-02-28', plannedDuration: 365, isMilestone: false, parentId: '2', responsible: 'Civil Team', predecessors: '2.1' },
    { wbsCode: '2.3', title: '700-1000mm dia Pipes', level: 2, sortOrder: 13, plannedStart: '2026-05-01', plannedEnd: '2027-03-31', plannedDuration: 334, isMilestone: false, parentId: '2', responsible: 'Civil Team', predecessors: '2.2' },
    { wbsCode: '2.4', title: 'RCC Manholes (3,728 Nos)', level: 2, sortOrder: 14, plannedStart: '2026-02-01', plannedEnd: '2027-03-31', plannedDuration: 423, isMilestone: false, parentId: '2', responsible: 'Civil Team', predecessors: '1' },
    { wbsCode: '2.5', title: 'Masonry Chambers (15,814 Nos)', level: 2, sortOrder: 15, plannedStart: '2026-03-01', plannedEnd: '2027-03-31', plannedDuration: 395, isMilestone: false, parentId: '2', responsible: 'Civil Team', predecessors: '2.1' },
    { wbsCode: '3.1', title: 'IPS-1 at Node 102', level: 2, sortOrder: 16, plannedStart: '2026-02-01', plannedEnd: '2026-11-30', plannedDuration: 302, isMilestone: false, parentId: '3', responsible: 'Civil Team', predecessors: '1' },
    { wbsCode: '3.2', title: 'IPS-3 at Node 1053', level: 2, sortOrder: 17, plannedStart: '2026-03-01', plannedEnd: '2027-02-28', plannedDuration: 365, isMilestone: false, parentId: '3', responsible: 'Civil Team', predecessors: '1' },
    { wbsCode: '3.3', title: 'IPS-5 at Node 1532', level: 2, sortOrder: 18, plannedStart: '2026-05-01', plannedEnd: '2027-03-31', plannedDuration: 334, isMilestone: false, parentId: '3', responsible: 'Civil Team', predecessors: '3.1' },
    { wbsCode: '3.4', title: 'IPS-9 at Node 4011 (Largest)', level: 2, sortOrder: 19, plannedStart: '2026-03-01', plannedEnd: '2027-03-31', plannedDuration: 395, isMilestone: false, parentId: '3', responsible: 'Civil Team', predecessors: '1' },
    { wbsCode: '3.5', title: 'MPS at Habak', level: 2, sortOrder: 20, plannedStart: '2026-08-01', plannedEnd: '2027-03-31', plannedDuration: 242, isMilestone: false, parentId: '3', responsible: 'Civil Team', predecessors: '3.1' },
    { wbsCode: 'M1', title: 'MILESTONE: Design Approval from UEED', level: 1, sortOrder: 21, plannedStart: '2026-01-31', plannedEnd: '2026-01-31', plannedDuration: 0, isMilestone: true, paymentMilestone: 'Design Approval', predecessors: '1' },
    { wbsCode: 'M2', title: 'MILESTONE: RA-1 Bill Submission', level: 1, sortOrder: 22, plannedStart: '2026-05-07', plannedEnd: '2026-05-07', plannedDuration: 0, isMilestone: true, paymentMilestone: 'RA-1 (5% of net)', predecessors: 'M1' },
    { wbsCode: 'M3', title: 'MILESTONE: 30% Network Complete', level: 1, sortOrder: 23, plannedStart: '2026-11-30', plannedEnd: '2026-11-30', plannedDuration: 0, isMilestone: true, paymentMilestone: 'Interim Progress', predecessors: '2' },
    { wbsCode: 'M4', title: 'MILESTONE: All IPS Civil Complete', level: 1, sortOrder: 24, plannedStart: '2027-03-31', plannedEnd: '2027-03-31', plannedDuration: 0, isMilestone: true, paymentMilestone: 'Civil Completion', predecessors: '3' },
    { wbsCode: 'M5', title: 'MILESTONE: STP Commissioned', level: 1, sortOrder: 25, plannedStart: '2027-10-31', plannedEnd: '2027-10-31', plannedDuration: 0, isMilestone: true, paymentMilestone: 'STP Testing & Commissioning', predecessors: '6' },
    { wbsCode: 'M6', title: 'MILESTONE: Completion Certificate', level: 1, sortOrder: 26, plannedStart: '2028-05-07', plannedEnd: '2028-05-07', plannedDuration: 0, isMilestone: true, paymentMilestone: 'Completion Certificate by UEED', predecessors: '9' },
];
let WbsService = class WbsService {
    repo;
    constructor(repo) {
        this.repo = repo;
    }
    daysFromStart(date) {
        const start = new Date(PROJECT_START).getTime();
        const target = new Date(date).getTime();
        return Math.round((target - start) / 86400000);
    }
    addDays(date, days) {
        const d = new Date(date);
        d.setDate(d.getDate() + days);
        return d.toISOString().split('T')[0];
    }
    async seed(projectId, force = false) {
        if (force) {
            await this.repo.delete({ projectId });
        }
        else {
            const existing = await this.repo.count({ where: { projectId } });
            if (existing > 0)
                return { seeded: 0 };
        }
        const tasks = SEED_TASKS.map(t => this.repo.create({
            ...t, projectId, status: wbs_task_entity_1.TaskStatus.NOT_STARTED, progressPct: 0,
        }));
        await this.repo.save(tasks);
        await this.recalculate(projectId);
        return { seeded: tasks.length };
    }
    async list(projectId) {
        return this.repo.find({ where: { projectId }, order: { sortOrder: 'ASC' } });
    }
    async update(id, data) {
        if (data.plannedEnd && data.actualEnd) {
            const planned = new Date(data.plannedEnd);
            const actual = new Date(data.actualEnd);
            data.delayDays = Math.max(0, Math.round((actual.getTime() - planned.getTime()) / 86400000));
        }
        else if (data.plannedEnd && data.progressPct < 100) {
            const today = new Date();
            const planned = new Date(data.plannedEnd);
            if (today > planned) {
                data.delayDays = Math.round((today.getTime() - planned.getTime()) / 86400000);
                if (!data.status)
                    data.status = wbs_task_entity_1.TaskStatus.DELAYED;
            }
        }
        await this.repo.update(id, data);
        const task = await this.repo.findOne({ where: { id } });
        if (task)
            await this.recalculate(task.projectId);
        return task;
    }
    async create(data) {
        const count = await this.repo.count({ where: { projectId: data.projectId } });
        const saved = await this.repo.save(this.repo.create({ ...data, sortOrder: count + 1 }));
        await this.recalculate(data.projectId);
        return saved;
    }
    async recalculate(projectId) {
        const tasks = await this.list(projectId);
        const byCode = new Map();
        tasks.forEach(t => byCode.set(t.wbsCode, t));
        const predMap = new Map();
        for (const t of tasks) {
            const explicit = (t.predecessors ?? '').split(',').map(s => s.trim()).filter(Boolean);
            predMap.set(t.wbsCode, explicit);
        }
        for (const t of tasks) {
            const M = Number(t.plannedDuration) || 0;
            const O = +(M * 0.9).toFixed(2);
            const P = +(M * 1.3 + (Number(t.delayDays) || 0)).toFixed(2);
            const TE = +((O + 4 * M + P) / 6).toFixed(2);
            const V = +(((P - O) / 6) ** 2).toFixed(4);
            const SD = +Math.sqrt(V).toFixed(4);
            t.optimisticDuration = O;
            t.mostLikelyDuration = M;
            t.pessimisticDuration = P;
            t.expectedDuration = TE;
            t.variance = V;
            t.standardDeviation = SD;
        }
        const computed = new Set();
        const visiting = new Set();
        const computeES = (code) => {
            const t = byCode.get(code);
            if (!t)
                return { es: 0, ef: 0 };
            if (computed.has(code))
                return { es: Number(t.earliestStart), ef: Number(t.earliestFinish) };
            if (visiting.has(code)) {
                return { es: Math.max(0, this.daysFromStart(t.plannedStart)), ef: Math.max(0, this.daysFromStart(t.plannedEnd)) };
            }
            visiting.add(code);
            const preds = predMap.get(code) ?? [];
            let es = 0;
            for (const p of preds) {
                const result = computeES(p);
                es = Math.max(es, result.ef);
            }
            if (preds.length === 0) {
                es = Math.max(0, this.daysFromStart(t.plannedStart));
            }
            const ef = es + Number(t.expectedDuration);
            t.earliestStart = +es.toFixed(0);
            t.earliestFinish = +ef.toFixed(0);
            computed.add(code);
            visiting.delete(code);
            return { es, ef };
        };
        for (const t of tasks)
            computeES(t.wbsCode);
        const projectDuration = Math.max(...tasks.map(t => Number(t.earliestFinish)));
        const succMap = new Map();
        for (const t of tasks) {
            const preds = predMap.get(t.wbsCode) ?? [];
            for (const p of preds) {
                if (!succMap.has(p))
                    succMap.set(p, []);
                succMap.get(p).push(t.wbsCode);
            }
        }
        const bwdComputed = new Set();
        const bwdVisiting = new Set();
        const computeLF = (code) => {
            const t = byCode.get(code);
            if (!t)
                return { ls: 0, lf: 0 };
            if (bwdComputed.has(code))
                return { ls: Number(t.latestStart), lf: Number(t.latestFinish) };
            if (bwdVisiting.has(code))
                return { ls: projectDuration, lf: projectDuration };
            bwdVisiting.add(code);
            const succs = succMap.get(code) ?? [];
            let lf = projectDuration;
            if (succs.length > 0) {
                lf = Infinity;
                for (const s of succs) {
                    const result = computeLF(s);
                    lf = Math.min(lf, result.ls);
                }
                if (lf === Infinity)
                    lf = projectDuration;
            }
            const ls = lf - Number(t.expectedDuration);
            t.latestFinish = +lf.toFixed(0);
            t.latestStart = +ls.toFixed(0);
            bwdComputed.add(code);
            bwdVisiting.delete(code);
            return { ls, lf };
        };
        for (const t of tasks)
            computeLF(t.wbsCode);
        const critical = [];
        for (const t of tasks) {
            t.totalFloat = Number(t.latestStart) - Number(t.earliestStart);
            t.isCritical = t.totalFloat <= 0 && !t.isMilestone;
            if (t.isCritical)
                critical.push(t.wbsCode);
        }
        await this.repo.save(tasks);
        return { critical, projectDuration };
    }
    async dashboard(projectId) {
        const tasks = await this.list(projectId);
        const nonMilestones = tasks.filter(t => !t.isMilestone);
        const total = nonMilestones.length;
        const completed = nonMilestones.filter(t => t.status === wbs_task_entity_1.TaskStatus.COMPLETED).length;
        const delayed = nonMilestones.filter(t => t.status === wbs_task_entity_1.TaskStatus.DELAYED || Number(t.delayDays) > 0).length;
        const inProg = nonMilestones.filter(t => t.status === wbs_task_entity_1.TaskStatus.IN_PROGRESS).length;
        const avgProg = total > 0 ? nonMilestones.reduce((s, t) => s + Number(t.progressPct), 0) / total : 0;
        const milestones = tasks.filter(t => t.isMilestone);
        const passedMs = milestones.filter(t => t.status === wbs_task_entity_1.TaskStatus.COMPLETED || new Date(t.plannedEnd) < new Date());
        const contractEnd = new Date(PROJECT_END);
        const contractStart = new Date(PROJECT_START);
        const today = new Date();
        const daysRemaining = Math.round((contractEnd.getTime() - today.getTime()) / 86400000);
        const contractPct = Math.min(100, Math.max(0, (today.getTime() - contractStart.getTime()) / (contractEnd.getTime() - contractStart.getTime()) * 100)).toFixed(1);
        const critical = tasks.filter(t => t.isCritical);
        const projectExpectedDuration = Math.max(...tasks.map(t => Number(t.earliestFinish)), 0);
        const totalVariance = critical.reduce((s, t) => s + Number(t.variance), 0);
        return {
            totalTasks: total, completed, delayed, inProgress: inProg,
            overallProgress: avgProg.toFixed(1),
            milestones: milestones.length, milestonesHit: passedMs.length,
            daysRemaining, contractPct,
            contractStart: PROJECT_START, contractEnd: PROJECT_END,
            criticalTasks: critical.length,
            projectExpectedDuration,
            projectStdDeviation: +Math.sqrt(totalVariance).toFixed(2),
        };
    }
    async getCPM(projectId) {
        await this.recalculate(projectId);
        const tasks = await this.list(projectId);
        return {
            projectStart: PROJECT_START,
            projectEnd: PROJECT_END,
            criticalPath: tasks.filter(t => t.isCritical).map(t => ({
                wbsCode: t.wbsCode,
                title: t.title,
                duration: Number(t.expectedDuration),
                earliestStart: t.earliestStart,
                earliestFinish: t.earliestFinish,
                latestStart: t.latestStart,
                latestFinish: t.latestFinish,
                totalFloat: t.totalFloat,
            })),
            allTasks: tasks.map(t => ({
                wbsCode: t.wbsCode,
                title: t.title,
                predecessors: t.predecessors,
                duration: Number(t.expectedDuration),
                es: t.earliestStart, ef: t.earliestFinish,
                ls: t.latestStart, lf: t.latestFinish,
                float: t.totalFloat,
                isCritical: t.isCritical,
            })),
        };
    }
    async getPERT(projectId) {
        await this.recalculate(projectId);
        const tasks = await this.list(projectId);
        const nonMilestones = tasks.filter(t => !t.isMilestone);
        const critical = tasks.filter(t => t.isCritical);
        const projectExpected = critical.reduce((s, t) => s + Number(t.expectedDuration), 0);
        const projectVariance = critical.reduce((s, t) => s + Number(t.variance), 0);
        const projectStdDev = Math.sqrt(projectVariance);
        return {
            projectExpectedDuration: +projectExpected.toFixed(2),
            projectStdDeviation: +projectStdDev.toFixed(4),
            projectVariance: +projectVariance.toFixed(4),
            probability68: { lower: +(projectExpected - projectStdDev).toFixed(2), upper: +(projectExpected + projectStdDev).toFixed(2) },
            probability95: { lower: +(projectExpected - 2 * projectStdDev).toFixed(2), upper: +(projectExpected + 2 * projectStdDev).toFixed(2) },
            probability99: { lower: +(projectExpected - 3 * projectStdDev).toFixed(2), upper: +(projectExpected + 3 * projectStdDev).toFixed(2) },
            tasks: nonMilestones.map(t => ({
                wbsCode: t.wbsCode,
                title: t.title,
                optimistic: Number(t.optimisticDuration),
                mostLikely: Number(t.mostLikelyDuration),
                pessimistic: Number(t.pessimisticDuration),
                expected: Number(t.expectedDuration),
                variance: Number(t.variance),
                stdDeviation: Number(t.standardDeviation),
                isCritical: t.isCritical,
            })),
        };
    }
};
exports.WbsService = WbsService;
exports.WbsService = WbsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(wbs_task_entity_1.WbsTask)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], WbsService);
//# sourceMappingURL=wbs.service.js.map