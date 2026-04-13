import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Meeting, MeetingStatus } from './meeting.entity'

@Injectable()
export class MeetingService {
  constructor(@InjectRepository(Meeting) private repo: Repository<Meeting>) {}

  async create(data: any): Promise<any> {
    const count = await this.repo.count({ where: { projectId: data.projectId } })
    const meetingNo = 'MOM-' + String(count + 1).padStart(4, '0')
    const saved = await this.repo.save(this.repo.create({ ...data, meetingNo }))
    return saved as any
  }

  async list(p: { projectId?: string; type?: string; status?: string; fromDate?: string; toDate?: string }) {
    const qb = this.repo.createQueryBuilder('m').orderBy('m.date', 'DESC')
    if (p.projectId) qb.andWhere('m.projectId = :pid', { pid: p.projectId })
    if (p.type)      qb.andWhere('m.type = :type',     { type: p.type })
    if (p.status)    qb.andWhere('m.status = :s',       { s: p.status })
    if (p.fromDate)  qb.andWhere('m.date >= :from',     { from: p.fromDate })
    if (p.toDate)    qb.andWhere('m.date <= :to',       { to: p.toDate })
    return qb.getMany()
  }

  async findOne(id: string): Promise<Meeting> {
    const m = await this.repo.findOne({ where: { id } })
    if (!m) throw new NotFoundException('Meeting not found')
    return m
  }

  async update(id: string, data: any): Promise<any> {
    await this.repo.update(id, data)
    return this.findOne(id)
  }

  async circulate(id: string): Promise<any> {
    await this.repo.update(id, { status: MeetingStatus.CIRCULATED })
    return this.findOne(id)
  }

  async confirm(id: string): Promise<any> {
    await this.repo.update(id, { status: MeetingStatus.CONFIRMED })
    return this.findOne(id)
  }

  async updateActionItem(id: string, actionIdx: number, updates: any): Promise<any> {
    const meeting = await this.findOne(id)
    const actions = [...(meeting.actionItems ?? [])]
    if (actions[actionIdx]) {
      actions[actionIdx] = { ...actions[actionIdx], ...updates }
      if (updates.status === 'closed') actions[actionIdx].closedDate = new Date().toISOString().split('T')[0]
    }
    await this.repo.update(id, { actionItems: actions })
    return this.findOne(id)
  }

  async dashboard(projectId: string) {
    const meetings = await this.list({ projectId })
    const allActions = meetings.flatMap(m => m.actionItems ?? [])
    const openActions   = allActions.filter(a => a.status !== 'closed').length
    const overdueActions = allActions.filter(a => {
      return a.status !== 'closed' && a.dueDate && new Date(a.dueDate) < new Date()
    }).length
    return {
      totalMeetings:   meetings.length,
      thisMonth:       meetings.filter(m => {
        const d = new Date(m.date); const n = new Date()
        return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear()
      }).length,
      openActions,
      overdueActions,
      byType: meetings.reduce((acc: any, m) => {
        acc[m.type] = (acc[m.type] || 0) + 1; return acc
      }, {}),
    }
  }
}
