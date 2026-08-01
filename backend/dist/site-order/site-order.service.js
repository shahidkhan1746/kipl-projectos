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
exports.SiteOrderService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const site_order_entity_1 = require("./site-order.entity");
let SiteOrderService = class SiteOrderService {
    repo;
    constructor(repo) {
        this.repo = repo;
    }
    async nextOrderNo(projectId) {
        const year = new Date().getFullYear();
        const count = await this.repo.count({ where: { projectId } });
        return `SO/${year}/${String(count + 1).padStart(3, '0')}`;
    }
    async create(data) {
        if (!data.orderNo && data.projectId)
            data.orderNo = await this.nextOrderNo(data.projectId);
        return this.repo.save(this.repo.create(data));
    }
    async update(id, data) {
        await this.repo.update(id, data);
        const r = await this.repo.findOne({ where: { id } });
        if (!r)
            throw new common_1.NotFoundException('Order not found');
        return r;
    }
    async remove(id) { return this.repo.delete(id); }
    async list(projectId, status) {
        const qb = this.repo.createQueryBuilder('o').orderBy('o.date', 'DESC');
        if (projectId)
            qb.andWhere('o.projectId = :pid', { pid: projectId });
        if (status)
            qb.andWhere('o.complianceStatus = :s', { s: status });
        return qb.getMany();
    }
};
exports.SiteOrderService = SiteOrderService;
exports.SiteOrderService = SiteOrderService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(site_order_entity_1.SiteOrder)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], SiteOrderService);
//# sourceMappingURL=site-order.service.js.map