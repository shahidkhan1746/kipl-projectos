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
const liaison_file_entity_1 = require("../liaison/liaison-file.entity");
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
    liaisonRepo;
    constructor(repo, liaisonRepo) {
        this.repo = repo;
        this.liaisonRepo = liaisonRepo;
    }
    daysFromStart(date) {
        const start = new Date(PROJECT_START).getTime();
        const target = new Date(date).getTime();
        return Math.round((target - start) / 86400000);
    }
    resolveDeps(t) {
        if (Array.isArray(t.dependencies) && t.dependencies.length > 0) {
            return t.dependencies
                .filter(d => d && d.code)
                .map(d => ({ code: String(d.code).trim(), type: (d.type ?? 'FS'), lag: Number(d.lag) || 0 }));
        }
        return (t.predecessors ?? '')
            .split(',').map(s => s.trim()).filter(Boolean)
            .map(code => ({ code, type: 'FS', lag: 0 }));
    }
    depsToString(deps) {
        if (!Array.isArray(deps))
            return '';
        return deps
            .filter(d => d && d.code)
            .map(d => {
            const type = (d.type ?? 'FS');
            const lag = Number(d.lag) || 0;
            const suffix = type === 'FS' && lag === 0 ? '' : `(${type}${lag ? (lag > 0 ? '+' + lag : lag) : ''})`;
            return `${d.code}${suffix}`;
        })
            .join(', ');
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
    async addEnablingPhase(projectId) {
        const exists = await this.repo.findOne({ where: { projectId, wbsCode: '0.1' } });
        if (exists)
            return { added: 0 };
        const P0 = [
            { wbsCode: '0.1', title: 'Land Identification & Allotment Decision (UEED / DC / LCMA)', plannedStart: '2025-11-07', plannedEnd: '2025-11-21', plannedDuration: 14, responsible: 'Liaison', dependencies: [] },
            { wbsCode: '0.2', title: 'Statutory Land Transfer & Paperwork (Govt Land)', plannedStart: '2025-11-22', plannedEnd: '2025-12-06', plannedDuration: 14, responsible: 'Liaison', dependencies: [{ code: '0.1', type: 'FS', lag: 0 }] },
            { wbsCode: '0.3', title: 'Tree Enumeration, Felling Clearance & Auction (Forest Dept + LCMA)', plannedStart: '2025-12-07', plannedEnd: '2026-01-05', plannedDuration: 30, responsible: 'Liaison', dependencies: [{ code: '0.2', type: 'FS', lag: 0 }] },
            { wbsCode: '0.4', title: 'Site Clearance, Ground-Improvement Enabling & Possession', plannedStart: '2026-01-06', plannedEnd: '2026-01-20', plannedDuration: 14, responsible: 'Civil', dependencies: [{ code: '0.3', type: 'FS', lag: 0 }] },
            { wbsCode: '0.5', title: 'Material Procurement / Quarrying Permissions', plannedStart: '2025-11-22', plannedEnd: '2025-12-21', plannedDuration: 30, responsible: 'Liaison', dependencies: [{ code: '0.2', type: 'FS', lag: 0 }] },
            { wbsCode: '0.6', title: 'Enforcement Hold — Site Sealed by DSP (LCMA)', plannedStart: '2026-01-06', plannedEnd: '2026-01-20', plannedDuration: 14, responsible: 'Liaison', dependencies: [{ code: '0.4', type: 'FS', lag: 0 }], eotApplied: true, delayReason: 'Site sealed by DSP enforcement (LCMA). Enter actual seal/release dates.' },
            { wbsCode: 'M0', title: 'MILESTONE: Site Handover / Possession to KIPL', plannedStart: '2026-01-20', plannedEnd: '2026-01-20', plannedDuration: 0, isMilestone: true, dependencies: [{ code: '0.4', type: 'FS', lag: 0 }, { code: '0.5', type: 'FS', lag: 0 }] },
        ];
        let order = -100;
        const rows = P0.map(t => ({
            ...t, projectId, level: 1, sortOrder: order++,
            status: wbs_task_entity_1.TaskStatus.NOT_STARTED, progressPct: 0,
            predecessors: this.depsToString(t.dependencies),
        }));
        await this.repo.save(rows);
        const t1 = await this.repo.findOne({ where: { projectId, wbsCode: '1' } });
        if (t1 && (!Array.isArray(t1.dependencies) || t1.dependencies.length === 0) && !(t1.predecessors ?? '').trim()) {
            t1.dependencies = [{ code: 'M0', type: 'FS', lag: 0 }];
            t1.predecessors = 'M0';
            await this.repo.save(t1);
        }
        await this.recalculate(projectId);
        return { added: rows.length };
    }
    async update(id, data) {
        if (Array.isArray(data.dependencies)) {
            data.predecessors = this.depsToString(data.dependencies);
        }
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
        if (Array.isArray(data.dependencies)) {
            data.predecessors = this.depsToString(data.dependencies);
        }
        const count = await this.repo.count({ where: { projectId: data.projectId } });
        const saved = await this.repo.save(this.repo.create({ ...data, sortOrder: count + 1 }));
        await this.recalculate(data.projectId);
        return saved;
    }
    async recalculate(projectId) {
        const tasks = await this.list(projectId);
        const byCode = new Map();
        tasks.forEach(t => byCode.set(t.wbsCode, t));
        const depMap = new Map();
        for (const t of tasks)
            depMap.set(t.wbsCode, this.resolveDeps(t));
        const liaisonFloor = new Map();
        const todayStr = new Date().toISOString().split('T')[0];
        const liaisonFiles = await this.liaisonRepo.find({ where: { projectId } });
        for (const f of liaisonFiles) {
            if (!f.linkedWbsCode)
                continue;
            let effDate = null;
            if (f.actualDate)
                effDate = f.actualDate;
            else if (f.expectedDate)
                effDate = todayStr > f.expectedDate ? todayStr : f.expectedDate;
            if (!effDate)
                continue;
            const floor = this.daysFromStart(effDate);
            const prev = liaisonFloor.get(f.linkedWbsCode);
            liaisonFloor.set(f.linkedWbsCode, prev === undefined ? floor : Math.max(prev, floor));
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
            const deps = depMap.get(code) ?? [];
            const dur = Number(t.expectedDuration);
            let es = deps.length === 0 ? Math.max(0, this.daysFromStart(t.plannedStart)) : 0;
            for (const d of deps) {
                const p = byCode.get(d.code);
                if (!p)
                    continue;
                const r = computeES(d.code);
                let cand;
                switch (d.type) {
                    case 'SS':
                        cand = r.es + d.lag;
                        break;
                    case 'FF':
                        cand = r.ef + d.lag - dur;
                        break;
                    case 'SF':
                        cand = r.es + d.lag - dur;
                        break;
                    case 'FS':
                    default:
                        cand = r.ef + d.lag;
                        break;
                }
                es = Math.max(es, cand);
            }
            const floor = liaisonFloor.get(code);
            if (floor !== undefined)
                es = Math.max(es, floor);
            es = Math.max(0, es);
            const ef = es + dur;
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
            for (const d of depMap.get(t.wbsCode) ?? []) {
                if (!succMap.has(d.code))
                    succMap.set(d.code, []);
                succMap.get(d.code).push({ code: t.wbsCode, type: d.type, lag: d.lag });
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
            const durP = Number(t.expectedDuration);
            const succs = succMap.get(code) ?? [];
            let lf = projectDuration;
            if (succs.length > 0) {
                lf = Infinity;
                for (const e of succs) {
                    const s = byCode.get(e.code);
                    if (!s)
                        continue;
                    const r = computeLF(e.code);
                    let cand;
                    switch (e.type) {
                        case 'SS':
                            cand = r.ls + durP - e.lag;
                            break;
                        case 'FF':
                            cand = r.lf - e.lag;
                            break;
                        case 'SF':
                            cand = r.lf + durP - e.lag;
                            break;
                        case 'FS':
                        default:
                            cand = r.ls - e.lag;
                            break;
                    }
                    lf = Math.min(lf, cand);
                }
                if (lf === Infinity)
                    lf = projectDuration;
            }
            const ls = lf - durP;
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
                dependencies: this.resolveDeps(t),
                duration: Number(t.expectedDuration),
                es: t.earliestStart, ef: t.earliestFinish,
                ls: t.latestStart, lf: t.latestFinish,
                float: t.totalFloat,
                isCritical: t.isCritical,
            })),
        };
    }
    async getEotRegister(projectId) {
        await this.recalculate(projectId);
        const tasks = await this.list(projectId);
        const byCode = new Map();
        tasks.forEach(t => byCode.set(t.wbsCode, t));
        const liaisonFiles = await this.liaisonRepo.find({ where: { projectId } });
        const openStatuses = [liaison_file_entity_1.LiaisonStatus.APPROVED, liaison_file_entity_1.LiaisonStatus.CLOSED];
        const approvalDelays = liaisonFiles
            .filter(f => (Number(f.delayDays) || 0) > 0 || f.isEotGround)
            .map(f => {
            const linked = f.linkedWbsCode ? byCode.get(f.linkedWbsCode) : undefined;
            return {
                source: 'approval',
                ref: f.fileNumber,
                subject: f.subject,
                department: f.department,
                expectedDate: f.expectedDate,
                actualDate: f.actualDate,
                settled: openStatuses.includes(f.currentStatus),
                delayDays: Number(f.delayDays) || 0,
                isEotGround: f.isEotGround,
                reason: f.eotReason,
                linkedWbsCode: f.linkedWbsCode ?? null,
                linkedTitle: linked?.title ?? null,
                criticalPathImpact: linked ? !!linked.isCritical : false,
            };
        });
        const taskDelays = tasks
            .filter(t => !t.isMilestone && ((Number(t.delayDays) || 0) > 0 || t.eotApplied))
            .map(t => ({
            source: 'task',
            ref: t.wbsCode,
            subject: t.title,
            responsible: t.responsible,
            delayDays: Number(t.delayDays) || 0,
            eotApplied: t.eotApplied,
            eotDays: Number(t.eotDays) || 0,
            reason: t.delayReason,
            criticalPathImpact: !!t.isCritical,
        }));
        const approvalEot = approvalDelays
            .filter(d => d.isEotGround && d.criticalPathImpact)
            .reduce((s, d) => s + d.delayDays, 0);
        const taskEot = taskDelays
            .filter(d => d.eotApplied)
            .reduce((s, d) => s + (d.eotDays || d.delayDays), 0);
        return {
            approvalDelays,
            taskDelays,
            totals: {
                approvalDelayDays: approvalDelays.reduce((s, d) => s + d.delayDays, 0),
                taskDelayDays: taskDelays.reduce((s, d) => s + d.delayDays, 0),
                claimableEotDays: approvalEot + taskEot,
            },
            contractEnd: PROJECT_END,
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
    __param(1, (0, typeorm_1.InjectRepository)(liaison_file_entity_1.LiaisonFile)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], WbsService);
//# sourceMappingURL=wbs.service.js.map