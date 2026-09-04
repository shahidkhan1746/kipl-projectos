import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '../../users/user.entity';

const INHERITED_ROLES: Partial<Record<UserRole, UserRole[]>> = {
  [UserRole.ADMIN]: [
    UserRole.PROJECT_MANAGER,
    UserRole.ENGINEER,
    UserRole.SUPERVISOR,
    UserRole.HR_OFFICER,
    UserRole.QA_ENGINEER,
    UserRole.LIAISON_OFFICER,
    UserRole.ACCOUNTANT,
    UserRole.ACCOUNTS,
    UserRole.FIELD_STAFF,
    UserRole.VIEWER,
  ],
  [UserRole.PROJECT_MANAGER]: [
    UserRole.ENGINEER,
    UserRole.SUPERVISOR,
    UserRole.FIELD_STAFF,
    UserRole.VIEWER,
  ],
  [UserRole.ENGINEER]: [
    UserRole.SUPERVISOR,
    UserRole.FIELD_STAFF,
    UserRole.VIEWER,
  ],
  [UserRole.SUPERVISOR]: [UserRole.FIELD_STAFF, UserRole.VIEWER],
  [UserRole.HR_OFFICER]: [UserRole.FIELD_STAFF, UserRole.VIEWER],
  [UserRole.QA_ENGINEER]: [UserRole.FIELD_STAFF, UserRole.VIEWER],
  [UserRole.LIAISON_OFFICER]: [UserRole.FIELD_STAFF, UserRole.VIEWER],
  [UserRole.ACCOUNTANT]: [UserRole.FIELD_STAFF, UserRole.VIEWER],
  [UserRole.ACCOUNTS]: [UserRole.FIELD_STAFF, UserRole.VIEWER],
  [UserRole.FIELD_STAFF]: [UserRole.VIEWER],
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) return false;
    if (user.role === UserRole.SUPER_ADMIN) return true;
    if (required.includes(user.role)) return true;
    const inherited = INHERITED_ROLES[user.role as UserRole] ?? [];
    return required.some(role => inherited.includes(role));
  }
}
