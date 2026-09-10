import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Observable, tap } from 'rxjs'
import { AuditLog } from './audit-log.entity'

const WRITE = new Set(['POST', 'PATCH', 'PUT', 'DELETE'])

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(@InjectRepository(AuditLog) private readonly repo: Repository<AuditLog>) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<any> {
    const req = ctx.switchToHttp().getRequest()
    const method = String(req.method || '').toUpperCase()
    if (!WRITE.has(method)) return next.handle()
    const path = String(req.originalUrl || req.url || '')
    if (path.startsWith('/api/v1/auth/login') || path.includes('/auth/refresh')) return next.handle()

    return next.handle().pipe(tap({
      next: () => {
        const res = ctx.switchToHttp().getResponse()
        const user = req.user
        this.repo.save(this.repo.create({
          userId: user?.id,
          email: user?.email,
          role: user?.role,
          method,
          path: path.slice(0, 400),
          statusCode: res.statusCode,
          summary: `${method} ${path.split('?')[0]}`.slice(0, 240),
        })).catch(() => undefined)
      },
    }))
  }
}
