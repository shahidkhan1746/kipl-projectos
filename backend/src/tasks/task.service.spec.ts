import { BadRequestException, ForbiddenException } from '@nestjs/common'
import { UserRole } from '../users/user.entity'
import { TaskStatus } from './task.entity'
import { TaskService } from './task.service'

describe('TaskService access controls', () => {
  function createService(overrides: Record<string, any> = {}) {
    const repo = {
      findOne: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn(),
      ...overrides,
    }
    return { service: new TaskService(repo as any), repo }
  }

  it('scopes specialist users to their own assignments', async () => {
    const qb = {
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    }
    const { service } = createService({ createQueryBuilder: jest.fn().mockReturnValue(qb) })

    await service.list(
      { projectId: 'project-1', assignedTo: 'somebody-else' },
      { id: 'qa-user', role: UserRole.QA_ENGINEER } as any,
    )

    expect(qb.andWhere).toHaveBeenCalledWith('t.assignedTo = :uid', { uid: 'qa-user' })
  })

  it('rejects a specialist updating another user\'s task', async () => {
    const { service } = createService({
      findOne: jest.fn().mockResolvedValue({ id: 'task-1', assignedTo: 'other-user' }),
    })

    await expect(service.update(
      'task-1',
      { status: TaskStatus.DONE },
      { id: 'qa-user', role: UserRole.QA_ENGINEER } as any,
    )).rejects.toBeInstanceOf(ForbiddenException)
  })

  it('allows an assigned specialist to change status only', async () => {
    const task = { id: 'task-1', assignedTo: 'qa-user', status: TaskStatus.TODO }
    const { service, repo } = createService({
      findOne: jest.fn().mockResolvedValue(task),
      update: jest.fn().mockResolvedValue(undefined),
    })

    await service.update(
      'task-1',
      { status: TaskStatus.IN_PROGRESS },
      { id: 'qa-user', role: UserRole.QA_ENGINEER } as any,
    )

    expect(repo.update).toHaveBeenCalledWith('task-1', { status: TaskStatus.IN_PROGRESS })
  })

  it('rejects invalid task status values before persistence', async () => {
    const { service } = createService({
      findOne: jest.fn().mockResolvedValue({ id: 'task-1', assignedTo: 'manager' }),
    })

    await expect(service.update(
      'task-1',
      { status: 'not-a-status' },
      { id: 'manager', role: UserRole.PROJECT_MANAGER } as any,
    )).rejects.toBeInstanceOf(BadRequestException)
  })
})
