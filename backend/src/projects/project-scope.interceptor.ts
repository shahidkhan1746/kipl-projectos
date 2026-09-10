import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common'
import { Observable } from 'rxjs'
import { User, UserRole } from '../users/user.entity'
import { ProjectsService } from './projects.service'

const SKIP_PREFIXES = [
  '/api/v1/auth',
  '/api/v1/health',
  '/api/v1/public',
  '/api/v1/gmail',
  '/api/v1/files',
  '/api/v1/storage',
  '/api/v1/settings',
  '/api/v1/users',
  '/api/v1/ai',
  '/api/v1/pdf',
]

const CROSS_PROJECT: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.HR_OFFICER,
  UserRole.ACCOUNTS,
  UserRole.ACCOUNTANT,
]

@Injectable()
export class ProjectScopeInterceptor implements NestInterceptor {
  constructor(private readonly projects: ProjectsService) {}

  async intercept(ctx: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const req = ctx.switchToHttp().getRequest()
    const path = String(req.originalUrl || req.url || '').split('?')[0]
    if (SKIP_PREFIXES.some(p => path.startsWith(p))) return next.handle()

    const user: User | undefined = req.user
    if (!user) return next.handle()
    if (CROSS_PROJECT.includes(user.role)) return next.handle()

    const allowed = await this.projects.allowedProjectIds(user)
    if (allowed === null) return next.handle()

    const method = String(req.method || 'GET').toUpperCase()
    const requested = req.query?.projectId
      || (['POST', 'PATCH', 'PUT'].includes(method) ? req.body?.projectId : undefined)

    if (requested) {
      if (allowed.length && !allowed.includes(String(requested))) {
        throw new ForbiddenException('Not assigned to this project')
      }
      return next.handle()
    }

    if (method === 'GET') {
      if (path === '/api/v1/projects' || path === '/api/v1/projects/') {
        return next.handle()
      }
      if (allowed.length === 1) {
        req.query = { ...(req.query || {}), projectId: allowed[0] }
      } else if (allowed.length === 0) {
        throw new ForbiddenException('No project assigned')
      } else {
        throw new BadRequestException('projectId is required')
      }
    }

    return next.handle()
  }
}
