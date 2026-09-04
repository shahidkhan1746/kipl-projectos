import type { ExecutionContext } from '@nestjs/common'
import type { Reflector } from '@nestjs/core'
import { UserRole } from '../../users/user.entity'
import { RolesGuard } from './roles.guard'

describe('RolesGuard', () => {
  function canActivate(userRole: UserRole, required: UserRole[]) {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(required),
    } as unknown as Reflector
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ user: { role: userRole } }),
      }),
      getHandler: () => undefined,
      getClass: () => undefined,
    } as unknown as ExecutionContext

    return new RolesGuard(reflector).canActivate(context)
  }

  it('does not treat specialist roles at the same former level as interchangeable', () => {
    expect(canActivate(UserRole.QA_ENGINEER, [UserRole.HR_OFFICER])).toBe(false)
    expect(canActivate(UserRole.ACCOUNTANT, [UserRole.LIAISON_OFFICER])).toBe(false)
  })

  it('allows the explicitly required specialist role', () => {
    expect(canActivate(UserRole.HR_OFFICER, [UserRole.HR_OFFICER])).toBe(true)
  })

  it('allows administrators across protected routes', () => {
    expect(canActivate(UserRole.ADMIN, [UserRole.HR_OFFICER])).toBe(true)
    expect(canActivate(UserRole.SUPER_ADMIN, [UserRole.QA_ENGINEER])).toBe(true)
  })

  it('does not let an admin satisfy a super-admin-only route', () => {
    expect(canActivate(UserRole.ADMIN, [UserRole.SUPER_ADMIN])).toBe(false)
  })

  it('preserves operational inheritance for managers and engineers', () => {
    expect(canActivate(UserRole.PROJECT_MANAGER, [UserRole.ENGINEER])).toBe(true)
    expect(canActivate(UserRole.ENGINEER, [UserRole.SUPERVISOR])).toBe(true)
    expect(canActivate(UserRole.SUPERVISOR, [UserRole.ENGINEER])).toBe(false)
  })
})
