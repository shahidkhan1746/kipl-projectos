import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { Observable } from 'rxjs'
import { tap } from 'rxjs/operators'

// Maps an API path to the AI knowledge-base entity type. After any successful
// create/update on one of these, we emit 'kb.entity.changed' so the record is
// re-indexed into the vector store — keeping the assistant current without a
// manual full sync. Fire-and-forget; never blocks or fails the user's request.
function typeForPath(path: string): string | null {
  const p = path.replace(/^\/?(api\/v1\/)?/, '').replace(/^\//, '')
  if (p.startsWith('diary')) return 'site_diary'
  if (p.startsWith('meetings')) return 'meeting'
  if (p.startsWith('material-register')) return 'material_register'
  if (p.startsWith('site-orders')) return 'site_order'
  if (p.startsWith('qa/inspections')) return 'qa_inspection'
  if (p.startsWith('liaison/files')) return 'liaison_file'
  if (p.startsWith('liaison/letters')) return 'letter'
  if (p.startsWith('hr/timesheets')) return 'timesheet'
  if (p.startsWith('hr/attendance')) return 'attendance'
  if (p.startsWith('hr/employees')) return 'employee'
  if (p.startsWith('wbs')) return 'wbs_task'
  return null
}

@Injectable()
export class KbIndexInterceptor implements NestInterceptor {
  constructor(private readonly events: EventEmitter2) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<any> {
    const req = ctx.switchToHttp().getRequest()
    const method = (req?.method || '').toUpperCase()
    const mutating = method === 'POST' || method === 'PATCH' || method === 'PUT'

    return next.handle().pipe(tap((data) => {
      try {
        if (!mutating) return
        const type = typeForPath(req.path || req.url || '')
        if (!type) return
        const bodyPid = req.body?.projectId
        const paramId = req.params?.id

        const emitOne = (id?: string, projectId?: string) => {
          if (id) this.events.emit('kb.entity.changed', { type, id, projectId: projectId || bodyPid })
        }
        if (Array.isArray(data)) data.forEach((it: any) => emitOne(it?.id, it?.projectId))
        else emitOne(data?.id || paramId, data?.projectId)
      } catch { /* never disrupt the response */ }
    }))
  }
}
