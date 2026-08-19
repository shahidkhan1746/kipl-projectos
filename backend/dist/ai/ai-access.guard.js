"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiAccessGuard = void 0;
const common_1 = require("@nestjs/common");
const user_entity_1 = require("../users/user.entity");
const ALLOWED = new Set([user_entity_1.UserRole.SUPER_ADMIN, user_entity_1.UserRole.PROJECT_MANAGER]);
let AiAccessGuard = class AiAccessGuard {
    canActivate(ctx) {
        const { user } = ctx.switchToHttp().getRequest();
        if (user && ALLOWED.has(user.role))
            return true;
        throw new common_1.ForbiddenException('AI features are restricted to Super Admin and Project Manager.');
    }
};
exports.AiAccessGuard = AiAccessGuard;
exports.AiAccessGuard = AiAccessGuard = __decorate([
    (0, common_1.Injectable)()
], AiAccessGuard);
//# sourceMappingURL=ai-access.guard.js.map