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
exports.TaskService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const task_entity_1 = require("./task.entity");
let TaskService = class TaskService {
    repo;
    constructor(repo) {
        this.repo = repo;
    }
    async create(data) {
        const count = await this.repo.count({ where: { projectId: data.projectId } });
        return this.repo.save(this.repo.create({ ...data, sortOrder: count + 1 }));
    }
    async list(p) {
        const qb = this.repo.createQueryBuilder('t').orderBy('t.priority', 'ASC').addOrderBy('t.dueDate', 'ASC');
        if (p.projectId)
            qb.andWhere('t.projectId = :pid', { pid: p.projectId });
        if (p.assignedTo)
            qb.andWhere('t.assignedTo = :uid', { uid: p.assignedTo });
        if (p.status)
            qb.andWhere('t.status = :s', { s: p.status });
        if (p.priority)
            qb.andWhere('t.priority = :pr', { pr: p.priority });
        return qb.getMany();
    }
    async update(id, data) {
        if (data.status === task_entity_1.TaskStatus.DONE && !data.completedDate) {
            data.completedDate = new Date().toISOString().split('T')[0];
            data.progressPct = 100;
        }
        await this.repo.update(id, data);
        return this.repo.findOne({ where: { id } });
    }
    async addComment(id, comment) {
        const task = await this.repo.findOne({ where: { id } });
        if (!task)
            throw new common_1.NotFoundException();
        const comments = [...(task.comments ?? []), { ...comment, date: new Date().toISOString() }];
        await this.repo.update(id, { comments });
        return this.repo.findOne({ where: { id } });
    }
    async delete(id) {
        await this.repo.delete(id);
    }
    async dashboard(projectId) {
        const tasks = await this.list({ projectId });
        const today = new Date().toISOString().split('T')[0];
        return {
            total: tasks.length,
            todo: tasks.filter(t => t.status === 'todo').length,
            inProgress: tasks.filter(t => t.status === 'in_progress').length,
            review: tasks.filter(t => t.status === 'review').length,
            done: tasks.filter(t => t.status === 'done').length,
            blocked: tasks.filter(t => t.status === 'blocked').length,
            overdue: tasks.filter(t => t.dueDate && t.dueDate < today && t.status !== 'done').length,
            critical: tasks.filter(t => t.priority === 'critical' && t.status !== 'done').length,
            byAssignee: tasks.reduce((acc, t) => {
                const name = t.assignedName ?? 'Unassigned';
                if (!acc[name])
                    acc[name] = { todo: 0, inProgress: 0, done: 0 };
                if (t.status === 'todo')
                    acc[name].todo++;
                if (t.status === 'in_progress')
                    acc[name].inProgress++;
                if (t.status === 'done')
                    acc[name].done++;
                return acc;
            }, {}),
        };
    }
};
exports.TaskService = TaskService;
exports.TaskService = TaskService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(task_entity_1.Task)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], TaskService);
//# sourceMappingURL=task.service.js.map