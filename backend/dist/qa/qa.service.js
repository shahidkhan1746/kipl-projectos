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
exports.QaService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const qa_checklist_entity_1 = require("./qa-checklist.entity");
const qa_inspection_entity_1 = require("./qa-inspection.entity");
const ncr_entity_1 = require("./ncr.entity");
const DEFAULT_CHECKLISTS = [
    {
        title: 'Pipe Laying — Pre-Laying Inspection',
        category: qa_checklist_entity_1.ChecklistCategory.PIPE_LAYING,
        workItem: 'RCC NP3 Pipe Laying',
        isTemplate: true,
        items: [
            { id: 'pl1', question: 'Trench excavated to correct width and depth as per drawing?', required: true, referenceSpec: 'Clause 6.0 SCC' },
            { id: 'pl2', question: 'Trench bottom properly levelled and compacted?', required: true },
            { id: 'pl3', question: 'PCC bedding (1:4:8) laid to specified thickness?', required: true, referenceSpec: 'BOQ Item 4.4.7' },
            { id: 'pl4', question: 'Pipe class (NP3) and diameter verified against drawing?', required: true },
            { id: 'pl5', question: 'Rubber gasket joints inspected and lubricated?', required: true },
            { id: 'pl6', question: 'Pipe laid to correct gradient — checked with level?', required: true },
            { id: 'pl7', question: 'Timbering/shoring provided where depth >1.5m?', required: true, referenceSpec: 'Safety Clause' },
            { id: 'pl8', question: 'Traffic barricading and night lamps in place?', required: true },
        ],
    },
    {
        title: 'Pipe Laying — Post-Laying & Backfilling',
        category: qa_checklist_entity_1.ChecklistCategory.PIPE_LAYING,
        workItem: 'RCC NP3 Pipe Laying',
        isTemplate: true,
        items: [
            { id: 'pb1', question: 'Sectional flow test conducted and passed?', required: true, referenceSpec: 'Clause 23.3 — 10% payment milestone' },
            { id: 'pb2', question: 'Backfilling done in 20cm layers with proper compaction?', required: true, referenceSpec: 'BOQ Item 2.11' },
            { id: 'pb3', question: 'Surplus earth disposed within 8km as per BOQ?', required: true },
            { id: 'pb4', question: 'Temporary road reinstatement done?', required: true },
            { id: 'pb5', question: 'Pipe protected from damage during backfilling?', required: true },
        ],
    },
    {
        title: 'Manhole Construction — Pre-Pour Check',
        category: qa_checklist_entity_1.ChecklistCategory.MANHOLE,
        workItem: 'RCC Manholes',
        isTemplate: true,
        items: [
            { id: 'mh1', question: 'Excavation to correct depth and dia as per drawing?', required: true },
            { id: 'mh2', question: 'PCC base laid to correct thickness?', required: true },
            { id: 'mh3', question: 'Reinforcement as per approved drawing — dia and spacing?', required: true },
            { id: 'mh4', question: 'Shuttering properly fixed and leak-free?', required: true },
            { id: 'mh5', question: 'Cover slab reinforcement and embedments correct?', required: true },
            { id: 'mh6', question: 'M25 RCC mix design approved by UEED?', required: true, referenceSpec: 'IS 456-2000, Clause 9' },
            { id: 'mh7', question: 'CI footrests positioned at correct spacing?', required: true },
        ],
    },
    {
        title: 'Concrete Pour — M25 RCC',
        category: qa_checklist_entity_1.ChecklistCategory.CONCRETE,
        workItem: 'RCC Work',
        isTemplate: true,
        items: [
            { id: 'cc1', question: 'RMC transit mixer batch ticket verified?', required: true, referenceSpec: 'IS 456-2000' },
            { id: 'cc2', question: 'Slump test done — within acceptable range?', required: true },
            { id: 'cc3', question: 'Cube samples taken (3 cubes per pour)?', required: true },
            { id: 'cc4', question: 'Vibration done properly — no segregation?', required: true },
            { id: 'cc5', question: 'Pour done in one continuous operation?', required: true },
            { id: 'cc6', question: 'Curing arrangement in place (water/cover)?', required: true, referenceSpec: 'Min 10 days curing' },
        ],
    },
    {
        title: 'Material Inspection — Incoming',
        category: qa_checklist_entity_1.ChecklistCategory.MATERIAL,
        workItem: 'Material Receipt',
        isTemplate: true,
        items: [
            { id: 'mi1', question: 'Cement brand approved — Ultratech/Ambuja/ACC?', required: true, referenceSpec: 'Clause 21.23' },
            { id: 'mi2', question: 'TMT steel — TATA/SAIL/RINL/Jindal brand?', required: true, referenceSpec: 'Clause 21.23' },
            { id: 'mi3', question: 'Test certificates from manufacturer available?', required: true },
            { id: 'mi4', question: 'Quantity as per delivery challan verified?', required: true },
            { id: 'mi5', question: 'Material stored properly — cement off ground?', required: true },
        ],
    },
    {
        title: 'Sectional Flow Testing — Sewer Network',
        category: qa_checklist_entity_1.ChecklistCategory.TESTING,
        workItem: 'Sewer Testing',
        isTemplate: true,
        items: [
            { id: 'sf1', question: 'Section isolated with plugs at manholes?', required: true },
            { id: 'sf2', question: 'Section filled with water and held for 30 minutes?', required: true },
            { id: 'sf3', question: 'Water loss within acceptable limits?', required: true },
            { id: 'sf4', question: 'All joints checked for leakage?', required: true },
            { id: 'sf5', question: 'CCTV inspection done for pipe interiors?', required: false },
            { id: 'sf6', question: 'Test report signed by AEE, UEED?', required: true, referenceSpec: 'Clause 23.3 — 10% payment' },
        ],
    },
    {
        title: 'Road Reinstatement — Final',
        category: qa_checklist_entity_1.ChecklistCategory.ROAD_RESTORATION,
        workItem: 'Road Cutting & Reinstatement',
        isTemplate: true,
        items: [
            { id: 'rr1', question: 'Sub-base compacted to 95% Proctor density?', required: true },
            { id: 'rr2', question: 'Aggregate base course laid to correct thickness?', required: true },
            { id: 'rr3', question: 'Bituminous surface matching original road?', required: true, referenceSpec: 'BOQ Item 16.14.1' },
            { id: 'rr4', question: 'Edges of reinstatement properly sealed?', required: true },
            { id: 'rr5', question: 'Road markings reinstated where applicable?', required: false },
            { id: 'rr6', question: 'Traffic police clearance obtained?', required: true, referenceSpec: 'Clause 20.1' },
        ],
    },
    {
        title: 'Safety Inspection — Daily Site Check',
        category: qa_checklist_entity_1.ChecklistCategory.SAFETY,
        workItem: 'Site Safety',
        isTemplate: true,
        items: [
            { id: 'sa1', question: 'All excavations barricaded and lit at night?', required: true },
            { id: 'sa2', question: 'Workers wearing PPE — helmets, boots, gloves?', required: true, referenceSpec: 'Labour Safety Clause' },
            { id: 'sa3', question: 'First Aid box stocked and accessible?', required: true, referenceSpec: 'Clause 3.2.2' },
            { id: 'sa4', question: 'Drinking water provided at site?', required: true, referenceSpec: 'Clause 4.1' },
            { id: 'sa5', question: 'Fire extinguisher available near fuel storage?', required: true },
            { id: 'sa6', question: 'Emergency contact numbers displayed?', required: true },
        ],
    },
];
let QaService = class QaService {
    clRepo;
    inRepo;
    ncrRepo;
    constructor(clRepo, inRepo, ncrRepo) {
        this.clRepo = clRepo;
        this.inRepo = inRepo;
        this.ncrRepo = ncrRepo;
    }
    async seedChecklists(projectId) {
        const existing = await this.clRepo.count({ where: { projectId, isTemplate: true } });
        if (existing > 0)
            return { seeded: 0 };
        const items = DEFAULT_CHECKLISTS.map(c => this.clRepo.create({ ...c, projectId }));
        await this.clRepo.save(items);
        return { seeded: items.length };
    }
    async listChecklists(projectId, category) {
        const qb = this.clRepo.createQueryBuilder('c')
            .where('c.projectId = :pid', { pid: projectId })
            .andWhere('c.isActive = true')
            .orderBy('c.category', 'ASC');
        if (category)
            qb.andWhere('c.category = :cat', { cat: category });
        return qb.getMany();
    }
    async createChecklist(data) {
        return this.clRepo.save(this.clRepo.create(data));
    }
    async getChecklist(id) {
        const c = await this.clRepo.findOne({ where: { id } });
        if (!c)
            throw new common_1.NotFoundException('Checklist not found');
        return c;
    }
    async createInspection(data) {
        const responses = data.responses ?? [];
        const passCount = responses.filter((r) => r.result === 'pass').length;
        const failCount = responses.filter((r) => r.result === 'fail').length;
        const naCount = responses.filter((r) => r.result === 'na').length;
        let overallResult = qa_inspection_entity_1.InspectionStatus.DRAFT;
        if (data.submitted) {
            overallResult = failCount === 0 ? qa_inspection_entity_1.InspectionStatus.PASSED
                : failCount <= 2 ? qa_inspection_entity_1.InspectionStatus.CONDITIONAL
                    : qa_inspection_entity_1.InspectionStatus.FAILED;
        }
        return this.inRepo.save(this.inRepo.create({
            ...data, passCount, failCount, naCount, overallResult,
        }));
    }
    async listInspections(p) {
        const qb = this.inRepo.createQueryBuilder('i').orderBy('i.date', 'DESC');
        if (p.projectId)
            qb.andWhere('i.projectId = :pid', { pid: p.projectId });
        if (p.workItem)
            qb.andWhere('i.workItem ILIKE :w', { w: '%' + p.workItem + '%' });
        if (p.result)
            qb.andWhere('i.overallResult = :r', { r: p.result });
        if (p.fromDate)
            qb.andWhere('i.date >= :from', { from: p.fromDate });
        if (p.toDate)
            qb.andWhere('i.date <= :to', { to: p.toDate });
        return qb.getMany();
    }
    async getInspection(id) {
        const i = await this.inRepo.findOne({ where: { id } });
        if (!i)
            throw new common_1.NotFoundException('Inspection not found');
        return i;
    }
    async updateInspection(id, data) {
        const responses = data.responses ?? [];
        const passCount = responses.filter((r) => r.result === 'pass').length;
        const failCount = responses.filter((r) => r.result === 'fail').length;
        const naCount = responses.filter((r) => r.result === 'na').length;
        let overallResult = qa_inspection_entity_1.InspectionStatus.SUBMITTED;
        if (failCount === 0)
            overallResult = qa_inspection_entity_1.InspectionStatus.PASSED;
        else if (failCount <= 2)
            overallResult = qa_inspection_entity_1.InspectionStatus.CONDITIONAL;
        else
            overallResult = qa_inspection_entity_1.InspectionStatus.FAILED;
        await this.inRepo.update(id, { ...data, passCount, failCount, naCount, overallResult });
        return this.getInspection(id);
    }
    async createNcr(data) {
        const count = await this.ncrRepo.count({ where: { projectId: data.projectId } });
        const ncrNo = 'NCR-' + String(count + 1).padStart(4, '0');
        return this.ncrRepo.save(this.ncrRepo.create({ ...data, ncrNo }));
    }
    async listNcrs(p) {
        const qb = this.ncrRepo.createQueryBuilder('n').orderBy('n.date', 'DESC');
        if (p.projectId)
            qb.andWhere('n.projectId = :pid', { pid: p.projectId });
        if (p.status)
            qb.andWhere('n.status = :s', { s: p.status });
        if (p.severity)
            qb.andWhere('n.severity = :sev', { sev: p.severity });
        return qb.getMany();
    }
    async closeNcr(id, data) {
        await this.ncrRepo.update(id, {
            ...data,
            status: ncr_entity_1.NcrStatus.CLOSED,
            closedDate: new Date().toISOString().split('T')[0],
        });
        return this.ncrRepo.findOne({ where: { id } });
    }
    async dashboard(projectId) {
        const inspections = await this.listInspections({ projectId });
        const ncrs = await this.listNcrs({ projectId });
        const passed = inspections.filter(i => i.overallResult === qa_inspection_entity_1.InspectionStatus.PASSED).length;
        const failed = inspections.filter(i => i.overallResult === qa_inspection_entity_1.InspectionStatus.FAILED).length;
        const openNcrs = ncrs.filter(n => n.status === ncr_entity_1.NcrStatus.OPEN).length;
        const critNcrs = ncrs.filter(n => n.severity === 'critical' && n.status === ncr_entity_1.NcrStatus.OPEN).length;
        return {
            totalInspections: inspections.length,
            passed, failed,
            passRate: inspections.length > 0 ? (passed / inspections.length * 100).toFixed(1) : '0',
            totalNcrs: ncrs.length,
            openNcrs, critNcrs,
            closedNcrs: ncrs.filter(n => n.status === ncr_entity_1.NcrStatus.CLOSED).length,
        };
    }
};
exports.QaService = QaService;
exports.QaService = QaService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(qa_checklist_entity_1.QaChecklist)),
    __param(1, (0, typeorm_1.InjectRepository)(qa_inspection_entity_1.QaInspection)),
    __param(2, (0, typeorm_1.InjectRepository)(ncr_entity_1.Ncr)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], QaService);
//# sourceMappingURL=qa.service.js.map