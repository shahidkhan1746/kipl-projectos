import { BadRequestException, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { JhaCheck } from './jha-check.entity'
import { ComplianceRecord } from './compliance-record.entity'

@Injectable()
export class ComplianceService {
  constructor(
    @InjectRepository(JhaCheck) private readonly jha: Repository<JhaCheck>,
    @InjectRepository(ComplianceRecord) private readonly items: Repository<ComplianceRecord>,
  ) {}

  listJha(projectId: string) {
    if (!projectId) throw new BadRequestException('projectId is required')
    return this.jha.find({ where: { projectId }, order: { paramKey: 'ASC', itemId: 'ASC' } })
  }

  async upsertJha(body: any, user?: { name?: string; id?: string }) {
    if (!body.projectId || !body.paramKey || !body.itemId) {
      throw new BadRequestException('projectId, paramKey and itemId are required')
    }
    let row = await this.jha.findOne({
      where: { projectId: body.projectId, paramKey: body.paramKey, itemId: body.itemId },
    })
    if (!row) {
      row = this.jha.create({
        projectId: body.projectId,
        paramKey: body.paramKey,
        itemId: body.itemId,
      })
    }
    if (body.checked !== undefined) row.checked = !!body.checked
    if (body.evidenceUrl !== undefined) row.evidenceUrl = body.evidenceUrl
    if (body.notes !== undefined) row.notes = body.notes
    row.updatedBy = user?.name ?? user?.id ?? ''
    return this.jha.save(row)
  }

  listItems(projectId: string) {
    if (!projectId) throw new BadRequestException('projectId is required')
    return this.items.find({ where: { projectId }, order: { itemId: 'ASC' } })
  }

  async upsertItem(body: any, user?: { name?: string; id?: string }) {
    if (!body.projectId || !body.itemId) {
      throw new BadRequestException('projectId and itemId are required')
    }
    let row = await this.items.findOne({
      where: { projectId: body.projectId, itemId: body.itemId },
    })
    if (!row) {
      row = this.items.create({ projectId: body.projectId, itemId: body.itemId })
    }
    if (body.status !== undefined) row.status = body.status
    if (body.deadline !== undefined) row.deadline = body.deadline || null
    if (body.evidenceUrl !== undefined) row.evidenceUrl = body.evidenceUrl
    if (body.notes !== undefined) row.notes = body.notes
    row.updatedBy = user?.name ?? user?.id ?? ''
    return this.items.save(row)
  }
}
