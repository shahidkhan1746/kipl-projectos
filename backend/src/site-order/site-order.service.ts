import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { SiteOrder } from './site-order.entity'

@Injectable()
export class SiteOrderService {
  constructor(@InjectRepository(SiteOrder) private repo: Repository<SiteOrder>) {}

  private async nextOrderNo(projectId: string): Promise<string> {
    const year = new Date().getFullYear()
    const count = await this.repo.count({ where: { projectId } })
    return `SO/${year}/${String(count + 1).padStart(3, '0')}`
  }

  async create(data: Partial<SiteOrder>) {
    if (!data.projectId) throw new BadRequestException('projectId is required')
    if (!data.instruction?.trim()) throw new BadRequestException('instruction is required')
    if (!data.orderNo && data.projectId) data.orderNo = await this.nextOrderNo(data.projectId)
    return this.repo.save(this.repo.create(data))
  }
  async update(id: string, data: Partial<SiteOrder>) {
    const existing = await this.repo.findOne({ where: { id } })
    if (!existing) throw new NotFoundException('Order not found')
    if (data.complianceStatus === 'complied' && !data.remarks?.trim()) {
      throw new BadRequestException('Compliance remarks are required')
    }
    await this.repo.update(id, data)
    return this.repo.findOne({ where: { id } })
  }
  async remove(id: string) { return this.repo.delete(id) }
  async list(projectId?: string, status?: string) {
    const qb = this.repo.createQueryBuilder('o').orderBy('o.date', 'DESC')
    if (projectId) qb.andWhere('o.projectId = :pid', { pid: projectId })
    if (status) qb.andWhere('o.complianceStatus = :s', { s: status })
    return qb.getMany()
  }
}
