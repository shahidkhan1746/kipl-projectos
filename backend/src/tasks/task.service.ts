import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Task, TaskPriority, TaskStatus } from './task.entity'
import { User, UserRole } from '../users/user.entity'
import { resolveListLimit } from '../common/list-limit'

@Injectable()
export class TaskService {
  constructor(@InjectRepository(Task) private repo: Repository<Task>) {}

  async create(data: any): Promise<any> {
    if (!data.projectId) throw new BadRequestException('projectId is required')
    if (!data.title?.trim()) throw new BadRequestException('title is required')
    const count = await this.repo.count({ where: { projectId: data.projectId } })
    return this.repo.save(this.repo.create({ ...data, sortOrder: count + 1 })) as any
  }

  private canManageAllTasks(user?: User) {
    return !!user && [
      UserRole.SUPER_ADMIN,
      UserRole.ADMIN,
      UserRole.PROJECT_MANAGER,
      UserRole.ENGINEER,
      UserRole.SUPERVISOR,
    ].includes(user.role)
  }

  async list(p: { projectId?: string; assignedTo?: string; status?: string; priority?: string; limit?: string | number }, actor?: User) {
    const assignedTo = actor && !this.canManageAllTasks(actor) ? actor.id : p.assignedTo
    const qb = this.repo.createQueryBuilder('t').orderBy('t.priority','ASC').addOrderBy('t.dueDate','ASC')
    if (p.projectId)  qb.andWhere('t.projectId = :pid',   { pid: p.projectId })
    if (assignedTo) qb.andWhere('t.assignedTo = :uid',  { uid: assignedTo })
    if (p.status)     qb.andWhere('t.status = :s',        { s: p.status })
    if (p.priority)   qb.andWhere('t.priority = :pr',     { pr: p.priority })
    return qb.take(resolveListLimit(p.limit)).getMany()
  }

  async update(id: string, data: any, actor?: User): Promise<any> {
    const task = await this.repo.findOne({ where: { id } })
    if (!task) throw new NotFoundException('Task not found')
    if (actor && !this.canManageAllTasks(actor)) {
      if (task.assignedTo !== actor.id) {
        throw new ForbiddenException('You may only update tasks assigned to you')
      }
      const disallowed = Object.keys(data).filter(key => !['status', 'progressPct'].includes(key))
      if (disallowed.length) throw new BadRequestException('Only task status and progress may be updated')
    }
    if (data.status !== undefined && !Object.values(TaskStatus).includes(data.status)) {
      throw new BadRequestException('Invalid task status')
    }
    if (data.priority !== undefined && !Object.values(TaskPriority).includes(data.priority)) {
      throw new BadRequestException('Invalid task priority')
    }
    if (data.progressPct !== undefined &&
        (!Number.isFinite(Number(data.progressPct)) || Number(data.progressPct) < 0 || Number(data.progressPct) > 100)) {
      throw new BadRequestException('Task progress must be between 0 and 100')
    }
    if (data.status === TaskStatus.DONE && !data.completedDate) {
      data.completedDate = new Date().toISOString().split('T')[0]
      data.progressPct   = 100
    }
    await this.repo.update(id, data)
    return this.repo.findOne({ where: { id } }) as any
  }

  async addComment(id: string, comment: { author: string; text: string }, actor?: User): Promise<any> {
    const task = await this.repo.findOne({ where: { id } })
    if (!task) throw new NotFoundException()
    if (actor && !this.canManageAllTasks(actor) && task.assignedTo !== actor.id) {
      throw new ForbiddenException('You may only comment on tasks assigned to you')
    }
    const text = comment.text?.trim()
    if (!text) throw new BadRequestException('Comment text is required')
    const comments = [...(task.comments ?? []), { ...comment, text, date: new Date().toISOString() }]
    await this.repo.update(id, { comments })
    return this.repo.findOne({ where: { id } }) as any
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id)
  }

  async dashboard(projectId: string, actor?: User) {
    const tasks = await this.list({ projectId }, actor)
    const today = new Date().toISOString().split('T')[0]
    return {
      total:      tasks.length,
      todo:       tasks.filter(t => t.status === 'todo').length,
      inProgress: tasks.filter(t => t.status === 'in_progress').length,
      review:     tasks.filter(t => t.status === 'review').length,
      done:       tasks.filter(t => t.status === 'done').length,
      blocked:    tasks.filter(t => t.status === 'blocked').length,
      overdue:    tasks.filter(t => t.dueDate && t.dueDate < today && t.status !== 'done').length,
      critical:   tasks.filter(t => t.priority === 'critical' && t.status !== 'done').length,
      byAssignee: tasks.reduce((acc: any, t) => {
        const name = t.assignedName ?? 'Unassigned'
        if (!acc[name]) acc[name] = { todo:0, inProgress:0, done:0 }
        if (t.status === 'todo')        acc[name].todo++
        if (t.status === 'in_progress') acc[name].inProgress++
        if (t.status === 'done')        acc[name].done++
        return acc
      }, {}),
    }
  }
}
