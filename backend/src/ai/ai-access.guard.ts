import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'
import { UserRole } from '../users/user.entity'

// AI features are restricted to Super Admin and Project Manager ONLY.
// Exact-match (not the level-based RolesGuard) so roles like Admin/Engineer,
// which outrank others, are still excluded.
const ALLOWED = new Set<string>([UserRole.SUPER_ADMIN, UserRole.PROJECT_MANAGER])

@Injectable()
export class AiAccessGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const { user } = ctx.switchToHttp().getRequest()
    if (user && ALLOWED.has(user.role)) return true
    throw new ForbiddenException('AI features are restricted to Super Admin and Project Manager.')
  }
}
