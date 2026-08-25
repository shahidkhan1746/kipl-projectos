import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'
import { UserRole } from '../users/user.entity'

// AI features are accessible to all authenticated staff members.
// Exact config/key management is protected by RolesGuard(UserRole.SUPER_ADMIN).
const ALLOWED = new Set<string>(Object.values(UserRole))

@Injectable()
export class AiAccessGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const { user } = ctx.switchToHttp().getRequest()
    if (user && ALLOWED.has(user.role)) return true
    throw new ForbiddenException('AI features require authenticated staff access.')
  }
}
