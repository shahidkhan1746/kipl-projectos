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

export interface RouteTarget {
  table: string
  id: string
}

export const ROUTE_TABLE_RULES: Array<{ pattern: RegExp; table: string }> = [
  { pattern: /^\/wbs\/([a-zA-Z0-9_-]+)/, table: 'wbs_tasks' },
  { pattern: /^\/tasks-board\/([a-zA-Z0-9_-]+)/, table: 'tasks' },
  { pattern: /^\/meetings\/([a-zA-Z0-9_-]+)/, table: 'meetings' },
  { pattern: /^\/material-register\/([a-zA-Z0-9_-]+)/, table: 'material_register' },
  { pattern: /^\/site-orders\/([a-zA-Z0-9_-]+)/, table: 'site_orders' },
  { pattern: /^\/fleet\/([a-zA-Z0-9_-]+)/, table: 'fleet_logs' },
  { pattern: /^\/diary\/([a-zA-Z0-9_-]+)/, table: 'site_diaries' },
  { pattern: /^\/qa\/inspections\/([a-zA-Z0-9_-]+)/, table: 'qa_inspections' },
  { pattern: /^\/qa\/checklists\/([a-zA-Z0-9_-]+)/, table: 'qa_checklists' },
  { pattern: /^\/qa\/ncrs\/([a-zA-Z0-9_-]+)/, table: 'ncrs' },
  { pattern: /^\/epc\/boq\/([a-zA-Z0-9_-]+)/, table: 'boq_items' },
  { pattern: /^\/epc\/ra-bills\/([a-zA-Z0-9_-]+)/, table: 'ra_bills' },
  { pattern: /^\/boq-items\/([a-zA-Z0-9_-]+)/, table: 'boq_items' },
  { pattern: /^\/accounting\/vendors\/([a-zA-Z0-9_-]+)/, table: 'vendors' },
  { pattern: /^\/accounting\/expenses\/([a-zA-Z0-9_-]+)/, table: 'expenses' },
  { pattern: /^\/accounting\/invoices\/([a-zA-Z0-9_-]+)/, table: 'invoices' },
  { pattern: /^\/accounting\/tds\/([a-zA-Z0-9_-]+)/, table: 'tds_entries' },
  { pattern: /^\/projects\/([a-zA-Z0-9_-]+)/, table: 'projects' },
  { pattern: /^\/om\/logs\/([a-zA-Z0-9_-]+)/, table: 'om_logs' },
  { pattern: /^\/om\/events\/([a-zA-Z0-9_-]+)/, table: 'om_events' },
  { pattern: /^\/om\/pm\/([a-zA-Z0-9_-]+)/, table: 'om_pm_tasks' },
  { pattern: /^\/project-updates\/([a-zA-Z0-9_-]+)/, table: 'project_updates' },
  { pattern: /^\/liaison\/files\/([a-zA-Z0-9_-]+)/, table: 'liaison_files' },
  { pattern: /^\/liaison\/letters\/([a-zA-Z0-9_-]+)/, table: 'letters' },
  { pattern: /^\/hr\/timesheets\/([a-zA-Z0-9_-]+)/, table: 'timesheets' },
  { pattern: /^\/hr\/leave\/([a-zA-Z0-9_-]+)/, table: 'leave_requests' },
  { pattern: /^\/pdf\/ra-bill\/([a-zA-Z0-9_-]+)/, table: 'ra_bills' },
  { pattern: /^\/pdf\/inspection\/([a-zA-Z0-9_-]+)/, table: 'qa_inspections' },
  { pattern: /^\/pdf\/salary-slip\/([a-zA-Z0-9_-]+)/, table: 'salary_records' },
]

const NON_ID_SEGMENTS = new Set([
  'dashboard', 'seed', 'enabling', 'remodel-dependencies', 'cpm', 'pert',
  'eot-register', 'recalculate', 'summary', 'upload', 'all', 'team', 'by-date',
  'next-code', 'me', 'today', 'bulk', 'generate', 'manpower', 'manpower-range',
  'payment-milestones', 'measurements', 'checklists', 'inspections', 'ncrs',
  'vendors', 'expenses', 'transactions', 'tds', 'invoices', 'logs', 'events', 'pm',
  'files', 'letters', 'timesheets', 'leave',
])

export function extractRouteTarget(path: string): RouteTarget | null {
  const clean = path.replace(/^\/api\/v1/, '').replace(/^\/api/, '')
  for (const rule of ROUTE_TABLE_RULES) {
    const match = clean.match(rule.pattern)
    if (match && match[1] && !NON_ID_SEGMENTS.has(match[1])) {
      return { table: rule.table, id: match[1] }
    }
  }
  return null
}

/**
 * Keeps a user inside the projects they are actually on.
 *
 * It works in two places, because one is not enough.
 *
 * On the way in it constrains the request:
 * 1. A projectId named in the query, body or route param must be one of the user's.
 * 2. Pre-handler write-IDOR check: when an :id targets an existing record, its owning
 *    project is resolved from the database BEFORE the controller handler or SQL write
 *    executes. If the record belongs to a foreign project, 403 Forbidden is thrown immediately.
 * 3. A GET that names no project has the user's own project filled in.
 *
 * On the way out it checks what the handler produced. That is the secondary defense-in-depth:
 * lists have foreign rows dropped, and single entities belonging to foreign projects throw 403.
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
    }

    // Pre-handler write-IDOR check:
    // If route targets a specific record by :id, resolve owner BEFORE handler runs.
    const target = extractRouteTarget(path)
    if (target) {
      const owner = await this.projects.resolveProjectId(target.table, target.id)
      if (owner) {
        if (allowed.length && !allowed.includes(owner)) {
          this.logger.warn(
            `Cross-project ${method} ${path} pre-handler refusal; target belongs to project ${owner}.`,
          )
          throw new ForbiddenException('Not assigned to this project')
        }
        if (requested && String(requested) !== owner) {
          throw new ForbiddenException('Target resource belongs to another project')
        }
      }
    }

    if (requested) {
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
