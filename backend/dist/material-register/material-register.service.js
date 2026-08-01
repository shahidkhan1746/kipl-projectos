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
exports.MaterialRegisterService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const material_register_entity_1 = require("./material-register.entity");
let MaterialRegisterService = class MaterialRegisterService {
    repo;
    constructor(repo) {
        this.repo = repo;
    }
    async create(data) { return this.repo.save(this.repo.create(data)); }
    async update(id, data) {
        await this.repo.update(id, data);
        const r = await this.repo.findOne({ where: { id } });
        if (!r)
            throw new common_1.NotFoundException('Entry not found');
        return r;
    }
    async remove(id) { return this.repo.delete(id); }
    async list(projectId) {
        const rows = await this.repo.find({
            where: projectId ? { projectId } : {},
            order: { material: 'ASC', date: 'ASC' },
        });
        const running = {};
        const out = rows.map(r => {
            const key = r.material;
            running[key] = (running[key] ?? 0) + (Number(r.receivedQty) || 0) - (Number(r.consumedQty) || 0);
            return { ...r, balance: +running[key].toFixed(3) };
        });
        return out.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    }
    async summary(projectId) {
        const rows = await this.repo.find({ where: projectId ? { projectId } : {} });
        const byMaterial = {};
        for (const r of rows) {
            const m = byMaterial[r.material] ?? { received: 0, consumed: 0, balance: 0, unit: r.unit };
            m.received += Number(r.receivedQty) || 0;
            m.consumed += Number(r.consumedQty) || 0;
            m.balance = m.received - m.consumed;
            m.unit = r.unit ?? m.unit;
            byMaterial[r.material] = m;
        }
        return byMaterial;
    }
};
exports.MaterialRegisterService = MaterialRegisterService;
exports.MaterialRegisterService = MaterialRegisterService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(material_register_entity_1.MaterialRegister)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], MaterialRegisterService);
//# sourceMappingURL=material-register.service.js.map