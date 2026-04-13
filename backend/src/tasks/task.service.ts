import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Task, TaskStatus } from './task.entity'

@Injectable()
export class TaskService {
  constructor(@InjectRepository(Task) private repo: Repository<Task>) {}

  async create(data: any): Promise<any> {
    const count = await this.repo.count({ where: { projectId: data.projectId } })
    return this.repo.save(this.repo.create({ ...data, sortOrder: count + 1 })) as any
  }

  async list(p: { projectId?: string; assignedTo?: string; status?: string; priority?: string }) {
    const qb = this.repo.createQueryBuilder('t').orderBy('t.priority','ASC').addOrderBy('t.dueDate','ASC')
    if (p.projectId)  qb.andWhere('t.projectId = :pid',   { pid: p.projectId })
    if (p.assignedTo) qb.andWhere('t.assignedTo = :uid',  { uid: p.assignedTo })
    if (p.status)     qb.andWhere('t.status = :s',        { s: p.status })
    if (p.priority)   qb.andWhere('t.priority = :pr',     { pr: p.priority })
    return qb.getMany()
  }

  async update(id: string, data: any): Promise<any> {
    if (data.status === TaskStatus.DONE && !data.completedDate) {
      data.completedDate = new Date().toISOString().split('T')[0]
      data.progressPct   = 100
    }
    await this.repo.update(id, data)
    return this.repo.findOne({ where: { id } }) as any
  }

  async addComment(id: string, comment: { author: string; text: string }): Promise<any> {
    const task = await this.repo.findOne({ where: { id } })
    if (!task) throw new NotFoundException()
    const comments = [...(task.comments ?? []), { ...comment, date: new Date().toISOString() }]
    await this.repo.update(id, { comments })
    return this.repo.findOne({ where: { id } }) as any
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id)
  }

  async dashboard(projectId: string) {
    const tasks = await this.list({ projectId })
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
