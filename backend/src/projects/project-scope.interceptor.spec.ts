import { BadRequestException, CallHandler, ExecutionContext, ForbiddenException } from '@nestjs/common'
import { firstValueFrom, of } from 'rxjs'
import { ProjectScopeInterceptor } from './project-scope.interceptor'
import { User, UserRole } from '../users/user.entity'

const OURS = 'project-a'
const THEIRS = 'project-b'

function ctxFor(req: any): ExecutionContext {
  return { switchToHttp: () => ({ getRequest: () => req }) } as unknown as ExecutionContext
}

function handlerReturning(payload: unknown): CallHandler {
  return { handle: () => of(payload) }
}

/** The interceptor with allowedProjectIds and resolveProjectId stubbed. */
function makeInterceptor(allowed: string[] | null, resolveMap: Record<string, string | null> = {}) {
  const projects = {
    allowedProjectIds: async () => allowed,
    resolveProjectId: async (table: string, id: string) =>
      resolveMap[`${table}:${id}`] ?? resolveMap[id] ?? null,
  } as any
  return new ProjectScopeInterceptor(projects)
}

interface FakeRequest {
  method: string
  originalUrl: string
  user?: User
  query: Record<string, unknown>
  params: Record<string, unknown>
  body: Record<string, unknown>
}

function request(over: Partial<FakeRequest> = {}): FakeRequest {
  return {
    method: 'GET',
    originalUrl: '/api/v1/wbs/task-1',
    user: { id: 'u1', role: UserRole.ENGINEER } as User,
    query: {},
    params: {},
    body: {},
    ...over,
  }
}

async function run(
  allowed: string[] | null,
  req: any,
  payload: unknown,
  resolveMap: Record<string, string | null> = {},
) {
  const interceptor = makeInterceptor(allowed, resolveMap)
  const observable = await interceptor.intercept(ctxFor(req), handlerReturning(payload))
  return firstValueFrom(observable)
}

describe('ProjectScopeInterceptor — inbound', () => {
  it('leaves a cross-project role alone', async () => {
    const req = request({ user: { id: 'a', role: UserRole.ADMIN } as User })
    await expect(run(null, req, { projectId: THEIRS })).resolves.toEqual({ projectId: THEIRS })
  })

  it('leaves an unauthenticated request alone', async () => {
    const req = request({ user: undefined })
    await expect(run([OURS], req, { projectId: THEIRS })).resolves.toEqual({ projectId: THEIRS })
  })

  it('skips the prefixes that are not project-scoped', async () => {
    const req = request({ originalUrl: '/api/v1/settings/weather_api_key' })
    await expect(run([OURS], req, { projectId: THEIRS })).resolves.toEqual({ projectId: THEIRS })
  })

  it('refuses a query projectId that is not the user’s', async () => {
    const req = request({ query: { projectId: THEIRS } })
    await expect(run([OURS], req, {})).rejects.toBeInstanceOf(ForbiddenException)
  })

  // /projects/:projectId/... names the project as plainly as ?projectId= does.
  it('refuses a route-param projectId that is not the user’s', async () => {
    const req = request({ params: { projectId: THEIRS } })
    await expect(run([OURS], req, {})).rejects.toBeInstanceOf(ForbiddenException)
  })

  it('refuses a body projectId that is not the user’s', async () => {
    const req = request({ method: 'POST', body: { projectId: THEIRS } })
    await expect(run([OURS], req, {})).rejects.toBeInstanceOf(ForbiddenException)
  })

  it('fills in the only project a user has, on a GET that names none', async () => {
    const req = request()
    await run([OURS], req, {})
    expect(req.query.projectId).toBe(OURS)
  })

  it('refuses a user on no project', async () => {
    await expect(run([], request(), {})).rejects.toBeInstanceOf(ForbiddenException)
  })

  it('asks which project when the user is on several', async () => {
    await expect(run([OURS, 'project-c'], request(), {}))
      .rejects.toBeInstanceOf(BadRequestException)
  })
})

