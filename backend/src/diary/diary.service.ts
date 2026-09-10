import { Injectable, NotFoundException, ConflictException, BadRequestException, Optional } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { SiteDiary, DiaryStatus } from './diary.entity'
import { resolveListLimit } from '../common/list-limit'
import { OpsEvents } from '../ops-sync/ops-events'
import { StorageService } from '../storage/storage.service'

@Injectable()
export class DiaryService {
  constructor(
    @InjectRepository(SiteDiary) private repo: Repository<SiteDiary>,
    @Optional() private readonly events?: EventEmitter2,
    @Optional() private readonly storage?: StorageService,
  ) {}

  private async withPendingPhotos(data: any, existingPhotos: any[] = []) {
    const pending = data?.pendingPhotos
    const rest = { ...data }
    delete rest.pendingPhotos
    if (!pending || !this.storage) return rest
    const urls = await this.storage.ingestPendingPhotos(pending, 'diary')
    const extra = urls.map(url => ({ url }))
    rest.photos = [...(rest.photos || existingPhotos || []), ...extra]
    return rest
  }

  async create(data: any): Promise<SiteDiary> {
    if (!data.projectId) throw new BadRequestException('projectId is required')
    if (!data.date) throw new BadRequestException('date is required')
    const existing = await this.repo.findOne({ where: { projectId: data.projectId, date: data.date } })
    if (existing) throw new ConflictException('Diary entry for this date already exists')
    const payload = await this.withPendingPhotos(data)
    const total = (payload.labourSkilled||0) + (payload.labourUnskilled||0) + (payload.labourSupervisory||0)
    const saved = await this.repo.save(this.repo.create({ ...payload, labourTotal: total })) as any
    if (saved.status === DiaryStatus.SUBMITTED || data.status === DiaryStatus.SUBMITTED) {
      this.events?.emit(OpsEvents.DIARY_SUBMITTED, saved)
    }
    return saved
  }

  async update(id: string, data: any): Promise<SiteDiary> {
    const existing = await this.findOne(id)
    if (existing.status === DiaryStatus.APPROVED) {
      throw new BadRequestException('An approved diary cannot be edited')
    }
    const labourChanged = ['labourSkilled', 'labourUnskilled', 'labourSupervisory']
      .some(key => data[key] !== undefined)
    const updateData = await this.withPendingPhotos(data, existing.photos || [])
    if (labourChanged) {
      updateData.labourTotal =
        Number(data.labourSkilled ?? existing.labourSkilled ?? 0) +
        Number(data.labourUnskilled ?? existing.labourUnskilled ?? 0) +
        Number(data.labourSupervisory ?? existing.labourSupervisory ?? 0)
    } else {
      delete updateData.labourTotal
    }
    await this.repo.update(id, updateData)
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

  async list(p: { projectId?: string; fromDate?: string; toDate?: string; status?: string; eotOnly?: boolean; limit?: string | number }) {
    const qb = this.repo.createQueryBuilder('d').orderBy('d.date', 'DESC')
    if (p.projectId) qb.andWhere('d.projectId = :pid', { pid: p.projectId })
    if (p.fromDate)  qb.andWhere('d.date >= :from', { from: p.fromDate })
    if (p.toDate)    qb.andWhere('d.date <= :to', { to: p.toDate })
    if (p.status)    qb.andWhere('d.status = :s', { s: p.status })
    if (p.eotOnly)   qb.andWhere('d.eotClaim = true')
    return qb.take(resolveListLimit(p.limit)).getMany()
  }

  async approve(id: string, approvedBy: string): Promise<SiteDiary> {
    await this.repo.update(id, { status: DiaryStatus.APPROVED, approvedBy })
    return this.findOne(id)
  }

  async submit(id: string): Promise<SiteDiary> {
    await this.repo.update(id, { status: DiaryStatus.SUBMITTED })
    const saved = await this.findOne(id)
    this.events?.emit(OpsEvents.DIARY_SUBMITTED, saved)
    return saved
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
