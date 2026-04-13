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
exports.FleetService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const fleet_log_entity_1 = require("./fleet-log.entity");
let FleetService = class FleetService {
    repo;
    constructor(repo) {
        this.repo = repo;
    }
    async list(params) {
        const q = this.repo.createQueryBuilder('f')
            .where('f.project_id = :pid', { pid: params.projectId })
            .orderBy('f.date', 'DESC')
            .addOrderBy('f.created_at', 'DESC');
        if (params.logType)
            q.andWhere('f.log_type = :t', { t: params.logType });
        if (params.from && params.to)
            q.andWhere('f.date BETWEEN :from AND :to', { from: params.from, to: params.to });
        return q.getMany();
    }
    async dashboard(projectId) {
        const today = new Date().toISOString().split('T')[0];
        const monthStart = today.slice(0, 7) + '-01';
        const [todayVehicle, todayPlant, monthVehicle, monthPlant, allPlant] = await Promise.all([
            this.repo.find({ where: { projectId, logType: 'vehicle', date: today } }),
            this.repo.find({ where: { projectId, logType: 'plant', date: today } }),
            this.repo.createQueryBuilder('f')
                .select('SUM(f.distance_km)', 'totalKm')
                .addSelect('SUM(f.fuel_litres)', 'totalFuel')
                .where('f.project_id = :pid AND f.log_type = :t AND f.date >= :from', { pid: projectId, t: 'vehicle', from: monthStart }).getRawOne(),
            this.repo.createQueryBuilder('f')
                .select('SUM(f.hours_worked)', 'totalHours')
                .addSelect('SUM(f.fuel_litres)', 'totalFuel')
                .where('f.project_id = :pid AND f.log_type = :t AND f.date >= :from', { pid: projectId, t: 'plant', from: monthStart }).getRawOne(),
            this.repo.createQueryBuilder('f')
                .select('f.machine_id', 'machineId')
                .addSelect('f.machine_type', 'machineType')
                .addSelect('MAX(f.hour_close)', 'lastReading')
                .addSelect('SUM(f.hours_worked)', 'totalHours')
                .addSelect('MAX(f.date)', 'lastDate')
                .where('f.project_id = :pid AND f.log_type = :t', { pid: projectId, t: 'plant' })
                .groupBy('f.machine_id').addGroupBy('f.machine_type')
                .getRawMany(),
        ]);
        return {
            today: { vehicle: todayVehicle, plant: todayPlant },
            monthStats: {
                vehicle: { km: +(monthVehicle?.totalKm || 0), fuel: +(monthVehicle?.totalFuel || 0) },
                plant: { hours: +(monthPlant?.totalHours || 0), fuel: +(monthPlant?.totalFuel || 0) },
            },
            fleet: allPlant,
        };
    }
    async create(dto) {
        if (dto.logType === 'vehicle' && dto.meterStart && dto.meterEnd)
            dto.distanceKm = +(dto.meterEnd) - +(dto.meterStart);
        if (dto.logType === 'plant' && dto.hourStart && dto.hourClose)
            dto.hoursWorked = +(dto.hourClose) - +(dto.hourStart);
        return this.repo.save(this.repo.create(dto));
    }
    async update(id, dto) {
        if (dto.meterStart && dto.meterEnd)
            dto.distanceKm = +(dto.meterEnd) - +(dto.meterStart);
        if (dto.hourStart && dto.hourClose)
            dto.hoursWorked = +(dto.hourClose) - +(dto.hourStart);
        await this.repo.update(id, dto);
        return this.repo.findOne({ where: { id } });
    }
    async delete(id) { return this.repo.delete(id); }
};
exports.FleetService = FleetService;
exports.FleetService = FleetService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(fleet_log_entity_1.FleetLog)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], FleetService);
//# sourceMappingURL=fleet.service.js.map