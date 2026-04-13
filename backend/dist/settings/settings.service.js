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
exports.SettingsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const setting_entity_1 = require("./setting.entity");
let SettingsService = class SettingsService {
    repo;
    constructor(repo) {
        this.repo = repo;
    }
    async get(key) {
        const s = await this.repo.findOne({ where: { key } });
        return s?.value ?? null;
    }
    async set(key, value, label, category) {
        const existing = await this.repo.findOne({ where: { key } });
        if (existing) {
            await this.repo.update(existing.id, { value, label, category });
            return this.repo.findOne({ where: { key } });
        }
        return this.repo.save(this.repo.create({ key, value, label: label ?? key, category: category ?? 'general' }));
    }
    async getAll(category) {
        if (category)
            return this.repo.find({ where: { category } });
        return this.repo.find();
    }
    async setBulk(settings) {
        for (const s of settings)
            await this.set(s.key, s.value, s.label, s.category);
    }
};
exports.SettingsService = SettingsService;
exports.SettingsService = SettingsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(setting_entity_1.Setting)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], SettingsService);
//# sourceMappingURL=settings.service.js.map