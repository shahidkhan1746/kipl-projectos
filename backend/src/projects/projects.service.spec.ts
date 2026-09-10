import { ForbiddenException, NotFoundException } from '@nestjs/common'
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
