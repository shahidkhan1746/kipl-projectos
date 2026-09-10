import { ForbiddenException, Logger, NotFoundException } from '@nestjs/common'
import { ProjectsService } from './projects.service'
import { User, UserRole } from '../users/user.entity'

const OURS = 'project-a'
const THEIRS = 'project-b'

/**
 * findById is the one project-scoped read the interceptor cannot police.
 *
 * Everything else that belongs to a project carries a `projectId`, which the
 * response-scoping interceptor recognises. A project row names itself `id`,
 * so it looks like a row belonging to nothing, and `GET /projects/:id`
 * returned any project to anyone signed in. The check has to live here.
 */
describe('ProjectsService.findById scoping', () => {
  const engineer = { id: 'u1', role: UserRole.ENGINEER } as User
  const admin = { id: 'u2', role: UserRole.ADMIN } as User

  function service(found: { id: string } | null, allowed: string[] | null) {
    const repo = {
      createQueryBuilder: () => ({
        leftJoin() { return this },
        addSelect() { return this },
        where() { return this },
        orderBy() { return this },
        andWhere() { return this },
        getOne: async () => found,
      }),
    } as any
    const svc = new ProjectsService(repo, {} as any)
    jest.spyOn(svc, 'allowedProjectIds').mockResolvedValue(allowed as any)
    return svc
  }

  it('returns the project when the caller is on it', async () => {
    const svc = service({ id: OURS }, [OURS])
    await expect(svc.findById(OURS, engineer)).resolves.toEqual({ id: OURS })
  })

  it('refuses a project the caller is not on', async () => {
    const svc = service({ id: THEIRS }, [OURS])
    await expect(svc.findById(THEIRS, engineer)).rejects.toBeInstanceOf(ForbiddenException)
  })

  it('lets a cross-project role through', async () => {
    // allowedProjectIds returns null for admin and above.
    const svc = service({ id: THEIRS }, null)
    await expect(svc.findById(THEIRS, admin)).resolves.toEqual({ id: THEIRS })
  })

  // The PDF generator and the update path call this with no user, because
  // there is no request to scope against at that point.
  it('is unscoped when no caller is given', async () => {
    const svc = service({ id: THEIRS }, [OURS])
    await expect(svc.findById(THEIRS)).resolves.toEqual({ id: THEIRS })
  })

  it('still reports a missing project as missing', async () => {
    const svc = service(null, [OURS])
    await expect(svc.findById('nope', engineer)).rejects.toBeInstanceOf(NotFoundException)
  })
})

describe('ProjectsService.resolveProjectId', () => {
  it('returns null when dataSource is not injected', async () => {
    const svc = new ProjectsService({} as any, {} as any)
    await expect(svc.resolveProjectId('wbs_tasks', 'task-1')).resolves.toBeNull()
  })

  it('rejects unallowed tables not in the whitelist', async () => {
    const ds = { query: jest.fn() } as any
    const svc = new ProjectsService({} as any, {} as any, ds)
    await expect(svc.resolveProjectId('users; DROP TABLE users;--', '1')).resolves.toBeNull()
    expect(ds.query).not.toHaveBeenCalled()
  })

  it('resolves project_id for standard project-scoped tables', async () => {
    const ds = { query: jest.fn().mockResolvedValue([{ project_id: 'proj-123' }]) } as any
    const svc = new ProjectsService({} as any, {} as any, ds)
    await expect(svc.resolveProjectId('wbs_tasks', 'task-1')).resolves.toBe('proj-123')
    expect(ds.query).toHaveBeenCalledWith(
      'SELECT project_id FROM wbs_tasks WHERE id = $1 LIMIT 1',
      ['task-1'],
    )
  })

  it('resolves id for projects table', async () => {
    const ds = { query: jest.fn().mockResolvedValue([{ id: 'proj-123' }]) } as any
    const svc = new ProjectsService({} as any, {} as any, ds)
    await expect(svc.resolveProjectId('projects', 'proj-123')).resolves.toBe('proj-123')
    expect(ds.query).toHaveBeenCalledWith(
      'SELECT id FROM projects WHERE id = $1 LIMIT 1',
      ['proj-123'],
    )
  })

  it('resolves employee project for leave_requests table via join', async () => {
    const ds = { query: jest.fn().mockResolvedValue([{ project_id: 'proj-emp' }]) } as any
    const svc = new ProjectsService({} as any, {} as any, ds)
    await expect(svc.resolveProjectId('leave_requests', 'lr-1')).resolves.toBe('proj-emp')
    expect(ds.query).toHaveBeenCalledWith(
      expect.stringContaining('JOIN employees'),
      ['lr-1'],
    )
  })

  it('returns null when query returns empty or throws', async () => {
    const ds = { query: jest.fn().mockRejectedValue(new Error('DB error')) } as any
    const svc = new ProjectsService({} as any, {} as any, ds)
    await expect(svc.resolveProjectId('wbs_tasks', 'unknown')).resolves.toBeNull()
  })
})


/**
 * The pre-handler write check is only as good as the DataSource behind it.
 *
 * resolveProjectId returns null both when a row does not exist and when the
 * DataSource is missing, and the interceptor passes through on null. The first
 * case is correct; the second silently disables the check for every route at
 * once, and looks identical from outside.
 */
describe('ProjectsService.resolveProjectId without a DataSource', () => {
  it('returns null and says so, rather than failing closed or staying quiet', async () => {
    const svc = new ProjectsService({} as any, {} as any, undefined)
    const spy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined)
    // Reset the once-only latch so this test sees the warning regardless of
    // what ran before it.
    ;(ProjectsService as unknown as { warnedNoDataSource: boolean }).warnedNoDataSource = false

    await expect(svc.resolveProjectId('wbs_tasks', 'task-1')).resolves.toBeNull()
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('inactive'))
    spy.mockRestore()
  })

  it('refuses a table that is not on the allowlist', async () => {
    const query = jest.fn()
    const svc = new ProjectsService({} as any, {} as any, { query } as any)
    await expect(svc.resolveProjectId('users; DROP TABLE users', 'x')).resolves.toBeNull()
    expect(query).not.toHaveBeenCalled()
  })
})
