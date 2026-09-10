import { CallHandler, ExecutionContext, ForbiddenException } from '@nestjs/common'
import { firstValueFrom, of, throwError } from 'rxjs'
import { AuditInterceptor } from './audit.interceptor'

function ctxFor(req: any, statusCode = 200): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => req, getResponse: () => ({ statusCode }) }),
  } as unknown as ExecutionContext
}

function request(over: Partial<any> = {}) {
  return {
    method: 'PATCH',
    originalUrl: '/api/v1/diary/d1/approve',
    user: { id: 'u1', email: 'a@kipl.com', role: 'engineer' },
    ...over,
  }
}

/** Captures what the interceptor tried to persist. */
function recorder() {
  const rows: any[] = []
  const repo = {
    create: (row: any) => row,
    save: async (row: any) => { rows.push(row); return row },
  } as any
  return { rows, interceptor: new AuditInterceptor(repo) }
}

const ok: CallHandler = { handle: () => of({ id: 'd1' }) }
const denied: CallHandler = { handle: () => throwError(() => new ForbiddenException()) }

describe('AuditInterceptor', () => {
  it('records a write that succeeded', async () => {
    const { rows, interceptor } = recorder()
    await firstValueFrom(interceptor.intercept(ctxFor(request()), ok))
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ method: 'PATCH', statusCode: 200, email: 'a@kipl.com' })
  })

  // The refusals are what an audit trail is usually read to find, and they
  // were the one thing it could not show.
  it('records a write that was refused, with the refusal’s status', async () => {
    const { rows, interceptor } = recorder()
    await expect(firstValueFrom(interceptor.intercept(ctxFor(request()), denied))).rejects.toThrow()
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ method: 'PATCH', statusCode: 403 })
  })

  it('still lets the refusal reach the caller', async () => {
    const { interceptor } = recorder()
    await expect(firstValueFrom(interceptor.intercept(ctxFor(request()), denied)))
      .rejects.toBeInstanceOf(ForbiddenException)
  })

  // Note: dropping the `instanceof HttpException` branch from statusOf fails
  // nothing here, because Nest exceptions also carry `status` as an own
  // property, so the fallback lands on the same number. getStatus() is the
  // documented API and `.status` is an implementation detail, which is why the
  // branch stays; this test pins the numbers, not which branch produced them.
  it('calls an unrecognised failure a 500', async () => {
    const { rows, interceptor } = recorder()
    const boom: CallHandler = { handle: () => throwError(() => new Error('kaboom')) }
    await expect(firstValueFrom(interceptor.intercept(ctxFor(request()), boom))).rejects.toThrow()
    expect(rows[0]).toMatchObject({ statusCode: 500 })
  })

  it('ignores reads', async () => {
    const { rows, interceptor } = recorder()
    await firstValueFrom(interceptor.intercept(ctxFor(request({ method: 'GET' })), ok))
    expect(rows).toHaveLength(0)
  })

  // Credentials pass through these two bodies.
  it('ignores login and refresh', async () => {
    const { rows, interceptor } = recorder()
    await firstValueFrom(interceptor.intercept(
      ctxFor(request({ method: 'POST', originalUrl: '/api/v1/auth/login' })), ok))
    await firstValueFrom(interceptor.intercept(
      ctxFor(request({ method: 'POST', originalUrl: '/api/v1/auth/refresh' })), ok))
    expect(rows).toHaveLength(0)
  })

  it('never stores a request body', async () => {
    const { rows, interceptor } = recorder()
    await firstValueFrom(interceptor.intercept(
      ctxFor(request({ body: { password: 'hunter2' } })), ok))
    expect(JSON.stringify(rows[0])).not.toContain('hunter2')
  })
})
