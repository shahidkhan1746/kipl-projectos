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
exports.UpdatesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const project_update_entity_1 = require("./project-update.entity");
const team_member_entity_1 = require("./team-member.entity");
let UpdatesService = class UpdatesService {
    updates;
    team;
    constructor(updates, team) {
        this.updates = updates;
        this.team = team;
    }
    listAll() {
        return this.updates.find({ order: { date: 'DESC', createdAt: 'DESC' } });
    }
    async getOne(id) {
        const u = await this.updates.findOne({ where: { id } });
        if (!u)
            throw new common_1.NotFoundException('Update not found');
        return u;
    }
    create(body, userName) {
        const u = this.updates.create({
            projectId: body.projectId ?? null,
            date: body.date,
            title: body.title,
            description: body.description ?? '',
            category: body.category ?? 'general',
            photos: Array.isArray(body.photos) ? body.photos : [],
            isPublished: body.isPublished ?? true,
            createdBy: userName ?? null,
        });
        return this.updates.save(u);
    }
    async update(id, body) {
        const u = await this.getOne(id);
        Object.assign(u, {
            projectId: body.projectId ?? u.projectId,
            date: body.date ?? u.date,
            title: body.title ?? u.title,
            description: body.description ?? u.description,
            category: body.category ?? u.category,
            photos: Array.isArray(body.photos) ? body.photos : u.photos,
            isPublished: body.isPublished ?? u.isPublished,
        });
        return this.updates.save(u);
    }
    async remove(id) {
        await this.updates.delete(id);
        return { ok: true };
    }
    listPublic() {
        return this.updates.find({
            where: { isPublished: true },
            order: { date: 'DESC', createdAt: 'DESC' },
        });
    }
    async gallery() {
        const rows = await this.listPublic();
        return rows.flatMap(u => (u.photos ?? []).map((p, i) => ({
            url: p.url,
            caption: p.caption ?? u.title,
            date: u.date,
            category: u.category,
            updateId: u.id,
            idx: i,
        })));
    }
    listTeamAll() {
        return this.team.find({ order: { sortOrder: 'ASC', createdAt: 'ASC' } });
    }
    listTeamPublic() {
        return this.team.find({ where: { isPublished: true }, order: { sortOrder: 'ASC', createdAt: 'ASC' } });
    }
    createTeam(body) {
        const m = this.team.create({
            name: body.name,
            title: body.title ?? '',
            department: body.department ?? '',
            photoUrl: body.photoUrl ?? null,
            photoKey: body.photoKey ?? null,
            bio: body.bio ?? '',
            sortOrder: body.sortOrder ?? 0,
            isPublished: body.isPublished ?? true,
        });
        return this.team.save(m);
    }
    async updateTeam(id, body) {
        const m = await this.team.findOne({ where: { id } });
        if (!m)
            throw new common_1.NotFoundException('Team member not found');
        Object.assign(m, {
            name: body.name ?? m.name,
            title: body.title ?? m.title,
            department: body.department ?? m.department,
            photoUrl: body.photoUrl ?? m.photoUrl,
            photoKey: body.photoKey ?? m.photoKey,
            bio: body.bio ?? m.bio,
            sortOrder: body.sortOrder ?? m.sortOrder,
            isPublished: body.isPublished ?? m.isPublished,
        });
        return this.team.save(m);
    }
    async removeTeam(id) {
        await this.team.delete(id);
        return { ok: true };
    }
};
exports.UpdatesService = UpdatesService;
exports.UpdatesService = UpdatesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(project_update_entity_1.ProjectUpdate)),
    __param(1, (0, typeorm_1.InjectRepository)(team_member_entity_1.TeamMember)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], UpdatesService);
//# sourceMappingURL=updates.service.js.map