import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '../../users/user.entity';

const ROLE_LEVEL: Record<UserRole, number> = {
  [UserRole.SUPER_ADMIN]:     100,
  [UserRole.ADMIN]:            90,
  [UserRole.PROJECT_MANAGER]:  70,
  [UserRole.ENGINEER]:         50,
  [UserRole.HR_OFFICER]:       50,
  [UserRole.LIAISON_OFFICER]:  50,
  [UserRole.ACCOUNTANT]:       50,
  [UserRole.ACCOUNTS]:         50,
  [UserRole.QA_ENGINEER]:      50,
  [UserRole.SUPERVISOR]:       50,
  [UserRole.FIELD_STAFF]:      30,
  [UserRole.VIEWER]:           10,
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const { user } = context.switchToHttp().getRequest();
    if (user.role === UserRole.SUPER_ADMIN) return true;
    return required.some(role => ROLE_LEVEL[user.role] >= ROLE_LEVEL[role]);
  }
}
