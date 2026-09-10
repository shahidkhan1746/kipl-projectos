import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common'
import { Observable, map } from 'rxjs'
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

/** Both spellings: TypeORM entities carry one, raw query results the other. */
const PROJECT_KEYS = ['projectId', 'project_id'] as const

/**
 * Keeps a user inside the projects they are actually on.
 *
 * It works in two places, because one is not enough.
 *
 * On the way in it constrains the request: a projectId named in the query, the
 * body or a route parameter must be one of the user's, and a GET that names
 * none has the user's own filled in.
 *
 * On the way out it checks what the handler actually produced. That is the half
 * that was missing, and it is the half that matters for the ninety-four routes
 * addressed by id. `GET /wbs/:id` names no project anywhere in the request —
 * the id is the whole address — so an inbound check has nothing to inspect and
 * the row came back whoever asked. Reading the response needs no per-route
 * knowledge: if what came back carries a projectId, it has to be one of theirs.
 */
@Injectable()
export class ProjectScopeInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ProjectScopeInterceptor.name)

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
    // Route params too: /projects/:projectId/... names the project as plainly
    // as ?projectId= does, and went unchecked.
    const requested = req.query?.projectId
      || req.params?.projectId
      || (['POST', 'PATCH', 'PUT'].includes(method) ? req.body?.projectId : undefined)

    if (requested) {
      if (allowed.length && !allowed.includes(String(requested))) {
        throw new ForbiddenException('Not assigned to this project')
      }
      return this.scoped(next, allowed, method, path)
    }

    if (method === 'GET') {
      if (path === '/api/v1/projects' || path === '/api/v1/projects/') {
        return this.scoped(next, allowed, method, path)
      }
      if (allowed.length === 1) {
        req.query = { ...(req.query || {}), projectId: allowed[0] }
      } else if (allowed.length === 0) {
        throw new ForbiddenException('No project assigned')
      } else {
        throw new BadRequestException('projectId is required')
      }
    }

    return this.scoped(next, allowed, method, path)
  }

  private scoped(
    next: CallHandler,
    allowed: string[],
    method: string,
    path: string,
  ): Observable<any> {
    // An empty list means the user is on no project at all. Nothing carrying a
    // project can be theirs, so leave the inbound rules to decide and do not
    // let this silently empty every response.
    if (!allowed.length) return next.handle()
    return next.handle().pipe(map(payload => this.filter(payload, allowed, method, path)))
  }

  private filter(payload: unknown, allowed: string[], method: string, path: string): unknown {
    if (Array.isArray(payload)) {
      // A list is filtered rather than refused: one foreign row should narrow
      // the page, not blank it.
      return payload.filter(row => this.projectOf(row) === undefined
        || allowed.includes(this.projectOf(row)!))
    }

    if (!this.isPlainObject(payload)) return payload

    const owner = this.projectOf(payload)
    if (owner !== undefined && !allowed.includes(owner)) {
      // A mutation reaching this point has already been applied — the response
      // is refused, but the row was written. Recorded so it is visible in the
      // log rather than only in the 403 the caller sees.
      if (method !== 'GET') {
        this.logger.warn(
          `Cross-project ${method} ${path} reached project ${owner}; response refused.`,
        )
      }
      throw new ForbiddenException('Not assigned to this project')
    }

    // One level into wrappers — {files: [...]}, {data: [...]} and the like are
    // how several of these endpoints return their lists.
    let changed = false
    const out: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(payload)) {
      if (Array.isArray(value)) {
        const kept = value.filter(row => this.projectOf(row) === undefined
          || allowed.includes(this.projectOf(row)!))
        if (kept.length !== value.length) changed = true
        out[key] = kept
      } else {
        out[key] = value
      }
    }
    return changed ? out : payload
  }

  /** The project a row belongs to, or undefined when it belongs to none. */
  private projectOf(row: unknown): string | undefined {
    if (!this.isPlainObject(row)) return undefined
    for (const key of PROJECT_KEYS) {
      const value = row[key]
      if (typeof value === 'string' && value) return value
    }
    return undefined
  }

  /**
   * Entities and query results only. A Buffer or a stream has an entries()
   * shape that would be mangled by walking it, and a Date would be flattened.
   */
  private isPlainObject(value: unknown): value is Record<string, unknown> {
    if (value === null || typeof value !== 'object') return false
    if (Array.isArray(value) || Buffer.isBuffer(value) || value instanceof Date) return false
    return true
  }
}
