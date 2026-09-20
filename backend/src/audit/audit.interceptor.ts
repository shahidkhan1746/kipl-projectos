import { CallHandler, ExecutionContext, HttpException, Injectable, NestInterceptor } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Observable, tap } from 'rxjs'
import { auditPayload, entityFromPath } from './audit-payload'
import { AuditLog } from './audit-log.entity'

const WRITE = new Set(['POST', 'PATCH', 'PUT', 'DELETE'])

/** The status an exception will become, defaulting to 500. */
function statusOf(err: unknown): number {
  if (err instanceof HttpException) return err.getStatus()
  const status = (err as { status?: unknown })?.status
  return typeof status === 'number' ? status : 500
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(@InjectRepository(AuditLog) private readonly repo: Repository<AuditLog>) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<any> {
    const req = ctx.switchToHttp().getRequest()
    const method = String(req.method || '').toUpperCase()
    if (!WRITE.has(method)) return next.handle()
    const path = String(req.originalUrl || req.url || '')
    if (path.startsWith('/api/v1/auth/login') || path.includes('/auth/refresh')) return next.handle()

    // Both outcomes. Recording only the writes that succeeded leaves the
    // refusals — the attempt to approve someone else's diary, the reach into
    // another project — as the one class of event an audit trail is most often
    // read to find, and the only one it could not show.
    const target = entityFromPath(path)
    const requested = auditPayload(req.body)

    const record = (statusCode: number, result?: unknown) => {
      const user = req.user
      this.repo.save(this.repo.create({
        userId: user?.id,
        email: user?.email,
        role: user?.role,
        method,
        path: path.slice(0, 400),
        statusCode,
        summary: `${method} ${path.split('?')[0]}`.slice(0, 240),
        entityTable: target?.table ?? null,
        entityId: target?.id ?? null,
        changeRequested: requested,
        changeResult: auditPayload(result),
      })).catch(() => undefined)
    }

    return next.handle().pipe(tap({
      next: (result: unknown) => record(ctx.switchToHttp().getResponse().statusCode, result),
      // The response has not been written yet on the error path, so the status
      // comes off the exception rather than off the response.
      error: (err: unknown) => record(statusOf(err)),
    }))
  }
}
