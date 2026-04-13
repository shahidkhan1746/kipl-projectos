import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { SiteDiary, DiaryStatus } from './diary.entity'

@Injectable()
export class DiaryService {
  constructor(
    @InjectRepository(SiteDiary) private repo: Repository<SiteDiary>,
  ) {}

  async create(data: any): Promise<SiteDiary> {
    const existing = await this.repo.findOne({ where: { projectId: data.projectId, date: data.date } })
    if (existing) throw new ConflictException('Diary entry for this date already exists')
    const total = (data.labourSkilled||0) + (data.labourUnskilled||0) + (data.labourSupervisory||0)
    const saved = await this.repo.save(this.repo.create({ ...data, labourTotal: total })); return saved as any
  }

  async update(id: string, data: any): Promise<SiteDiary> {
    const total = (data.labourSkilled||0) + (data.labourUnskilled||0) + (data.labourSupervisory||0)
    await this.repo.update(id, { ...data, labourTotal: total })
    return this.findOne(id)
  }

  async findOne(id: string): Promise<SiteDiary> {
    const d = await this.repo.findOne({ where: { id } })
    if (!d) throw new NotFoundException('Diary entry not found')
    return d
  }

  async findByDate(projectId: string, date: string): Promise<SiteDiary | null> {
    return this.repo.findOne({ where: { projectId, date } })
  }

  async list(p: { projectId?: string; fromDate?: string; toDate?: string; status?: string; eotOnly?: boolean }) {
    const qb = this.repo.createQueryBuilder('d').orderBy('d.date', 'DESC')
    if (p.projectId) qb.andWhere('d.projectId = :pid', { pid: p.projectId })
    if (p.fromDate)  qb.andWhere('d.date >= :from', { from: p.fromDate })
    if (p.toDate)    qb.andWhere('d.date <= :to', { to: p.toDate })
    if (p.status)    qb.andWhere('d.status = :s', { s: p.status })
    if (p.eotOnly)   qb.andWhere('d.eotClaim = true')
    return qb.getMany()
  }

  async approve(id: string, approvedBy: string): Promise<SiteDiary> {
    await this.repo.update(id, { status: DiaryStatus.APPROVED, approvedBy })
    return this.findOne(id)
  }

  async submit(id: string): Promise<SiteDiary> {
    await this.repo.update(id, { status: DiaryStatus.SUBMITTED })
    return this.findOne(id)
  }

  async dashboard(projectId: string) {
    const entries = await this.list({ projectId })
    const now     = new Date()
    const monthEntries = entries.filter(e => {
      const d = new Date(e.date)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
    const totalLabour  = monthEntries.reduce((s, e) => s + Number(e.labourTotal), 0)
    const rainyDays    = entries.filter(e => e.weatherMorning === 'rainy' || e.weatherAfternoon === 'rainy').length
    const eotDays      = entries.filter(e => e.eotClaim).length
    const hoursLost    = entries.reduce((s, e) => s + Number(e.hoursLost), 0)
    const workDoneCount = entries.reduce((s, e) => s + (e.workDone?.length || 0), 0)
    return {
      totalEntries: entries.length,
      thisMonthEntries: monthEntries.length,
      avgLabourThisMonth: monthEntries.length > 0 ? Math.round(totalLabour / monthEntries.length) : 0,
      rainyDays,
      eotClaimDays: eotDays,
      hoursLostWeather: hoursLost,
      workDoneCount,
      pendingApproval: entries.filter(e => e.status === DiaryStatus.SUBMITTED).length,
    }
  }
}
