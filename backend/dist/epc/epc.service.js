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
        slNo: 'A1', sorRef: 'NS/IS-458:2003',
        description: 'Providing and Laying non-pressure (NP3) RCC socket & spigot pipes with rubber gasket joint (all dia incl. DI / HDPE) including excavation, bedding, backfilling, temporary surface reinstatement, testing & O&M — complete job as per BOQ',
        unit: 'M',
        category: boq_item_entity_1.BoqCategory.SEWER_NETWORK,
        subCategory: 'RCC NP3 Pipes',
        estimatedQty: 210020,
        rate: 4545.24,
        estimatedAmount: 954741293.39,
        quotedRate: 4277.24,
        quotedAmount: 898365557.84,
        measuredQty: 0,
        measuredAmount: 0,
    },
    {
        slNo: 'A2', sorRef: 'Unit Est.',
        description: 'Construction of RCC Manholes / Inspection Chambers of different sizes and depths (all types: 910mm, 1220mm, 1520mm×4950mm, 1520mm×9000mm dia) including excavation, backfilling, temporary surface reinstatement, testing & O&M',
        unit: 'Nos',
        category: boq_item_entity_1.BoqCategory.SEWER_NETWORK,
        subCategory: 'Manholes',
        estimatedQty: 3728,
        rate: 188462.16,
        estimatedAmount: 702752222.51,
        quotedRate: 177444.77,
        quotedAmount: 661255982.92,
        measuredQty: 0,
        measuredAmount: 0,
    },
    {
        slNo: 'A3', sorRef: 'Unit Est.',
        description: 'Construction of Drop Arrangement of different dia in Manholes / Inspection Chambers including backfilling, surface reinstatement, disposal of surplus excavated materials within 8Kms, testing & O&M',
        unit: 'M',
        category: boq_item_entity_1.BoqCategory.SEWER_NETWORK,
        subCategory: 'Drop Arrangements',
        estimatedQty: 1299.87,
        rate: 26807.78,
        estimatedAmount: 34846788.90,
        quotedRate: 25225.73,
        quotedAmount: 32789149.44,
        measuredQty: 0,
        measuredAmount: 0,
    },
    {
        slNo: 'A4', sorRef: 'Unit Est.',
        description: 'Construction of Masonry Chamber of different sizes (45×45×60cm and 60×60×60cm with CI Cover) for house / property sewer connections including providing & laying UPVC/HDPE connecting pipes, backfilling, surface reinstatement, testing & O&M',
        unit: 'Nos',
        category: boq_item_entity_1.BoqCategory.SEWER_NETWORK,
        subCategory: 'Masonry Chambers',
        estimatedQty: 15814,
        rate: 17398.35,
        estimatedAmount: 275113279.60,
        quotedRate: 16370.89,
        quotedAmount: 258868341.20,
        measuredQty: 0,
        measuredAmount: 0,
    },
    {
        slNo: 'B1', sorRef: 'Det. Est.',
        description: 'IPS-1 — Survey, Design & Construction of Sewage Pumping Station with Coarse Screen Channel in RCC M-25 (2.50m dia × 7.70m depth) at Node 102 including pump house, sump, valve chamber, screen channel, boundary wall, gate and all allied civil works — turnkey basis including trial run & O&M',
        unit: 'LS',
        category: boq_item_entity_1.BoqCategory.IPS_CIVIL,
        subCategory: 'IPS-1',
        estimatedQty: 1,
        rate: 2405000,
        estimatedAmount: 2405000,
        quotedRate: 2263000,
        quotedAmount: 2263000,
        measuredQty: 0,
        measuredAmount: 0,
    },
    {
        slNo: 'B2', sorRef: 'Det. Est.',
        description: 'IPS-2 — Survey, Design & Construction of Sewage Pumping Station with Coarse Screen Channel in RCC M-25 (4.57m × 4.27m pump house) at Node including pump house, sump, valve chamber, screen channel, boundary wall, gate and all allied civil works — turnkey basis including trial run & O&M',
        unit: 'LS',
        category: boq_item_entity_1.BoqCategory.IPS_CIVIL,
        subCategory: 'IPS-2',
        estimatedQty: 1,
        rate: 2054000,
        estimatedAmount: 2054000,
        quotedRate: 1933000,
        quotedAmount: 1933000,
        measuredQty: 0,
        measuredAmount: 0,
    },
    {
        slNo: 'B3', sorRef: 'Det. Est.',
        description: 'IPS-3 — Survey, Design & Construction of Sewage Pumping Station with Coarse Screen Channel in RCC M-25 (5.49m × 10.98m pump house) at Node 1053 including pump house, sump, valve chamber, screen channel, boundary wall, gate and all allied civil works — turnkey basis including trial run & O&M',
        unit: 'LS',
        category: boq_item_entity_1.BoqCategory.IPS_CIVIL,
        subCategory: 'IPS-3',
        estimatedQty: 1,
        rate: 3763000,
        estimatedAmount: 3763000,
        quotedRate: 3541000,
        quotedAmount: 3541000,
        measuredQty: 0,
        measuredAmount: 0,
    },
    {
        slNo: 'B4', sorRef: 'Det. Est.',
        description: 'IPS-4 — Survey, Design & Construction of Sewage Pumping Station with Coarse Screen Channel in RCC M-25 (4.57m × 4.27m pump house) at Node including pump house, sump, valve chamber, screen channel, boundary wall, gate and all allied civil works — turnkey basis including trial run & O&M',
        unit: 'LS',
        category: boq_item_entity_1.BoqCategory.IPS_CIVIL,
        subCategory: 'IPS-4',
        estimatedQty: 1,
        rate: 4514000,
        estimatedAmount: 4514000,
        quotedRate: 4248000,
        quotedAmount: 4248000,
        measuredQty: 0,
        measuredAmount: 0,
    },
    {
        slNo: 'B5', sorRef: 'Det. Est.',
        description: 'IPS-5 — Survey, Design & Construction of Sewage Pumping Station with Coarse Screen Channel in RCC M-25 (5.49m × 10.98m pump house, 8.00m dia × 9.89m depth) at Node 1532 including pump house, sump, valve chamber, screen channel, boundary wall, gate and all allied civil works — turnkey basis including trial run & O&M',
        unit: 'LS',
        category: boq_item_entity_1.BoqCategory.IPS_CIVIL,
        subCategory: 'IPS-5',
        estimatedQty: 1,
        rate: 11140000,
        estimatedAmount: 11140000,
        quotedRate: 10371000,
        quotedAmount: 10371000,
        measuredQty: 0,
        measuredAmount: 0,
    },
    {
        slNo: 'B6', sorRef: 'Det. Est.',
        description: 'IPS-6 — Survey, Design & Construction of Sewage Pumping Station with Coarse Screen Channel in RCC M-25 (5.49m × 10.98m pump house) at Node including pump house, sump, valve chamber, screen channel, boundary wall, gate and all allied civil works — turnkey basis including trial run & O&M',
        unit: 'LS',
        category: boq_item_entity_1.BoqCategory.IPS_CIVIL,
        subCategory: 'IPS-6',
        estimatedQty: 1,
        rate: 7127000,
        estimatedAmount: 7127000,
        quotedRate: 6706000,
        quotedAmount: 6706000,
        measuredQty: 0,
        measuredAmount: 0,
    },
    {
        slNo: 'B7', sorRef: 'Det. Est.',
        description: 'IPS-7 — Survey, Design & Construction of Sewage Pumping Station with Coarse Screen Channel in RCC M-25 (small pump house) at Node including pump house, sump, valve chamber, screen channel, boundary wall, gate and all allied civil works — turnkey basis including trial run & O&M',
        unit: 'LS',
        category: boq_item_entity_1.BoqCategory.IPS_CIVIL,
        subCategory: 'IPS-7',
        estimatedQty: 1,
        rate: 1873000,
        estimatedAmount: 1873000,
        quotedRate: 1701000,
        quotedAmount: 1701000,
        measuredQty: 0,
        measuredAmount: 0,
    },
    {
        slNo: 'B8', sorRef: 'Det. Est.',
        description: 'IPS-8 — Survey, Design & Construction of Sewage Pumping Station with Coarse Screen Channel in RCC M-25 (4.57m × 4.27m pump house) at Node including pump house, sump, valve chamber, screen channel, boundary wall, gate and all allied civil works — turnkey basis including trial run & O&M',
        unit: 'LS',
        category: boq_item_entity_1.BoqCategory.IPS_CIVIL,
        subCategory: 'IPS-8',
        estimatedQty: 1,
        rate: 3175000,
        estimatedAmount: 3175000,
        quotedRate: 2987000,
        quotedAmount: 2987000,
        measuredQty: 0,
        measuredAmount: 0,
    },
    {
        slNo: 'B9', sorRef: 'Det. Est.',
        description: 'IPS-9 — Survey, Design & Construction of Sewage Pumping Station with Coarse Screen Channel in RCC M-25 (5.49m × 10.98m pump house, 10.00m dia × 10.77m depth, largest) at Node 4011 including pump house, sump, valve chamber, screen channel, DG platform, transformer platform, boundary wall, gate and all allied civil works — turnkey basis including trial run & O&M',
        unit: 'LS',
        category: boq_item_entity_1.BoqCategory.IPS_CIVIL,
        subCategory: 'IPS-9',
        estimatedQty: 1,
        rate: 16747000,
        estimatedAmount: 16747000,
        quotedRate: 15758000,
        quotedAmount: 15758000,
        measuredQty: 0,
        measuredAmount: 0,
    },
    {
        slNo: 'B10', sorRef: 'Det. Est.',
        description: 'MPS (Main Pumping Station) at Habak + IPS-10 to IPS-13 — Civil construction of remaining intermediate pumping stations and Main Pumping Station including pump houses, screen channels, sumps, valve chambers, boundary walls, gates and all allied civil works — turnkey basis including trial run & O&M',
        unit: 'LS',
        category: boq_item_entity_1.BoqCategory.IPS_CIVIL,
        subCategory: 'MPS',
        estimatedQty: 1,
        rate: 26993000,
        estimatedAmount: 26993000,
        quotedRate: 25396737,
        quotedAmount: 25396737,
        measuredQty: 0,
        measuredAmount: 0,
    },
    {
        slNo: 'B11', sorRef: 'Det. Est.',
        description: 'Compound Walling (750m total) around all IPS/MPS premises in brick masonry with RCC posts, including MS gate and allied works — as per 11__compound_wall.xlsx',
        unit: 'M',
        category: boq_item_entity_1.BoqCategory.IPS_CIVIL,
        subCategory: 'Compound Wall',
        estimatedQty: 750,
        rate: 12089.41,
        estimatedAmount: 9067056.20,
        quotedRate: 11375.65,
        quotedAmount: 8531737.20,
        measuredQty: 0,
        measuredAmount: 0,
    },
    {
        slNo: 'B12', sorRef: 'Det. Est.',
        description: 'STP 30 MLD — Survey, Design, Engineering, Construction & Commissioning of Sewage Treatment Plant based on SBR Technology (38.50 MLD design capacity for peak flow) including all civil & structural works: screen channel, inlet chamber, SBR tanks, clarifiers, pump houses, administrative cum lab building, staff quarters, campus electrification, boundary wall, pathway, horticulture, water supply, drainage, sewerage, reuse pump station with rising main — complete on turnkey basis including 6-month trial run & 5-year O&M',
        unit: 'LS',
        category: boq_item_entity_1.BoqCategory.STP_CIVIL,
        subCategory: 'STP Civil',
        estimatedQty: 1,
        rate: 204000000,
        estimatedAmount: 204000000,
        quotedRate: 191954184,
        quotedAmount: 191954184,
        measuredQty: 0,
        measuredAmount: 0,
    },
    {
        slNo: 'B13', sorRef: 'Det. Est.',
        description: 'STP 30 MLD — Electro-Mechanical Components: supply, erection, testing & commissioning of all E&M equipment including submersible pumps, blowers, screens, conveyors, mixers, valves, piping, LT/HT panels, DG set, SCADA, OCEMS (online monitoring at inlet & outlet), automation, instrumentation — complete on turnkey basis including 6-month trial run & 5-year O&M',
        unit: 'LS',
        category: boq_item_entity_1.BoqCategory.STP_EM,
        subCategory: 'STP E&M',
        estimatedQty: 1,
        rate: 306000000,
        estimatedAmount: 306000000,
        quotedRate: 287931370,
        quotedAmount: 287931370,
        measuredQty: 0,
        measuredAmount: 0,
    },
    {
        slNo: 'B14', sorRef: 'Det. Est.',
        description: 'All IPS/MPS (1-9 + MPS) — Electro-Mechanical Components: supply, erection, testing & commissioning of all E&M equipment for all 9 IPS + MPS including submersible sewage pumps, raw sewage pumps, coarse screen & conveyor, LT/HT control panels, DG sets, automation/SCADA, instrumentation, piping, valves, lifting arrangements — complete on turnkey basis including 6-month trial run & 5-year O&M',
        unit: 'LS',
        category: boq_item_entity_1.BoqCategory.IPS_EM,
        subCategory: 'IPS E&M',
        estimatedQty: 1,
        rate: 179103000,
        estimatedAmount: 179103000,
        quotedRate: 168528759,
        quotedAmount: 168528759,
        measuredQty: 0,
        measuredAmount: 0,
    },
    {
        slNo: 'B15', sorRef: 'Det. Est.',
        description: 'Rising Mains (IPS 1-13) — Providing, Laying, Jointing, Testing & Commissioning of DI/MS rising main pipes of various dia (100mm, 150mm, 200mm, 300mm, 350mm, 400mm, 500mm, 700mm) from all IPS to MPS/STP including excavation, bedding, backfilling, road cutting & reinstatement, valves, fittings and all allied works — complete incl. O&M for 5 years',
        unit: 'M',
        category: boq_item_entity_1.BoqCategory.RISING_MAIN,
        subCategory: 'Rising Mains',
        estimatedQty: 14542,
        rate: 5044.72,
        estimatedAmount: 73378821.30,
        quotedRate: 4747.53,
        quotedAmount: 69046536.00,
        measuredQty: 0,
        measuredAmount: 0,
    },
    {
        slNo: 'B16', sorRef: 'PAR 2021',
        description: 'Staff Quarters at STP Site — Construction of RCC frame structure staff quarter (85 sqm) as per Plinth Area Rate 2021 including all services (water supply, sanitation, electrical, telephone conduits) — complete as per 13__staff_quarter.xlsx',
        unit: 'LS',
        category: boq_item_entity_1.BoqCategory.STP_CIVIL,
        subCategory: 'Staff Quarters',
        estimatedQty: 1,
        rate: 2318375,
        estimatedAmount: 2318375,
        quotedRate: 2181498,
        quotedAmount: 2181498,
        measuredQty: 0,
        measuredAmount: 0,
    },
    {
        slNo: 'B17', sorRef: 'Det. Est.',
        description: 'Treated Effluent Disposal Pipe — Providing & Laying of 1000mm dia NP3 RCC pipe (500m length) from STP outlet to disposal point including excavation, bedding, backfilling, road cutting & reinstatement and all allied civil works — complete as per 14__effulent_disposal_pipe.xlsx',
        unit: 'M',
        category: boq_item_entity_1.BoqCategory.STP_CIVIL,
        subCategory: 'Effluent Disposal',
        estimatedQty: 500,
        rate: 12121.79,
        estimatedAmount: 6060896.21,
        quotedRate: 11406.12,
        quotedAmount: 5703061.00,
        measuredQty: 0,
        measuredAmount: 0,
    },
    {
        slNo: 'B18', sorRef: 'Det. Est.',
        description: 'Treated Effluent Disposal Pipe — E&M components (valves, actuators, instrumentation) for treated effluent disposal system',
        unit: 'LS',
        category: boq_item_entity_1.BoqCategory.STP_EM,
        subCategory: 'Effluent Disposal E&M',
        estimatedQty: 1,
        rate: 303000,
        estimatedAmount: 303000,
        quotedRate: 285110,
        quotedAmount: 285110,
        measuredQty: 0,
        measuredAmount: 0,
    },
    {
        slNo: 'B19', sorRef: 'Det. Est.',
        description: 'Approach Road to STP (500m, bituminous) — Construction of approach road including earthwork, graded stone aggregate sub-base, bituminous surface dressing, brick edging and all allied works — complete as per 15__Approach_road.xlsx',
        unit: 'M',
        category: boq_item_entity_1.BoqCategory.ROAD_WORK,
        subCategory: 'Approach Road',
        estimatedQty: 500,
        rate: 52900.65,
        estimatedAmount: 2645032.50,
        quotedRate: 49777.40,
        quotedAmount: 2488870.00,
        measuredQty: 0,
        measuredAmount: 0,
    },
];
const PAYMENT_MILESTONES = {
    sewer_network: [
        { code: 'S1', name: 'Survey & Vetting of Design', pct: 5 },
        { code: 'S2', name: 'Providing & Laying Pipes + Backfilling + Temporary Surface Reinstatement & disposal within 8Kms', pct: 55 },
        { code: 'S3', name: 'Sectional Flow Testing', pct: 10 },
        { code: 'S4', name: 'Permanent Surface Reinstatement of Roads/Lanes to original status & disposal within 8Kms', pct: 20 },
        { code: 'S5', name: 'Testing, Commissioning and Successful Trial Run of Complete Sewerage Network', pct: 5 },
        { code: 'S6', name: 'O&M for 5 Years', pct: 5 },
    ],
    manholes: [
        { code: 'M1', name: 'Survey & Vetting of Design', pct: 5 },
        { code: 'M2', name: 'Construction of RCC Manholes + Backfilling + Temporary Surface Reinstatement & disposal within 8Kms', pct: 65 },
        { code: 'M3', name: 'Permanent Surface Reinstatement of Roads/Lanes to original status & disposal within 8Kms', pct: 20 },
        { code: 'M4', name: 'Testing, Commissioning and Successful Trial Run of Complete Sewerage Network', pct: 5 },
        { code: 'M5', name: 'O&M for 5 Years', pct: 5 },
    ],
    drop_arrangements: [
        { code: 'D1', name: 'Survey & Vetting of Design', pct: 5 },
        { code: 'D2', name: 'Construction of Drop Arrangement + Backfilling + Surface Reinstatement & disposal within 8Kms', pct: 65 },
        { code: 'D3', name: 'Permanent Surface Reinstatement of Roads/Lanes to original status & disposal within 8Kms', pct: 20 },
        { code: 'D4', name: 'Testing, Commissioning and Successful Trial Run of Complete Sewerage Network', pct: 5 },
        { code: 'D5', name: 'O&M for 5 Years', pct: 5 },
    ],
    masonry_chambers: [
        { code: 'C1', name: 'Survey & Vetting of Design', pct: 5 },
        { code: 'C2', name: 'Construction of Masonry Chamber + Backfilling + Surface Reinstatement & disposal within 8Kms', pct: 30 },
        { code: 'C3', name: 'Providing & Laying of Sewer Pipes + Backfilling + Surface Reinstatement & disposal within 8Kms', pct: 35 },
        { code: 'C4', name: 'Permanent Surface Reinstatement of Roads/Lanes to original status & disposal within 8Kms', pct: 20 },
        { code: 'C5', name: 'Testing, Commissioning and Successful Trial Run of Complete Sewerage Network', pct: 5 },
        { code: 'C6', name: 'O&M for 5 Years', pct: 5 },
    ],
    civil_turnkey: [
        { code: 'T1', name: 'Survey & Vetting of Design', pct: 5 },
        { code: 'T2', name: 'Building Work up to Plinth Level or 25% Completion of Civil Structure Work', pct: 20 },
        { code: 'T3', name: '60% Completion of Building Work or Civil Structure Work', pct: 30 },
        { code: 'T4', name: 'Complete Finishing of Building Work and Civil Structure Works as per Approved Drawings & Specifications', pct: 30 },
        { code: 'T5', name: "Testing & Commissioning of STP's/IPS's", pct: 5 },
        { code: 'T6', name: 'After Issuance of Completion Certificate by UEED', pct: 5 },
        { code: 'T7', name: 'O&M for 5 Years', pct: 5 },
    ],
    electro_mechanical: [
        { code: 'E1', name: 'Delivery of Electro-Mechanical Components at Site after TPI', pct: 40 },
        { code: 'E2', name: 'Installation, Erection & Testing of Electro-Mechanical Components at Site', pct: 25 },
        { code: 'E3', name: 'Commissioning of Electro-Mechanical Components at Site', pct: 10 },
        { code: 'E4', name: 'Successful Completion of Six Months Free Trial Run', pct: 10 },
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
    async saveQuotedRateByCategory(projectId, category, subCategory, quotedAmount) {
        const items = await this.boqRepo.find({
            where: { projectId, category: category, subCategory, isActive: true },
        });
        if (items.length === 0)
            return;
        const totalEst = items.reduce((s, i) => s + Number(i.estimatedAmount), 0);
        for (const item of items) {
            const proportion = totalEst > 0
                ? Number(item.estimatedAmount) / totalEst
                : 1 / items.length;
            await this.boqRepo.update(item.id, {
                quotedAmount: quotedAmount * proportion,
                quotedRate: (quotedAmount * proportion) / Number(item.estimatedQty || 1),
            });
        }
    }
    async boqSummary(projectId) {
        const items = await this.listBoqItems(projectId);
        const totalEstimated = items.reduce((s, i) => s + Number(i.estimatedAmount), 0);
        const totalQuoted = items.reduce((s, i) => s + Number(i.quotedAmount || i.estimatedAmount), 0);
        const totalMeasured = items.reduce((s, i) => s + Number(i.measuredAmount), 0);
        const byCategory = {};
        for (const item of items) {
            const cat = item.category;
            if (!byCategory[cat])
                byCategory[cat] = { estimated: 0, quoted: 0, measured: 0, items: 0 };
            byCategory[cat].estimated += Number(item.estimatedAmount);
            byCategory[cat].quoted += Number(item.quotedAmount || item.estimatedAmount);
            byCategory[cat].measured += Number(item.measuredAmount);
            byCategory[cat].items++;
        }
        const raBills = await this.raRepo.find({ where: { projectId } });
        const totalBilled = raBills
            .filter(b => b.status !== ra_bill_entity_1.RaBillStatus.REJECTED)
            .reduce((s, b) => s + Number(b.netPayable), 0);
        return {
            totalEstimated,
            totalQuoted,
            totalMeasured,
            percentageComplete: totalQuoted > 0
                ? (totalMeasured / totalQuoted * 100).toFixed(2)
                : '0',
            totalBilled,
            balance: totalQuoted - totalBilled,
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