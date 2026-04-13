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
exports.RolesGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const roles_decorator_1 = require("../decorators/roles.decorator");
const user_entity_1 = require("../../users/user.entity");
const ROLE_LEVEL = {
    [user_entity_1.UserRole.SUPER_ADMIN]: 100,
    [user_entity_1.UserRole.ADMIN]: 90,
    [user_entity_1.UserRole.PROJECT_MANAGER]: 70,
    [user_entity_1.UserRole.ENGINEER]: 50,
    [user_entity_1.UserRole.HR_OFFICER]: 50,
    [user_entity_1.UserRole.LIAISON_OFFICER]: 50,
    [user_entity_1.UserRole.ACCOUNTANT]: 50,
    [user_entity_1.UserRole.ACCOUNTS]: 50,
    [user_entity_1.UserRole.QA_ENGINEER]: 50,
    [user_entity_1.UserRole.SUPERVISOR]: 50,
    [user_entity_1.UserRole.FIELD_STAFF]: 30,
    [user_entity_1.UserRole.VIEWER]: 10,
};
let RolesGuard = class RolesGuard {
    reflector;
    constructor(reflector) {
        this.reflector = reflector;
    }
    canActivate(context) {
        const required = this.reflector.getAllAndOverride(roles_decorator_1.ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        const { user } = context.switchToHttp().getRequest();
        if (user.role === user_entity_1.UserRole.SUPER_ADMIN)
            return true;
        return required.some(role => ROLE_LEVEL[user.role] >= ROLE_LEVEL[role]);
    }
};
exports.RolesGuard = RolesGuard;
exports.RolesGuard = RolesGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector])
], RolesGuard);
//# sourceMappingURL=roles.guard.js.map