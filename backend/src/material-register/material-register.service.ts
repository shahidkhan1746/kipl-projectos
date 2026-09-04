import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { MaterialRegister } from './material-register.entity'

@Injectable()
export class MaterialRegisterService {
  constructor(@InjectRepository(MaterialRegister) private repo: Repository<MaterialRegister>) {}

  private validate(data: Partial<MaterialRegister>) {
    if (!data.projectId) throw new BadRequestException('projectId is required')
    if (!data.material?.trim()) throw new BadRequestException('material is required')
    if (Number(data.receivedQty ?? 0) < 0 || Number(data.consumedQty ?? 0) < 0) {
      throw new BadRequestException('Material quantities cannot be negative')
    }
    if (Number(data.receivedQty ?? 0) === 0 && Number(data.consumedQty ?? 0) === 0) {
      throw new BadRequestException('A received or consumed quantity is required')
    }
  }

  async create(data: Partial<MaterialRegister>) {
    this.validate(data)
    return this.repo.save(this.repo.create(data))
  }
  async update(id: string, data: Partial<MaterialRegister>) {
    const existing = await this.repo.findOne({ where: { id } })
    if (!existing) throw new NotFoundException('Entry not found')
    this.validate({ ...existing, ...data })
    await this.repo.update(id, data)
    return this.repo.findOne({ where: { id } })
  }
  async remove(id: string) { return this.repo.delete(id) }

  // Running balance-in-hand per material (received − consumed, cumulative by date).
  async list(projectId?: string) {
    const rows = await this.repo.find({
      where: projectId ? { projectId } : {},
      order: { material: 'ASC', date: 'ASC' },
    })
    const running: Record<string, number> = {}
    const out = rows.map(r => {
      const key = r.material
      running[key] = (running[key] ?? 0) + (Number(r.receivedQty) || 0) - (Number(r.consumedQty) || 0)
      return { ...r, balance: +running[key].toFixed(3) }
    })
    // newest first for display
    return out.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  }

  async summary(projectId?: string) {
    const rows = await this.repo.find({ where: projectId ? { projectId } : {} })
    const byMaterial: Record<string, { received: number; consumed: number; balance: number; unit: string }> = {}
    for (const r of rows) {
      const m = byMaterial[r.material] ?? { received: 0, consumed: 0, balance: 0, unit: r.unit }
      m.received += Number(r.receivedQty) || 0
      m.consumed += Number(r.consumedQty) || 0
      m.balance = m.received - m.consumed
      m.unit = r.unit ?? m.unit
      byMaterial[r.material] = m
    }
    return byMaterial
  }
}
