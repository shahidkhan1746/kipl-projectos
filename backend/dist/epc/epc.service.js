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
exports.EpcService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const boq_item_entity_1 = require("./boq-item.entity");
const ra_bill_entity_1 = require("./ra-bill.entity");
const measurement_entity_1 = require("./measurement.entity");
const DAL_LAKE_BOQ = [
    {
        slNo: '1A', sorRef: 'NS',
        description: 'Providing and Laying non-pressure (NP3) RCC socket & spigot pipes with rubber gasket joint incl. testing — 200mm dia',
        unit: 'M', category: boq_item_entity_1.BoqCategory.SEWER_NETWORK, subCategory: 'RCC NP3 Pipes',
        estimatedQty: 184793, rate: 566.40, estimatedAmount: 10466675.52,
    },
    {
        slNo: '1B', sorRef: 'NS',
        description: 'RCC NP3 pipes — 250mm dia',
        unit: 'M', category: boq_item_entity_1.BoqCategory.SEWER_NETWORK, subCategory: 'RCC NP3 Pipes',
        estimatedQty: 4016, rate: 666.00, estimatedAmount: 2674656,
    },
    {
        slNo: '1C', sorRef: 'NS',
        description: 'RCC NP3 pipes — 300mm dia',
        unit: 'M', category: boq_item_entity_1.BoqCategory.SEWER_NETWORK, subCategory: 'RCC NP3 Pipes',
        estimatedQty: 4938, rate: 1274.40, estimatedAmount: 6292987.20,
    },
    {
        slNo: '1D', sorRef: 'NS',
        description: 'RCC NP3 pipes — 700mm dia',
        unit: 'M', category: boq_item_entity_1.BoqCategory.SEWER_NETWORK, subCategory: 'RCC NP3 Pipes',
        estimatedQty: 5676, rate: 4536.00, estimatedAmount: 25746336,
    },
    {
        slNo: '1E', sorRef: 'NS',
        description: 'RCC NP3 pipes — 900mm dia',
        unit: 'M', category: boq_item_entity_1.BoqCategory.SEWER_NETWORK, subCategory: 'RCC NP3 Pipes',
        estimatedQty: 1180, rate: 5664.00, estimatedAmount: 6683520,
    },
    {
        slNo: '1F', sorRef: 'NS',
        description: 'RCC NP3 pipes — 1000mm dia',
        unit: 'M', category: boq_item_entity_1.BoqCategory.SEWER_NETWORK, subCategory: 'RCC NP3 Pipes',
        estimatedQty: 302, rate: 6372.00, estimatedAmount: 1924344,
    },
    {
        slNo: '2', sorRef: 'J&K SOR 2022 2.9',
        description: 'Earth work in excavation by mechanical means in trenches — 0.00 to 1.50m depth, ordinary soil',
        unit: 'Cum', category: boq_item_entity_1.BoqCategory.SEWER_NETWORK, subCategory: 'Earthwork',
        estimatedQty: 241513.56, rate: 256.85, estimatedAmount: 62032757.19,
    },
    {
        slNo: '3', sorRef: 'J&K SOR 2022 2.11',
        description: 'Filling available excavated earth in trenches — layer not exceeding 20cm, ramming and watering',
        unit: 'Cum', category: boq_item_entity_1.BoqCategory.SEWER_NETWORK, subCategory: 'Earthwork',
        estimatedQty: 524187.19, rate: 218.40, estimatedAmount: 114482481.47,
    },
    {
        slNo: '4', sorRef: 'Unit Est.',
        description: 'RCC circular Manholes — 910mm dia x 1670mm depth',
        unit: 'Nos', category: boq_item_entity_1.BoqCategory.SEWER_NETWORK, subCategory: 'Manholes',
        estimatedQty: 909, rate: 57022.72, estimatedAmount: 51833648,
    },
    {
        slNo: '5', sorRef: 'Unit Est.',
        description: 'RCC circular Manholes — 1220mm dia x 2290mm depth',
        unit: 'Nos', category: boq_item_entity_1.BoqCategory.SEWER_NETWORK, subCategory: 'Manholes',
        estimatedQty: 481, rate: 100439.78, estimatedAmount: 48311533.79,
    },
    {
        slNo: '6', sorRef: 'Unit Est.',
        description: 'RCC circular Manholes — 1520mm dia x 4950mm depth',
        unit: 'Nos', category: boq_item_entity_1.BoqCategory.SEWER_NETWORK, subCategory: 'Manholes',
        estimatedQty: 2071, rate: 275488.98, estimatedAmount: 570537669.32,
    },
    {
        slNo: '7', sorRef: 'Unit Est.',
        description: 'RCC circular Manholes — 1520mm dia x 9000mm depth',
        unit: 'Nos', category: boq_item_entity_1.BoqCategory.SEWER_NETWORK, subCategory: 'Manholes',
        estimatedQty: 267, rate: 643192.52, estimatedAmount: 171732403.41,
    },
    {
        slNo: '8', sorRef: 'Unit Est.',
        description: 'Drop arrangement in manholes — 200mm dia',
        unit: 'M', category: boq_item_entity_1.BoqCategory.SEWER_NETWORK, subCategory: 'Drop Arrangements',
        estimatedQty: 1299.87, rate: 23063.00, estimatedAmount: 29978901.81,
    },
    {
        slNo: '9', sorRef: 'Unit Est.',
        description: 'Masonry chamber 45x45x60cm with CI Cover — house sewer connecting chamber',
        unit: 'Nos', category: boq_item_entity_1.BoqCategory.SEWER_NETWORK, subCategory: 'Masonry Chambers',
        estimatedQty: 12651, rate: 16438.94, estimatedAmount: 207972313.37,
    },
    {
        slNo: '10', sorRef: 'Unit Est.',
        description: 'Masonry chamber 60x60x60cm with CI Cover',
        unit: 'Nos', category: boq_item_entity_1.BoqCategory.SEWER_NETWORK, subCategory: 'Masonry Chambers',
        estimatedQty: 3163, rate: 21228.33, estimatedAmount: 67140966.23,
    },
    {
        slNo: '11', sorRef: 'J&K SOR 16.14.1',
        description: 'Cutting bitumen road and making good — supply of aggregate, moorum, screening',
        unit: 'Cum', category: boq_item_entity_1.BoqCategory.ROAD_WORK, subCategory: 'Road Cutting',
        estimatedQty: 48046.17, rate: 4000.40, estimatedAmount: 192203910.47,
    },
    {
        slNo: '12', sorRef: 'Det. Est.',
        description: 'IPS-1 — Screen channel, pump house, sump RCC M-25 2.50m dia x 7.70m depth at Node 102',
        unit: 'LS', category: boq_item_entity_1.BoqCategory.IPS_CIVIL, subCategory: 'IPS-1',
        estimatedQty: 1, rate: 5451000, estimatedAmount: 5451000,
    },
    {
        slNo: '13', sorRef: 'Det. Est.',
        description: 'IPS-3 — Screen channel, pump house, sump RCC M-25 5.00m dia x 7.19m depth at Node 1053',
        unit: 'LS', category: boq_item_entity_1.BoqCategory.IPS_CIVIL, subCategory: 'IPS-3',
        estimatedQty: 1, rate: 8747000, estimatedAmount: 8747000,
    },
    {
        slNo: '14', sorRef: 'Det. Est.',
        description: 'IPS-5 — Screen channel, pump house, sump RCC M-25 8.00m dia x 9.89m depth at Node 1532',
        unit: 'LS', category: boq_item_entity_1.BoqCategory.IPS_CIVIL, subCategory: 'IPS-5',
        estimatedQty: 1, rate: 16293000, estimatedAmount: 16293000,
    },
    {
        slNo: '15', sorRef: 'Det. Est.',
        description: 'IPS-9 — Screen channel, pump house, sump RCC M-25 10.00m dia x 10.77m depth at Node 4011 (Largest)',
        unit: 'LS', category: boq_item_entity_1.BoqCategory.IPS_CIVIL, subCategory: 'IPS-9',
        estimatedQty: 1, rate: 22069000, estimatedAmount: 22069000,
    },
    {
        slNo: '16', sorRef: 'Det. Est.',
        description: 'STP 30 MLD — SBR Technology, including office building, lab & equipment, campus development, boundary wall, water supply, drainage, sewerage, electrification, SCADA',
        unit: 'LS', category: boq_item_entity_1.BoqCategory.STP_CIVIL, subCategory: 'STP Civil',
        estimatedQty: 1, rate: 204000000, estimatedAmount: 204000000,
    },
    {
        slNo: '17', sorRef: 'Det. Est.',
        description: 'STP 30 MLD — Electro-Mechanical components, SCADA, online monitoring system',
        unit: 'LS', category: boq_item_entity_1.BoqCategory.STP_EM, subCategory: 'STP E&M',
        estimatedQty: 1, rate: 306000000, estimatedAmount: 306000000,
    },
    {
        slNo: '18', sorRef: 'Det. Est.',
        description: 'Rising main — IPS-9 to MPS (Node 4011), 700mm dia, 870m',
        unit: 'M', category: boq_item_entity_1.BoqCategory.RISING_MAIN, subCategory: 'Rising Mains',
        estimatedQty: 870, rate: 15000, estimatedAmount: 13050000,
    },
    {
        slNo: '19', sorRef: 'Det. Est.',
        description: 'MPS (Main Pumping Station) at Habak — civil and E&M works',
        unit: 'LS', category: boq_item_entity_1.BoqCategory.IPS_CIVIL, subCategory: 'MPS',
        estimatedQty: 1, rate: 22500000, estimatedAmount: 22500000,
    },
    {
        slNo: '20', sorRef: 'Det. Est.',
        description: 'Staff quarters at STP site',
        unit: 'LS', category: boq_item_entity_1.BoqCategory.STP_CIVIL, subCategory: 'STP Civil',
        estimatedQty: 1, rate: 2318000, estimatedAmount: 2318000,
    },
];
const PAYMENT_MILESTONES = {
    sewer_network: [
        { code: 'S1', name: 'Survey & Vetting of Design', pct: 5 },
        { code: 'S2', name: 'Providing & Laying Pipes + Backfilling + Temp Reinstatement', pct: 55 },
        { code: 'S3', name: 'Sectional Flow Testing', pct: 10 },
        { code: 'S4', name: 'Permanent Road Reinstatement', pct: 20 },
        { code: 'S5', name: 'Testing, Commissioning & Trial Run', pct: 5 },
        { code: 'S6', name: 'O&M for 5 Years', pct: 5 },
    ],
    civil_stp_ips: [
        { code: 'C1', name: 'Survey & Vetting of Design', pct: 5 },
        { code: 'C2', name: 'Building to Plinth / 25% Completion', pct: 20 },
        { code: 'C3', name: '60% Completion of Civil Structure', pct: 30 },
        { code: 'C4', name: 'Complete Finishing as per Approved Drawings', pct: 30 },
        { code: 'C5', name: 'Testing & Commissioning of STP/IPS', pct: 5 },
        { code: 'C6', name: 'After Issuance of Completion Certificate by UEED', pct: 5 },
        { code: 'C7', name: 'O&M for 5 Years', pct: 5 },
    ],
    electro_mechanical: [
        { code: 'E1', name: 'Delivery of E&M Components at Site after TPI', pct: 40 },
        { code: 'E2', name: 'Installation, Erection & Testing at Site', pct: 25 },
        { code: 'E3', name: 'Commissioning of E&M Components', pct: 10 },
        { code: 'E4', name: 'Successful Completion of 6 Months Free Trial Run', pct: 10 },
        { code: 'E5', name: 'Successful Completion of Defect Liability Period', pct: 10 },
        { code: 'E6', name: 'O&M for 5 Years', pct: 5 },
    ],
    om_component: [
        { code: 'O1', name: '1st Year O&M', pct: 0.5 },
        { code: 'O2', name: '2nd Year O&M', pct: 0.5 },
        { code: 'O3', name: '3rd Year O&M', pct: 1.0 },
        { code: 'O4', name: '4th Year O&M', pct: 1.5 },
        { code: 'O5', name: '5th Year O&M', pct: 1.5 },
    ],
};
let EpcService = class EpcService {
    boqRepo;
    raRepo;
    mbRepo;
    constructor(boqRepo, raRepo, mbRepo) {
        this.boqRepo = boqRepo;
        this.raRepo = raRepo;
        this.mbRepo = mbRepo;
    }
    getPaymentMilestones() { return PAYMENT_MILESTONES; }
    async seedBoqItems(projectId) {
        const existing = await this.boqRepo.count({ where: { projectId } });
        if (existing > 0)
            return { seeded: 0 };
        const items = DAL_LAKE_BOQ.map(item => this.boqRepo.create({ ...item, projectId }));
        await this.boqRepo.save(items);
        return { seeded: items.length };
    }
    async listBoqItems(projectId, category) {
        const qb = this.boqRepo.createQueryBuilder('b')
            .where('b.projectId = :pid', { pid: projectId })
            .andWhere('b.isActive = true')
            .orderBy('b.slNo', 'ASC');
        if (category)
            qb.andWhere('b.category = :cat', { cat: category });
        return qb.getMany();
    }
    async createBoqItem(data) {
        return this.boqRepo.save(this.boqRepo.create(data));
    }
    async updateBoqItem(id, data) {
        await this.boqRepo.update(id, data);
        const item = await this.boqRepo.findOne({ where: { id } });
        if (!item)
            throw new common_1.NotFoundException('BOQ item not found');
        return item;
    }
    async updateMeasuredQty(id, measuredQty) {
        const item = await this.boqRepo.findOne({ where: { id } });
        if (!item)
            throw new common_1.NotFoundException('BOQ item not found');
        const measuredAmount = measuredQty * Number(item.rate);
        await this.boqRepo.update(id, { measuredQty, measuredAmount });
        return this.boqRepo.findOne({ where: { id } });
    }
    async boqSummary(projectId) {
        const items = await this.listBoqItems(projectId);
        const totalEstimated = items.reduce((s, i) => s + Number(i.estimatedAmount), 0);
        const totalMeasured = items.reduce((s, i) => s + Number(i.measuredAmount), 0);
        const totalQty = items.reduce((s, i) => s + Number(i.estimatedQty), 0);
        const measuredQty = items.reduce((s, i) => s + Number(i.measuredQty), 0);
        const byCategory = {};
        for (const item of items) {
            const cat = item.category;
            if (!byCategory[cat])
                byCategory[cat] = { estimated: 0, measured: 0, items: 0 };
            byCategory[cat].estimated += Number(item.estimatedAmount);
            byCategory[cat].measured += Number(item.measuredAmount);
            byCategory[cat].items++;
        }
        const raBills = await this.raRepo.find({ where: { projectId } });
        const totalBilled = raBills.filter(b => b.status !== ra_bill_entity_1.RaBillStatus.REJECTED)
            .reduce((s, b) => s + Number(b.netPayable), 0);
        return {
            totalEstimated,
            totalMeasured,
            percentageComplete: totalEstimated > 0 ? (totalMeasured / totalEstimated * 100).toFixed(2) : '0',
            totalBilled,
            balance: totalEstimated - totalBilled,
            items: items.length,
            byCategory,
            raBills: raBills.length,
        };
    }
    async createRaBill(data) {
        const gross = Number(data.grossAmount ?? 0);
        const prevBilled = Number(data.prevBilled ?? 0);
        const netThisBill = gross - prevBilled;
        const gstPct = Number(data.gstPct ?? 0);
        const tdsPct = Number(data.tdsPct ?? 2);
        const sdPct = Number(data.securityDepositPct ?? 5);
        const gstAmt = netThisBill * gstPct / 100;
        const tdsAmt = (netThisBill + gstAmt) * tdsPct / 100;
        const sdAmt = netThisBill * sdPct / 100;
        const netPayable = netThisBill + gstAmt - tdsAmt - sdAmt;
        return this.raRepo.save(this.raRepo.create({
            ...data,
            netThisBill,
            gstAmount: gstAmt,
            tdsAmount: tdsAmt,
            securityDepositAmount: sdAmt,
            netPayable,
        }));
    }
    async listRaBills(projectId) {
        return this.raRepo.find({
            where: { projectId },
            order: { createdAt: 'DESC' },
        });
    }
    async getRaBill(id) {
        const bill = await this.raRepo.findOne({ where: { id } });
        if (!bill)
            throw new common_1.NotFoundException('RA Bill not found');
        return bill;
    }
    async updateRaBillStatus(id, status, remarks) {
        const update = { status };
        if (status === ra_bill_entity_1.RaBillStatus.SUBMITTED)
            update.submittedDate = new Date().toISOString().split('T')[0];
        if (status === ra_bill_entity_1.RaBillStatus.APPROVED)
            update.approvedDate = new Date().toISOString().split('T')[0];
        if (status === ra_bill_entity_1.RaBillStatus.PAID)
            update.paidDate = new Date().toISOString().split('T')[0];
        if (remarks)
            update.remarks = remarks;
        await this.raRepo.update(id, update);
        return this.getRaBill(id);
    }
    async addMeasurement(data) {
        const m = await this.mbRepo.save(this.mbRepo.create(data));
        const all = await this.mbRepo.find({ where: { boqItemId: data.boqItemId } });
        const totalQty = all.reduce((s, mb) => s + Number(mb.totalQty), 0);
        await this.updateMeasuredQty(data.boqItemId, totalQty);
        return m;
    }
    async listMeasurements(p) {
        const qb = this.mbRepo.createQueryBuilder('m').orderBy('m.date', 'DESC');
        if (p.projectId)
            qb.andWhere('m.projectId = :pid', { pid: p.projectId });
        if (p.boqItemId)
            qb.andWhere('m.boqItemId = :bid', { bid: p.boqItemId });
        if (p.raBillId)
            qb.andWhere('m.raBillId = :rid', { rid: p.raBillId });
        return qb.getMany();
    }
};
exports.EpcService = EpcService;
exports.EpcService = EpcService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(boq_item_entity_1.BoqItem)),
    __param(1, (0, typeorm_1.InjectRepository)(ra_bill_entity_1.RaBill)),
    __param(2, (0, typeorm_1.InjectRepository)(measurement_entity_1.Measurement)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], EpcService);
//# sourceMappingURL=epc.service.js.map