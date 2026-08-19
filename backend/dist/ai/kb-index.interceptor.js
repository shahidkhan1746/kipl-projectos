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
Object.defineProperty(exports, "__esModule", { value: true });
exports.KbIndexInterceptor = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const operators_1 = require("rxjs/operators");
function typeForPath(path) {
    const p = path.replace(/^\/?(api\/v1\/)?/, '').replace(/^\//, '');
    if (p.startsWith('diary'))
        return 'site_diary';
    if (p.startsWith('meetings'))
        return 'meeting';
    if (p.startsWith('material-register'))
        return 'material_register';
    if (p.startsWith('site-orders'))
        return 'site_order';
    if (p.startsWith('qa/inspections'))
        return 'qa_inspection';
    if (p.startsWith('liaison/files'))
        return 'liaison_file';
    if (p.startsWith('liaison/letters'))
        return 'letter';
    if (p.startsWith('hr/timesheets'))
        return 'timesheet';
    if (p.startsWith('hr/attendance'))
        return 'attendance';
    if (p.startsWith('hr/employees'))
        return 'employee';
    if (p.startsWith('wbs'))
        return 'wbs_task';
    return null;
}
let KbIndexInterceptor = class KbIndexInterceptor {
    events;
    constructor(events) {
        this.events = events;
    }
    intercept(ctx, next) {
        const req = ctx.switchToHttp().getRequest();
        const method = (req?.method || '').toUpperCase();
        const mutating = method === 'POST' || method === 'PATCH' || method === 'PUT';
        return next.handle().pipe((0, operators_1.tap)((data) => {
            try {
                if (!mutating)
                    return;
                const type = typeForPath(req.path || req.url || '');
                if (!type)
                    return;
                const bodyPid = req.body?.projectId;
                const paramId = req.params?.id;
                const emitOne = (id, projectId) => {
                    if (id)
                        this.events.emit('kb.entity.changed', { type, id, projectId: projectId || bodyPid });
                };
                if (Array.isArray(data))
                    data.forEach((it) => emitOne(it?.id, it?.projectId));
                else
                    emitOne(data?.id || paramId, data?.projectId);
            }
            catch { }
        }));
    }
};
exports.KbIndexInterceptor = KbIndexInterceptor;
exports.KbIndexInterceptor = KbIndexInterceptor = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [event_emitter_1.EventEmitter2])
], KbIndexInterceptor);
//# sourceMappingURL=kb-index.interceptor.js.map