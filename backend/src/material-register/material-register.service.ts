import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { EntityManager, Repository } from 'typeorm'
import { MaterialRegister } from './material-register.entity'
import { resolveListLimit } from '../common/list-limit'
import { canonicalMaterialName, stockKey } from './material-key'

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

  /**
   * `manager` lets a caller enlist this write in its own transaction — the GRN
   * bridge does, so a receipt and the stock it creates either both land or
   * neither does. Validation and canonicalisation stay here either way.
   */
  async create(data: Partial<MaterialRegister>, manager?: EntityManager) {
    this.validate(data)
    const repo = manager ? manager.getRepository(MaterialRegister) : this.repo
    // Stored canonical. validate() trimmed the name only to check it was not
    // empty and then saved whatever was passed, so a trailing space opened a
    // second stock line for the same material.
    return repo.save(repo.create({ ...data, material: canonicalMaterialName(data.material) }))
  }
  async update(id: string, data: Partial<MaterialRegister>) {
    const existing = await this.repo.findOne({ where: { id } })
    if (!existing) throw new NotFoundException('Entry not found')
    this.validate({ ...existing, ...data })
    const patch = data.material === undefined
      ? data
      : { ...data, material: canonicalMaterialName(data.material) }
    await this.repo.update(id, patch)
    return this.repo.findOne({ where: { id } })
  }
  /**
   * Withdraws an entry. See the note on MaterialRegister.deletedAt for why
   * these are not destroyed.
   *
   * Who withdrew it and why are recorded on the row itself rather than left to
   * the audit trail, which knows the request and not the record.
   */
  async remove(id: string, withdrawnBy?: { userId?: string; reason?: string }) {
    const existing = await this.repo.findOne({ where: { id } })
    if (!existing) throw new NotFoundException('Entry not found')
    await this.repo.update(id, {
      deletedById: withdrawnBy?.userId ?? null,
      deletedReason: withdrawnBy?.reason?.trim() || null,
    })
    await this.repo.softDelete(id)
    return { id, withdrawn: true }
  }

  /** Withdrawn entries, for reconstructing the register as it stood. */
  async listWithdrawn(projectId?: string) {
    return this.repo.find({
      where: projectId ? { projectId } : {},
      withDeleted: true,
      order: { deletedAt: 'DESC' },
    }).then(rows => rows.filter(r => r.deletedAt != null))
  }

  // Running balance-in-hand per material (received − consumed, cumulative by date).
  async list(projectId?: string, limit?: string | number) {
    const rows = await this.repo.find({
      where: projectId ? { projectId } : {},
      order: { material: 'ASC', date: 'ASC', createdAt: 'ASC' },
    })
    const running: Record<string, number> = {}
    const out = rows.map(r => {
      // Per project AND material. Keyed on the name alone, a call without a
      // projectId ran one project's receipts into another's balance.
      const key = stockKey(r.projectId, r.material)
      const prev = running[key] ?? 0
      const rec = Number(r.receivedQty) || 0
      const con = Number(r.consumedQty) || 0
      running[key] = +(prev + rec - con).toFixed(3)
      return { ...r, balance: running[key] }
    })
    // The running balance above must accumulate over EVERY row for a material,
    // so the row cap is applied here, to the display slice, and never to the
    // query — capping the query would silently produce wrong balances.
    const sorted = out.sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1
      return (a.createdAt || '') < (b.createdAt || '') ? 1 : -1
    })
    return sorted.slice(0, resolveListLimit(limit))
  }

  /**
   * Stock per material, per project, per unit.
   *
   * The previous version added every row for a material together and labelled
   * the total with whichever unit the last row happened to carry. A delivery
   * of 400 cft followed by one of 400 KG reported "800 KG" — cubic feet added
   * to kilograms, on the register the contract requires both parties to sign.
   *
   * Quantities in different units are never added now. A material recorded in
   * more than one unit reports each unit separately and is flagged, because
   * there is no correct single number for it — it is a data-entry fault to be
   * corrected, not a sum to be computed.
   */
  async summary(projectId?: string) {
    const rows = await this.repo.find({ where: projectId ? { projectId } : {} })

    type UnitTotals = { received: number; consumed: number; balance: number }
    const perMaterial = new Map<string, { display: string; byUnit: Map<string, UnitTotals>; rowsPerUnit: Map<string, number> }>()

    for (const r of rows) {
      const key = stockKey(r.projectId, r.material)
      let entry = perMaterial.get(key)
      if (!entry) {
        entry = { display: canonicalMaterialName(r.material), byUnit: new Map(), rowsPerUnit: new Map() }
        perMaterial.set(key, entry)
      }
      const unit = (r.unit ?? '').trim()
      const totals = entry.byUnit.get(unit) ?? { received: 0, consumed: 0, balance: 0 }
      totals.received = +(totals.received + (Number(r.receivedQty) || 0)).toFixed(3)
      totals.consumed = +(totals.consumed + (Number(r.consumedQty) || 0)).toFixed(3)
      totals.balance = +(totals.received - totals.consumed).toFixed(3)
      entry.byUnit.set(unit, totals)
      entry.rowsPerUnit.set(unit, (entry.rowsPerUnit.get(unit) ?? 0) + 1)
    }

    const out: Record<string, any> = {}
    for (const entry of perMaterial.values()) {
      const units = [...entry.byUnit.keys()]
      // The unit most rows were entered in. With one unit that is simply the
      // unit; with several it is the one the figures below belong to, and the
      // rest are in byUnit for the caller to show rather than to add.
      const primary = units.reduce((best, u) =>
        (entry.rowsPerUnit.get(u) ?? 0) > (entry.rowsPerUnit.get(best) ?? 0) ? u : best, units[0] ?? '')
      const totals = entry.byUnit.get(primary) ?? { received: 0, consumed: 0, balance: 0 }

      out[entry.display] = {
        ...totals,
        unit: primary,
        units,
        unitConflict: units.length > 1,
        byUnit: Object.fromEntries(entry.byUnit),
      }
    }
    return out
  }
}