describe('ProjectScopeInterceptor — outbound', () => {
  // The point of the whole thing: /wbs/:id names no project in the request, so
  // there is nothing for an inbound check to inspect. Ninety-four routes are
  // addressed this way.
  it('refuses a row fetched by id that belongs to another project', async () => {
    const req = request({ query: { projectId: OURS } })
    await expect(run([OURS], req, { id: 'task-1', projectId: THEIRS }))
      .rejects.toBeInstanceOf(ForbiddenException)
  })

  it('returns a row fetched by id that belongs to the user', async () => {
    const req = request({ query: { projectId: OURS } })
    await expect(run([OURS], req, { id: 'task-1', projectId: OURS }))
      .resolves.toEqual({ id: 'task-1', projectId: OURS })
  })

  it('catches the snake_case spelling a raw query returns', async () => {
    const req = request({ query: { projectId: OURS } })
    await expect(run([OURS], req, { id: 't', project_id: THEIRS }))
      .rejects.toBeInstanceOf(ForbiddenException)
  })

  it('filters a foreign row out of a list rather than refusing the page', async () => {
    const req = request({ query: { projectId: OURS } })
    await expect(run([OURS], req, [
      { id: '1', projectId: OURS },
      { id: '2', projectId: THEIRS },
      { id: '3' },
    ])).resolves.toEqual([{ id: '1', projectId: OURS }, { id: '3' }])
  })

  it('filters inside a wrapper, which is how several endpoints return lists', async () => {
    const req = request({ query: { projectId: OURS } })
    await expect(run([OURS], req, {
      total: 2,
      files: [{ id: '1', projectId: OURS }, { id: '2', projectId: THEIRS }],
    })).resolves.toEqual({ total: 2, files: [{ id: '1', projectId: OURS }] })
  })

  it('leaves a payload carrying no project alone', async () => {
    const req = request({ query: { projectId: OURS } })
    const payload = { totalTasks: 25, completed: 1 }
    await expect(run([OURS], req, payload)).resolves.toBe(payload)
  })

  it('refuses a mutation whose target turns out to be another project', async () => {
    const req = request({ method: 'PATCH', originalUrl: '/api/v1/wbs/task-1' })
    await expect(run([OURS], req, { id: 'task-1', projectId: THEIRS }))
      .rejects.toBeInstanceOf(ForbiddenException)
  })

  // Pins the contract, not the mechanism. Removing the Buffer/Date guard in
  // isPlainObject does not currently fail this: the walker rebuilds an object
  // only when an array property was actually filtered, so a Buffer survives by
  // luck rather than by design. The guard is what keeps that true as `filter`
  // grows, and this test is what will notice when it stops being true.
  it('does not mangle a Buffer or a Date', async () => {
    const req = request({ query: { projectId: OURS } })
    const buf = Buffer.from('pdf')
    await expect(run([OURS], req, buf)).resolves.toBe(buf)
    const when = new Date('2026-09-10T00:00:00Z')
    await expect(run([OURS], req, when)).resolves.toBe(when)
  })

  it('passes primitives and null through', async () => {
    const req = request({ query: { projectId: OURS } })
    await expect(run([OURS], req, null)).resolves.toBeNull()
    await expect(run([OURS], req, 'ok')).resolves.toBe('ok')
  })

  // A user on no project already fails the inbound rules; the outbound half
  // must not additionally blank every list for them.
  it('does not empty responses for a user on no project', async () => {
    const req = request({ method: 'POST', body: {} })
    await expect(run([], req, [{ id: '1', projectId: OURS }]))
      .resolves.toEqual([{ id: '1', projectId: OURS }])
  })
})

describe('ProjectScopeInterceptor — pre-handler write-IDOR prevention', () => {
  it('refuses PATCH on an entity belonging to another project before handler executes', async () => {
    const handler = { handle: jest.fn(() => of({ id: 'task-1', projectId: THEIRS })) }
    const interceptor = makeInterceptor([OURS], { 'wbs_tasks:task-1': THEIRS })
    const req = request({ method: 'PATCH', originalUrl: '/api/v1/wbs/task-1' })

    await expect(interceptor.intercept(ctxFor(req), handler)).rejects.toBeInstanceOf(ForbiddenException)
    // CRITICAL: handler.handle() was NEVER called, meaning no DB mutation occurred!
    expect(handler.handle).not.toHaveBeenCalled()
  })

  it('refuses DELETE on an entity belonging to another project before handler executes', async () => {
    const handler = { handle: jest.fn(() => of({ deleted: true })) }
    const interceptor = makeInterceptor([OURS], { 'tasks:task-99': THEIRS })
    const req = request({ method: 'DELETE', originalUrl: '/api/v1/tasks-board/task-99' })

    await expect(interceptor.intercept(ctxFor(req), handler)).rejects.toBeInstanceOf(ForbiddenException)
    expect(handler.handle).not.toHaveBeenCalled()
  })

  it('refuses mutation when caller provides body projectId spoofing an authorized project', async () => {
    const handler = { handle: jest.fn(() => of({ id: 'task-1', projectId: THEIRS })) }
    const interceptor = makeInterceptor([OURS], { 'wbs_tasks:task-1': THEIRS })
    const req = request({
      method: 'PATCH',
      originalUrl: '/api/v1/wbs/task-1',
      body: { projectId: OURS, title: 'Hacked' },
    })

    await expect(interceptor.intercept(ctxFor(req), handler)).rejects.toBeInstanceOf(ForbiddenException)
    expect(handler.handle).not.toHaveBeenCalled()
  })

  it('allows mutation when entity belongs to the user’s project', async () => {
    const handler = { handle: jest.fn(() => of({ id: 'task-1', projectId: OURS, title: 'Updated' })) }
    const interceptor = makeInterceptor([OURS], { 'wbs_tasks:task-1': OURS })
    const req = request({ method: 'PATCH', originalUrl: '/api/v1/wbs/task-1' })

    const obs = await interceptor.intercept(ctxFor(req), handler)
    const res = await firstValueFrom(obs)
    expect(handler.handle).toHaveBeenCalled()
    expect(res).toEqual(expect.objectContaining({ id: 'task-1', projectId: OURS }))
  })
})

